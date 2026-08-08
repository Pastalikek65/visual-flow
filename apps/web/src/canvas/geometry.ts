import type { FlowNode } from 'flow-types';

export const NODE_W = 216;
export const HEADER_H = 34;
export const PORT_STEP = 24;
export const PORT_Y0 = 16;

export interface WorldPoint {
  x: number;
  y: number;
}

export function portOffsetX(side: 'in' | 'out'): number {
  return side === 'in' ? 0 : NODE_W;
}

export function portWorldPos(node: FlowNode, side: 'in' | 'out', index: number): WorldPoint {
  return { x: node.x + portOffsetX(side), y: node.y + PORT_Y0 + index * PORT_STEP };
}