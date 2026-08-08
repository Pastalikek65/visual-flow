import type { NodeValue, WireGraphData, WirePatchData } from 'flow-types';

export type EngineMethod =
  | 'init'
  | 'setGraph'
  | 'patchGraph'
  | 'run'
  | 'query'
  | 'canConnect'
  | 'graphJson';

export interface WorkerRequest {
  id: number;
  method: EngineMethod;
  payload?: unknown;
}

export interface WorkerResponse {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export type EngineStatus = 'idle' | 'running' | 'error';

export interface EngineBus {
  postMessage(msg: WorkerRequest): void;
  terminate(): void;
  onmessage: ((ev: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((ev: ErrorEvent) => void) | null;
}

export interface EngineResult {
  values: Record<string, NodeValue>;
  runMs: number;
}

export interface EngineStats {
  nodes: number;
  edges: number;
  dirty: number;
}

export function isErrorResult(r: unknown): r is { error: string } {
  return typeof r === 'object' && r !== null && 'error' in r;
}