import { create } from 'zustand';
import type { FlowEdge, FlowNode, ParamValue } from 'flow-types';
import { uid } from 'flow-types';

export interface Selection {
  kind: 'node' | 'edge';
  id: string;
}

interface GraphState {
  nodes: Record<string, FlowNode>;
  edges: Record<string, FlowEdge>;
  selection: Selection | null;
  addNode(kind: string, x: number, y: number): string;
  moveNode(id: string, x: number, y: number): void;
  setParam(id: string, key: string, value: ParamValue): void;
  connect(fromId: string, fromPort: string, toId: string, toPort: string): boolean;
  removeNode(id: string): void;
  removeEdge(id: string): void;
  select(sel: Selection | null): void;
  clear(): void;
}

function demoState(): { nodes: Record<string, FlowNode>; edges: Record<string, FlowEdge> } {
  const node = (id: string, kind: string, x: number, y: number, params: Record<string, ParamValue> = {}): FlowNode => ({
    id,
    kind,
    x,
    y,
    params,
  });
  const edge = (id: string, from: string, fromPort: string, to: string, toPort: string): FlowEdge => ({
    id,
    from,
    fromPort,
    to,
    toPort,
  });
  return {
    nodes: {
      c1: node('c1', 'constant', 60, 140, { value: 10 }),
      c2: node('c2', 'constant', 60, 240, { value: 3 }),
      s1: node('s1', 'slider', 60, 360, { value: 2, min: 0, max: 10, step: 0.5 }),
      add1: node('add1', 'add', 360, 160),
      mul1: node('mul1', 'mul', 640, 240),
      out1: node('out1', 'output', 900, 200),
    },
    edges: {
      e1: edge('e1', 'c1', 'value', 'add1', 'a'),
      e2: edge('e2', 'c2', 'value', 'add1', 'b'),
      e3: edge('e3', 'add1', 'out', 'mul1', 'a'),
      e4: edge('e4', 's1', 'value', 'mul1', 'b'),
      e5: edge('e5', 'mul1', 'out', 'out1', 'in'),
    },
  };
}

function demoGraph(): ReturnType<typeof demoState> {
  return demoState();
}

export const useGraphStore = create<GraphState>()((set, get) => ({
  nodes: demoGraph().nodes,
  edges: demoGraph().edges,
  selection: null,

  addNode(kind, x, y) {
    const id = uid('n');
    set((s) => ({
      nodes: { ...s.nodes, [id]: { id, kind, x, y, params: {} } },
      selection: { kind: 'node', id },
    }));
    return id;
  },

  moveNode(id, x, y) {
    set((s) => {
      const node = s.nodes[id];
      if (!node) return s;
      return { nodes: { ...s.nodes, [id]: { ...node, x, y } } };
    });
  },

  setParam(id, key, value) {
    set((s) => {
      const node = s.nodes[id];
      if (!node) return s;
      return { nodes: { ...s.nodes, [id]: { ...node, params: { ...node.params, [key]: value } } } };
    });
  },

  connect(fromId, fromPort, toId, toPort) {
    const existing = Object.values(get().edges).find(
      (e) => e.from === fromId && e.to === toId && e.toPort === toPort,
    );
    if (existing) return false;
    const id = uid('e');
    set((s) => ({
      edges: { ...s.edges, [id]: { id, from: fromId, fromPort, to: toId, toPort } },
    }));
    return true;
  },

  removeNode(id) {
    set((s) => {
      const nodes = { ...s.nodes };
      delete nodes[id];
      const edges: Record<string, FlowEdge> = {};
      for (const [eid, e] of Object.entries(s.edges)) {
        if (e.from !== id && e.to !== id) edges[eid] = e;
      }
      return {
        nodes,
        edges,
        selection: s.selection?.id === id ? null : s.selection,
      };
    });
  },

  removeEdge(id) {
    set((s) => {
      const edges = { ...s.edges };
      delete edges[id];
      return {
        edges,
        selection: s.selection?.kind === 'edge' && s.selection.id === id ? null : s.selection,
      };
    });
  },

  select(sel) {
    set({ selection: sel });
  },

  clear() {
    set({ nodes: {}, edges: {}, selection: null });
  },
}));