"use client";

import React, { useEffect, useRef } from "react";

const SPOTLIGHT_SELECTOR =
  ".project-card, .stack-category, .timeline-content, .skill-cell, .principle, .contact-card, .button-primary";

const FALLBACK_ITEM_SELECTOR =
  ".section-heading-main, .stack-intro, .work-metric, .project-card, .marquee-viewport, .stack-category, .timeline-entry, .skill-cell, .principle, .contact-card, .site-footer";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasScrollableAncestor(target: EventTarget | null, deltaY: number): boolean {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 2) {
      const canScrollDown = deltaY > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1;
      const canScrollUp = deltaY < 0 && node.scrollTop > 1;
      if (canScrollDown || canScrollUp) {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

export default function ExperienceEnhancer() {
  const progressFillRef = useRef<HTMLDivElement>(null);

  // 1. Scroll progress bar fallback when CSS `animation-timeline: scroll()` is unsupported (e.g. Firefox)
  useEffect(() => {
    const el = progressFillRef.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      el.style.transform = "scaleX(0)";
      return;
    }

    const supportsScrollTimeline =
      typeof CSS !== "undefined" && Boolean(CSS.supports?.("animation-timeline", "scroll()"));

    if (supportsScrollTimeline) return;

    let frame = 0;
    const syncProgress = () => {
      frame = 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ratio = clamp(window.scrollY / maxScroll, 0, 1);
      el.style.transform = `scaleX(${ratio.toFixed(4)})`;
    };

    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(syncProgress);
      }
    };

    syncProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // 2. Smooth bidirectional desktop wheel inertia (preserves native touch physics, Tour Mode, and Navbar transitions)
  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");

    if (reducedQuery.matches || !finePointerQuery.matches) return;

    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let lastAppliedY = window.scrollY;
    let rafId = 0;
    let lastTime = 0;
    let isStepping = false;

    const stopInertia = (resyncToWindow = true) => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (resyncToWindow) {
        currentY = window.scrollY;
        targetY = window.scrollY;
        lastAppliedY = window.scrollY;
      }
    };

    const step = (now: number) => {
      if (
        document.documentElement.classList.contains("tour-active") ||
        document.documentElement.classList.contains("nav-transiting") ||
        reducedQuery.matches
      ) {
        stopInertia(true);
        return;
      }

      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.064) : 1 / 60;
      lastTime = now;

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      targetY = clamp(targetY, 0, maxScroll);

      const diff = targetY - currentY;
      if (Math.abs(diff) <= 0.4) {
        isStepping = true;
        window.scrollTo({ top: targetY, behavior: "instant" });
        isStepping = false;
        currentY = targetY;
        lastAppliedY = targetY;
        rafId = 0;
        lastTime = 0;
        return;
      }

      // Frame-rate independent exponential smoothing for crisp start & silky deceleration
      const factor = 1 - Math.exp(-9.8 * dt);
      currentY += diff * factor;

      isStepping = true;
      window.scrollTo({ top: currentY, behavior: "instant" });
      isStepping = false;
      lastAppliedY = window.scrollY;

      rafId = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
      if (!finePointerQuery.matches || reducedQuery.matches) return;
      if (
        document.documentElement.classList.contains("tour-active") ||
        document.documentElement.classList.contains("nav-transiting")
      ) {
        stopInertia(true);
        return;
      }

      let rawDeltaY = e.deltaY;
      if (Math.abs(rawDeltaY) < 0.01) return;
      if (Math.abs(e.deltaX) > Math.abs(rawDeltaY) * 1.15) return;
      if (hasScrollableAncestor(e.target, rawDeltaY)) return;

      if (e.deltaMode === 1) {
        rawDeltaY *= 38;
      } else if (e.deltaMode === 2) {
        rawDeltaY *= window.innerHeight * 0.85;
      } else {
        rawDeltaY *= 1.06;
      }

      e.preventDefault();

      if (!rafId) {
        currentY = window.scrollY;
        targetY = window.scrollY;
      }

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      targetY = clamp(targetY + rawDeltaY, 0, maxScroll);

      if (!rafId) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(step);
      }
    };

    const onExternalScroll = () => {
      if (isStepping) return;
      if (rafId && Math.abs(window.scrollY - lastAppliedY) > 3) {
        stopInertia(true);
      } else if (!rafId) {
        currentY = window.scrollY;
        targetY = window.scrollY;
        lastAppliedY = window.scrollY;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const navKeys = [
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
      ];
      if (navKeys.includes(e.key)) {
        stopInertia(true);
      }
    };

    const onAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (anchor) {
        stopInertia(true);
      }
    };

    const onStop = () => stopInertia(true);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onExternalScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown, { passive: true });
    window.addEventListener("touchstart", onStop, { passive: true });
    window.addEventListener("pointerdown", onStop, { passive: true });
    window.addEventListener("resize", onStop, { passive: true });
    window.addEventListener("portfolio:navigate", onStop);
    document.addEventListener("click", onAnchorClick, { passive: true });

    return () => {
      stopInertia(false);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onExternalScroll);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onStop);
      window.removeEventListener("pointerdown", onStop);
      window.removeEventListener("resize", onStop);
      window.removeEventListener("portfolio:navigate", onStop);
      document.removeEventListener("click", onAnchorClick);
    };
  }, []);

  // 3. Delegated pointer-reactive spotlight coordinate tracker (--mouse-x / --mouse-y)
  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rectCache = new WeakMap<HTMLElement, DOMRect>();
    const trackedEls = new Set<HTMLElement>();

    const clearCache = () => {
      trackedEls.forEach((el) => rectCache.delete(el));
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
            for (const entry of entries) {
              rectCache.set(entry.target as HTMLElement, entry.target.getBoundingClientRect());
            }
          })
        : null;

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || reducedQuery.matches) return;
      const surface = (e.target as Element | null)?.closest?.(SPOTLIGHT_SELECTOR) as HTMLElement | null;
      if (!surface) return;

      let rect = rectCache.get(surface);
      if (!rect) {
        rect = surface.getBoundingClientRect();
        rectCache.set(surface, rect);
        if (!trackedEls.has(surface)) {
          trackedEls.add(surface);
          resizeObserver?.observe(surface);
        }
      }

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      surface.style.setProperty("--mouse-x", `${x.toFixed(1)}px`);
      surface.style.setProperty("--mouse-y", `${y.toFixed(1)}px`);
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", clearCache, { passive: true });
    window.addEventListener("resize", clearCache, { passive: true });

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", clearCache);
      window.removeEventListener("resize", clearCache);
      resizeObserver?.disconnect();
    };
  }, []);

  // 4. Bidirectional fallback for browsers lacking ViewTimeline + animation-range (Firefox)
  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedQuery.matches) return;

    const supportsViewTimeline =
      typeof CSS !== "undefined" &&
      Boolean(CSS.supports?.("(animation-timeline: view()) and (animation-range: entry)"));

    if (supportsViewTimeline) return;

    document.documentElement.classList.add("js-scroll-fallback");

    const hero = document.querySelector<HTMLElement>(".hero");
    const items = Array.from(document.querySelectorAll<HTMLElement>(FALLBACK_ITEM_SELECTOR));
    const visibleItems = new Set<HTMLElement>();
    let heroActive = true;
    let rafId = 0;

    const updateElement = (el: HTMLElement, vh: number) => {
      const rect = el.getBoundingClientRect();
      const entrySpan = Math.max(56, Math.min(rect.height * 0.78, vh * 0.34));
      const entryP = clamp((vh - rect.top) / entrySpan, 0, 1);

      let exitP = 0;
      if (rect.top < 0) {
        const exitSpan = Math.max(72, rect.height * 0.84);
        exitP = clamp(-rect.top / exitSpan, 0, 1);
      }

      const opacity = clamp(Math.min(0.14 + 0.86 * entryP, 1 - 0.8 * exitP), 0.14, 1);
      const translateY = (1 - entryP) * 28 - exitP * 16;
      const scale = clamp(1 - (1 - entryP) * 0.025 - exitP * 0.015, 0.96, 1);

      el.style.opacity = opacity.toFixed(3);
      el.style.transform =
        opacity > 0.995 && Math.abs(translateY) < 0.3
          ? "none"
          : `translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
    };

    const resetStaticStyles = () => {
      items.forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
      });
      if (hero) {
        hero.style.removeProperty("--hero-p");
      }
    };

    const syncFrame = () => {
      rafId = 0;
      const vh = window.innerHeight || 800;

      if (hero && heroActive) {
        const heroRect = hero.getBoundingClientRect();
        const heroProgress = heroRect.top >= 0 ? 0 : clamp(-heroRect.top / Math.max(1, heroRect.height), 0, 1);
        hero.style.setProperty("--hero-p", heroProgress.toFixed(4));
      }

      if (document.documentElement.classList.contains("build-mode")) {
        items.forEach((el) => {
          if (el.style.opacity || el.style.transform) {
            el.style.opacity = "";
            el.style.transform = "";
          }
        });
        return;
      }

      visibleItems.forEach((el) => updateElement(el, vh));
    };

    const scheduleSync = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(syncFrame);
      }
    };

    const itemObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            visibleItems.add(el);
            updateElement(el, window.innerHeight || 800);
          } else {
            visibleItems.delete(el);
            if (!document.documentElement.classList.contains("build-mode")) {
              updateElement(el, window.innerHeight || 800);
            }
          }
        }
      },
      { rootMargin: "90px 0px 90px 0px", threshold: 0 }
    );

    items.forEach((el) => itemObserver.observe(el));

    const heroObserver = new IntersectionObserver(
      (entries) => {
        heroActive = entries[0]?.isIntersecting ?? false;
        scheduleSync();
      },
      { rootMargin: "40px 0px 40px 0px", threshold: 0 }
    );
    if (hero) heroObserver.observe(hero);

    const classObserver = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("build-mode")) {
        scheduleSync();
      } else {
        items.forEach((el) => {
          el.style.opacity = "";
          el.style.transform = "";
        });
      }
    });
    classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    scheduleSync();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("portfolio:agentschange", scheduleSync);

    return () => {
      document.documentElement.classList.remove("js-scroll-fallback");
      if (rafId) cancelAnimationFrame(rafId);
      itemObserver.disconnect();
      heroObserver.disconnect();
      classObserver.disconnect();
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("portfolio:agentschange", scheduleSync);
      resetStaticStyles();
    };
  }, []);

  return (
    <div className="scroll-progress-track" aria-hidden="true">
      <div ref={progressFillRef} className="scroll-progress-fill" />
    </div>
  );
}
