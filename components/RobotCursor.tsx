"use client";
import React from "react";
import { AgentCursor } from "@/lib/types";

interface RobotCursorProps {
  agent: AgentCursor;
  scale?: number;
}

/** Bare agent pointer: no name tag, just the arrow (rotated around its tip). */
export default function RobotCursor({ agent, scale = 1 }: RobotCursorProps) {
  const rotation = agent.rotation ?? 0;
  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-40 will-change-transform"
      style={{
        transform: `translate3d(${agent.x}px, ${agent.y}px, 0) scale(${scale})`,
      }}
    >
      {agent.clicking && (
        <span
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full border animate-ping pointer-events-none"
          style={{ borderColor: agent.color }}
        />
      )}
      <div style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "0 0" }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="filter transition-transform duration-100"
          style={{
            filter: `drop-shadow(0 2px 6px rgba(0,0,0,0.85)) drop-shadow(0 0 6px ${agent.bg})`,
            transform: agent.clicking ? "scale(0.88) translate(-2px, -2px)" : "translate(-2px, -2px)",
            transformOrigin: "2px 2px",
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
      </div>
    </div>
  );
}
