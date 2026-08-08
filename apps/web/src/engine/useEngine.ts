import { useEffect, useRef } from 'react';
import { EngineBridge } from 'flow-engine';
import { toWire, diff } from 'flow-types';
import type { FlowGraph, NodeValue } from 'flow-types';
import { useGraphStore } from '../store/graphStore';
import { useEngineStore } from '../store/engineStore';

const snapshot = (): string => {
  const s = useGraphStore.getState();
  return JSON.stringify({ nodes: s.nodes, edges: s.edges });
};

const mergeValues = (
  prev: Record<string, NodeValue>,
  next: Record<string, NodeValue>,
  nodeIds: string[],
): Record<string, NodeValue> => {
  const merged: Record<string, NodeValue> = {};
  for (const id of nodeIds) merged[id] = next[id] ?? prev[id];
  return merged;
};

export function useEngine() {
  const started = useRef(false);
  const lastSent = useRef('');
  const prevGraph = useRef<FlowGraph>({ nodes: {}, edges: {} });

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const worker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
    const bridge = new EngineBridge(worker);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const sync = async () => {
      const graph = useGraphStore.getState();
      const delta = diff(prevGraph.current, graph);
      prevGraph.current = { nodes: { ...graph.nodes }, edges: { ...graph.edges } };
      if (!delta.nodesAdded && !delta.nodesRemoved && !delta.nodesChanged && !delta.edgesAdded && !delta.edgesRemoved) {
        return;
      }
      try {
        useEngineStore.getState().setStatus('running');
        const dirty = await bridge.patch(delta);
        if (dirty.length === 0) {
          useEngineStore.getState().setStatus('idle');
          return;
        }
        const result = await bridge.run();
        const oldValues = useEngineStore.getState().values;
        useEngineStore.getState().setRun(
          result.runMs,
          mergeValues(oldValues, result.values, Object.keys(graph.nodes)),
          {
            nodes: Object.keys(graph.nodes).length,
            edges: Object.keys(graph.edges).length,
          },
        );
        useEngineStore.getState().setStatus('idle');
      } catch (err) {
        if (!disposed) {
          useEngineStore.getState().setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    bridge
      .open()
      .then(async () => {
        const graph = useGraphStore.getState();
        prevGraph.current = { nodes: { ...graph.nodes }, edges: { ...graph.edges } };
        await bridge.setGraph(toWire(graph));
        const result = await bridge.run();
        useEngineStore.getState().setRun(
          result.runMs,
          mergeValues({}, result.values, Object.keys(graph.nodes)),
          {
            nodes: Object.keys(graph.nodes).length,
            edges: Object.keys(graph.edges).length,
          },
        );
        useEngineStore.getState().setStatus('idle');
      })
      .catch((err) => {
        useEngineStore.getState().setError(err instanceof Error ? err.message : String(err));
      });

    const unsub = useGraphStore.subscribe(() => {
      const next = snapshot();
      if (next === lastSent.current) return;
      lastSent.current = next;
      if (timer) clearTimeout(timer);
      timer = setTimeout(sync, 120);
    });
    lastSent.current = snapshot();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      unsub();
      bridge.dispose();
    };
  }, []);
}