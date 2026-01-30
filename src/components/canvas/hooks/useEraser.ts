import { useState, useCallback, useMemo } from 'react';
import type { Stage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore } from '../../../store/canvasStore';
import type {
  CanvasElement,
  FreehandElement,
  RectangleElement,
  CircleElement,
  LineElement,
  ArrowElement,
  TextElement,
  ImageElement,
  MindMapNodeElement,
} from '../../../types/canvas';

interface EraserState {
  isErasing: boolean;
  hoveredElementIds: string[];
}

// Check if a point is within the eraser radius of any point in a freehand path
function isPointNearPath(
  px: number,
  py: number,
  element: FreehandElement,
  radius: number
): boolean {
  const points = element.points;
  for (let i = 0; i < points.length - 1; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    const distance = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
    if (distance <= radius + element.strokeWidth / 2) {
      return true;
    }
  }
  return false;
}

// Check if eraser circle intersects with rectangle
function isNearRectangle(
  px: number,
  py: number,
  element: RectangleElement,
  radius: number
): boolean {
  // Find closest point on rectangle to eraser center
  const closestX = Math.max(element.x, Math.min(px, element.x + element.width));
  const closestY = Math.max(element.y, Math.min(py, element.y + element.height));
  const distance = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  return distance <= radius;
}

// Check if eraser circle intersects with circle element
function isNearCircle(
  px: number,
  py: number,
  element: CircleElement,
  radius: number
): boolean {
  const distance = Math.sqrt((px - element.x) ** 2 + (py - element.y) ** 2);
  return distance <= radius + element.radius;
}

// Calculate distance from point to line segment
function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if eraser is near a line element
function isNearLine(
  px: number,
  py: number,
  element: LineElement | ArrowElement,
  radius: number
): boolean {
  const points = element.points;
  // Handle multi-segment lines
  for (let i = 0; i < points.length - 2; i += 2) {
    const x1 = points[i];
    const y1 = points[i + 1];
    const x2 = points[i + 2];
    const y2 = points[i + 3];
    const distance = pointToLineDistance(px, py, x1, y1, x2, y2);
    if (distance <= radius + element.strokeWidth / 2) {
      return true;
    }
  }
  return false;
}

// Check if eraser is near text element (bounding box)
function isNearText(
  px: number,
  py: number,
  element: TextElement,
  radius: number
): boolean {
  const width = element.width || 200;
  const height = element.fontSize * 1.5; // Approximate height
  const closestX = Math.max(element.x, Math.min(px, element.x + width));
  const closestY = Math.max(element.y, Math.min(py, element.y + height));
  const distance = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  return distance <= radius;
}

// Check if eraser is near image element (bounding box)
function isNearImage(
  px: number,
  py: number,
  element: ImageElement,
  radius: number
): boolean {
  const closestX = Math.max(element.x, Math.min(px, element.x + element.width));
  const closestY = Math.max(element.y, Math.min(py, element.y + element.height));
  const distance = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  return distance <= radius;
}

// Check if eraser is near mindmap node
function isNearMindMapNode(
  px: number,
  py: number,
  element: MindMapNodeElement,
  radius: number
): boolean {
  const closestX = Math.max(element.x, Math.min(px, element.x + element.width));
  const closestY = Math.max(element.y, Math.min(py, element.y + element.height));
  const distance = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  return distance <= radius;
}

// Check if eraser point is near an element
function isNearElement(
  px: number,
  py: number,
  element: CanvasElement,
  radius: number
): boolean {
  switch (element.type) {
    case 'freehand':
      return isPointNearPath(px, py, element, radius);
    case 'rectangle':
      return isNearRectangle(px, py, element, radius);
    case 'circle':
      return isNearCircle(px, py, element, radius);
    case 'line':
      return isNearLine(px, py, element, radius);
    case 'arrow':
      return isNearLine(px, py, element, radius);
    case 'text':
      return isNearText(px, py, element, radius);
    case 'image':
      return isNearImage(px, py, element, radius);
    case 'mindmap-node':
      return isNearMindMapNode(px, py, element, radius);
    case 'mindmap-connection':
      // Don't allow erasing connections directly (they're tied to nodes)
      return false;
    default:
      return false;
  }
}

