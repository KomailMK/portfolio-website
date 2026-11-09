"use client";
import React from "react";
import { AgentCursor } from "@/lib/types";
interface RobotCursorProps {
  agent: AgentCursor;
  scale?: number;
}
export default function RobotCursor({ agent, scale = 1 }: RobotCursorProps) {
  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-40 will-change-transform"
      style={{
        transform: `translate3d(${agent.x}px, ${agent.y}px, 0) scale(${scale})`,
      }}
    >
      {/* Click Down Ripple Effect */}
      {agent.clicking && (
        <span
          className="absolute -top-1 -left-1 w-6 h-6 rounded-full border animate-ping pointer-events-none"
          style={{ borderColor: agent.color }}
        />
      )}
      {/* Top Left Cursor Pointer Arrow */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] filter transition-transform duration-100"
        style={{
          color: agent.color,
          transform: agent.clicking ? "scale(0.9) translate(-1px, -1px)" : "translate(-2px, -2px)",
        }}
      >
        <path
          d="M3 2L19 12L12 14L8 22L3 2Z"
          fill={agent.color}
          stroke="#09090b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {/* Floating Name Tag with Robot Head */}
      <div
        className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono shadow-2xl backdrop-blur-md whitespace-nowrap border select-none transition-all duration-150"
        style={{
          backgroundColor: "#09090bee",
          borderColor: agent.color,
          boxShadow: `0 4px 18px ${agent.bg}`,
        }}
      >
        {/* Tiny Robot Head */}
        <div className="relative flex flex-col items-center justify-center w-4 h-4 shrink-0">
          {/* Antenna with Pulsing LED Dot */}
          <div className="absolute -top-1.5 flex flex-col items-center">
            <span
              className="w-1.5 h-1.5 rounded-full robot-antenna-pulse"
              style={{
                backgroundColor: agent.color,
                boxShadow: `0 0 6px ${agent.color}`,
              }}
            />
            <span
              className="w-[1px] h-1"
              style={{ backgroundColor: agent.color }}
            />
          </div>

          {/* Robot Head Body */}
          <div
            className="w-3.5 h-3 rounded-[2px] flex items-center justify-center gap-[2px] mt-1 border"
            style={{
              borderColor: agent.color,
              backgroundColor: "#18181b",
            }}
          >
            {/* Blinking LED Eyes */}
            <span
              className="w-[2px] h-[2px] rounded-full robot-eyes-blink"
              style={{ backgroundColor: agent.color }}
            />
            <span
              className="w-[2px] h-[2px] rounded-full robot-eyes-blink"
              style={{ backgroundColor: agent.color }}
            />
          </div>
        </div>

        {/* Agent Name & Action State */}
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-bold text-zinc-100" style={{ color: agent.color }}>
            {agent.name}
          </span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
              agent.actionState === "VERIFIED"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : agent.isBuilding
                ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                : "text-zinc-500"
            }`}
          >
            {agent.actionState || agent.role}
          </span>
        </div>
      </div>
    </div>
  );
}
