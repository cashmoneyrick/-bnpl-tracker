import { forwardRef } from 'react';
import { Line, Arrow } from 'react-konva';
import type Konva from 'konva';
import type { LineElement as LineElementType, ArrowElement } from '../../../types/canvas';
import { useCanvasStore } from '../../../store/canvasStore';

interface LineProps {
  element: LineElementType;
  isSelected?: boolean;
  isEraserHovering?: boolean;
  onSelect: () => void;
}

export const LineShape = forwardRef<Konva.Line, LineProps>(
  ({ element, isSelected, isEraserHovering, onSelect }, ref) => {
    const updateElement = useCanvasStore((state) => state.updateElement);
    const activeTool = useCanvasStore((state) => state.activeTool);
    const gridSettings = useCanvasStore((state) => state.gridSettings);

    const handleDragEnd = (e: { target: { x: (val?: number) => number; y: (val?: number) => number } }) => {
      const dx = e.target.x();
      const dy = e.target.y();

      if (dx !== 0 || dy !== 0) {
        const selectedIds = useCanvasStore.getState().selectedElementIds;

        // Group move: if this element is part of a multi-selection, move all selected elements
        if (selectedIds.length > 1 && selectedIds.includes(element.id)) {
          useCanvasStore.getState().moveSelectedElements(dx, dy);
        } else {
          // Single element move - snap the delta, not each point
          const snappedDx = gridSettings.snapToGrid
            ? Math.round(dx / gridSettings.size) * gridSettings.size
            : dx;
          const snappedDy = gridSettings.snapToGrid
            ? Math.round(dy / gridSettings.size) * gridSettings.size
            : dy;

          const newPoints = element.points.map((p, i) =>
            i % 2 === 0 ? p + snappedDx : p + snappedDy
          );
          updateElement(element.id, { points: newPoints });
        }
        e.target.x(0);
        e.target.y(0);
      }
    };

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
      <Line
        ref={ref}
        id={element.id}
        points={element.points}
        stroke={isEraserHovering ? '#ef4444' : element.stroke}
        strokeWidth={isEraserHovering ? Math.max(element.strokeWidth, 3) : element.strokeWidth}
        lineCap={element.lineCap}
        dash={element.dash}
        rotation={element.rotation}
        scaleX={element.scaleX}
        scaleY={element.scaleY}
        opacity={isEraserHovering ? 0.7 : element.opacity}
        visible={element.visible}
        draggable={activeTool === 'select' && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        hitStrokeWidth={Math.max(element.strokeWidth, 20)}
        shadowColor={getShadowColor()}
        shadowBlur={getShadowBlur()}
        shadowOpacity={isEraserHovering || isSelected ? 0.5 : 0}
      />
    );
  }
);

LineShape.displayName = 'LineShape';

interface ArrowProps {
  element: ArrowElement;
  isSelected?: boolean;
  isEraserHovering?: boolean;
  onSelect: () => void;
}

export const ArrowShape = forwardRef<Konva.Arrow, ArrowProps>(
  ({ element, isSelected, isEraserHovering, onSelect }, ref) => {
    const updateElement = useCanvasStore((state) => state.updateElement);
    const activeTool = useCanvasStore((state) => state.activeTool);
    const gridSettings = useCanvasStore((state) => state.gridSettings);

    const handleDragEnd = (e: { target: { x: (val?: number) => number; y: (val?: number) => number } }) => {
      const dx = e.target.x();
      const dy = e.target.y();

      if (dx !== 0 || dy !== 0) {
        const selectedIds = useCanvasStore.getState().selectedElementIds;

        // Group move: if this element is part of a multi-selection, move all selected elements
        if (selectedIds.length > 1 && selectedIds.includes(element.id)) {
          useCanvasStore.getState().moveSelectedElements(dx, dy);
        } else {
          // Single element move - snap the delta, not each point
          const snappedDx = gridSettings.snapToGrid
            ? Math.round(dx / gridSettings.size) * gridSettings.size
            : dx;
          const snappedDy = gridSettings.snapToGrid
            ? Math.round(dy / gridSettings.size) * gridSettings.size
            : dy;

          const newPoints = element.points.map((p, i) =>
            i % 2 === 0 ? p + snappedDx : p + snappedDy
          );
          updateElement(element.id, { points: newPoints });
        }
        e.target.x(0);
        e.target.y(0);
      }
    };

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
      <Arrow
        ref={ref}
        id={element.id}
        points={element.points}
        stroke={isEraserHovering ? '#ef4444' : element.stroke}
        strokeWidth={isEraserHovering ? Math.max(element.strokeWidth, 3) : element.strokeWidth}
        fill={isEraserHovering ? '#ef4444' : element.fill}
        pointerLength={element.pointerLength}
        pointerWidth={element.pointerWidth}
        rotation={element.rotation}
        scaleX={element.scaleX}
        scaleY={element.scaleY}
        opacity={isEraserHovering ? 0.7 : element.opacity}
        visible={element.visible}
        draggable={activeTool === 'select' && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        hitStrokeWidth={Math.max(element.strokeWidth, 20)}
        shadowColor={getShadowColor()}
        shadowBlur={getShadowBlur()}
        shadowOpacity={isEraserHovering || isSelected ? 0.5 : 0}
      />
    );
  }
);

ArrowShape.displayName = 'ArrowShape';
