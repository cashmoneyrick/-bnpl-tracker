import { useState, useCallback } from 'react';
import type { Stage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore } from '../../../store/canvasStore';
import type { FreehandElement } from '../../../types/canvas';

interface DrawingState {
  isDrawing: boolean;
  currentPoints: number[];
}

export function useDrawing(stageRef: React.RefObject<Stage | null>) {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPoints: [],
  });

  const activeTool = useCanvasStore((state) => state.activeTool);
  const toolSettings = useCanvasStore((state) => state.toolSettings);
  const viewport = useCanvasStore((state) => state.viewport);
  const addElement = useCanvasStore((state) => state.addElement);
  const setIsDrawing = useCanvasStore((state) => state.setIsDrawing);

  // Get pointer position in canvas coordinates
  const getPointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    // Convert screen coordinates to canvas coordinates
    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  }, [stageRef, viewport]);

  // Start drawing
  const handleDrawStart = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (activeTool !== 'pen') return;
      // Only left click for mouse events
      if (e.evt.type === 'mousedown' && (e.evt as MouseEvent).button !== 0) return;

      const pos = getPointerPosition();
      if (!pos) return;

      setDrawingState({
        isDrawing: true,
        currentPoints: [pos.x, pos.y],
      });
      setIsDrawing(true);
    },
    [activeTool, getPointerPosition, setIsDrawing]
  );

  // Continue drawing
  const handleDrawMove = useCallback(
    (_e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawingState.isDrawing || activeTool !== 'pen') return;

      const pos = getPointerPosition();
      if (!pos) return;

      // Add point to current stroke
      setDrawingState((prev) => ({
        ...prev,
        currentPoints: [...prev.currentPoints, pos.x, pos.y],
      }));
    },
    [drawingState.isDrawing, activeTool, getPointerPosition]
  );

  // End drawing
  const handleDrawEnd = useCallback(() => {
    if (!drawingState.isDrawing || activeTool !== 'pen') return;

    // Only create element if we have at least 2 points
    if (drawingState.currentPoints.length >= 4) {
      const { pen } = toolSettings;

      const element: Omit<FreehandElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
        type: 'freehand',
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: pen.opacity,
        visible: true,
        locked: false,
        points: drawingState.currentPoints,
        stroke: pen.color,
        strokeWidth: pen.size,
        tension: 0.5, // Smooth curves
        lineCap: 'round',
        lineJoin: 'round',
      };

      addElement(element);
    }

    setDrawingState({
      isDrawing: false,
      currentPoints: [],
    });
    setIsDrawing(false);
  }, [drawingState, activeTool, toolSettings, addElement, setIsDrawing]);

  return {
    drawingState,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
  };
}
