import { describe, it, expect } from 'vitest';
import { diff, toWire } from './wire';
import type { FlowEdge, FlowNode, FlowGraph } from './graph';

function node(id: string, kind = 'constant', params: Record<string, number | boolean> = {}, x = 0, y = 0): FlowNode {
  return { id, kind, x, y, params };
}

function edge(id: string, from: string, to: string): FlowEdge {
  return { id, from, fromPort: 'out', to, toPort: 'a' };
}

describe('wire diff', () => {
  it('detects added nodes', () => {
    const prev: FlowGraph = { nodes: { a: node('a') }, edges: {} };
    const next: FlowGraph = { nodes: { a: node('a'), b: node('b') }, edges: {} };
    const p = diff(prev, next);
    expect(p.nodesAdded).toHaveLength(1);
    expect(p.nodesAdded![0].id).toBe('b');
    expect(p.nodesChanged).toBeUndefined();
  });

  it('detects removed nodes and their edges', () => {
    const prev: FlowGraph = {
      nodes: { a: node('a'), b: node('b') },
      edges: { e1: edge('e1', 'a', 'b') },
    };
    const next: FlowGraph = { nodes: { b: node('b') }, edges: {} };
    const p = diff(prev, next);
    expect(p.nodesRemoved).toEqual(['a']);
    expect(p.edgesRemoved).toEqual(['e1']);
  });

  it('detects param changes only, not moves', () => {
    const prev: FlowGraph = { nodes: { a: node('a', 'constant', { value: 1 }, 5, 5) }, edges: {} };
    const moved: FlowGraph = { nodes: { a: node('a', 'constant', { value: 1 }, 50, 60) }, edges: {} };
    const changed: FlowGraph = { nodes: { a: node('a', 'constant', { value: 9 }, 50, 60) }, edges: {} };
    expect(diff(prev, moved).nodesChanged).toBeUndefined();
    expect(diff(prev, changed).nodesChanged).toHaveLength(1);
  });

  it('round-trips through toWire', () => {
    const g: FlowGraph = {
      nodes: { a: node('a', 'slider', { v: 3 }, 1, 2), b: node('b', 'output') },
      edges: { e1: edge('e1', 'a', 'b') },
    };
    const wire = toWire(g);
    expect(wire.nodes).toHaveLength(2);
    expect(wire.edges[0].from).toBe('a');
    expect(wire.nodes.find((n) => n.id === 'a')?.params['v']).toBe(3);
  });
});