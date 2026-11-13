"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import RobotCursor from "./RobotCursor";
import DockControls from "./DockControls";
import BootLoader from "./BootLoader";
import { AgentCursor, BuildType, WireframeBox } from "@/lib/types";

const ALL_AGENTS_CONFIG = [
  { id: "scout", name: "Scout", color: "#38bdf8", border: "#0284c7", bg: "rgba(56,189,248,0.25)", role: "Structure" },
  { id: "layout", name: "Layout", color: "#a855f7", border: "#7e22ce", bg: "rgba(168,85,247,0.25)", role: "Grid" },
  { id: "typeset", name: "Typeset", color: "#ff3b2f", border: "#dc2626", bg: "rgba(255,59,47,0.25)", role: "Typography" },
  { id: "motion", name: "Motion", color: "#ec4899", border: "#db2777", bg: "rgba(236,72,153,0.25)", role: "Animation" },
  { id: "qa", name: "QA", color: "#10b981", border: "#059669", bg: "rgba(16,185,129,0.25)", role: "Validation" },
  { id: "deploy", name: "Deploy", color: "#f59e0b", border: "#d97706", bg: "rgba(245,158,11,0.25)", role: "Shipping" },
  { id: "copy", name: "Copy", color: "#06b6d4", border: "#0891b2", bg: "rgba(6,182,212,0.25)", role: "Content" },
  { id: "lint", name: "Lint", color: "#84cc16", border: "#65a30d", bg: "rgba(132,204,22,0.25)", role: "Syntax" },
  { id: "index", name: "Index", color: "#6366f1", border: "#4f46e5", bg: "rgba(99,102,241,0.25)", role: "Tokens" },
  { id: "render", name: "Render", color: "#14b8a6", border: "#0d9488", bg: "rgba(20,184,166,0.25)", role: "Draw" },
  { id: "palette", name: "Palette", color: "#f43f5e", border: "#e11d48", bg: "rgba(244,63,94,0.25)", role: "Color" },
  { id: "review", name: "Review", color: "#8b5cf6", border: "#6d28d9", bg: "rgba(139,92,246,0.25)", role: "Audit" },
];

interface ActiveBuildingTask {
  element: HTMLElement;
  agentId: string;
  buildType: BuildType;
  startX: number;
  startY: number;
  targetWidth: number;
  targetHeight: number;
  progress: number;
  phase: "glide" | "drag" | "grab" | "carry" | "reveal" | "revealing" | "verified" | "done";
  phaseTimer: number;
  revealDuration: number;
  wireframe: WireframeBox;
  wordElements?: HTMLElement[];
  wordStaggerMs?: number;
  /** Copy mode: an already-built twin that gets duplicated onto this element */
  source?: HTMLElement;
  ghost?: HTMLElement;
  carryDuration?: number;
  measureTimer?: number;
}

interface MeasureLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  gap: number;
  horizontal: boolean;
}

const DYNAMIC_CLASSES = new Set(["animate-pop-in", "animate-wipe-in", "build-reveal", "revealed"]);
const RAD_TO_DEG = 180 / Math.PI;
/** The arrow SVG naturally points up-left (~ -125deg); add this to a heading to aim it. */
const ARROW_HEADING_OFFSET = 125;

const cleanClasses = (el: Element | null) =>
  el ? Array.from(el.classList).filter((c) => !DYNAMIC_CLASSES.has(c)).sort().join(".") : "";

/** Identity used to find "similar divs" inside a section that can be duplicated. */
function twinKey(el: HTMLElement): { key: string; scope: Element } | null {
  const own = cleanClasses(el);
  const parent = el.parentElement;
  if (!parent) return null;
  const build = el.getAttribute("data-build") || "pop";
  if (own) {
    return {
      key: `${el.tagName}|${own}|${build}`,
      scope: el.closest("section, header, footer, aside, nav") || document.body,
    };
  }
  const parentCls = cleanClasses(parent);
  if (parentCls) {
    return {
      key: `${el.tagName}||${parent.tagName}.${parentCls}|${build}`,
      scope: el.closest("section, header, footer, aside, nav") || document.body,
    };
  }
  // Unclassed siblings (e.g. list items) only match inside the same parent
  return { key: `${el.tagName}|~|${build}`, scope: parent };
}

function isOnScreen(rect: DOMRect) {
  return rect.width > 0 && rect.height > 0 && rect.bottom > -40 && rect.top < window.innerHeight + 40;
}

function sizeSimilar(a: DOMRect, b: DOMRect) {
  const w = a.width / Math.max(1, b.width);
  const h = a.height / Math.max(1, b.height);
  return w > 0.25 && w < 4 && h > 0.45 && h < 2.2;
}

