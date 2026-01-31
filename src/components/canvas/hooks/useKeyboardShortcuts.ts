import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasTool } from '../../../types/canvas';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;

  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const setSpacebarPanning = useCanvasStore((state) => state.setSpacebarPanning);
  const setIsPanning = useCanvasStore((state) => state.setIsPanning);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const selectAll = useCanvasStore((state) => state.selectAll);
  const deselectAll = useCanvasStore((state) => state.deselectAll);
  const deleteElements = useCanvasStore((state) => state.deleteElements);

  // Check if user is currently editing text (input/textarea focused)
  const isEditingText = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const tagName = activeElement.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' ||
           (activeElement as HTMLElement).isContentEditable;
  }, []);

  // Tool shortcut mapping
  const toolShortcuts: Record<string, CanvasTool> = {
    v: 'select',
    h: 'pan',
    p: 'pen',
    e: 'eraser',
    r: 'rectangle',
    o: 'circle',
    l: 'line',
    a: 'arrow',
    t: 'text',
    i: 'image',
    m: 'mindmap',
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Never intercept keys during text input
      const { textInputState } = useCanvasStore.getState();
      if (textInputState.isInputting) return;

      // Space bar for temporary panning
      if (e.code === 'Space' && !e.repeat && !isEditingText()) {
        e.preventDefault();
        setSpacebarPanning(true);
        return;
      }

      // Skip shortcuts when editing text
      if (isEditingText()) return;

      const isMeta = e.metaKey || e.ctrlKey;

      // Undo: Cmd/Ctrl + Z
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((isMeta && e.key === 'z' && e.shiftKey) || (isMeta && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Select All: Cmd/Ctrl + A
      if (isMeta && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // Escape: Deselect all
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectAll();
        return;
      }

      // Delete/Backspace: Delete selected elements
      // Read fresh from store to avoid stale closure
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = useCanvasStore.getState().selectedElementIds;
        if (ids.length > 0) {
          e.preventDefault();
          deleteElements(ids);
        }
        return;
      }

      // Tool shortcuts (single keys without modifiers)
      if (!isMeta && !e.altKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        const tool = toolShortcuts[key];
        if (tool) {
          e.preventDefault();
          setActiveTool(tool);
          return;
        }
      }
    },
    [
      enabled,
      isEditingText,
      setSpacebarPanning,
      undo,
      redo,
      selectAll,
      deselectAll,
      deleteElements,
      setActiveTool,
    ]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Release space bar panning
      if (e.code === 'Space') {
        setSpacebarPanning(false);
        setIsPanning(false);
        return;
      }
    },
    [enabled, setSpacebarPanning, setIsPanning]
  );

  // Handle window blur (release spacebar when window loses focus)
  const handleWindowBlur = useCallback(() => {
    setSpacebarPanning(false);
    setIsPanning(false);
  }, [setSpacebarPanning, setIsPanning]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, handleKeyDown, handleKeyUp, handleWindowBlur]);

  return null;
}
