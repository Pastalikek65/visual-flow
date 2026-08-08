import type { FlowEdge, FlowNode, FlowGraph } from './graph';

export interface WireNode {
  id: string;
  kind: string;
  params: Record<string, boolean | number>;
  x: number;
  y: number;
}

export interface WireEdge {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

export interface WireGraphData {
  nodes: WireNode[];
  edges: WireEdge[];
}

export interface WirePatchData {
  nodesAdded?: WireNode[];
  nodesRemoved?: string[];
  nodesChanged?: WireNode[];
  edgesAdded?: WireEdge[];
  edgesRemoved?: string[];
}

export function toWire(g: FlowGraph): WireGraphData {
  return {
    nodes: Object.values(g.nodes).map((n) => ({
      id: n.id,
      kind: n.kind,
      params: n.params as Record<string, boolean | number>,
      x: n.x,
      y: n.y,
    })),
    edges: Object.values(g.edges).map((e) => ({ ...e })),
  };
}

export function diff(prev: FlowGraph, next: FlowGraph): WirePatchData {
  const patch: WirePatchData = {};

  const removed = Object.keys(prev.nodes).filter((id) => !next.nodes[id]);
  if (removed.length) patch.nodesRemoved = removed;

  const changed = Object.keys(next.nodes).filter((id) => {
    const prevNode = prev.nodes[id];
    if (!prevNode) return false;
    return (
      prevNode.kind !== next.nodes[id].kind ||
      JSON.stringify(prevNode.params) !== JSON.stringify(next.nodes[id].params)
    );
  });
  if (changed.length) {
    patch.nodesChanged = changed.map((id) => ({
      id,
      kind: next.nodes[id].kind,
      params: next.nodes[id].params as Record<string, boolean | number>,
      x: next.nodes[id].x,
      y: next.nodes[id].y,
    }));
  }

  const addedNodes = Object.keys(next.nodes).filter((id) => !prev.nodes[id]);
  if (addedNodes.length) {
    patch.nodesAdded = addedNodes.map((id) => ({
      id,
      kind: next.nodes[id].kind,
      params: next.nodes[id].params as Record<string, boolean | number>,
      x: next.nodes[id].x,
      y: next.nodes[id].y,
    }));
  }

  const edgesJustAdded = Object.keys(next.edges).filter((id) => !prev.edges[id]);
  if (edgesJustAdded.length) {
    patch.edgesAdded = edgesJustAdded.map((id) => next.edges[id]);
  }

  const edgesRemoved = Object.keys(prev.edges).filter((id) => !next.edges[id]);
  if (edgesRemoved.length) patch.edgesRemoved = edgesRemoved;

  return patch;
}

export function emptyPatch(): WirePatchData {
  return {};
}

export function normalizeParam(value: boolean | number): boolean | number {
  return value;
}