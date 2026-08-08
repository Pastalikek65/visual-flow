import { useEffect } from 'react';
import { EditorCanvas } from './canvas/EditorCanvas';
import { NodePalette } from './ui/NodePalette';
import { InspectorPanel } from './ui/InspectorPanel';
import { Toolbar } from './ui/Toolbar';
import { useEngine } from './engine/useEngine';
import { useGraphStore } from './store/graphStore';
import './styles/global.css';

export default function App() {
  useEngine();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = useGraphStore.getState().selection;
        if (!sel) return;
        const s = useGraphStore.getState();
        if (sel.kind === 'node') s.removeNode(sel.id);
        else s.removeEdge(sel.id);
      }
      if (e.key === 'Escape') {
        useGraphStore.getState().select(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <Toolbar />
      <div className="app-main">
        <NodePalette />
        <EditorCanvas />
        <InspectorPanel />
      </div>
    </div>
  );
}