import { useState, useCallback } from 'react';
import type { Stage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasElement } from '../../../types/canvas';

interface SelectionBoxState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// Get bounding box for an element
function getElementBounds(el: CanvasElement): { left: number; top: number; right: number; bottom: number } | null {
  switch (el.type) {
    case 'rectangle':
    case 'image':
    case 'mindmap-node':
      return {
        left: el.x,
        top: el.y,
        right: el.x + el.width,
        bottom: el.y + el.height,
      };

    case 'circle':
      return {
        left: el.x - el.radius,
        top: el.y - el.radius,
        right: el.x + el.radius,
        bottom: el.y + el.radius,
      };

    case 'text':
      return {
        left: el.x,
        top: el.y,
        right: el.x + (el.width || 100),
        bottom: el.y + el.fontSize * 1.5,
      };

    case 'freehand':
    case 'line':
    case 'arrow': {
      const points = el.points;
      if (points.length < 2) return null;

      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      for (let i = 0; i < points.length; i += 2) {
        minX = Math.min(minX, points[i]);
        maxX = Math.max(maxX, points[i]);
        minY = Math.min(minY, points[i + 1]);
        maxY = Math.max(maxY, points[i + 1]);
      }

      return { left: minX, top: minY, right: maxX, bottom: maxY };
    }

    case 'mindmap-connection':
      // Skip connections
      return null;

    default:
      return null;
  }
}

export function useSelection(stageRef: React.RefObject<Stage | null>) {
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const activeTool = useCanvasStore((state) => state.activeTool);
  const elements = useCanvasStore((state) => state.elements);
  const selectElements = useCanvasStore((state) => state.selectElements);
  const deselectAll = useCanvasStore((state) => state.deselectAll);

  const getPointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    const viewport = useCanvasStore.getState().viewport;
    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  }, [stageRef]);

  const handleSelectionStart = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (activeTool !== 'select') return;
      // Only start selection box if clicking on empty stage
      if (e.target !== stageRef.current) return;
      if (e.evt.button !== 0) return;

      const pos = getPointerPosition();
      if (!pos) return;

      setSelectionBox({
        isSelecting: true,
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      });
    },
    [activeTool, stageRef, getPointerPosition]
  );

  const handleSelectionMove = useCallback(
    (_e: KonvaEventObject<MouseEvent>) => {
      if (!selectionBox.isSelecting) return;

      const pos = getPointerPosition();
      if (!pos) return;

      setSelectionBox((prev) => ({
        ...prev,
        currentX: pos.x,
        currentY: pos.y,
      }));
    },
    [selectionBox.isSelecting, getPointerPosition]
  );

  const handleSelectionEnd = useCallback(() => {
    if (!selectionBox.isSelecting) return;

    const { startX, startY, currentX, currentY } = selectionBox;
    const boxLeft = Math.min(startX, currentX);
    const boxRight = Math.max(startX, currentX);
    const boxTop = Math.min(startY, currentY);
    const boxBottom = Math.max(startY, currentY);

    const boxWidth = boxRight - boxLeft;
    const boxHeight = boxBottom - boxTop;

    // If box is too small, treat as a click (deselect)
    if (boxWidth < 5 || boxHeight < 5) {
      deselectAll();
      setSelectionBox({
        isSelecting: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
      return;
    }

    // Find all elements that intersect with selection box
    const selectedIds = elements
      .filter((el) => {
        const bounds = getElementBounds(el);
        if (!bounds) return false;

        // Check intersection (not fully contained, just overlapping)
        return !(
          bounds.right < boxLeft ||
          bounds.left > boxRight ||
          bounds.bottom < boxTop ||
          bounds.top > boxBottom
        );
      })
      .map((el) => el.id);

    if (selectedIds.length > 0) {
      selectElements(selectedIds);
    } else {
      // No elements in box, deselect
      deselectAll();
    }

    setSelectionBox({
      isSelecting: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, [selectionBox, elements, selectElements, deselectAll]);

  return {
    selectionBox,
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,
  };
}
