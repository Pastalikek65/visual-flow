export type ParamValue = number | boolean | string;

export interface FlowNode {
  id: string;
  kind: string;
  x: number;
  y: number;
  params: Record<string, ParamValue>;
}

export interface FlowEdge {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

export interface FlowGraph {
  nodes: Record<string, FlowNode>;
  edges: Record<string, FlowEdge>;
}

export type NodeValue =
  | { type: 'number'; value: number | 'NaN' | 'inf' | '-inf' }
  | { type: 'bool'; value: boolean }
  | { type: 'string'; value: string }
  | { type: 'null' };

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}