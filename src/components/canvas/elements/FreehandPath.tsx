import { forwardRef } from 'react';
import { Line } from 'react-konva';
import type Konva from 'konva';
import type { FreehandElement } from '../../../types/canvas';
import { useCanvasStore } from '../../../store/canvasStore';

interface FreehandPathProps {
  element: FreehandElement;
  isSelected?: boolean;
  isEraserHovering?: boolean;
  onSelect: () => void;
}

export const FreehandPath = forwardRef<Konva.Line, FreehandPathProps>(
  ({ element, isSelected, isEraserHovering, onSelect }, ref) => {
    const updateElement = useCanvasStore((state) => state.updateElement);
    const activeTool = useCanvasStore((state) => state.activeTool);

    const handleClick = () => {
      if (activeTool === 'select') {
        onSelect();
      }
    };

    const handleDragEnd = (e: { target: { x: (val?: number) => number; y: (val?: number) => number } }) => {
      // Update all points by the drag offset
      const dx = e.target.x();
      const dy = e.target.y();

      if (dx !== 0 || dy !== 0) {
        const selectedIds = useCanvasStore.getState().selectedElementIds;

        // Group move: if this element is part of a multi-selection, move all selected elements
        if (selectedIds.length > 1 && selectedIds.includes(element.id)) {
          useCanvasStore.getState().moveSelectedElements(dx, dy);
        } else {
          // Single element move - snap the delta, not each point
          const gridSettings = useCanvasStore.getState().gridSettings;
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
        // Reset position since we updated the points
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
        tension={element.tension}
        lineCap={element.lineCap}
        lineJoin={element.lineJoin}
        opacity={isEraserHovering ? 0.7 : element.opacity}
        visible={element.visible}
        draggable={activeTool === 'select' && !element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDragEnd={handleDragEnd}
        hitStrokeWidth={Math.max(element.strokeWidth, 20)} // Easier to select thin lines
        shadowColor={getShadowColor()}
        shadowBlur={getShadowBlur()}
        shadowOpacity={isEraserHovering || isSelected ? 0.5 : 0}
      />
    );
  }
);

FreehandPath.displayName = 'FreehandPath';

// Component for rendering the current drawing stroke (not yet saved)
interface CurrentStrokeProps {
  points: number[];
  color: string;
  size: number;
  opacity: number;
}

export function CurrentStroke({ points, color, size, opacity }: CurrentStrokeProps) {
  if (points.length < 4) return null;

  return (
    <Line
      points={points}
      stroke={color}
      strokeWidth={size}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      opacity={opacity}
      listening={false}
    />
  );
}