function makeGhost(source: HTMLElement, layer: HTMLElement): HTMLElement {
  const rect = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  clone.classList.remove("animate-pop-in", "animate-wipe-in");
  [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("[data-build]"))].forEach((n) => {
    n.dataset.built = "true";
    n.style.visibility = "visible";
  });
  clone.querySelectorAll(".reveal-word").forEach((w) => w.classList.add("revealed"));

  // Carry the look of the root over (descendants mostly style themselves by class)
  const cs = getComputedStyle(source);
  [
    "color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing",
    "text-transform", "text-align", "white-space", "background-color", "background-image",
    "border-top", "border-right", "border-bottom", "border-left", "border-radius",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "display", "flex-direction", "flex-wrap", "align-items", "justify-content", "gap",
  ].forEach((p) => clone.style.setProperty(p, cs.getPropertyValue(p)));

  Object.assign(clone.style, {
    position: "fixed",
    left: "0px",
    top: "0px",
    margin: "0px",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    boxSizing: "border-box",
    overflow: "hidden",
    pointerEvents: "none",
    opacity: "0.78",
    outline: "1.5px dashed #38bdf8",
    outlineOffset: "3px",
    boxShadow: "0 18px 40px -18px rgba(56,189,248,0.55)",
    transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
    willChange: "transform",
    transition: "none",
    animation: "none",
    translate: "none",
    rotate: "none",
    scale: "none",
  } as Partial<CSSStyleDeclaration>);
  clone.setAttribute("aria-hidden", "true");
  layer.appendChild(clone);
  return clone;
}

function measureGap(a: DOMRect, b: DOMRect, id: string): MeasureLine | null {
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  if (overlapY > 4 && overlapX <= 0) {
    const left = a.right <= b.left ? a : b;
    const right = left === a ? b : a;
    const y = Math.max(a.top, b.top) + overlapY / 2;
    const gap = right.left - left.right;
    if (gap < 1 || gap > 700) return null;
    return { id, x1: left.right, y1: y, x2: right.left, y2: y, gap, horizontal: true };
  }
  const top = a.bottom <= b.top ? a : b;
  const bottom = top === a ? b : a;
  const gap = bottom.top - top.bottom;
  if (gap < 1 || gap > 700) return null;
  const x =
    overlapX > 4
      ? Math.max(a.left, b.left) + Math.min(overlapX / 2, 48)
      : bottom.left + Math.min(bottom.width / 2, 48);
  return { id, x1: x, y1: top.bottom, x2: x, y2: bottom.top, gap, horizontal: false };
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function lerpAngle(from: number, to: number, f: number) {
  const diff = ((((to - from) % 360) + 540) % 360) - 180;
  return from + diff * f;
}

function discardTasks(tasks: ActiveBuildingTask[]) {
  tasks.forEach((t) => {
    t.ghost?.remove();
    t.ghost = undefined;
  });
}

/**
 * Word-by-word text reveal tokenizer using CSS keyframes so initial Agents Mode
 * assembly behaves identically to Tour Mode re-assembly.
 */
function splitIntoWordTokens(element: HTMLElement, staggerMs = 68): HTMLElement[] {
  element.style.setProperty("--word-stagger", `${staggerMs}ms`);

  if (element.dataset.wordsReady === "true") {
    const existing = Array.from(element.querySelectorAll<HTMLElement>(".reveal-word"));
    existing.forEach((w) => w.classList.remove("revealed"));
    void element.offsetWidth;
    existing.forEach((w) => w.classList.add("revealed"));
    return existing;
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.closest(".reveal-word")) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue && node.nodeValue.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  const createdWords: HTMLElement[] = [];
  let wordIdx = 0;

  for (const textNode of textNodes) {
    const rawText = textNode.nodeValue || "";
    const tokens = rawText.split(/(\s+)/);
    const fragment = document.createDocumentFragment();
    const isAttachedAccentPunctuation = Boolean(
      textNode.parentElement?.closest(".accent-period, .name-period")
    );

    for (const token of tokens) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        fragment.appendChild(document.createTextNode(token));
      } else {
        const span = document.createElement("span");
        span.className = "reveal-word revealed";
        const assignedIdx =
          isAttachedAccentPunctuation && wordIdx > 0 ? wordIdx - 1 : wordIdx++;
        span.style.setProperty("--word-idx", String(assignedIdx));
        span.textContent = token;
        fragment.appendChild(span);
        createdWords.push(span);
      }
    }

    textNode.replaceWith(fragment);
  }

  element.dataset.wordsReady = "true";
  return createdWords;
}

function releaseCursor(cursor: AgentCursor) {
  cursor.isBuilding = false;
  cursor.actionState = "SCOUTING";
  cursor.clicking = false;
  cursor.currentElementId = null;
}

