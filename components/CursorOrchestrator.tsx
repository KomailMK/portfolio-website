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
  phase: "glide" | "drag" | "reveal" | "revealing" | "verified" | "done";
  phaseTimer: number;
  revealDuration: number;
  wireframe: WireframeBox;
  wordElements?: HTMLElement[];
  wordStaggerMs?: number;
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

    activeTasksRef.current = [];
    setRenderWireframes([]);
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
        activeTasksRef.current = [];
        cursorsRef.current.forEach(releaseCursor);
        setRenderWireframes([]);
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
    activeTasksRef.current = [];
    cursorsRef.current.forEach(releaseCursor);
    setRenderWireframes([]);

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

        while (unassignedVisibleTargets.length > 0) {
          const idleCursors = cursorsRef.current.filter((c) => !c.isBuilding);
          if (idleCursors.length === 0) break;

          const targetEl = unassignedVisibleTargets.shift();
          if (!targetEl) break;

          const rect = targetEl.getBoundingClientRect();
          const targetCenterX = rect.left + rect.width * 0.5;
          const targetCenterY = rect.top + rect.height * 0.5;

          // Pick nearest idle cursor to prevent chaotic cross-screen criss-crossing
          let nearestCursor = idleCursors[0];
          let minDistSq = Infinity;
          for (const candidate of idleCursors) {
            const dx = candidate.x - targetCenterX;
            const dy = candidate.y - targetCenterY;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq) {
              minDistSq = distSq;
              nearestCursor = candidate;
            }
          }

          const buildType = (targetEl.getAttribute("data-build") as BuildType) || "pop";

          nearestCursor.isBuilding = true;
          nearestCursor.actionState = "TARGETING";
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
            phase: "glide",
            phaseTimer: 0,
            revealDuration: 0.45,
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
              label: `[${nearestCursor.name.toUpperCase()}] ${Math.round(targetW)} × ${Math.round(targetH)}px`,
              buildType,
            },
          };

          activeTasksRef.current.push(task);
        }

        // =========================================================================
        // C. UPDATE ACTIVE TASKS & WIREFRAMES
        // =========================================================================
        const updatedWireframes: WireframeBox[] = [];
        const finishedIndices: number[] = [];

        activeTasksRef.current.forEach((task, idx) => {
          const cursor = cursorsRef.current.find((c) => c.id === task.agentId);
          if (!cursor) {
            finishedIndices.push(idx);
            return;
          }

          if (!task.element.isConnected) {
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

          if (task.phase === "glide") {
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

            task.wireframe.label = `[${cursor.name.toUpperCase()}] ${Math.round(
              task.wireframe.currentWidth
            )} × ${Math.round(task.wireframe.currentHeight)}px`;

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
        // D. ACTIVE SCOUTING PHYSICS (FRAMERATE-INDEPENDENT SMOOTH LERP)
        // =========================================================================
        cursorsRef.current.forEach((c, idx) => {
          if (c.isBuilding) {
            const baseFactor =
              c.actionState === "TYPESETTING" ? 0.36 : c.clicking ? 0.40 : 0.30;
            const lerp = 1 - Math.pow(1 - baseFactor, Math.max(0.25, dt * 60));
            c.x += (c.targetX - c.x) * lerp;
            c.y += (c.targetY - c.y) * lerp;
          } else {
            const totalCursors = cursorsRef.current.length;
            const horizontalSlot = (window.innerWidth / (totalCursors + 1)) * (idx + 1);
            const timeOffset = currentTime * 0.002 + idx * 1.1;

            const scoutTargetX = horizontalSlot + Math.sin(timeOffset) * 20;
            const scoutTargetY = window.innerHeight * 0.72 + Math.cos(timeOffset * 1.2) * 16;

            c.actionState = "SCOUTING";
            c.targetX = scoutTargetX;
            c.targetY = scoutTargetY;

            const scoutLerp = 1 - Math.pow(1 - 0.12, Math.max(0.25, dt * 60));
            c.x += (c.targetX - c.x) * scoutLerp;
            c.y += (c.targetY - c.y) * scoutLerp;
          }
        });

        setRenderCursors([...cursorsRef.current]);
      }

      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);

    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
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

              <div className="absolute -top-5 left-0 px-2 py-0.5 bg-[#09090b] border border-[#38bdf8] text-[10px] font-mono text-[#38bdf8] rounded-sm whitespace-nowrap shadow-md flex items-center gap-1.5 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-ping" />
                <span>{wire.label}</span>
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
