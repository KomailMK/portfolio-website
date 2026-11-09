"use client";

import React from "react";
import { Play, Pause, Bot, BotOff, Compass, Square } from "lucide-react";

interface DockControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  agentsEnabled: boolean;
  onToggleAgents: () => void;
  isTouring: boolean;
  onToggleTour: () => void;
  activeBuildingCount: number;
}

export default function DockControls({
  isPaused,
  onTogglePause,
  agentsEnabled,
  onToggleAgents,
  isTouring,
  onToggleTour,
  activeBuildingCount,
}: DockControlsProps) {
  return (
    <aside aria-label="Build engine controls" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 select-none">
      <div className="flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full border border-zinc-800 bg-zinc-950/90 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md font-mono text-xs">
        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-2 pl-2 pr-3 border-r border-zinc-800">
          <span
            className={`w-2 h-2 rounded-full ${
              !agentsEnabled
                ? "bg-zinc-600"
                : isTouring
                ? "bg-cyan-400 animate-ping"
                : isPaused
                ? "bg-amber-400"
                : "bg-emerald-500 animate-pulse"
            }`}
          />
          <span className="text-[11px] text-zinc-400 whitespace-nowrap">
            {!agentsEnabled
              ? "Agents: Off"
              : isTouring
              ? "Touring Site"
              : isPaused
              ? "Paused"
              : `${activeBuildingCount} Building`}
          </span>
        </div>

        {/* Pause / Resume Button */}
        <button
          type="button"
          onClick={onTogglePause}
          disabled={!agentsEnabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff3b2f]"
          title="Pause / Resume animation (P)"
          aria-label={isPaused ? "Resume agents (P)" : "Pause agents (P)"}
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span className="text-[11px] font-semibold">Resume</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold">Pause</span>
            </>
          )}
          <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            P
          </kbd>
        </button>

        {/* Agents On / Off Toggle */}
        <button
          type="button"
          onClick={onToggleAgents}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff3b2f] ${
            agentsEnabled
              ? "text-zinc-200 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-800"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
          }`}
          title="Toggle Agents On / Off (A)"
          aria-label={agentsEnabled ? "Turn off agents (A)" : "Turn on agents (A)"}
        >
          {agentsEnabled ? (
            <>
              <Bot className="w-3.5 h-3.5 text-[#ff3b2f]" />
              <span className="text-[11px] font-semibold">Agents</span>
            </>
          ) : (
            <>
              <BotOff className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[11px] font-semibold">Agents Off</span>
            </>
          )}
          <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            A
          </kbd>
        </button>

        {/* Tour Button */}
        <button
          type="button"
          onClick={onToggleTour}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff3b2f] ${
            isTouring
              ? "bg-[#ff3b2f] text-white hover:bg-[#ff5449] active:scale-95 shadow-[0_0_12px_rgba(255,59,47,0.5)]"
              : "text-zinc-200 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-800"
          }`}
          title="Auto-scroll tour for screen recording (T / Esc to stop)"
          aria-label={isTouring ? "Stop tour (Esc)" : "Start tour (T)"}
        >
          {isTouring ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="text-[11px] font-semibold">Stop Tour</span>
            </>
          ) : (
            <>
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-semibold">Tour</span>
            </>
          )}
          <kbd
            className={`hidden md:inline-block text-[9px] px-1 py-0.2 rounded border ${
              isTouring
                ? "bg-[#d02e23] border-[#ff3b2f] text-white"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}
          >
            {isTouring ? "ESC" : "T"}
          </kbd>
        </button>
      </div>
    </aside>
  );
}
