import { useState, useCallback } from 'react';
import type { Stage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore } from '../../../store/canvasStore';
import type { TextElement } from '../../../types/canvas';

interface TextCreationState {
  isCreating: boolean;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
}

export function useText(stageRef: React.RefObject<Stage | null>) {
  const [textState, setTextState] = useState<TextCreationState>({
    isCreating: false,
    x: 0,
    y: 0,
    screenX: 0,
    screenY: 0,
  });

  const activeTool = useCanvasStore((state) => state.activeTool);
  const toolSettings = useCanvasStore((state) => state.toolSettings);
  const viewport = useCanvasStore((state) => state.viewport);
  const gridSettings = useCanvasStore((state) => state.gridSettings);
  const addElement = useCanvasStore((state) => state.addElement);

  const snapToGrid = useCallback(
    (value: number) => {
      if (!gridSettings.snapToGrid) return value;
      return Math.round(value / gridSettings.size) * gridSettings.size;
    },
    [gridSettings]
  );

  const handleTextStart = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (activeTool !== 'text') return;
      if (e.evt.type === 'mousedown' && (e.evt as MouseEvent).button !== 0) return;

      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Convert to canvas coordinates
      const canvasX = snapToGrid((pointer.x - viewport.x) / viewport.scale);
      const canvasY = snapToGrid((pointer.y - viewport.y) / viewport.scale);

      // Get screen coordinates for the input overlay
      const container = stage.container();
      const rect = container.getBoundingClientRect();
      const screenX = rect.left + pointer.x;
      const screenY = rect.top + pointer.y;

      setTextState({
        isCreating: true,
        x: canvasX,
        y: canvasY,
        screenX,
        screenY,
      });
    },
    [activeTool, stageRef, viewport, snapToGrid]
  );

  const handleTextComplete = useCallback(
    (text: string) => {
      if (!text.trim()) {
        setTextState({
          isCreating: false,
          x: 0,
          y: 0,
          screenX: 0,
          screenY: 0,
        });
        return;
      }

      const textElement: Omit<TextElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
        type: 'text',
        x: textState.x,
        y: textState.y,
        text: text.trim(),
        fontSize: toolSettings.text.fontSize,
        fontFamily: toolSettings.text.fontFamily,
        fontStyle: 'normal',
        fill: toolSettings.text.color,
        align: 'left',
        padding: 4,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
      };

      addElement(textElement);

      setTextState({
        isCreating: false,
        x: 0,
        y: 0,
        screenX: 0,
        screenY: 0,
      });
    },
    [textState.x, textState.y, toolSettings.text, addElement]
  );

  const handleTextCancel = useCallback(() => {
    setTextState({
      isCreating: false,
      x: 0,
      y: 0,
      screenX: 0,
      screenY: 0,
    });
  }, []);

  return {
    textState,
    isTextTool: activeTool === 'text',
    handleTextStart,
    handleTextComplete,
    handleTextCancel,
    textSettings: toolSettings.text,
  };
}
