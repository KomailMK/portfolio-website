"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import RobotCursor from "./RobotCursor";
import DockControls from "./DockControls";
import BootLoader from "./BootLoader";
import { AgentCursor, BuildType, CursorShape } from "@/lib/types";

// Swarm Rebuild inspired multi-agent color palette (no text labels rendered on cursors)
const ALL_AGENTS_CONFIG = [
  { id: "a0", color: "#F24E1E", bg: "rgba(242,78,30,0.28)" },
  { id: "a1", color: "#A259FF", bg: "rgba(162,89,255,0.28)" },
  { id: "a2", color: "#1ABCFE", bg: "rgba(26,188,254,0.28)" },
  { id: "a3", color: "#0ACF83", bg: "rgba(10,207,131,0.28)" },
  { id: "a4", color: "#FF7262", bg: "rgba(255,114,98,0.28)" },
  { id: "a5", color: "#FFC700", bg: "rgba(255,199,0,0.28)" },
  { id: "a6", color: "#9747FF", bg: "rgba(151,71,255,0.28)" },
  { id: "a7", color: "#E8467C", bg: "rgba(232,70,124,0.28)" },
  { id: "a8", color: "#14AE5C", bg: "rgba(20,174,92,0.28)" },
  { id: "a9", color: "#0D99FF", bg: "rgba(13,153,255,0.28)" },
  { id: "a10", color: "#FF8A00", bg: "rgba(255,138,0,0.28)" },
  { id: "a11", color: "#00B5CE", bg: "rgba(0,181,206,0.28)" },
  { id: "a12", color: "#38BDF8", bg: "rgba(56,189,248,0.28)" },
  { id: "a13", color: "#EC4899", bg: "rgba(236,72,153,0.28)" },
  { id: "a14", color: "#84CC16", bg: "rgba(132,204,22,0.28)" },
  { id: "a15", color: "#6366F1", bg: "rgba(99,102,241,0.28)" },
];

const BLUE = "#0D99FF";
const RED = "#F24822";
const DYNAMIC_CLASSES = new Set(["animate-pop-in", "animate-wipe-in", "build-reveal", "revealed"]);
const RAD_TO_DEG = 180 / Math.PI;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const f1 = (n: number) => Math.round(n * 10) / 10;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const HOTSPOTS: Record<CursorShape, [number, number]> = {
  arrow: [5, 3.5],
  dup: [5, 3.5],
  cross: [12, 12],
  ibeam: [12, 12],
};

interface CachedTarget {
  el: HTMLElement;
  buildType: BuildType;
  twinKey: string | null;
  twinScope: Element;
  parentTargets: HTMLElement[];
  isLongProse: boolean;
}

interface BoxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ActiveBuildingTask {
  entry: CachedTarget;
  element: HTMLElement;
  agentId: string;
  buildType: BuildType;
  phase: "glide" | "drag" | "grab" | "selectWait" | "carry" | "reveal" | "revealing" | "verified" | "done";
  phaseTimer: number;
  revealDuration: number;
  // Curved moveTo motion state (eliminates cursor-to-element lag)
  moveX0: number;
  moveY0: number;
  moveX1: number;
  moveY1: number;
  moveT: number;
  moveDur: number;
  moveBend: number;
  // Box drag geometry
  boxLeft: number;
  boxTop: number;
  boxW: number;
  boxH: number;
  drawW: number;
  drawH: number;
  // Type reveal state
  wordElements?: HTMLElement[];
  wordStaggerMs?: number;
  // Twin copy-drag state
  source?: HTMLElement;
  ghost?: HTMLElement;
  grabOffX: number;
  grabOffY: number;
  srcRectSnap?: BoxRect;
  measureTimer: number;
}

interface MeasureLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  gap: number;
  horizontal: boolean;
}

interface CursorDomEntry {
  wrap: HTMLDivElement;
  rot: SVGSVGElement;
  shape: CursorShape;
  clicking: boolean;
}

const cleanClasses = (el: Element | null) =>
  el ? Array.from(el.classList).filter((c) => !DYNAMIC_CLASSES.has(c)).sort().join(".") : "";

function computeTwinMeta(el: HTMLElement): { key: string | null; scope: Element; isLongProse: boolean } {
  const own = cleanClasses(el);
  const parent = el.parentElement;
  const scope = el.closest("section, header, footer, aside, nav") || parent || document.body;
  const textLen = (el.textContent || "").trim().length;
  const isLongProse = (el.tagName === "P" || el.tagName === "LI") && textLen > 95 && el.children.length <= 2;

  if (!parent) return { key: null, scope, isLongProse };
  const build = el.getAttribute("data-build") || "pop";

  if (own) {
    return { key: `${el.tagName}|${own}|${build}`, scope, isLongProse };
  }
  const parentCls = cleanClasses(parent);
  if (parentCls) {
    return { key: `${el.tagName}||${parent.tagName}.${parentCls}|${build}`, scope, isLongProse };
  }
  return { key: `${el.tagName}|~|${build}`, scope: parent, isLongProse };
}

function buildTargetRegistry(): CachedTarget[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-build]"));
  return nodes.map((el) => {
    const { key, scope, isLongProse } = computeTwinMeta(el);
    const parentTargets: HTMLElement[] = [];
    let p = el.parentElement;
    while (p) {
      if (p.hasAttribute("data-build")) parentTargets.push(p);
      p = p.parentElement;
    }
    return {
      el,
      buildType: (el.getAttribute("data-build") as BuildType) || "pop",
      twinKey: key,
      twinScope: scope,
      parentTargets,
      isLongProse,
    };
  });
}

function finalizeElement(el: HTMLElement) {
  el.dataset.built = "true";
  el.style.visibility = "visible";
  el.querySelectorAll(".reveal-word").forEach((w) => w.classList.add("revealed"));
}

