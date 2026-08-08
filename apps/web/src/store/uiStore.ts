import { create } from 'zustand';
import type { NodeValue } from 'flow-types';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'visual-flow:theme';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export interface DragState {
  nodeId: string;
  port: string;
  side: 'in' | 'out';
}

interface UiState {
  drag: DragState | null;
  hover: { nodeId: string; port: string; side: 'in' | 'out' } | null;
  cursor: { x: number; y: number } | null;
  theme: Theme;

  setDrag(d: DragState | null): void;
  setHover(h: UiState['hover']): void;
  setCursor(c: UiState['cursor']): void;
  setTheme(t: Theme): void;
}

export const useUiStore = create<UiState>()((set) => ({
  drag: null,
  hover: null,
  cursor: null,
  theme: initialTheme(),
  setDrag: (drag) => set({ drag }),
  setHover: (hover) => set({ hover }),
  setCursor: (cursor) => set({ cursor }),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
    set({ theme });
  },
}));