export function useEraser(stageRef: React.RefObject<Stage | null>) {
  const [eraserState, setEraserState] = useState<EraserState>({
    isErasing: false,
    hoveredElementIds: [],
  });

  const activeTool = useCanvasStore((state) => state.activeTool);
  const toolSettings = useCanvasStore((state) => state.toolSettings);
  const viewport = useCanvasStore((state) => state.viewport);
  const elements = useCanvasStore((state) => state.elements);
  const deleteElements = useCanvasStore((state) => state.deleteElements);

  // Get pointer position in canvas coordinates
  const getPointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  }, [stageRef, viewport]);

  // Find elements under eraser cursor (for hover preview)
  const findElementsUnderEraser = useCallback(() => {
    const pos = getPointerPosition();
    if (!pos) return [];

    const eraserRadius = toolSettings.eraser.size / 2;
    const hoveredIds: string[] = [];

    for (const element of elements) {
      if (isNearElement(pos.x, pos.y, element, eraserRadius)) {
        hoveredIds.push(element.id);
      }
    }

    return hoveredIds;
  }, [getPointerPosition, toolSettings.eraser.size, elements]);

  // Update hover state
  const updateHoverState = useCallback(() => {
    if (activeTool !== 'eraser') {
      if (eraserState.hoveredElementIds.length > 0) {
        setEraserState((prev) => ({ ...prev, hoveredElementIds: [] }));
      }
      return;
    }

    const hoveredIds = findElementsUnderEraser();
    setEraserState((prev) => ({
      ...prev,
      hoveredElementIds: hoveredIds,
    }));
  }, [activeTool, findElementsUnderEraser, eraserState.hoveredElementIds.length]);

  // Check and erase elements under cursor
  const eraseAtPosition = useCallback(() => {
    const pos = getPointerPosition();
    if (!pos) return;

    const eraserRadius = toolSettings.eraser.size / 2;
    const elementsToDelete: string[] = [];

    for (const element of elements) {
      if (isNearElement(pos.x, pos.y, element, eraserRadius)) {
        elementsToDelete.push(element.id);
      }
    }

    if (elementsToDelete.length > 0) {
      deleteElements(elementsToDelete);
    }
  }, [getPointerPosition, toolSettings.eraser.size, elements, deleteElements]);

  // Start erasing
  const handleEraseStart = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (activeTool !== 'eraser') return;
      if (e.evt.type === 'mousedown' && (e.evt as MouseEvent).button !== 0) return;

      setEraserState((prev) => ({ ...prev, isErasing: true }));
      eraseAtPosition();
    },
    [activeTool, eraseAtPosition]
  );

  // Continue erasing and update hover state
  const handleEraseMove = useCallback(
    (_e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (activeTool !== 'eraser') return;

      // Always update hover state when eraser tool is active
      updateHoverState();

      // Only erase when mouse is pressed
      if (eraserState.isErasing) {
        eraseAtPosition();
      }
    },
    [activeTool, eraserState.isErasing, eraseAtPosition, updateHoverState]
  );

  // Stop erasing
  const handleEraseEnd = useCallback(() => {
    setEraserState((prev) => ({ ...prev, isErasing: false }));
  }, []);

  // Memoized set of hovered element IDs for efficient lookup
  const hoveredElementIdsSet = useMemo(
    () => new Set(eraserState.hoveredElementIds),
    [eraserState.hoveredElementIds]
  );

  return {
    eraserState,
    hoveredElementIdsSet,
    handleEraseStart,
    handleEraseMove,
    handleEraseEnd,
  };
}
