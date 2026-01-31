import { useState, useCallback } from 'react';
import type { Stage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore } from '../../../store/canvasStore';

interface TextDrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const MIN_BOX_WIDTH = 30;
const MIN_BOX_HEIGHT = 20;

export function useText(stageRef: React.RefObject<Stage | null>) {
  const [drawingState, setDrawingState] = useState<TextDrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const activeTool = useCanvasStore((state) => state.activeTool);
  const textInputState = useCanvasStore((state) => state.textInputState);
  const gridSettings = useCanvasStore((state) => state.gridSettings);

  const snapToGrid = useCallback(
    (value: number) => {
      if (!gridSettings.snapToGrid) return value;
      return Math.round(value / gridSettings.size) * gridSettings.size;
    },
    [gridSettings]
  );

  const getPointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const viewport = useCanvasStore.getState().viewport;
    return {
      x: snapToGrid((pointer.x - viewport.x) / viewport.scale),
      y: snapToGrid((pointer.y - viewport.y) / viewport.scale),
    };
  }, [stageRef, snapToGrid]);

  // Convert canvas coords to screen coords for the textarea overlay
  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number, width: number, height: number) => {
      const stage = stageRef.current;
      if (!stage) return { screenX: 0, screenY: 0, screenWidth: 0, screenHeight: 0 };
      const viewport = useCanvasStore.getState().viewport;
      const container = stage.container();
      const rect = container.getBoundingClientRect();
      return {
        screenX: rect.left + canvasX * viewport.scale + viewport.x,
        screenY: rect.top + canvasY * viewport.scale + viewport.y,
        screenWidth: width * viewport.scale,
        screenHeight: height * viewport.scale,
      };
    },
    [stageRef]
  );

  const handleTextStart = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const currentTool = useCanvasStore.getState().activeTool;
      if (currentTool !== 'text') return;

      // Don't start drawing while inputting
      const { textInputState } = useCanvasStore.getState();
      if (textInputState.isInputting) return;

      if (e.evt.type === 'mousedown' && (e.evt as MouseEvent).button !== 0) return;

      const pos = getPointerPosition();
      if (!pos) return;

      setDrawingState({
        isDrawing: true,
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      });
    },
    [getPointerPosition]
  );

  const handleTextMove = useCallback(
    (_e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawingState.isDrawing) return;
      const pos = getPointerPosition();
      if (!pos) return;
      setDrawingState((prev) => ({
        ...prev,
        currentX: pos.x,
        currentY: pos.y,
      }));
    },
    [drawingState.isDrawing, getPointerPosition]
  );

  const handleTextEnd = useCallback(() => {
    if (!drawingState.isDrawing) return;

    const { startX, startY, currentX, currentY } = drawingState;
    const boxWidth = Math.abs(currentX - startX);
    const boxHeight = Math.abs(currentY - startY);
    const boxX = Math.min(startX, currentX);
    const boxY = Math.min(startY, currentY);

    // Reset drawing state
    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });

    // Check minimum size
    if (boxWidth < MIN_BOX_WIDTH || boxHeight < MIN_BOX_HEIGHT) {
      return; // Too small, cancel
    }

    // Calculate font size from box height
    const fontSize = Math.max(12, Math.min(96, Math.floor(boxHeight * 0.6)));

    // Convert to screen coordinates for the textarea overlay
    const screenCoords = canvasToScreen(boxX, boxY, boxWidth, boxHeight);

    // Set input state in store
    useCanvasStore.getState().setTextInputState({
      isInputting: true,
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      fontSize,
      ...screenCoords,
    });
  }, [drawingState, canvasToScreen]);

  const handleTextCancel = useCallback(() => {
    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
    useCanvasStore.getState().clearTextInput();
  }, []);

  return {
    drawingState,
    textInputState,
    isTextTool: activeTool === 'text',
    handleTextStart,
    handleTextMove,
    handleTextEnd,
    handleTextCancel,
  };
}
