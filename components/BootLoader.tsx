"use client";

import React, { useEffect, useState, useRef } from "react";
import { Terminal, Cpu } from "lucide-react";

interface BootLoaderProps {
  onBootComplete: () => void;
  enabled: boolean;
}

export default function BootLoader({ onBootComplete, enabled }: BootLoaderProps) {
  const [visible, setVisible] = useState(enabled);
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const completedRef = useRef(false);

  const steps = [
    "BOOTING ANTIGRAVITY ENGINE v2.6...",
    "SPAWNING 12 AUTONOMOUS AGENTS (SCOUT, LAYOUT, TYPESET, MOTION, QA...)",
    "LOCATING [data-build] DOM TARGETS & TOPOLOGY...",
    "DISPATCHING WORKERS TO VIEWPORT CHANNELS...",
    "READY. COMMENCING REAL-TIME ASSEMBLY.",
  ];

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      if (!completedRef.current) {
        completedRef.current = true;
        onBootComplete();
      }
      return;
    }

    if (completedRef.current) return;

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      setVisible(false);
      onBootComplete();
    };

    // Hard ceiling safety timeout: Never exceed 950ms under any circumstances
    const safetyTimeout = setTimeout(finish, 950);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(finish, 120);
          return 100;
        }
        const next = prev + 25;
        const currentIdx = Math.min(
          steps.length - 1,
          Math.floor((next / 100) * (steps.length - 1))
        );
        setStepIndex(currentIdx);
        return next;
      });
    }, 130);

    return () => {
      clearInterval(interval);
      clearTimeout(safetyTimeout);
    };
  }, [enabled, onBootComplete, steps.length]);

  if (!enabled || !visible) return null;

  return (
    <div className="boot-loader is-active fixed inset-0 z-50 flex items-center justify-center bg-[#09090b] px-4 select-none">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-950/90 p-5 shadow-2xl backdrop-blur-md rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
            <Terminal className="w-4 h-4 text-[#ff3b2f]" />
            <span className="font-semibold tracking-wider">SYSTEM INITIALIZATION</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] text-zinc-500 uppercase">SYS_OK</span>
          </div>
        </div>

        {/* Console Log */}
        <div className="space-y-2 mb-5 font-mono text-xs">
          {steps.slice(0, stepIndex + 1).map((step, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 ${
                idx === stepIndex ? "text-zinc-200" : "text-zinc-500"
              }`}
            >
              <span className="text-[#ff3b2f] select-none">&gt;</span>
              <span className="leading-tight">{step}</span>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[#ff3b2f]" />
              <span>ORCHESTRATING RUNTIME</span>
            </span>
            <span className="text-zinc-200 font-bold">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-[#ff3b2f] transition-all duration-100 ease-out shadow-[0_0_8px_#ff3b2f]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
