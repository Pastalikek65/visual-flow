import { FlowEngine } from './wasm-gen/flow_core';
import type { NodeValue } from 'flow-types';
import type { WireGraphData, WirePatchData } from 'flow-types';

let engine: FlowEngine | undefined;

const post = (id: number, ok: boolean, result?: unknown, error?: string) => {
  (self as unknown as { postMessage(m: unknown): void }).postMessage({ id, ok, result, error });
};

self.onmessage = async (ev: MessageEvent<{ id: number; method: string; payload: unknown }>) => {
  const { id, method, payload } = ev.data;
  try {
    if (method === 'init') {
      engine = new FlowEngine();
      post(id, true);
      return;
    }
    if (!engine) throw new Error('engine not initialized');

    switch (method) {
      case 'setGraph': {
        engine.set_graph(JSON.stringify(payload as WireGraphData));
        post(id, true);
        break;
      }
      case 'patchGraph': {
        const dirty = engine.patch_graph(JSON.stringify(payload as WirePatchData));
        post(id, true, Array.from(dirty));
        break;
      }
      case 'run': {
        const t0 = performance.now();
        const json = engine.run();
        const values = JSON.parse(json) as Record<string, unknown>;
        post(id, true, { values, runMs: performance.now() - t0 });
        break;
      }
      case 'query': {
        const json = engine.query(String(payload));
        post(id, true, JSON.parse(json));
        break;
      }
      case 'canConnect': {
        const { from, to } = payload as { from: string; to: string };
        post(id, true, engine.can_connect(from, to));
        break;
      }
      case 'graphJson': {
        post(id, true, engine.graph_json());
        break;
      }
      default:
        post(id, false, undefined, `unknown method: ${method}`);
    }
  } catch (err) {
    post(id, false, undefined, err instanceof Error ? err.message : String(err));
  }
};

post(-1, true, 'worker booted');