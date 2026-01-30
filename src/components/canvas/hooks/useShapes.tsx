import { useState, useCallback } from 'react';
import type { Stage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Rect, Circle, Line, Arrow } from 'react-konva';
import { useCanvasStore } from '../../../store/canvasStore';
import type {
  RectangleElement,
  CircleElement,
  LineElement,
  ArrowElement,
  CanvasTool,
} from '../../../types/canvas';

interface ShapeDrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const SHAPE_TOOLS: CanvasTool[] = ['rectangle', 'circle', 'line', 'arrow'];

export function useShapes(stageRef: React.RefObject<Stage | null>) {
  const [shapeState, setShapeState] = useState<ShapeDrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const activeTool = useCanvasStore((state) => state.activeTool);
  const toolSettings = useCanvasStore((state) => state.toolSettings);
  const viewport = useCanvasStore((state) => state.viewport);
  const gridSettings = useCanvasStore((state) => state.gridSettings);
  const addElement = useCanvasStore((state) => state.addElement);

  const isShapeTool = SHAPE_TOOLS.includes(activeTool);

  // Snap to grid helper
  const snapToGrid = useCallback(
    (value: number) => {
      if (!gridSettings.snapToGrid) return value;
      return Math.round(value / gridSettings.size) * gridSettings.size;
    },
    [gridSettings]
  );

  // Get pointer position in canvas coordinates
  const getPointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    return {
      x: snapToGrid((pointer.x - viewport.x) / viewport.scale),
      y: snapToGrid((pointer.y - viewport.y) / viewport.scale),
    };
  }, [stageRef, viewport, snapToGrid]);

  // Start drawing shape
  const handleShapeStart = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isShapeTool) return;
      if (e.evt.type === 'mousedown' && (e.evt as MouseEvent).button !== 0) return;

      const pos = getPointerPosition();
      if (!pos) return;

      setShapeState({
        isDrawing: true,
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      });
    },
    [isShapeTool, getPointerPosition]
  );

  // Continue drawing shape
  const handleShapeMove = useCallback(
    (_e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!shapeState.isDrawing || !isShapeTool) return;

      const pos = getPointerPosition();
      if (!pos) return;

      setShapeState((prev) => ({
        ...prev,
        currentX: pos.x,
        currentY: pos.y,
      }));
    },
    [shapeState.isDrawing, isShapeTool, getPointerPosition]
  );

  // Finish drawing shape
  const handleShapeEnd = useCallback(() => {
    if (!shapeState.isDrawing || !isShapeTool) return;

    const { startX, startY, currentX, currentY } = shapeState;
    const { shapes } = toolSettings;

    // Calculate dimensions
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);

    // Minimum size threshold
    if (width < 5 && height < 5) {
      setShapeState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
      return;
    }

    // Create element based on tool
    switch (activeTool) {
      case 'rectangle': {
        const element: Omit<RectangleElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
          type: 'rectangle',
          x: minX,
          y: minY,
          width,
          height,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
          fill: shapes.fillColor,
          stroke: shapes.strokeColor,
          strokeWidth: shapes.strokeWidth,
          cornerRadius: 0,
        };
        addElement(element);
        break;
      }

      case 'circle': {
        const radius = Math.max(width, height) / 2;
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;

        const element: Omit<CircleElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
          type: 'circle',
          x: centerX,
          y: centerY,
          radius,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
          fill: shapes.fillColor,
          stroke: shapes.strokeColor,
          strokeWidth: shapes.strokeWidth,
        };
        addElement(element);
        break;
      }

      case 'line': {
        const element: Omit<LineElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
          type: 'line',
          x: 0,
          y: 0,
          points: [startX, startY, currentX, currentY],
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
          stroke: shapes.strokeColor,
          strokeWidth: shapes.strokeWidth,
          lineCap: 'round',
          dash: [],
        };
        addElement(element);
        break;
      }

      case 'arrow': {
        const element: Omit<ArrowElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
          type: 'arrow',
          x: 0,
          y: 0,
          points: [startX, startY, currentX, currentY],
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
          stroke: shapes.strokeColor,
          strokeWidth: shapes.strokeWidth,
          fill: shapes.strokeColor,
          pointerLength: 15,
          pointerWidth: 15,
        };
        addElement(element);
        break;
      }
    }

    setShapeState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, [shapeState, isShapeTool, activeTool, toolSettings, addElement]);

  return {
    shapeState,
    isShapeTool,
    handleShapeStart,
    handleShapeMove,
    handleShapeEnd,
  };
}

// Preview components for shapes being drawn
interface ShapePreviewProps {
  shapeState: ShapeDrawingState;
  tool: CanvasTool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

export function ShapePreview({
  shapeState,
  tool,
  strokeColor,
  fillColor,
  strokeWidth,
}: ShapePreviewProps) {
  if (!shapeState.isDrawing) return null;

  const { startX, startY, currentX, currentY } = shapeState;
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const minX = Math.min(startX, currentX);
  const minY = Math.min(startY, currentY);

  switch (tool) {
    case 'rectangle':
      return (
        <Rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
          listening={false}
        />
      );

    case 'circle': {
      const radius = Math.max(width, height) / 2;
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;
      return (
        <Circle
          x={centerX}
          y={centerY}
          radius={radius}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
          listening={false}
        />
      );
    }

    case 'line':
      return (
        <Line
          points={[startX, startY, currentX, currentY]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
          listening={false}
        />
      );

    case 'arrow':
      return (
        <Arrow
          points={[startX, startY, currentX, currentY]}
          stroke={strokeColor}
          fill={strokeColor}
          strokeWidth={strokeWidth}
          pointerLength={15}
          pointerWidth={15}
          dash={[5, 5]}
          listening={false}
        />
      );

    default:
      return null;
  }
}
