import { create } from 'zustand';
import type { NodeValue } from 'flow-types';

export type EngineStatus = 'idle' | 'running' | 'error';

interface EngineState {
  status: EngineStatus;
  runMs: number;
  nodeCount: number;
  edgeCount: number;
  values: Record<string, NodeValue>;
  error: string | null;

  setStatus(s: EngineStatus): void;
  setRun(runMs: number, values: Record<string, NodeValue>, count: { nodes: number; edges: number }): void;
  setError(msg: string | null): void;
}

export const useEngineStore = create<EngineState>()((set) => ({
  status: 'idle',
  runMs: 0,
  nodeCount: 0,
  edgeCount: 0,
  values: {},
  error: null,

  setStatus(s) {
    set({ status: s });
  },
  setRun(runMs, values, count) {
    set({ runMs, values, nodeCount: count.nodes, edgeCount: count.edges });
  },
  setError(msg) {
    set({ error: msg, status: msg ? 'error' : 'idle' });
  },
}));