"use client";
import React, { useState, useEffect, useRef, useCallback, type CSSProperties, type MouseEvent } from "react";
import { Download, ArrowUpRight } from "lucide-react";
const NAV_LINKS = [
  { name: "Work", href: "#work", index: "01" },
  { name: "Stack", href: "#stack", index: "02" },
  { name: "Record", href: "#record", index: "03" },
  { name: "About", href: "#about", index: "04" },
  { name: "Contact", href: "#contact", index: "05" },
];
function waitForScrollSettle(targetY: number, maxWaitMs = 1100): Promise<void> {
  if (Math.abs(window.scrollY - targetY) <= 4) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (idleTimer) clearTimeout(idleTimer);
      if (safetyTimer) clearTimeout(safetyTimer);
      window.removeEventListener("scrollend", finish);
      window.removeEventListener("scroll", onScroll);
      resolve();
    };
    const onScroll = () => {
      if (Math.abs(window.scrollY - targetY) <= 4) {
        finish();
        return;
      }
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(finish, 110);
    };
    window.addEventListener("scrollend", finish, { once: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    idleTimer = setTimeout(finish, 120);
    safetyTimer = setTimeout(finish, maxWaitMs);
  });
}
async function scrollToYAsync(targetY: number, reducedMotion: boolean): Promise<void> {
  if (Math.abs(window.scrollY - targetY) <= 2) {
    return;
  }
  const maybePromise = window.scrollTo({
    top: targetY,
    behavior: reducedMotion ? "auto" : "smooth",
  }) as unknown;
  if (maybePromise instanceof Promise) {
    await maybePromise;
    // Guard against Chrome's early Promise resolution on root scroller mid-flight
    if (!reducedMotion && Math.abs(window.scrollY - targetY) > 12) {
      await waitForScrollSettle(targetY);
    }
    return;
  }
  if (!reducedMotion) {
    await waitForScrollSettle(targetY);
  }
}
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string>("#top");
  const [clickedMobileHref, setClickedMobileHref] = useState<string | null>(null);
  const [isTransiting, setIsTransiting] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const scrollTokenRef = useRef(0);
  const arrivalTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeNavRef = useRef(false);
  useEffect(() => {
    document.documentElement.classList.toggle("nav-transiting", isTransiting);
    return () => {
      document.documentElement.classList.remove("nav-transiting");
    };
  }, [isTransiting]);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
      if (window.scrollY < 160 && !activeNavRef.current) {
        setActiveHref("#top");
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  // Scrollspy tracking: native scroll-target-group when supported + IntersectionObserver fallback
  useEffect(() => {
    const sectionIds = ["work", "stack", "record", "about", "contact"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;
    const syncFromTargetCurrent = () => {
      const currentLink = document.querySelector<HTMLAnchorElement>(
        "nav.glass-nav-desktop a:target-current"
      );
      if (currentLink) {
        const href = currentLink.getAttribute("href");
        if (href) setActiveHref(href);
      }
    };
    const supportsScrollTargetGroup =
      typeof CSS !== "undefined" &&
      Boolean(CSS.supports?.("scroll-target-group", "auto")) &&
      Boolean(CSS.supports?.("selector(:target-current)"));
    if (supportsScrollTargetGroup) {
      syncFromTargetCurrent();
      document.addEventListener("scrollend", syncFromTargetCurrent, { passive: true });
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (activeNavRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHref(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: "-35% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((sec) => observer.observe(sec));
    return () => {
      observer.disconnect();
      if (supportsScrollTargetGroup) {
        document.removeEventListener("scrollend", syncFromTargetCurrent);
      }
    };
  }, []);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const mq = window.matchMedia("(min-width: 768px)");
    const handleBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    mq.addEventListener("change", handleBreakpoint);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      mq.removeEventListener("change", handleBreakpoint);
    };
  }, [mobileMenuOpen]);
  const handleNavClick = useCallback(
    async (
      event: MouseEvent<HTMLAnchorElement>,
      href: string,
      fromMobile = false
    ) => {
      if (!href.startsWith("#")) return;
      event.preventDefault();
      const scrollToken = ++scrollTokenRef.current;
      activeNavRef.current = true;
      setActiveHref(href);
      if (fromMobile) {
        setClickedMobileHref(href);
        setTimeout(() => {
          if (scrollTokenRef.current === scrollToken) {
            setClickedMobileHref(null);
            setMobileMenuOpen(false);
          }
        }, 120);
      } else {
        setMobileMenuOpen(false);
      }
      window.dispatchEvent(new CustomEvent("portfolio:navigate", { detail: { href } }));
      const targetId = href.slice(1);
      const targetEl = document.getElementById(targetId);
      if (!targetEl) {
        activeNavRef.current = false;
        return;
      }
      // Clear previous section arrival highlights
      document.querySelectorAll(".section-nav-arrived").forEach((el) => {
        el.classList.remove("section-nav-arrived");
      });
      if (arrivalTimerRef.current) {
        clearTimeout(arrivalTimerRef.current);
      }
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const topBarBottom = topBarRef.current
        ? topBarRef.current.getBoundingClientRect().bottom + 12
        : 66;
      const targetY =
        href === "#top"
          ? 0
          : Math.max(
              0,
              Math.min(
                document.documentElement.scrollHeight - window.innerHeight,
                targetEl.getBoundingClientRect().top + window.scrollY - (topBarBottom + 12)
              )
            );

      if (!reducedMotion && Math.abs(window.scrollY - targetY) > 12) {
        setIsTransiting(true);
      }
      await scrollToYAsync(targetY, reducedMotion);
      if (scrollTokenRef.current !== scrollToken) return;
      setIsTransiting(false);
      activeNavRef.current = false;
      if (window.location.hash !== href) {
        window.history.replaceState(null, "", href);
      }
      if (!reducedMotion) {
        void targetEl.offsetWidth;
        targetEl.classList.add("section-nav-arrived");
        arrivalTimerRef.current = setTimeout(() => {
          targetEl.classList.remove("section-nav-arrived");
        }, 980);
      }
      // Move assistive focus without causing a second scroll
      const heading = targetEl.querySelector<HTMLElement>("h1, h2") ?? targetEl;
      if (!heading.hasAttribute("tabindex")) {
        heading.setAttribute("tabindex", "-1");
      }
      heading.focus({ preventScroll: true });
    },
    []
  );
  return (
    <>
      {/* Subtle scrim behind mobile menu drawer for focus & outside-tap dismissal */}
      <div
        aria-hidden="true"
        data-open={mobileMenuOpen}
        onClick={() => setMobileMenuOpen(false)}
        className="mobile-nav-backdrop md:hidden"
      />
      <header
        ref={headerRef}
        className={`glass-navbar ${scrolled ? "is-scrolled" : ""} ${
          mobileMenuOpen ? "is-open" : ""
        } ${isTransiting ? "is-transiting" : ""}`}
      >
        <div ref={topBarRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          {/* Brand / Logo */}
          <a
            href="#top"
            onClick={(e) => handleNavClick(e, "#top")}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff3b2f] rounded active:scale-[0.98] transition-transform"
          >
            <div className="w-8 h-8 rounded-md bg-white/[0.06] border border-white/[0.14] flex items-center justify-center group-hover:border-[#ff3b2f] group-hover:bg-[#ff3b2f]/10 transition-colors">
              <span className="font-anton text-sm text-[#ff3b2f]">K</span>
            </div>
            <div className="flex flex-col">
              <span className="font-anton text-base tracking-wider uppercase text-white group-hover:text-zinc-200 transition-colors">
                Komail Ahmad Khalil
              </span>
              <span className="font-mono text-[10px] text-zinc-400 tracking-wide uppercase">
                SE &amp; AI SPECIALIST
              </span>
            </div>
          </a>
          {/* Desktop Nav Links */}
          <nav
            aria-label="Main Navigation"
            className="glass-nav-desktop hidden md:flex items-center gap-6 font-mono text-xs"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                data-active={activeHref === link.href}
                aria-current={activeHref === link.href ? "location" : undefined}
                onClick={(e) => handleNavClick(e, link.href)}
                className="glass-nav-link text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff3b2f]"
              >
                <span className="text-[#ff3b2f] select-none font-bold mr-1">//</span>
                {link.name}
              </a>
            ))}
          </nav>
          {/* Right Action: Resume Download & Mobile Hamburger */}
          <div className="flex items-center gap-2.5">
            <a
              href="/resume.pdf"
              download="Komail_Ahmad_Khalil_Resume.pdf"
              className="glass-nav-pill hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-zinc-100 hover:text-white font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff3b2f]"
            >
              <Download className="w-3.5 h-3.5 text-[#ff3b2f]" />
              <span>Resume</span>
            </a>
            {/* Animated Morphing Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="hamburger-btn md:hidden text-zinc-200 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff3b2f]"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              <span className="hamburger-box" aria-hidden="true">
                <span className="hamburger-line" />
                <span className="hamburger-line" />
                <span className="hamburger-line" />
              </span>
            </button>
          </div>
        </div>
        {/* Smooth Always-Mounted Frosted Mobile Drawer */}
        <div
          id="mobile-nav-drawer"
          data-open={mobileMenuOpen}
          aria-hidden={!mobileMenuOpen}
          inert={!mobileMenuOpen}
          className="mobile-nav-shell md:hidden"
        >
          <div className="mobile-nav-inner">
            <nav aria-label="Mobile Navigation" className="mobile-nav-surface px-5 pt-3 pb-6 font-mono text-sm">
              <div className="divide-y divide-white/[0.06]">
                {NAV_LINKS.map((link, idx) => (
                  <a
                    key={link.name}
                    href={link.href}
                    data-active={activeHref === link.href}
                    aria-current={activeHref === link.href ? "location" : undefined}
                    style={{ "--nav-idx": idx } as CSSProperties}
                    onClick={(e) => handleNavClick(e, link.href, true)}
                    className={`mobile-nav-item flex items-center justify-between py-3.5 px-2.5 -mx-2 rounded-lg text-zinc-200 hover:text-white hover:bg-white/[0.05] active:scale-[0.985] ${
                      clickedMobileHref === link.href ? "is-clicked bg-white/[0.09] text-white" : ""
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="mobile-nav-idx text-[11px] text-zinc-500">{link.index}</span>
                      <span className="tracking-wide">{link.name}</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-zinc-500" aria-hidden="true" />
                  </a>
                ))}
              </div>
              <div
                style={{ "--nav-idx": NAV_LINKS.length } as CSSProperties}
                className="mobile-nav-item pt-4"
              >
                <a
                  href="/resume.pdf"
                  download="Komail_Ahmad_Khalil_Resume.pdf"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex w-full justify-center items-center gap-2 px-4 py-3 rounded-lg bg-[#ff3b2f] hover:bg-[#ff5045] active:scale-[0.99] text-white font-medium text-xs uppercase tracking-wider shadow-[0_8px_24px_-6px_rgba(255,59,47,0.55)] transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Resume</span>
                </a>
              </div>
            </nav>
          </div>
        </div>
        {/* Photonic glass edge transit beam during smooth navigation */}
        <span className="nav-transit-beam" aria-hidden="true" />
      </header>
    </>
  );
}