function splitIntoWordTokens(element: HTMLElement, staggerMs = 46): HTMLElement[] {
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
      if (node.parentElement?.closest(".reveal-word")) return NodeFilter.FILTER_REJECT;
      return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  const createdWords: HTMLElement[] = [];
  let wordIdx = 0;

  for (const textNode of textNodes) {
    const rawText = textNode.nodeValue || "";
    const tokens = rawText.split(/(\s+)/);
    const fragment = document.createDocumentFragment();
    const isPunctuation = Boolean(textNode.parentElement?.closest(".accent-period, .name-period"));

    for (const token of tokens) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        fragment.appendChild(document.createTextNode(token));
      } else {
        const span = document.createElement("span");
        span.className = "reveal-word revealed";
        const idx = isPunctuation && wordIdx > 0 ? wordIdx - 1 : wordIdx++;
        span.style.setProperty("--word-idx", String(idx));
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

function copyComputedAppearance(srcEl: Element, dstEl: HTMLElement, root: boolean) {
  const cs = getComputedStyle(srcEl);
  const props = root
    ? [
        "color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing",
        "text-transform", "text-align", "white-space", "background-color", "background-image",
        "border-top", "border-right", "border-bottom", "border-left", "border-radius",
        "padding-top", "padding-right", "padding-bottom", "padding-left",
        "display", "grid-template-columns", "flex-direction", "flex-wrap", "align-items",
        "justify-content", "gap",
      ]
    : ["color", "font-family", "font-size", "font-weight", "line-height", "background-color", "border", "border-radius", "padding"];
  for (const p of props) {
    const val = cs.getPropertyValue(p);
    if (val) dstEl.style.setProperty(p, val);
  }
}

function makeGhost(source: HTMLElement, layer: HTMLElement): HTMLElement {
  const rect = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  clone.classList.remove("animate-pop-in", "animate-wipe-in");

  // Preserve visual appearance cleanly across root & shallow child containers
  copyComputedAppearance(source, clone, true);
  const srcChildren = source.children;
  const dstChildren = clone.children;
  const limit = Math.min(srcChildren.length, 16);
  for (let i = 0; i < limit; i++) {
    copyComputedAppearance(srcChildren[i], dstChildren[i] as HTMLElement, false);
  }

  [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("[data-build]"))].forEach((n) => {
    n.dataset.built = "true";
    n.style.visibility = "visible";
  });
  clone.querySelectorAll<HTMLElement>(".reveal-word").forEach((w) => {
    w.classList.add("revealed");
    w.style.opacity = "1";
    w.style.animation = "none";
    w.style.transform = "none";
    w.style.filter = "none";
  });

  const cs = getComputedStyle(source);
  const hasVisibleBg = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";

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
    opacity: "0.84",
    backgroundColor: hasVisibleBg ? cs.backgroundColor : "rgba(13, 153, 255, 0.08)",
    boxShadow: "0 18px 42px -16px rgba(13, 153, 255, 0.45)",
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

function measureGap(a: BoxRect, b: BoxRect): MeasureLine | null {
  const aRight = a.x + a.w;
  const bRight = b.x + b.w;
  const aBot = a.y + a.h;
  const bBot = b.y + b.h;
  const overlapY = Math.min(aBot, bBot) - Math.max(a.y, b.y);
  const overlapX = Math.min(aRight, bRight) - Math.max(a.x, b.x);

  if (overlapY > 4 && overlapX <= 0) {
    const left = aRight <= b.x ? a : b;
    const right = left === a ? b : a;
    const y = Math.max(a.y, b.y) + overlapY / 2;
    const gap = right.x - (left.x + left.w);
    if (gap < 2 || gap > 720) return null;
    return { x1: left.x + left.w, y1: y, x2: right.x, y2: y, gap, horizontal: true };
  }

  const top = aBot <= b.y ? a : b;
  const bottom = top === a ? b : a;
  const gap = bottom.y - (top.y + top.h);
  if (gap < 2 || gap > 720) return null;
  const x = overlapX > 4 ? Math.max(a.x, b.x) + overlapX / 2 : bottom.x + bottom.w / 2;
  return { x1: x, y1: top.y + top.h, x2: x, y2: bottom.y, gap, horizontal: false };
}

function sizeSimilar(a: DOMRect, b: DOMRect) {
  const w = a.width / Math.max(1, b.width);
  const h = a.height / Math.max(1, b.height);
  return w > 0.35 && w < 2.8 && h > 0.45 && h < 2.2;
}

function isOnScreen(rect: DOMRect) {
  return rect.width > 0 && rect.height > 0 && rect.bottom > -40 && rect.top < window.innerHeight + 40;
}

function lerpAngle(from: number, to: number, f: number) {
  const diff = ((((to - from) % 360) + 540) % 360) - 180;
  return from + diff * f;
}

function initMoveTo(task: ActiveBuildingTask, fromX: number, fromY: number, toX: number, toY: number, speedMult = 1, bendScale = 1) {
  const dist = Math.hypot(toX - fromX, toY - fromY);
  task.moveX0 = fromX;
  task.moveY0 = fromY;
  task.moveX1 = toX;
  task.moveY1 = toY;
  task.moveT = 0;
  task.moveDur = clamp((0.09 + Math.sqrt(dist) * 0.015) / speedMult, 0.1, 0.42);
  task.moveBend = bendScale === 0 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.09) * Math.min(dist, 520) * bendScale;
}

function stepMoveTo(task: ActiveBuildingTask, c: AgentCursor, dt: number, dragMode = false): boolean {
  if (task.moveDur <= 0.001) {
    c.x = task.moveX1;
    c.y = task.moveY1;
    return true;
  }
  task.moveT += dt / task.moveDur;
  const k = Math.min(1, task.moveT);
  const e = dragMode || k < 0.18 ? easeInOut(k) : easeOut(k);
  const dx = task.moveX1 - task.moveX0;
  const dy = task.moveY1 - task.moveY0;
  const L = Math.hypot(dx, dy) || 1;
  const off = Math.sin(Math.PI * e) * task.moveBend;
  c.x = task.moveX0 + dx * e + (-dy / L) * off;
  c.y = task.moveY0 + dy * e + (dx / L) * off;
  return k >= 1;
}

function discardTasks(tasks: ActiveBuildingTask[]) {
  tasks.forEach((t) => {
    t.ghost?.remove();
    t.ghost = undefined;
  });
}

function releaseCursor(cursor: AgentCursor) {
  cursor.isBuilding = false;
  cursor.actionState = "FREE";
  cursor.clicking = false;
  cursor.press = 0;
  cursor.shape = "arrow";
  cursor.currentElementId = null;
}

export default function CursorOrchestrator({ children }: { children: React.ReactNode }) {
  const [booted, setBooted] = useState(false);
  const [agentsEnabled, setAgentsEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [activeBuildingCount, setActiveBuildingCount] = useState(0);
  const [isMobileSize, setIsMobileSize] = useState(false);

  // Only recreated when cursor pool size changes (init or desktop<->mobile breakpoint cross)
  const [poolCursors, setPoolCursors] = useState<AgentCursor[]>([]);

  const cursorsRef = useRef<AgentCursor[]>([]);
  const cursorDomRef = useRef<Map<string, CursorDomEntry>>(new Map());
  const overlaySvgRef = useRef<SVGSVGElement | null>(null);
  const overlayBadgesRef = useRef<HTMLDivElement | null>(null);
  const ghostLayerRef = useRef<HTMLDivElement | null>(null);
  const prevOverlayRef = useRef({ svg: "", badges: "" });

  const targetsRef = useRef<CachedTarget[]>([]);
  const remainingRef = useRef<CachedTarget[]>([]);
  const activeTasksRef = useRef<ActiveBuildingTask[]>([]);
  const rAFRef = useRef<number | null>(null);
  const lastIsMobileRef = useRef<boolean | null>(null);
  const lastCountRef = useRef(-1);

  const isPausedRef = useRef(false);
  const agentsEnabledRef = useRef(false);
  const isTouringRef = useRef(false);
  const tourScrollYRef = useRef(0);
  const tourFinishHoldRef = useRef(0);

  // Free-swarm pointer tracking & state
  const mouseRef = useRef({
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    tvx: 0,
    tvy: 0,
    t: 0,
    lastMoveAt: 0,
    has: false,
  });

  const flockRef = useRef({
    centerX: 0,
    centerY: 0,
    placed: false,
    crowdFollow: 0, // 1 when chasing moved cursor -> decays after arrival
    evenBlend: 0, // smoothly distributes cursors evenly after follow, then relaxes to triangular idle
    shatterUntil: 0,
    cooldownUntil: 0,
  });

  isPausedRef.current = isPaused;
  agentsEnabledRef.current = agentsEnabled;
  isTouringRef.current = isTouring;

  const registerCursorDom = useCallback((id: string, wrap: HTMLDivElement | null, rot: SVGSVGElement | null) => {
    if (wrap && rot) {
      cursorDomRef.current.set(id, { wrap, rot, shape: "arrow", clicking: false });
    } else {
      cursorDomRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("build-paused", isPaused);
  }, [isPaused]);

  useEffect(() => {
    document.documentElement.classList.toggle("tour-active", isTouring);
    return () => {
      document.documentElement.classList.remove("tour-active");
    };
  }, [isTouring]);

  // 1. Initial config check
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const agentsParam = params.get("agents");
      const saved = localStorage.getItem("portfolio_agents");
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let enabled = false;
      if (agentsParam === "on") enabled = true;
      else if (agentsParam === "off") enabled = false;
      else if (saved !== null) enabled = saved === "true";
      if (prefersReduced && agentsParam !== "on") enabled = false;

      setAgentsEnabled(enabled);
      agentsEnabledRef.current = enabled;

      if (!enabled) {
        document.documentElement.classList.remove("build-mode");
        document.querySelectorAll<HTMLElement>("[data-build]").forEach(finalizeElement);
      } else {
        document.documentElement.classList.add("build-mode");
      }
    } catch {
      // fallback
    }
  }, []);

  // 2. Setup cursor pool (16 on desktop, 8 on mobile) - no per-frame React re-renders
  const setupCursors = useCallback((force = false) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (!force && lastIsMobileRef.current !== null && lastIsMobileRef.current === isMobile) return;
    lastIsMobileRef.current = isMobile;
    setIsMobileSize(isMobile);

    const poolConfig = isMobile ? ALL_AGENTS_CONFIG.slice(0, 8) : ALL_AGENTS_CONFIG;

    const newCursors: AgentCursor[] = poolConfig.map((cfg, index) => {
      let startX = 100;
      let startY = 120;
      if (typeof window !== "undefined") {
        const angle = (index / poolConfig.length) * Math.PI * 2;
        const r = isMobile ? 80 : 120;
        startX = window.innerWidth * 0.5 + Math.cos(angle) * r;
        startY = window.innerHeight * 0.58 + Math.sin(angle) * r;
      }
      const fast = index % 4 === 0;
      return {
        id: cfg.id,
        name: cfg.id,
        color: cfg.color,
        border: cfg.color,
        bg: cfg.bg,
        role: "",
        x: startX,
        y: startY,
        targetX: startX,
        targetY: startY,
        isBuilding: false,
        actionState: "FREE",
        clicking: false,
        currentElementId: null,
        shape: "arrow",
        press: 0,
        rotation: 0,
        vx: 0,
        vy: 0,
        spin: 0,
        speed: fast ? 1050 + (index * 37) % 280 : 480 + (index * 53) % 240,
        force: fast ? 3400 + (index * 191) % 1200 : 1250 + (index * 139) % 750,
        curl: ((index % 5) - 2) * 0.42,
        orbit: 72 + ((index * 29) % 92),
        spinRate: 0.9 + ((index * 17) % 10) * 0.14,
      };
    });

    discardTasks(activeTasksRef.current);
    activeTasksRef.current = [];
    cursorsRef.current = newCursors;
    setPoolCursors([...newCursors]);
  }, []);

  useEffect(() => {
    setupCursors(true);
    const handleResize = () => setupCursors(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCursors]);

  const handleBootComplete = useCallback(() => setBooted(true), []);
  const stopTour = useCallback(() => {
    setIsTouring(false);
    isTouringRef.current = false;
  }, []);

  const clearOverlay = useCallback(() => {
    if (overlaySvgRef.current && prevOverlayRef.current.svg !== "") {
      overlaySvgRef.current.innerHTML = "";
      prevOverlayRef.current.svg = "";
    }
    if (overlayBadgesRef.current && prevOverlayRef.current.badges !== "") {
      overlayBadgesRef.current.innerHTML = "";
      prevOverlayRef.current.badges = "";
    }
  }, []);

  const toggleAgents = useCallback(() => {
    setAgentsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("portfolio_agents", String(next));
      agentsEnabledRef.current = next;

      if (!next) {
        document.documentElement.classList.remove("build-mode", "build-paused");
        document.querySelectorAll<HTMLElement>("[data-build]").forEach(finalizeElement);
        discardTasks(activeTasksRef.current);
        activeTasksRef.current = [];
        cursorsRef.current.forEach(releaseCursor);
        clearOverlay();
        setIsTouring(false);
        isTouringRef.current = false;
        window.dispatchEvent(new CustomEvent("portfolio:agentschange", { detail: { enabled: false } }));
      } else {
        document.documentElement.classList.add("build-mode");
        window.location.reload();
      }
      return next;
    });
  }, [clearOverlay]);

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

    discardTasks(activeTasksRef.current);
    activeTasksRef.current = [];
    cursorsRef.current.forEach(releaseCursor);
    clearOverlay();

    document.querySelectorAll<HTMLElement>("[data-build]").forEach((el) => {
      el.dataset.built = "false";
      el.style.visibility = "hidden";
      el.classList.remove("animate-pop-in", "animate-wipe-in");
      el.querySelectorAll(".reveal-word").forEach((w) => w.classList.remove("revealed"));
    });

    const all = buildTargetRegistry();
    targetsRef.current = all;
    remainingRef.current = [...all];

    window.scrollTo({ top: 0, behavior: "instant" });
    tourScrollYRef.current = 0;
    tourFinishHoldRef.current = 0;

    setIsTouring(true);
    isTouringRef.current = true;
    setIsPaused(false);
  }, [clearOverlay, stopTour]);

  // 3. Main high-FPS rAF engine (direct DOM mutations for zero per-frame React churn)
  useEffect(() => {
    if (!booted || !agentsEnabled) return;

    const all = buildTargetRegistry();
    targetsRef.current = all;
    remainingRef.current = all.filter((entry) => entry.el.dataset.built !== "true");

    let lastTime = performance.now();

    const syncCursorsToDom = () => {
      const mobile = window.innerWidth < 768;
      const svgSize = mobile ? 26 : 32;
      const svgScale = svgSize / 28;
      const domMap = cursorDomRef.current;

      for (const c of cursorsRef.current) {
        const dom = domMap.get(c.id);
        if (!dom) continue;
        const shape: CursorShape = c.shape || "arrow";
        const [hx, hy] = HOTSPOTS[shape];
        const hxPx = hx * svgScale;
        const hyPx = hy * svgScale;
        const pressScale = 1 - (c.press || 0) * 0.14;

        dom.wrap.style.transform = `translate3d(${f1(c.x)}px, ${f1(c.y)}px, 0)`;
        dom.rot.style.transformOrigin = `${f1(hxPx)}px ${f1(hyPx)}px`;
        dom.rot.style.transform = `translate(${f1(-hxPx)}px, ${f1(-hyPx)}px) rotate(${f1(c.rotation ?? 0)}deg) scale(${pressScale.toFixed(3)})`;

        if (dom.shape !== shape) {
          dom.wrap.dataset.shape = shape;
          dom.shape = shape;
        }
        if (dom.clicking !== c.clicking) {
          dom.wrap.dataset.clicking = c.clicking ? "true" : "false";
          dom.clicking = c.clicking;
        }
      }
    };

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      if (!isPausedRef.current && agentsEnabledRef.current) {
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        // =========================================================================
        // A. TOUR SCROLL & COMPLETION SYNCHRONIZATION
        // =========================================================================
        if (isTouringRef.current) {
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
          const scrollSpeed = vw < 768 ? 140 : 225;

          if (tourScrollYRef.current < maxScroll) {
            tourScrollYRef.current = Math.min(maxScroll, tourScrollYRef.current + scrollSpeed * dt);
            window.scrollTo({ top: tourScrollYRef.current, behavior: "instant" });
          } else {
            tourFinishHoldRef.current += dt;
            const unfinishedVisible = remainingRef.current.some((e) => {
              const r = e.el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && r.top < vh && r.bottom > 0;
            });
            if (
              (activeTasksRef.current.length === 0 && !unfinishedVisible && tourFinishHoldRef.current >= 0.45) ||
              tourFinishHoldRef.current >= 3.2
            ) {
              setIsTouring(false);
              isTouringRef.current = false;
            }
          }
        }

        // =========================================================================
        // B. INCREMENTAL VIEWPORT DISCOVERY & PASSED-ELEMENT FINALIZATION
        // =========================================================================
        const nextRemaining: CachedTarget[] = [];
        const visibleCandidates: { entry: CachedTarget; rect: DOMRect }[] = [];
        const busyEls = new Set(activeTasksRef.current.map((t) => t.element));

        for (const entry of remainingRef.current) {
          const el = entry.el;
          if (!el.isConnected || el.dataset.built === "true") continue;

          const rect = el.getBoundingClientRect();
          // Never leave elements scrolled past the top stuck hidden
          if (rect.bottom < -36 && !busyEls.has(el)) {
            finalizeElement(el);
            continue;
          }

          nextRemaining.push(entry);

          if (!busyEls.has(el) && rect.width > 0 && rect.height > 0 && rect.top < vh - 4 && rect.bottom > 4) {
            const parentUnbuilt = entry.parentTargets.some((p) => p.dataset.built !== "true");
            if (!parentUnbuilt) {
              visibleCandidates.push({ entry, rect });
            }
          }
        }
        remainingRef.current = nextRemaining;

        visibleCandidates.sort((a, b) => {
          const topDiff = a.rect.top - b.rect.top;
          if (Math.abs(topDiff) > 20) return topDiff;
          return a.rect.left - b.rect.left;
        });

        for (const { entry, rect } of visibleCandidates) {
          const idleCursors = cursorsRef.current.filter((c) => !c.isBuilding);
          if (idleCursors.length === 0) break;

          const targetEl = entry.el;
          let source: HTMLElement | undefined;

          // Match similar built sibling divs inside same section for option-drag copying
          if (entry.twinKey && !entry.isLongProse && rect.height < vh * 0.72) {
            const matches = targetsRef.current.filter(
              (cand) => cand.el !== targetEl && cand.twinKey === entry.twinKey && cand.twinScope === entry.twinScope
            );
            if (matches.length > 0) {
              let bestSrc: HTMLElement | undefined;
              let bestDist = Infinity;
              for (const m of matches) {
                if (m.el.dataset.built !== "true" || busyEls.has(m.el)) continue;
                const sr = m.el.getBoundingClientRect();
                if (!isOnScreen(sr) || !sizeSimilar(sr, rect)) continue;
                const d = Math.hypot(sr.left - rect.left, sr.top - rect.top);
                if (d < bestDist) {
                  bestDist = d;
                  bestSrc = m.el;
                }
              }
              if (bestSrc) {
                source = bestSrc;
              } else if (matches.some((m) => busyEls.has(m.el))) {
                // Wait for the first sibling card/block in the row/grid to appear, then duplicate it
                continue;
              }
            }
          }

          const srcRect = source ? source.getBoundingClientRect() : null;
          const anchorX = srcRect ? srcRect.left + Math.min(srcRect.width * 0.42, 68) : rect.left;
          const anchorY = srcRect ? srcRect.top + Math.min(srcRect.height * 0.45, 32) : rect.top;

          let nearest = idleCursors[0];
          let bestDistSq = Infinity;
          for (const cand of idleCursors) {
            const dx = cand.x - anchorX;
            const dy = cand.y - anchorY;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDistSq) {
              bestDistSq = d2;
              nearest = cand;
            }
          }

          nearest.isBuilding = true;
          nearest.clicking = false;
          nearest.press = 0;
          nearest.currentElementId = targetEl.id || `${entry.buildType}-${targetsRef.current.indexOf(entry)}`;

          const targetW = Math.max(20, rect.width);
          const targetH = Math.max(16, rect.height);
          const task: ActiveBuildingTask = {
            entry,
            element: targetEl,
            agentId: nearest.id,
            buildType: entry.buildType,
            phase: source ? "grab" : "glide",
            phaseTimer: 0,
            revealDuration: 0.4,
            moveX0: nearest.x,
            moveY0: nearest.y,
            moveX1: anchorX,
            moveY1: anchorY,
            moveT: 0,
            moveDur: 0.2,
            moveBend: 0,
            boxLeft: rect.left,
            boxTop: rect.top,
            boxW: targetW,
            boxH: targetH,
            drawW: 0,
            drawH: 0,
            source,
            grabOffX: srcRect ? anchorX - srcRect.left : 0,
            grabOffY: srcRect ? anchorY - srcRect.top : 0,
            srcRectSnap: srcRect ? { x: srcRect.left, y: srcRect.top, w: srcRect.width, h: srcRect.height } : undefined,
            measureTimer: 0,
          };

          if (source) {
            nearest.actionState = "COPYING";
            nearest.shape = "arrow";
            initMoveTo(task, nearest.x, nearest.y, anchorX, anchorY, 1.05, 0.8);
          } else {
            nearest.actionState = "TARGETING";
            nearest.shape = "cross";
            initMoveTo(task, nearest.x, nearest.y, rect.left, rect.top, 1.15, 0.9);
          }

          activeTasksRef.current.push(task);
          busyEls.add(targetEl);
        }

        // =========================================================================
        // C. UPDATE ACTIVE TASKS + BUILD IMPERATIVE SWARM REBUILD OVERLAY SVG
        // =========================================================================
        let ovSvg = "";
        let ovBadges = "";
        const finishedIndices: number[] = [];

        activeTasksRef.current.forEach((task, idx) => {
          const c = cursorsRef.current.find((cur) => cur.id === task.agentId);
          if (!c || !task.element.isConnected) {
            task.ghost?.remove();
            if (task.element.isConnected && task.phase !== "glide" && task.phase !== "grab") {
              finalizeElement(task.element);
            }
            finishedIndices.push(idx);
            if (c) releaseCursor(c);
            return;
          }

          const currentRect = task.element.getBoundingClientRect();
          const left = currentRect.left;
          const top = currentRect.top;
          const w = Math.max(20, currentRect.width);
          const h = Math.max(16, currentRect.height);
          task.boxLeft = left;
          task.boxTop = top;
          task.boxW = w;
          task.boxH = h;

          // If user scrolled down past an active element, complete it cleanly instead of abandoning it hidden
          if (currentRect.width === 0 || currentRect.height === 0 || currentRect.bottom < -90) {
            task.ghost?.remove();
            task.ghost = undefined;
            finalizeElement(task.element);
            task.phase = "done";
            finishedIndices.push(idx);
            releaseCursor(c);
            return;
          }
          if (currentRect.top > vh + 130) {
            task.ghost?.remove();
            task.ghost = undefined;
            if (task.phase === "revealing" || task.phase === "verified") {
              finalizeElement(task.element);
            }
            task.phase = "done";
            finishedIndices.push(idx);
            releaseCursor(c);
            return;
          }

          c.press = Math.max(0, (c.press || 0) - dt * 5.5);

          const drawSelectionBox = (bx: number, by: number, bw: number, bh: number, color: string, handles: boolean, badge?: string) => {
            const rx = f1(bx);
            const ry = f1(by);
            const rw = f1(bw);
            const rh = f1(bh);
            ovSvg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${color === BLUE ? "rgba(13,153,255,0.06)" : "none"}" stroke="${color}" stroke-width="1.25" stroke-dasharray="4 2.5"/>`;
            if (handles && bw > 6 && bh > 6) {
              for (const [hx, hy] of [
                [rx, ry],
                [rx + rw, ry],
                [rx, ry + rh],
                [rx + rw, ry + rh],
              ]) {
                ovSvg += `<rect x="${f1(hx - 3)}" y="${f1(hy - 3)}" width="6" height="6" fill="#ffffff" stroke="${color}" stroke-width="1.25"/>`;
              }
            }
            if (badge && bw > 14) {
              ovBadges += `<div class="agent-overlay-badge" style="left:${f1(rx + rw / 2)}px;top:${f1(ry - 21)}px;background:${color}">${badge}</div>`;
            }
          };

          const drawMeasure = (a: BoxRect, b: BoxRect) => {
            const m = measureGap(a, b);
            if (!m) return;
            const x1 = f1(m.x1);
            const y1 = f1(m.y1);
            const x2 = f1(m.x2);
            const y2 = f1(m.y2);
            ovSvg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${RED}" stroke-width="1.25"/>`;
            if (m.horizontal) {
              ovSvg += `<line x1="${x1}" y1="${f1(y1 - 4)}" x2="${x1}" y2="${f1(y1 + 4)}" stroke="${RED}" stroke-width="1.25"/>`;
              ovSvg += `<line x1="${x2}" y1="${f1(y2 - 4)}" x2="${x2}" y2="${f1(y2 + 4)}" stroke="${RED}" stroke-width="1.25"/>`;
              ovBadges += `<div class="agent-overlay-badge" style="left:${f1((m.x1 + m.x2) / 2)}px;top:${f1(m.y1 - 21)}px;background:${RED}">${Math.round(m.gap)}</div>`;
            } else {
              ovSvg += `<line x1="${f1(x1 - 4)}" y1="${y1}" x2="${f1(x1 + 4)}" y2="${y1}" stroke="${RED}" stroke-width="1.25"/>`;
              ovSvg += `<line x1="${f1(x2 - 4)}" y1="${y2}" x2="${f1(x2 + 4)}" y2="${y2}" stroke="${RED}" stroke-width="1.25"/>`;
              ovBadges += `<div class="agent-overlay-badge" style="left:${f1(m.x1 + 18)}px;top:${f1((m.y1 + m.y2) / 2 - 9)}px;background:${RED}">${Math.round(m.gap)}</div>`;
            }
          };

          if (task.phase === "glide") {
            c.shape = "cross";
            c.rotation = lerpAngle(c.rotation ?? 0, 0, 1 - Math.exp(-dt * 18));
            task.moveX1 = left;
            task.moveY1 = top;
            const arrived = stepMoveTo(task, c, dt, false);
            if (arrived) {
              c.press = 1;
              c.clicking = true;
              c.actionState = "DRAGGING BOX";
              const endX = Math.min(left + w, vw - 18);
              const endY = Math.min(top + h, vh - 18);
              task.phase = "drag";
              task.phaseTimer = 0;
              task.drawW = 0;
              task.drawH = 0;
              initMoveTo(
                task,
                left,
                top,
                Math.max(left + Math.min(w, 40), endX),
                Math.max(top + Math.min(h, 24), endY),
                1.0,
                0
              );
            }
          } else if (task.phase === "drag") {
            c.shape = "cross";
            c.rotation = 0;
            const endX = Math.min(left + w, vw - 18);
            const endY = Math.min(top + h, vh - 18);
            task.moveX1 = Math.max(left + Math.min(w, 40), endX);
            task.moveY1 = Math.max(top + Math.min(h, 24), endY);

            const doneDrag = stepMoveTo(task, c, dt, true);
            const ratioX = clamp((c.x - left) / Math.max(1, task.moveX1 - left), 0, 1);
            const ratioY = clamp((c.y - top) / Math.max(1, task.moveY1 - top), 0, 1);
            task.drawW = w * ratioX;
            task.drawH = h * ratioY;

            drawSelectionBox(left, top, task.drawW, task.drawH, BLUE, true, `${Math.round(task.drawW)} × ${Math.round(task.drawH)}`);

            if (doneDrag) {
              c.clicking = false;
              task.phase = "reveal";
              task.phaseTimer = 0;
            }
          } else if (task.phase === "grab") {
            c.shape = "arrow";
            c.rotation = lerpAngle(c.rotation ?? 0, 0, 1 - Math.exp(-dt * 18));
            const src = task.source;
            const sr = src?.isConnected ? src.getBoundingClientRect() : null;
            if (!src || !sr || !isOnScreen(sr)) {
              c.shape = "cross";
              task.phase = "glide";
              initMoveTo(task, c.x, c.y, left, top, 1.15, 0.7);
            } else {
              const grabX = sr.left + task.grabOffX;
              const grabY = sr.top + task.grabOffY;
              task.moveX1 = grabX;
              task.moveY1 = grabY;
              task.srcRectSnap = { x: sr.left, y: sr.top, w: sr.width, h: sr.height };
              const arrived = stepMoveTo(task, c, dt, false);
              if (arrived) {
                c.press = 1;
                c.clicking = true;
                task.phase = "selectWait";
                task.phaseTimer = 0;
              }
            }
          } else if (task.phase === "selectWait") {
            const src = task.source;
            const sr = src?.isConnected ? src.getBoundingClientRect() : null;
            if (!src || !sr || !isOnScreen(sr)) {
              c.shape = "cross";
              c.clicking = false;
              task.phase = "glide";
              initMoveTo(task, c.x, c.y, left, top, 1.15, 0.7);
            } else {
              task.phaseTimer += dt;
              drawSelectionBox(sr.left, sr.top, sr.width, sr.height, BLUE, true, `${Math.round(sr.width)} × ${Math.round(sr.height)}`);
              if (task.phaseTimer >= 0.08) {
                c.shape = "dup";
                const layer = ghostLayerRef.current;
                if (layer) task.ghost = makeGhost(src, layer);
                const dropX = left + Math.min(w * 0.42, 68);
                const dropY = top + Math.min(h * 0.45, 32);
                task.grabOffX = c.x - sr.left;
                task.grabOffY = c.y - sr.top;
                task.srcRectSnap = { x: sr.left, y: sr.top, w: sr.width, h: sr.height };
                task.phase = "carry";
                task.phaseTimer = 0;
                initMoveTo(task, c.x, c.y, dropX, dropY, 0.85, 0.55);
              }
            }
          } else if (task.phase === "carry") {
            c.shape = "dup";
            c.clicking = true;
            c.rotation = 0;
            const dropX = left + Math.min(w * 0.42, 68);
            const dropY = top + Math.min(h * 0.45, 32);
            task.moveX1 = dropX;
            task.moveY1 = dropY;
            const doneCarry = stepMoveTo(task, c, dt, true);

            const gx = c.x - task.grabOffX;
            const gy = c.y - task.grabOffY;
            const srcBox = task.srcRectSnap || { x: left, y: top, w, h };
            const k = clamp(task.moveT, 0, 1);
            const curW = srcBox.w + (w - srcBox.w) * easeInOut(k);
            const curH = srcBox.h + (h - srcBox.h) * easeInOut(k);

            if (task.ghost) {
              const tilt = Math.sin(k * Math.PI) * -1.4;
              task.ghost.style.transform = `translate3d(${f1(gx)}px, ${f1(gy)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
              task.ghost.style.width = `${f1(curW)}px`;
              task.ghost.style.height = `${f1(curH)}px`;
            }

            const ghostBox: BoxRect = { x: gx, y: gy, w: curW, h: curH };
            drawSelectionBox(srcBox.x, srcBox.y, srcBox.w, srcBox.h, RED, false);
            drawSelectionBox(ghostBox.x, ghostBox.y, ghostBox.w, ghostBox.h, RED, true);
            drawMeasure(srcBox, ghostBox);

            if (doneCarry) {
              task.ghost?.remove();
              task.ghost = undefined;
              c.clicking = false;
              c.shape = "arrow";
              task.measureTimer = 0.35;
              task.phase = "reveal";
              task.phaseTimer = 0;
            }
          } else if (task.phase === "reveal") {
            const el = task.element;
            el.dataset.built = "true";
            el.style.visibility = "visible";

            if (task.buildType === "type") {
              c.shape = "ibeam";
              c.actionState = "TYPESETTING";
              const wordsCount = (el.textContent?.trim() || "").split(/\s+/).filter(Boolean).length;
              const stagger = wordsCount < 8 ? 50 : wordsCount < 18 ? 38 : 28;
              const wordElements = splitIntoWordTokens(el, stagger);
              task.wordElements = wordElements;
              task.wordStaggerMs = stagger;
              const spanSec = (Math.max(0, wordElements.length - 1) * stagger) / 1000;
              task.revealDuration = Math.max(0.24, spanSec + 0.24);
            } else if (task.buildType === "wipe") {
              c.shape = "arrow";
              c.actionState = "REVEALING";
              el.classList.remove("animate-wipe-in");
              void el.offsetWidth;
              el.classList.add("animate-wipe-in");
              task.revealDuration = 0.38;
            } else {
              c.shape = "arrow";
              c.actionState = "INJECTING";
              el.classList.remove("animate-pop-in");
              void el.offsetWidth;
              el.classList.add("animate-pop-in");
              task.revealDuration = 0.28;
            }
            task.phase = "revealing";
            task.phaseTimer = 0;
          } else if (task.phase === "revealing") {
            task.phaseTimer += dt;
            if (task.measureTimer > 0 && task.source?.isConnected) {
              task.measureTimer -= dt;
              const sr = task.source.getBoundingClientRect();
              drawMeasure({ x: sr.left, y: sr.top, w: sr.width, h: sr.height }, { x: left, y: top, w, h });
            }

            if (task.buildType === "type" && task.wordElements && task.wordElements.length > 0) {
              c.shape = "ibeam";
              const staggerMs = task.wordStaggerMs || 42;
              const words = task.wordElements;
              const activeIdx = Math.min(words.length - 1, Math.floor((task.phaseTimer * 1000) / staggerMs));
              const activeWord = words[activeIdx];
              const wr = activeWord.getBoundingClientRect();
              if (wr.width > 0 && wr.height > 0) {
                const startSec = (activeIdx * staggerMs) / 1000;
                const localP = clamp((task.phaseTimer - startSec) / (staggerMs / 1000), 0, 1);
                const tx = wr.left + wr.width * (0.25 + 0.75 * localP) + 3;
                const ty = wr.top + wr.height * 0.52;
                const lerp = 1 - Math.exp(-dt * 28);
                c.x += (tx - c.x) * lerp;
                c.y += (ty - c.y) * lerp;
              }
              drawSelectionBox(left, top, w, h, BLUE, false);
            } else {
              c.shape = "arrow";
              drawSelectionBox(left, top, w, h, BLUE, true, `${Math.round(w)} × ${Math.round(h)}`);
            }

            if (task.phaseTimer >= task.revealDuration) {
              task.phase = "verified";
              task.phaseTimer = 0;
              c.shape = "arrow";
              c.actionState = "VERIFIED";
            }
          } else if (task.phase === "verified") {
            task.phaseTimer += dt;
            if (task.measureTimer > 0 && task.source?.isConnected) {
              task.measureTimer -= dt;
              const sr = task.source.getBoundingClientRect();
              drawMeasure({ x: sr.left, y: sr.top, w: sr.width, h: sr.height }, { x: left, y: top, w, h });
            }
            if (task.phaseTimer >= 0.14) task.phase = "done";
          }

          if (task.phase === "done") {
            finishedIndices.push(idx);
            releaseCursor(c);
          }
        });

        for (let i = finishedIndices.length - 1; i >= 0; i--) {
          activeTasksRef.current.splice(finishedIndices[i], 1);
        }

        // Write imperative SVG & badges ONLY when changed (idle flock touches ZERO DOM nodes here)
        if (overlaySvgRef.current && ovSvg !== prevOverlayRef.current.svg) {
          overlaySvgRef.current.innerHTML = ovSvg;
          prevOverlayRef.current.svg = ovSvg;
        }
        if (overlayBadgesRef.current && ovBadges !== prevOverlayRef.current.badges) {
          overlayBadgesRef.current.innerHTML = ovBadges;
          prevOverlayRef.current.badges = ovBadges;
        }

        const nowCount = activeTasksRef.current.length;
        if (nowCount !== lastCountRef.current) {
          lastCountRef.current = nowCount;
          setActiveBuildingCount(nowCount);
        }

        // =========================================================================
        // D. SWARM REBUILD BOIDS ORBIT & CROWD FOLLOW PHYSICS
        //    Free cursors circulate in Swarm Rebuild's uneven 3-lobed triangular
        //    pattern. Moving the pointer makes them flock & follow as a crowd,
        //    then settle evenly around the cursor; sweeping through shatters them.
        // =========================================================================
        const free = cursorsRef.current.filter((c) => !c.isBuilding);
        if (free.length > 0) {
          const isMobileView = vw < 768;
          const scale = isMobileView ? 0.68 : 1;
          const tSec = currentTime * 0.001;
          const mouse = mouseRef.current;
          const f = flockRef.current;

          const idlePointX = vw * (0.5 + 0.18 * Math.sin(tSec * 0.37));
          const idlePointY = vh * (0.55 + 0.16 * Math.sin(tSec * 0.53 + 1));
          const aimX = mouse.has ? mouse.x : idlePointX;
          const aimY = mouse.has ? mouse.y : idlePointY;

          if (!f.placed) {
            f.centerX = aimX;
            f.centerY = aimY;
            f.placed = true;
          }

          const timeSinceMove = currentTime - mouse.lastMoveAt;
          const pointerMoving = mouse.has && timeSinceMove < 180;

          // Compute swarm centroid & average distance to target
          let sumX = 0;
          let sumY = 0;
          for (const c of free) {
            sumX += c.x;
            sumY += c.y;
          }
          const avgX = sumX / free.length;
          const avgY = sumY / free.length;
          const crowdLag = Math.hypot(aimX - avgX, aimY - avgY);

          const R = 118 * scale * (1 + 0.14 * Math.sin(tSec * 0.55));

          // 1) Moving pointer or lagging crowd -> active crowd follow
          if (pointerMoving || crowdLag > R * 1.15) {
            f.crowdFollow = Math.min(1, f.crowdFollow + dt * 4.5);
          } else {
            f.crowdFollow = Math.max(0, f.crowdFollow - dt * 1.4);
          }

          // 2) After moving the pointer, transition cleanly into even circulation before relaxing back to uneven triangular
          if (mouse.has && timeSinceMove < 3200) {
            const rampUp = timeSinceMove < 2200 ? 3.2 : 0;
            if (rampUp > 0) f.evenBlend = Math.min(1, f.evenBlend + dt * rampUp);
            else f.evenBlend = Math.max(0, f.evenBlend - dt * 0.75);
          } else {
            f.evenBlend = Math.max(0, f.evenBlend - dt * 0.45);
          }

          const followRate = 1 - Math.exp(-dt * 8.5);
          f.centerX += (aimX - f.centerX) * followRate;
          f.centerY += (aimY - f.centerY) * followRate;

          const swirl = Math.tanh(Math.cos(tSec * 0.11) * 3);
          const shattered = currentTime < f.shatterUntil;

          // Sort free cursors by current angle around target for even angular spacing pressure
          const indexedAngles = free
            .map((c, idx) => ({ idx, ang: Math.atan2(c.y - aimY, c.x - aimX) }))
            .sort((a, b) => a.ang - b.ang);
          const angleRank = new Int32Array(free.length);
          indexedAngles.forEach((item, rank) => {
            angleRank[item.idx] = rank;
          });

          const wantVx: number[] = [];
          const wantVy: number[] = [];

          for (let i = 0; i < free.length; i++) {
            const c = free[i];
            const vx = c.x - aimX;
            const vy = c.y - aimY;
            const d = Math.hypot(vx, vy) || 0.01;
            const nx = vx / d;
            const ny = vy / d;
            const ang = Math.atan2(vy, vx);

            // Uneven 3-lobed triangular radius (from Swarm Rebuild `3 * ang`)
            const off = ((c.orbit ?? 110) - 118) * 0.55 * scale;
            const triangularR = R * (1 + 0.36 * Math.sin(3 * ang + tSec * 0.65)) + off;
            const evenR = R * 0.96;
            const rr = triangularR * (1 - f.evenBlend) + evenR * f.evenBlend;

            // Even angular spacing pressure when settling after a pointer move
            let spacingTang = 0;
            if (f.evenBlend > 0.05 && free.length > 2) {
              const rank = angleRank[i];
              const prev = indexedAngles[(rank - 1 + free.length) % free.length].ang;
              const next = indexedAngles[(rank + 1) % free.length].ang;
              const gapPrev = ((ang - prev + Math.PI * 2) % (Math.PI * 2)) || 0;
              const gapNext = ((next - ang + Math.PI * 2) % (Math.PI * 2)) || 0;
              spacingTang = clamp((gapNext - gapPrev) * 140, -160, 160) * f.evenBlend;
            }

            const spinMult = 0.72 + (c.spinRate ?? 1.2) * 0.18;
            const baseTang = 285 * scale * spinMult * swirl + spacingTang;
            const radPull = clamp((rr - d) * (4.2 + f.crowdFollow * 2.2), -2600, 1500);
            const far = Math.min(1, Math.max(0, (d - rr) / (520 * scale)));
            const curlBoost = (c.curl ?? 0) * 340 * far;

            // Crowd cohesion force toward swarm centroid while chasing moved pointer
            const cohScale = f.crowdFollow * 1.4;
            const cxForce = (avgX - c.x) * cohScale;
            const cyForce = (avgY - c.y) * cohScale;

            wantVx.push(-ny * baseTang + nx * radPull - ny * curlBoost + cxForce);
            wantVy.push(nx * baseTang + ny * radPull + nx * curlBoost + cyForce);
          }

          const neighborR = 96 * scale;
          const sepR = (38 + f.evenBlend * 14) * scale;

          for (let i = 0; i < free.length; i++) {
            const c = free[i];
            c.actionState = "FREE";
            c.shape = "arrow";
            c.press = 0;

            let cvx = c.vx ?? 0;
            let cvy = c.vy ?? 0;

            if (shattered) {
              // Blast burst coasting with air drag and tumbling spin
              const drag = Math.exp(-dt * 2.4);
              cvx *= drag;
              cvy *= drag;
              c.spin = (c.spin ?? 0) * Math.exp(-dt * 1.9);
              c.rotation = (c.rotation ?? 0) + (c.spin ?? 0) * dt;
              c.x += cvx * dt;
              c.y += cvy * dt;
              c.vx = cvx;
              c.vy = cvy;
              continue;
            }

            let ax = 0;
            let ay = 0;
            let wsum = 0;
            let sx = 0;
            let sy = 0;

            for (let j = 0; j < free.length; j++) {
              if (j === i) continue;
              const q = free[j];
              const dx = c.x - q.x;
              const dy = c.y - q.y;
              const d = Math.hypot(dx, dy) || 0.01;
              if (d < neighborR) {
                const w = 1 - d / neighborR;
                ax += (q.vx ?? 0) * w;
                ay += (q.vy ?? 0) * w;
                wsum += w;
              }
              if (d < sepR) {
                const push = (1 - d / sepR) * 320;
                sx += (dx / d) * push;
                sy += (dy / d) * push;
              }
            }

            let fx = wantVx[i] + sx;
            let fy = wantVy[i] + sy;
            if (wsum > 0) {
              const alignWeight = 0.28 + f.crowdFollow * 0.16;
              fx = fx * (1 - alignWeight) + (ax / wsum) * alignWeight;
              fy = fy * (1 - alignWeight) + (ay / wsum) * alignWeight;
            }

            const distBeyond = Math.max(0, Math.hypot(c.x - aimX, c.y - aimY) - 165 * scale);
            const maxV = (c.speed ?? 650) * (1.25 + Math.min(3.2, distBeyond / 85));
            const fl = Math.hypot(fx, fy);
            if (fl > maxV) {
              fx *= maxV / fl;
              fy *= maxV / fl;
            }

            let gx = (fx - cvx) * 6;
            let gy = (fy - cvy) * 6;
            const maxF = (c.force ?? 1700) * (1.35 + Math.min(4.8, distBeyond / 50));
            const gl = Math.hypot(gx, gy);
            if (gl > maxF) {
              gx *= maxF / gl;
              gy *= maxF / gl;
            }

            cvx += gx * dt;
            cvy += gy * dt;
            c.x += cvx * dt;
            c.y += cvy * dt;

            // Core repulsion pocket R0 (keeps user pointer cleanly visible inside swarm)
            if (mouse.has) {
              const rx = c.x - mouse.x;
              const ry = c.y - mouse.y;
              const rd = Math.hypot(rx, ry) || 0.01;
              const R0 = 46 * scale;
              if (rd < R0) {
                const nx = rx / rd;
                const ny = ry / rd;
                c.x = mouse.x + nx * R0;
                c.y = mouse.y + ny * R0;
                const rel = (cvx - mouse.tvx) * nx + (cvy - mouse.tvy) * ny;
                if (rel < 0) {
                  cvx -= nx * rel * 1.5;
                  cvy -= ny * rel * 1.5;
                }
                cvx += nx * 240;
                cvy += ny * 240;
              }
            }

            c.vx = cvx;
            c.vy = cvy;

            if (Math.hypot(cvx, cvy) >= 24) {
              const targetRot = Math.atan2(cvy, cvx) * RAD_TO_DEG + 128;
              c.rotation = lerpAngle(c.rotation ?? 0, targetRot, 1 - Math.exp(-dt * 9));
            }
          }
        }

        syncCursorsToDom();
      }

      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);

    // Center sweep shatter burst
    const shatter = (hitX: number, hitY: number, pvx: number, pvy: number) => {
      const f = flockRef.current;
      const now = performance.now();
      f.shatterUntil = now + 720;
      f.cooldownUntil = now + 1350;
      for (const c of cursorsRef.current) {
        if (c.isBuilding) continue;
        const dx = c.x - hitX;
        const dy = c.y - hitY;
        const len = Math.hypot(dx, dy) || 1;
        const burst = 560 + Math.random() * 540;
        const jitter = (Math.random() - 0.5) * 0.9;
        const cos = Math.cos(jitter);
        const sin = Math.sin(jitter);
        const ax = dx / len;
        const ay = dy / len;
        c.vx = (ax * cos - ay * sin) * burst + pvx * 240;
        c.vy = (ax * sin + ay * cos) * burst + pvy * 240;
        c.spin = (Math.random() < 0.5 ? -1 : 1) * (340 + Math.random() * 680);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const m = mouseRef.current;
      const now = performance.now();
      const x = e.clientX;
      const y = e.clientY;
      if (!m.has) {
        m.x = x;
        m.y = y;
        m.prevX = x;
        m.prevY = y;
        m.t = now;
        m.lastMoveAt = now;
        m.has = true;
        return;
      }

      const elapsedMs = Math.max(8, now - m.t);
      const dtSec = elapsedMs * 0.001;
      const px = m.x;
      const py = m.y;
      const vxMs = (x - px) / elapsedMs;
      const vyMs = (y - py) / elapsedMs;
      const speedPxMs = Math.hypot(vxMs, vyMs);
      const k = Math.min(1, dtSec * 18);
      m.tvx += ((x - px) / dtSec - m.tvx) * k;
      m.tvy += ((y - py) / dtSec - m.tvy) * k;
      m.prevX = px;
      m.prevY = py;
      m.x = x;
      m.y = y;
      m.t = now;
      if (Math.hypot(x - px, y - py) > 2) m.lastMoveAt = now;

      const f = flockRef.current;
      if (now < f.cooldownUntil || speedPxMs < 0.34) return;

      const freeCursors = cursorsRef.current.filter((c) => !c.isBuilding);
      if (freeCursors.length < Math.max(4, Math.ceil(cursorsRef.current.length / 2))) return;

      let cx = 0;
      let cy = 0;
      for (const c of freeCursors) {
        cx += c.x;
        cy += c.y;
      }
      cx /= freeCursors.length;
      cy /= freeCursors.length;

      const shatterR = window.innerWidth < 768 ? 55 : 88;
      const sx = x - px;
      const sy = y - py;
      const segLenSq = sx * sx + sy * sy || 1;
      const t = clamp(((cx - px) * sx + (cy - py) * sy) / segLenSq, 0, 1);
      const nearX = px + sx * t;
      const nearY = py + sy * t;
      const dist = Math.hypot(cx - nearX, cy - nearY);
      const startedOutside = Math.hypot(px - cx, py - cy) > shatterR * 0.65;
      if (dist < shatterR * 0.72 && (startedOutside || speedPxMs > 0.85)) {
        shatter(nearX, nearY, vxMs, vyMs);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const m = mouseRef.current;
      m.x = e.clientX;
      m.y = e.clientY;
      m.t = performance.now();
      m.lastMoveAt = m.t;
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

  // 4. Keyboard & scroll interruptions
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
      if (isTouringRef.current) stopTour();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleUserScroll, { passive: true });
    window.addEventListener("touchmove", handleUserScroll, { passive: true });
    window.addEventListener("portfolio:navigate", handleUserScroll);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleUserScroll);
      window.removeEventListener("touchmove", handleUserScroll);
      window.removeEventListener("portfolio:navigate", handleUserScroll);
    };
  }, [toggleAgents, startTour, stopTour]);

  return (
    <>
      <BootLoader enabled={agentsEnabled} onBootComplete={handleBootComplete} />

      {children}

      {booted && agentsEnabled && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none">
          <div ref={ghostLayerRef} className="pointer-events-none fixed inset-0" aria-hidden="true" />
          <svg ref={overlaySvgRef} className="pointer-events-none fixed inset-0 w-full h-full" aria-hidden="true" />
          <div ref={overlayBadgesRef} className="pointer-events-none fixed inset-0" aria-hidden="true" />

          {poolCursors.map((agent) => (
            <RobotCursor
              key={agent.id}
              agent={agent}
              size={isMobileSize ? 26 : 32}
              registerDom={registerCursorDom}
            />
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
