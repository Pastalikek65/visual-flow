import { create } from 'zustand';
import type { NodeValue } from 'flow-types';

export interface DragState {
  nodeId: string;
  port: string;
  side: 'in' | 'out';
}

interface UiState {
  drag: DragState | null;
  hover: { nodeId: string; port: string; side: 'in' | 'out' } | null;
  cursor: { x: number; y: number } | null;

  setDrag(d: DragState | null): void;
  setHover(h: UiState['hover']): void;
  setCursor(c: UiState['cursor']): void;
}

export const useUiStore = create<UiState>()((set) => ({
  drag: null,
  hover: null,
  cursor: null,
  setDrag: (drag) => set({ drag }),
  setHover: (hover) => set({ hover }),
  setCursor: (cursor) => set({ cursor }),
}));