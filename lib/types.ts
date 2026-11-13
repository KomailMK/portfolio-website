export type BuildType = "type" | "pop" | "wipe";
export type CursorShape = "arrow" | "cross" | "ibeam" | "dup";

export interface AgentCursor {
  id: string;
  name: string;
  color: string;
  border: string;
  bg: string;
  role: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isBuilding: boolean;
  actionState: string;
  clicking: boolean;
  currentElementId: string | null;
  shape?: CursorShape;
  press?: number;
  rotation?: number;
  vx?: number;
  vy?: number;
  spin?: number;
  speed?: number;
  force?: number;
  curl?: number;
  orbit?: number;
  spinRate?: number;
}
export interface WireframeBox {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  currentWidth: number;
  currentHeight: number;
  progress: number; // 0 to 1
  label: string;
  buildType: BuildType;
}
export interface BuildableTarget {
  id: string;
  element: HTMLElement;
  buildType: BuildType;
  rect: DOMRect;
  scrolledPast: boolean;
  built: boolean;
  building: boolean;
  readingOrder: number;
}