export type BuildType = "type" | "pop" | "wipe";
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
  actionState: string; // e.g. "TARGETING", "DRAGGING BOX", "TYPESETTING", "VERIFIED", "STANDBY"
  clicking: boolean;
  currentElementId: string | null;
  rotation?: number; // degrees applied around the pointer tip
  vx?: number;
  vy?: number;
  spin?: number;
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