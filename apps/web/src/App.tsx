import { useEffect } from 'react';
import { EditorCanvas } from './canvas/EditorCanvas';
import { NodePalette } from './ui/NodePalette';
import { InspectorPanel } from './ui/InspectorPanel';
import { Toolbar } from './ui/Toolbar';
import { useEngine } from './engine/useEngine';
import { useGraphStore, saveGraphToStorage } from './store/graphStore';
import './styles/global.css';

export default function App() {
  useEngine();

  useEffect(() => {
    const unsub = useGraphStore.subscribe(() => saveGraphToStorage());
    return () => unsub();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && typing) return;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const s = useGraphStore.getState();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useGraphStore.getState().redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'c' && !typing) {
        useGraphStore.getState().copySelection();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v' && !typing) {
        e.preventDefault();
        useGraphStore.getState().paste();
        return;
      }
      if (typing) return;
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