import { useCallback } from 'react';
import type { Stage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore } from '../../../store/canvasStore';
import type { TextElement } from '../../../types/canvas';

export function useText(stageRef: React.RefObject<Stage | null>) {
  const textState = useCanvasStore((state) => state.textCreationState);
  const cancelTextCreation = useCanvasStore((state) => state.cancelTextCreation);

  const activeTool = useCanvasStore((state) => state.activeTool);
  const toolSettings = useCanvasStore((state) => state.toolSettings);
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
      // Read fresh state to avoid stale closure issues
      const currentTool = useCanvasStore.getState().activeTool;
      const currentViewport = useCanvasStore.getState().viewport;

      if (currentTool !== 'text') return;
      if (e.evt.type === 'mousedown' && (e.evt as MouseEvent).button !== 0) return;

      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Convert to canvas coordinates
      const canvasX = snapToGrid((pointer.x - currentViewport.x) / currentViewport.scale);
      const canvasY = snapToGrid((pointer.y - currentViewport.y) / currentViewport.scale);

      // Get screen coordinates for the input overlay
      const container = stage.container();
      const rect = container.getBoundingClientRect();
      const screenX = rect.left + pointer.x;
      const screenY = rect.top + pointer.y;

      // Call directly from store to avoid stale closure
      useCanvasStore.getState().startTextCreation({
        x: canvasX,
        y: canvasY,
        screenX,
        screenY,
      });
    },
    [stageRef, snapToGrid]
  );

  const handleTextComplete = useCallback(
    (text: string) => {
      if (!text.trim()) {
        cancelTextCreation();
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
      cancelTextCreation();
    },
    [textState.x, textState.y, toolSettings.text, addElement, cancelTextCreation]
  );

  const handleTextCancel = useCallback(() => {
    cancelTextCreation();
  }, [cancelTextCreation]);

  return {
    textState,
    isTextTool: activeTool === 'text',
    handleTextStart,
    handleTextComplete,
    handleTextCancel,
    textSettings: toolSettings.text,
  };
}