export default function CursorOrchestrator({ children }: { children: React.ReactNode }) {
  const [booted, setBooted] = useState(false);
  const [agentsEnabled, setAgentsEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [activeBuildingCount, setActiveBuildingCount] = useState(0);

  const cursorsRef = useRef<AgentCursor[]>([]);
  const [renderCursors, setRenderCursors] = useState<AgentCursor[]>([]);
  const [renderWireframes, setRenderWireframes] = useState<WireframeBox[]>([]);
  const [renderMeasures, setRenderMeasures] = useState<MeasureLine[]>([]);
  const ghostLayerRef = useRef<HTMLDivElement | null>(null);

  // Post-build formation: ring of pointers that trails the user's cursor
  const mouseRef = useRef({ x: 0, y: 0, t: 0, has: false });
  const formationRef = useRef({
    cx: 0,
    cy: 0,
    angle: 0,
    radius: 78,
    placed: false,
    shatterUntil: 0,
    cooldownUntil: 0,
  });

  const activeTasksRef = useRef<ActiveBuildingTask[]>([]);
  const rAFRef = useRef<number | null>(null);
  const lastIsMobileRef = useRef<boolean | null>(null);

  const isPausedRef = useRef(false);
  const agentsEnabledRef = useRef(false);
  const isTouringRef = useRef(false);

  // Continuous Constant-Speed Tour state
  const tourScrollYRef = useRef(0);
  const tourFinishHoldRef = useRef(0);

  isPausedRef.current = isPaused;
  agentsEnabledRef.current = agentsEnabled;
  isTouringRef.current = isTouring;

  useEffect(() => {
    document.documentElement.classList.toggle("build-paused", isPaused);
  }, [isPaused]);

  useEffect(() => {
    document.documentElement.classList.toggle("tour-active", isTouring);
    return () => {
      document.documentElement.classList.remove("tour-active");
    };
  }, [isTouring]);

  // 1. Initial configuration check: URL params, localStorage, reduced-motion
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const agentsParam = params.get("agents");
      const saved = localStorage.getItem("portfolio_agents");
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let enabled = false;
      if (agentsParam === "on") {
        enabled = true;
      } else if (agentsParam === "off") {
        enabled = false;
      } else if (saved !== null) {
        enabled = saved === "true";
      }
      if (prefersReduced && agentsParam !== "on") {
        enabled = false;
      }

      setAgentsEnabled(enabled);
      agentsEnabledRef.current = enabled;

      if (!enabled) {
        document.documentElement.classList.remove("build-mode");
        document.querySelectorAll<HTMLElement>("[data-build]").forEach((el) => {
          el.dataset.built = "true";
          el.style.visibility = "visible";
        });
      } else {
        document.documentElement.classList.add("build-mode");
      }
    } catch {
      // fallback
    }
  }, []);

  // 2. Setup Cursor pool: 6 on phone, 12 on desktop (only rebuild on breakpoint cross)
  const setupCursors = useCallback((force = false) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (!force && lastIsMobileRef.current !== null && lastIsMobileRef.current === isMobile) {
      return;
    }
    lastIsMobileRef.current = isMobile;

    const poolConfig = isMobile ? ALL_AGENTS_CONFIG.slice(0, 6) : ALL_AGENTS_CONFIG;

    const newCursors: AgentCursor[] = poolConfig.map((cfg, index) => {
      let startX = 60;
      let startY = 80;
      if (typeof window !== "undefined") {
        const spread = window.innerWidth / (poolConfig.length + 1);
        startX = spread * (index + 1);
        startY = window.innerHeight * 0.72 + (index % 3) * 30;
      }

      return {
        id: cfg.id,
        name: cfg.name,
        color: cfg.color,
        border: cfg.border,
        bg: cfg.bg,
        role: cfg.role,
        x: startX,
        y: startY,
        targetX: startX,
        targetY: startY,
        isBuilding: false,
        actionState: "SCOUTING",
        clicking: false,
        currentElementId: null,
      };
    });

    discardTasks(activeTasksRef.current);
    activeTasksRef.current = [];
    setRenderWireframes([]);
    setRenderMeasures([]);
    cursorsRef.current = newCursors;
    setRenderCursors([...newCursors]);
  }, []);

  useEffect(() => {
    setupCursors(true);
    const handleResize = () => setupCursors(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCursors]);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsTouring(false);
    isTouringRef.current = false;
  }, []);

  const toggleAgents = useCallback(() => {
    setAgentsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("portfolio_agents", String(next));
      agentsEnabledRef.current = next;

      if (!next) {
        document.documentElement.classList.remove("build-mode", "build-paused");
        document.querySelectorAll<HTMLElement>("[data-build]").forEach((el) => {
          el.dataset.built = "true";
          el.style.visibility = "visible";
          el.querySelectorAll(".reveal-word").forEach((w) => w.classList.add("revealed"));
        });
        discardTasks(activeTasksRef.current);
        activeTasksRef.current = [];
        cursorsRef.current.forEach(releaseCursor);
        setRenderWireframes([]);
        setRenderMeasures([]);
        setIsTouring(false);
        isTouringRef.current = false;
        window.dispatchEvent(new CustomEvent("portfolio:agentschange", { detail: { enabled: false } }));
      } else {
        document.documentElement.classList.add("build-mode");
        window.location.reload();
      }
      return next;
    });
  }, []);

  const startTour = useCallback(() => {
    if (isTouringRef.current) {
      stopTour();
      return;
    }

    if (!agentsEnabledRef.current) {
      agentsEnabledRef.current = true;
      setAgentsEnabled(true);
      setBooted(true);
      document.documentElement.classList.add("build-mode");
      window.dispatchEvent(new CustomEvent("portfolio:agentschange", { detail: { enabled: true } }));
    }

    // Release any mid-flight cursors so none stay frozen
    discardTasks(activeTasksRef.current);
    activeTasksRef.current = [];
    cursorsRef.current.forEach(releaseCursor);
    setRenderWireframes([]);
    setRenderMeasures([]);

    // Reset all targets across page identically to initial build state
    document.querySelectorAll<HTMLElement>("[data-build]").forEach((el) => {
      el.dataset.built = "false";
      el.style.visibility = "hidden";
      el.classList.remove("animate-pop-in", "animate-wipe-in");
      el.querySelectorAll(".reveal-word").forEach((w) => {
        w.classList.remove("revealed");
      });
    });

    window.scrollTo({ top: 0, behavior: "instant" });
    tourScrollYRef.current = 0;
    tourFinishHoldRef.current = 0;

    setIsTouring(true);
    isTouringRef.current = true;
    setIsPaused(false);
  }, [stopTour]);

  // 3. Main building loop & rAF continuous engine
  useEffect(() => {
    if (!booted || !agentsEnabled) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (!isPausedRef.current && agentsEnabledRef.current) {
        // =========================================================================
        // A. TOUR MODE: CONTINUOUS CONSTANT-SPEED CINEMATIC SCROLL
        // =========================================================================
        if (isTouringRef.current) {
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          const scrollSpeed = window.innerWidth < 768 ? 130 : 210;

          if (tourScrollYRef.current < maxScroll) {
            tourScrollYRef.current = Math.min(maxScroll, tourScrollYRef.current + scrollSpeed * dt);
            window.scrollTo({
              top: tourScrollYRef.current,
              behavior: "instant",
            });
          } else {
            tourFinishHoldRef.current += dt;
            if (tourFinishHoldRef.current >= 1.8) {
              setIsTouring(false);
              isTouringRef.current = false;
            }
          }
        }

        // =========================================================================
        // B. VIEWPORT DISCOVERY WITH PARENT-FIRST HIERARCHY
        // =========================================================================
        const allUnbuilt = Array.from(
          document.querySelectorAll<HTMLElement>("[data-build]:not([data-built='true'])")
        );

        const visibleTargets = allUnbuilt.filter((el) => {
          const rect = el.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top < window.innerHeight - 4 &&
            rect.bottom > 4
          );
        });

        const isParentUnbuilt = (el: HTMLElement) => {
          let parent = el.parentElement;
          while (parent) {
            if (parent.hasAttribute("data-build") && parent.getAttribute("data-built") !== "true") {
              return true;
            }
            parent = parent.parentElement;
          }
          return false;
        };

        const currentlyBuildingSet = new Set(activeTasksRef.current.map((t) => t.element));
        const unassignedVisibleTargets = visibleTargets.filter(
          (el) => !currentlyBuildingSet.has(el) && !isParentUnbuilt(el)
        );

        unassignedVisibleTargets.sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          const topDiff = rectA.top - rectB.top;
          if (Math.abs(topDiff) > 20) return topDiff;
          return rectA.left - rectB.left;
        });

        const busyEls = new Set(activeTasksRef.current.map((t) => t.element));

        for (const targetEl of unassignedVisibleTargets) {
          const idleCursors = cursorsRef.current.filter((c) => !c.isBuilding);
          if (idleCursors.length === 0) break;

          const rect = targetEl.getBoundingClientRect();

          // Look for a similar, already-built element in the same section to duplicate
          let source: HTMLElement | undefined;
          const twin = rect.height < window.innerHeight * 0.6 ? twinKey(targetEl) : null;
          if (twin) {
            const twins = Array.from(twin.scope.querySelectorAll<HTMLElement>("[data-build]")).filter(
              (n) => n !== targetEl && twinKey(n)?.key === twin.key
            );
            if (twins.length) {
              let best: HTMLElement | undefined;
              let bestDist = Infinity;
              for (const n of twins) {
                if (n.dataset.built !== "true" || busyEls.has(n)) continue;
                const r = n.getBoundingClientRect();
                if (!isOnScreen(r) || !sizeSimilar(r, rect)) continue;
                const d = Math.hypot(r.left - rect.left, r.top - rect.top);
                if (d < bestDist) {
                  bestDist = d;
                  best = n;
                }
              }
              if (best) {
                source = best;
              } else if (twins.some((n) => busyEls.has(n))) {
                // First twin is still being drawn: wait, then copy it instead of redrawing
                continue;
              }
            }
          }

          const anchorX = source ? source.getBoundingClientRect().left : rect.left;
          const anchorY = source ? source.getBoundingClientRect().top : rect.top;

          // Pick nearest idle cursor to prevent chaotic cross-screen criss-crossing
          let nearestCursor = idleCursors[0];
          let minDistSq = Infinity;
          for (const candidate of idleCursors) {
            const dx = candidate.x - anchorX;
            const dy = candidate.y - anchorY;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq) {
              minDistSq = distSq;
              nearestCursor = candidate;
            }
          }

          const buildType = (targetEl.getAttribute("data-build") as BuildType) || "pop";

          nearestCursor.isBuilding = true;
          nearestCursor.actionState = source ? "COPYING" : "TARGETING";
          nearestCursor.clicking = false;
          nearestCursor.currentElementId = targetEl.id || `target-${Math.random()}`;

          const targetW = Math.max(24, rect.width);
          const targetH = Math.max(18, rect.height);

          const task: ActiveBuildingTask = {
            element: targetEl,
            agentId: nearestCursor.id,
            buildType,
            startX: rect.left,
            startY: rect.top,
            targetWidth: targetW,
            targetHeight: targetH,
            progress: 0,
            phase: source ? "grab" : "glide",
            phaseTimer: 0,
            revealDuration: 0.45,
            source,
            wireframe: {
              id: `wire-${nearestCursor.id}-${Date.now()}`,
              agentId: nearestCursor.id,
              agentName: nearestCursor.name,
              agentColor: nearestCursor.color,
              x: rect.left,
              y: rect.top,
              width: targetW,
              height: targetH,
              currentWidth: 0,
              currentHeight: 0,
              progress: 0,
              label: `${Math.round(targetW)} × ${Math.round(targetH)}`,
              buildType,
            },
          };

          activeTasksRef.current.push(task);
          busyEls.add(targetEl);
        }

        // =========================================================================
        // C. UPDATE ACTIVE TASKS & WIREFRAMES
        // =========================================================================
        const updatedWireframes: WireframeBox[] = [];
        const updatedMeasures: MeasureLine[] = [];
        const finishedIndices: number[] = [];

        activeTasksRef.current.forEach((task, idx) => {
          const cursor = cursorsRef.current.find((c) => c.id === task.agentId);
          if (!cursor) {
            task.ghost?.remove();
            finishedIndices.push(idx);
            return;
          }

          if (!task.element.isConnected) {
            task.ghost?.remove();
            finishedIndices.push(idx);
            releaseCursor(cursor);
            return;
          }

          const currentRect = task.element.getBoundingClientRect();
          const targetLeft = currentRect.left;
          const targetTop = currentRect.top;
          const targetW = Math.max(24, currentRect.width);
          const targetH = Math.max(18, currentRect.height);

          // Off-screen culling: never trap cursors chasing scrolled-away elements
          const isFarOffscreen =
            currentRect.width === 0 ||
            currentRect.height === 0 ||
            currentRect.bottom < -120 ||
            currentRect.top > window.innerHeight + 120;

          if (isFarOffscreen) {
            task.ghost?.remove();
            task.ghost = undefined;
            if (task.phase === "revealing" || task.phase === "verified") {
              task.element.querySelectorAll(".reveal-word").forEach((w) => w.classList.add("revealed"));
            }
            task.phase = "done";
            finishedIndices.push(idx);
            releaseCursor(cursor);
            return;
          }

          task.wireframe.x = targetLeft;
          task.wireframe.y = targetTop;
          task.wireframe.width = targetW;
          task.wireframe.height = targetH;

          if (task.measureTimer && task.measureTimer > 0) {
            task.measureTimer -= dt;
            if (task.source?.isConnected) {
              const line = measureGap(task.source.getBoundingClientRect(), currentRect, task.wireframe.id);
              if (line) updatedMeasures.push(line);
            }
          }

          if (task.phase === "grab") {
            // Copy mode 1/2: reach for the already-built twin
            const src = task.source;
            const srcRect = src?.isConnected ? src.getBoundingClientRect() : null;
            if (!src || !srcRect || !isOnScreen(srcRect)) {
              task.phase = "glide";
              task.phaseTimer = 0;
            } else {
              task.phaseTimer += dt;
              cursor.targetX = srcRect.left + srcRect.width * 0.35;
              cursor.targetY = srcRect.top + srcRect.height * 0.5;
              cursor.actionState = "COPYING";
              const near = Math.hypot(cursor.x - cursor.targetX, cursor.y - cursor.targetY) < 8;
              if ((near && task.phaseTimer >= 0.12) || task.phaseTimer >= 0.45) {
                const layer = ghostLayerRef.current;
                if (layer) task.ghost = makeGhost(src, layer);
                const dist = Math.hypot(srcRect.left - targetLeft, srcRect.top - targetTop);
                task.carryDuration = Math.min(0.75, Math.max(0.38, dist / 1300));
                task.phase = "carry";
                task.phaseTimer = 0;
                cursor.clicking = true;
              }
            }
          } else if (task.phase === "carry") {
            // Copy mode 2/2: drag the duplicate over to the empty slot
            const src = task.source;
            const srcRect = src?.isConnected ? src.getBoundingClientRect() : currentRect;
            task.phaseTimer += dt;
            const t = Math.min(1, task.phaseTimer / (task.carryDuration || 0.5));
            const e = easeInOutCubic(t);
            const x = srcRect.left + (targetLeft - srcRect.left) * e;
            const y = srcRect.top + (targetTop - srcRect.top) * e;
            const w = srcRect.width + (currentRect.width - srcRect.width) * e;
            const h = srcRect.height + (currentRect.height - srcRect.height) * e;
            if (task.ghost) {
              task.ghost.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${Math.sin(t * Math.PI) * -1.2}deg)`;
              task.ghost.style.width = `${w}px`;
              task.ghost.style.height = `${h}px`;
            }
            cursor.targetX = x + w * 0.35;
            cursor.targetY = y + h * 0.5;
            if (t >= 1) {
              task.ghost?.remove();
              task.ghost = undefined;
              cursor.clicking = false;
              task.measureTimer = 0.75;
              task.phase = "reveal";
              task.phaseTimer = 0;
            }
          } else if (task.phase === "glide") {
            task.phaseTimer += dt;
            cursor.targetX = targetLeft;
            cursor.targetY = targetTop;
            cursor.actionState = "TARGETING";

            if (task.phaseTimer >= 0.18) {
              task.phase = "drag";
              task.phaseTimer = 0;
              cursor.clicking = true;
              cursor.actionState = "DRAGGING BOX";
            }
          } else if (task.phase === "drag") {
            task.phaseTimer += dt;
            const dragDuration = 0.35;
            task.progress = Math.min(1, task.phaseTimer / dragDuration);

            const easeProgress = Math.pow(task.progress, 0.95);
            task.wireframe.currentWidth = targetW * easeProgress;
            task.wireframe.currentHeight = targetH * easeProgress;
            task.wireframe.progress = task.progress;

            task.wireframe.label = `${Math.round(task.wireframe.currentWidth)} × ${Math.round(
              task.wireframe.currentHeight
            )}`;

            updatedWireframes.push(task.wireframe);

            cursor.targetX = targetLeft + task.wireframe.currentWidth;
            cursor.targetY = targetTop + task.wireframe.currentHeight;

            if (task.progress >= 1) {
              cursor.clicking = false;
              task.phase = "reveal";
              task.phaseTimer = 0;
            }
          } else if (task.phase === "reveal") {
            const el = task.element;
            el.dataset.built = "true";
            el.style.visibility = "visible";

            if (task.buildType === "type") {
              cursor.actionState = "TYPESETTING";
              const rawWordCount = (el.textContent?.trim() || "").split(/\s+/).filter(Boolean).length;
              const stagger = rawWordCount < 10 ? 68 : rawWordCount < 20 ? 52 : 42;
              const wordElements = splitIntoWordTokens(el, stagger);
              task.wordElements = wordElements;
              task.wordStaggerMs = stagger;

              const activeSpanSec = (Math.max(0, wordElements.length - 1) * stagger) / 1000;
              task.revealDuration = Math.max(0.32, activeSpanSec + 0.30);
            } else if (task.buildType === "wipe") {
              cursor.actionState = "REVEALING";
              el.classList.remove("animate-wipe-in");
              void el.offsetWidth;
              el.classList.add("animate-wipe-in");
              task.revealDuration = 0.45;
            } else {
              cursor.actionState = "INJECTING DOM";
              el.classList.remove("animate-pop-in");
              void el.offsetWidth;
              el.classList.add("animate-pop-in");
              task.revealDuration = 0.36;
            }

            task.phase = "revealing";
            task.phaseTimer = 0;
          } else if (task.phase === "revealing") {
            task.phaseTimer += dt;
            const revealProgress = Math.min(1, task.phaseTimer / (task.revealDuration || 0.45));

            if (task.buildType === "type" && task.wordElements && task.wordElements.length > 0) {
              // Follow actual word bounding rects across lines instead of dragging across empty block space
              const staggerMs = task.wordStaggerMs || 60;
              const words = task.wordElements;
              const activeWordIdx = Math.min(
                words.length - 1,
                Math.floor((task.phaseTimer * 1000) / staggerMs)
              );
              const activeWord = words[activeWordIdx];
              const wordRect = activeWord.getBoundingClientRect();

              if (wordRect.width > 0 && wordRect.height > 0) {
                const wordStartSec = (activeWordIdx * staggerMs) / 1000;
                const wordLocalProgress = Math.min(
                  1,
                  Math.max(0, (task.phaseTimer - wordStartSec) / (staggerMs / 1000))
                );
                cursor.targetX = wordRect.left + wordRect.width * (0.25 + 0.75 * wordLocalProgress) + 3;
                cursor.targetY = wordRect.top + wordRect.height * 0.52;
              } else {
                cursor.targetX = targetLeft + Math.min(targetW * 0.5, 40);
                cursor.targetY = targetTop + targetH * 0.5;
              }
            } else if (task.buildType === "wipe") {
              cursor.targetX = targetLeft + targetW * (0.2 + 0.6 * revealProgress);
              cursor.targetY = targetTop + targetH * 0.5;
            } else {
              // Non-text containers ("pop"): settle smoothly near center
              cursor.targetX = targetLeft + targetW * 0.5;
              cursor.targetY = targetTop + targetH * 0.5;
            }

            if (task.phaseTimer >= task.revealDuration) {
              task.phase = "verified";
              task.phaseTimer = 0;
              cursor.actionState = "VERIFIED";
            }
          } else if (task.phase === "verified") {
            task.phaseTimer += dt;
            if (task.phaseTimer >= 0.22) {
              task.phase = "done";
            }
          }

          if (task.phase === "done") {
            finishedIndices.push(idx);
            releaseCursor(cursor);
          }
        });

        for (let i = finishedIndices.length - 1; i >= 0; i--) {
          activeTasksRef.current.splice(finishedIndices[i], 1);
        }

        setRenderWireframes(updatedWireframes);
        setActiveBuildingCount(activeTasksRef.current.length);

        // =========================================================================
        // D. CURSOR PHYSICS
        //    Builders lerp to their task targets. Everyone else gathers into a
        //    rotating ring that trails the user's pointer, shatters when the
        //    pointer sweeps through it, then springs back into formation.
        // =========================================================================
        const f = formationRef.current;
        const isMobileView = window.innerWidth < 768;
        f.radius = isMobileView ? 56 : 80;
        const mouse = mouseRef.current;
        const anchorX = mouse.has ? mouse.x : window.innerWidth * 0.5;
        const anchorY = mouse.has ? mouse.y : window.innerHeight * 0.62;
        if (!f.placed) {
          f.cx = anchorX;
          f.cy = anchorY;
          f.placed = true;
        }
        const follow = 1 - Math.exp(-dt * 4.2);
        f.cx += (anchorX - f.cx) * follow;
        f.cy += (anchorY - f.cy) * follow;
        f.angle += dt * 0.45;

        const shattered = currentTime < f.shatterUntil;
        const total = cursorsRef.current.length;
        const breathe = f.radius * (1 + 0.06 * Math.sin(currentTime * 0.0016));

        cursorsRef.current.forEach((c, idx) => {
          if (c.isBuilding) {
            const baseFactor =
              c.actionState === "TYPESETTING" ? 0.36 : c.clicking ? 0.40 : 0.30;
            const lerp = 1 - Math.pow(1 - baseFactor, Math.max(0.25, dt * 60));
            c.x += (c.targetX - c.x) * lerp;
            c.y += (c.targetY - c.y) * lerp;
            c.vx = 0;
            c.vy = 0;
            c.rotation = lerpAngle(c.rotation ?? 0, 0, 1 - Math.exp(-dt * 14));
            return;
          }

          c.actionState = "FORMATION";
          const slot = f.angle + (idx / total) * Math.PI * 2;
          const slotX = f.cx + Math.cos(slot) * breathe;
          const slotY = f.cy + Math.sin(slot) * breathe;
          c.targetX = slotX;
          c.targetY = slotY;
          let vx = c.vx ?? 0;
          let vy = c.vy ?? 0;

          if (shattered) {
            // Free flight with drag after the burst
            const drag = Math.exp(-dt * 2.6);
            vx *= drag;
            vy *= drag;
            c.spin = (c.spin ?? 0) * Math.exp(-dt * 1.8);
            c.rotation = (c.rotation ?? 0) + (c.spin ?? 0) * dt;
          } else {
            // Slightly under-damped spring for a springy re-assembly
            const k = 70;
            const damping = 11;
            vx += (k * (slotX - c.x) - damping * vx) * dt;
            vy += (k * (slotY - c.y) - damping * vy) * dt;
            const heading = (slot + Math.PI / 2) * RAD_TO_DEG + ARROW_HEADING_OFFSET;
            c.rotation = lerpAngle(c.rotation ?? 0, heading, 1 - Math.exp(-dt * 7));
          }
          c.x += vx * dt;
          c.y += vy * dt;
          c.vx = vx;
          c.vy = vy;
        });

        setRenderMeasures(updatedMeasures);
        setRenderCursors([...cursorsRef.current]);
      }

      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);

    // Shatter detection: pointer sweeping through the ring breaks it apart
    const shatter = (hitX: number, hitY: number, pvx: number, pvy: number) => {
      const f = formationRef.current;
      const now = performance.now();
      f.shatterUntil = now + 850;
      f.cooldownUntil = now + 1500;
      cursorsRef.current.forEach((c) => {
        if (c.isBuilding) return;
        const dx = c.x - hitX;
        const dy = c.y - hitY;
        const len = Math.hypot(dx, dy) || 1;
        const burst = 520 + Math.random() * 520;
        const jitter = (Math.random() - 0.5) * 0.9;
        const ax = dx / len;
        const ay = dy / len;
        const cos = Math.cos(jitter);
        const sin = Math.sin(jitter);
        c.vx = (ax * cos - ay * sin) * burst + pvx * 260;
        c.vy = (ax * sin + ay * cos) * burst + pvy * 260;
        c.spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720);
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      const m = mouseRef.current;
      const now = performance.now();
      const x = e.clientX;
      const y = e.clientY;
      if (!m.has) {
        m.x = x;
        m.y = y;
        m.t = now;
        m.has = true;
        return;
      }
      const elapsed = Math.max(8, now - m.t);
      const px = m.x;
      const py = m.y;
      const vx = (x - px) / elapsed;
      const vy = (y - py) / elapsed;
      const speed = Math.hypot(vx, vy); // px per ms
      m.x = x;
      m.y = y;
      m.t = now;

      const f = formationRef.current;
      if (now < f.cooldownUntil || speed < 0.28) return;
      const inFormation = cursorsRef.current.filter((c) => !c.isBuilding).length;
      if (inFormation < Math.max(3, Math.ceil(cursorsRef.current.length / 2))) return;

      // Distance from ring center to the movement segment
      const sx = x - px;
      const sy = y - py;
      const segLenSq = sx * sx + sy * sy || 1;
      const t = Math.max(0, Math.min(1, ((f.cx - px) * sx + (f.cy - py) * sy) / segLenSq));
      const nearX = px + sx * t;
      const nearY = py + sy * t;
      const dist = Math.hypot(f.cx - nearX, f.cy - nearY);
      const startedOutside = Math.hypot(px - f.cx, py - f.cy) > f.radius * 0.7;
      if (dist < f.radius * 0.7 && (startedOutside || speed > 0.9)) {
        shatter(nearX, nearY, vx, vy);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      // Taps reposition the anchor without counting as a sweep
      const m = mouseRef.current;
      m.x = e.clientX;
      m.y = e.clientY;
      m.t = performance.now();
      m.has = true;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [booted, agentsEnabled]);

  // 4. Handle Keyboard & Manual Scroll Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const key = e.key.toLowerCase();
      if (key === "p") {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if (key === "a") {
        e.preventDefault();
        toggleAgents();
      } else if (key === "t") {
        e.preventDefault();
        startTour();
      } else if (e.key === "Escape" && isTouringRef.current) {
        e.preventDefault();
        stopTour();
      }
    };

    const handleUserScroll = () => {
      if (isTouringRef.current) {
        stopTour();
      }
    };

    const handleProgrammaticNav = () => {
      if (isTouringRef.current) {
        stopTour();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleUserScroll, { passive: true });
    window.addEventListener("touchmove", handleUserScroll, { passive: true });
    window.addEventListener("portfolio:navigate", handleProgrammaticNav);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleUserScroll);
      window.removeEventListener("touchmove", handleUserScroll);
      window.removeEventListener("portfolio:navigate", handleProgrammaticNav);
    };
  }, [toggleAgents, startTour, stopTour]);

  return (
    <>
      <BootLoader
        enabled={agentsEnabled}
        onBootComplete={handleBootComplete}
      />

      {children}

      {booted && agentsEnabled && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none">
          <div ref={ghostLayerRef} className="pointer-events-none fixed inset-0" aria-hidden="true" />

          {renderMeasures.map((m) => (
            <div
              key={`measure-${m.id}`}
              className="fixed pointer-events-none"
              style={
                m.horizontal
                  ? { left: `${m.x1}px`, top: `${m.y1}px`, width: `${m.x2 - m.x1}px`, height: "1px", background: "#ff3b2f" }
                  : { left: `${m.x1}px`, top: `${m.y1}px`, width: "1px", height: `${m.y2 - m.y1}px`, background: "#ff3b2f" }
              }
            >
              <span
                className="absolute bg-[#ff3b2f]"
                style={m.horizontal ? { left: 0, top: -4, width: 1, height: 9 } : { top: 0, left: -4, width: 9, height: 1 }}
              />
              <span
                className="absolute bg-[#ff3b2f]"
                style={m.horizontal ? { right: 0, top: -4, width: 1, height: 9 } : { bottom: 0, left: -4, width: 9, height: 1 }}
              />
              <span
                className="absolute px-1 py-[1px] rounded-[2px] bg-[#ff3b2f] text-[9px] font-mono leading-none text-white whitespace-nowrap"
                style={
                  m.horizontal
                    ? { left: "50%", top: -15, transform: "translateX(-50%)" }
                    : { top: "50%", left: 6, transform: "translateY(-50%)" }
                }
              >
                {Math.round(m.gap)}
              </span>
            </div>
          ))}

          {renderWireframes.map((wire) => (
            <div
              key={wire.id}
              className="fixed pointer-events-none transition-none rounded-[2px]"
              style={{
                left: `${wire.x}px`,
                top: `${wire.y}px`,
                width: `${wire.currentWidth}px`,
                height: `${wire.currentHeight}px`,
                border: "1.5px dashed #38bdf8",
                backgroundColor: "rgba(56, 189, 248, 0.08)",
                boxShadow: "0 0 20px rgba(56, 189, 248, 0.22)",
              }}
            >
              <span className="absolute -top-1 -left-1 w-2 h-2 bg-[#38bdf8] border border-black shadow" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#38bdf8] border border-black shadow" />
              <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#38bdf8] border border-black shadow" />
              <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#38bdf8] border border-black shadow" />

              <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-[#38bdf8] text-[9px] font-mono text-[#09090b] rounded-sm whitespace-nowrap shadow-md leading-none">
                {wire.label}
              </div>
            </div>
          ))}

          {renderCursors.map((agent) => (
            <RobotCursor key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      <DockControls
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        agentsEnabled={agentsEnabled}
        onToggleAgents={toggleAgents}
        isTouring={isTouring}
        onToggleTour={startTour}
        activeBuildingCount={activeBuildingCount}
      />
    </>
  );
}
