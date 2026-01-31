import { forwardRef } from 'react';
import { Rect, Circle } from 'react-konva';
import type Konva from 'konva';
import type { RectangleElement, CircleElement } from '../../../types/canvas';
import { useCanvasStore } from '../../../store/canvasStore';

interface RectangleProps {
  element: RectangleElement;
  isSelected?: boolean;
  isEraserHovering?: boolean;
  onSelect: () => void;
}

export const RectangleShape = forwardRef<Konva.Rect, RectangleProps>(
  ({ element, isSelected, isEraserHovering, onSelect }, ref) => {
    const updateElement = useCanvasStore((state) => state.updateElement);
    const activeTool = useCanvasStore((state) => state.activeTool);
    const gridSettings = useCanvasStore((state) => state.gridSettings);

    const snapToGrid = (value: number) => {
      if (!gridSettings.snapToGrid) return value;
      return Math.round(value / gridSettings.size) * gridSettings.size;
    };

    const handleDragEnd = (e: { target: { x: (val?: number) => number; y: (val?: number) => number } }) => {
      const selectedIds = useCanvasStore.getState().selectedElementIds;
      const dx = e.target.x() - element.x;
      const dy = e.target.y() - element.y;

      // Group move: if this element is part of a multi-selection, move all selected elements
      if (selectedIds.length > 1 && selectedIds.includes(element.id)) {
        useCanvasStore.getState().moveSelectedElements(dx, dy);
        // Reset position to original (moveSelectedElements updates the store)
        e.target.x(element.x);
        e.target.y(element.y);
      } else {
        // Single element move
        updateElement(element.id, {
          x: snapToGrid(e.target.x()),
          y: snapToGrid(e.target.y()),
        });
      }
    };

    // Determine shadow color based on state
    const getShadowColor = () => {
      if (isEraserHovering) return '#ef4444'; // Red for eraser hover
      if (isSelected) return '#3b82f6'; // Blue for selection
      return undefined;
    };

    const getShadowBlur = () => {
      if (isEraserHovering) return 15;
      if (isSelected) return 10;
      return 0;
    };

    return (
      <Rect
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={element.fill}
        stroke={isEraserHovering ? '#ef4444' : element.stroke}
        strokeWidth={isEraserHovering ? Math.max(element.strokeWidth, 2) : element.strokeWidth}
        cornerRadius={element.cornerRadius}
        rotation={element.rotation}
        scaleX={element.scaleX}
        scaleY={element.scaleY}
        opacity={isEraserHovering ? 0.7 : element.opacity}
        visible={element.visible}
        draggable={activeTool === 'select' && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        shadowColor={getShadowColor()}
        shadowBlur={getShadowBlur()}
        shadowOpacity={isEraserHovering || isSelected ? 0.5 : 0}
      />
    );
  }
);

RectangleShape.displayName = 'RectangleShape';

interface CircleProps {
  element: CircleElement;
  isSelected?: boolean;
  isEraserHovering?: boolean;
  onSelect: () => void;
}

export const CircleShape = forwardRef<Konva.Circle, CircleProps>(
  ({ element, isSelected, isEraserHovering, onSelect }, ref) => {
    const updateElement = useCanvasStore((state) => state.updateElement);
    const activeTool = useCanvasStore((state) => state.activeTool);
    const gridSettings = useCanvasStore((state) => state.gridSettings);

    const snapToGrid = (value: number) => {
      if (!gridSettings.snapToGrid) return value;
      return Math.round(value / gridSettings.size) * gridSettings.size;
    };

    const handleDragEnd = (e: { target: { x: (val?: number) => number; y: (val?: number) => number } }) => {
      const selectedIds = useCanvasStore.getState().selectedElementIds;
      const dx = e.target.x() - element.x;
      const dy = e.target.y() - element.y;

      // Group move: if this element is part of a multi-selection, move all selected elements
      if (selectedIds.length > 1 && selectedIds.includes(element.id)) {
        useCanvasStore.getState().moveSelectedElements(dx, dy);
        // Reset position to original (moveSelectedElements updates the store)
        e.target.x(element.x);
        e.target.y(element.y);
      } else {
        // Single element move
        updateElement(element.id, {
          x: snapToGrid(e.target.x()),
          y: snapToGrid(e.target.y()),
        });
      }
    };

    // Determine shadow color based on state
    const getShadowColor = () => {
      if (isEraserHovering) return '#ef4444';
      if (isSelected) return '#3b82f6';
      return undefined;
    };

    const getShadowBlur = () => {
      if (isEraserHovering) return 15;
      if (isSelected) return 10;
      return 0;
    };

    return (
      <Circle
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        radius={element.radius}
        fill={element.fill}
        stroke={isEraserHovering ? '#ef4444' : element.stroke}
        strokeWidth={isEraserHovering ? Math.max(element.strokeWidth, 2) : element.strokeWidth}
        rotation={element.rotation}
        scaleX={element.scaleX}
        scaleY={element.scaleY}
        opacity={isEraserHovering ? 0.7 : element.opacity}
        visible={element.visible}
        draggable={activeTool === 'select' && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        shadowColor={getShadowColor()}
        shadowBlur={getShadowBlur()}
        shadowOpacity={isEraserHovering || isSelected ? 0.5 : 0}
      />
    );
  }
);

CircleShape.displayName = 'CircleShape';
