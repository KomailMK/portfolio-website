"use client";

import React from "react";
import { AgentCursor } from "@/lib/types";

interface RobotCursorProps {
  agent: AgentCursor;
  size?: number;
  registerDom?: (id: string, wrap: HTMLDivElement | null, rot: SVGSVGElement | null) => void;
}

const ARROW_D =
  "M4.6 3.9 C4.2 3.1 4.9 2.4 5.7 2.8 L20.6 9.4 C21.5 9.8 21.4 11.1 20.4 11.3 L13.9 12.9 C13.4 13 13 13.4 12.9 13.9 L11.3 20.4 C11.1 21.4 9.8 21.5 9.4 20.6 Z";
const IBEAM_D =
  "M8.5 4.5 H10.5 Q12 4.5 12 6 Q12 4.5 13.5 4.5 H15.5 M12 6 V18 M8.5 19.5 H10.5 Q12 19.5 12 18 Q12 19.5 13.5 19.5 H15.5";

/**
 * Bare Swarm-Rebuild-inspired pointer cursor (no name tag or text labels).
 * Renders all 4 tool glyphs in a static SVG so the rAF loop can mutate
 * transform, rotation, press scale, and active shape directly via refs with
 * zero per-frame React re-renders.
 */
const RobotCursor = React.memo(function RobotCursor({
  agent,
  size = 30,
  registerDom,
}: RobotCursorProps) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    registerDom?.(agent.id, wrapRef.current, svgRef.current);
    return () => {
      registerDom?.(agent.id, null, null);
    };
  }, [agent.id, registerDom]);

  return (
    <div
      ref={wrapRef}
      data-cursor-id={agent.id}
      data-shape={agent.shape || "arrow"}
      data-clicking={agent.clicking ? "true" : "false"}
      className="agent-cursor pointer-events-none fixed top-0 left-0 z-40 will-change-transform"
      style={{
        transform: `translate3d(${agent.x}px, ${agent.y}px, 0)`,
      }}
    >
      <span
        className="agent-click-ring pointer-events-none"
        style={{ borderColor: agent.color }}
      />
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        className="agent-cursor-svg"
        style={{
          filter: `drop-shadow(0 2px 6px rgba(0, 0, 0, 0.72)) drop-shadow(0 0 7px ${agent.bg})`,
        }}
      >
        <g className="agent-glyph agent-glyph-arrow">
          <path
            d={ARROW_D}
            fill={agent.color}
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>

        <g className="agent-glyph agent-glyph-dup">
          <path
            d={ARROW_D}
            transform="translate(4 3.5)"
            fill="#ffffff"
            stroke={agent.color}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d={ARROW_D}
            fill={agent.color}
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>

        <g className="agent-glyph agent-glyph-cross" strokeLinecap="round">
          <path d="M12 3.5 V20.5 M3.5 12 H20.5" stroke="#ffffff" strokeWidth="3.8" />
          <path d="M12 3.5 V20.5 M3.5 12 H20.5" stroke={agent.color} strokeWidth="1.7" />
        </g>

        <g className="agent-glyph agent-glyph-ibeam" fill="none" strokeLinecap="round">
          <path d={IBEAM_D} stroke="#ffffff" strokeWidth="3.8" />
          <path d={IBEAM_D} stroke={agent.color} strokeWidth="1.7" />
        </g>
      </svg>
    </div>
  );
});

export default RobotCursor;
