import { Line } from 'react-konva';
import type { FreehandElement } from '../../../types/canvas';
import { useCanvasStore } from '../../../store/canvasStore';

interface FreehandPathProps {
  element: FreehandElement;
  isSelected?: boolean;
  isEraserHovering?: boolean;
}

export function FreehandPath({ element, isSelected, isEraserHovering }: FreehandPathProps) {
  const selectElements = useCanvasStore((state) => state.selectElements);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const activeTool = useCanvasStore((state) => state.activeTool);

  const handleClick = () => {
    if (activeTool === 'select') {
      selectElements([element.id]);
    }
  };

  const handleDragEnd = (e: { target: { x: (val?: number) => number; y: (val?: number) => number } }) => {
    // Update all points by the drag offset
    const dx = e.target.x();
    const dy = e.target.y();

    if (dx !== 0 || dy !== 0) {
      const newPoints = element.points.map((p, i) =>
        i % 2 === 0 ? p + dx : p + dy
      );
      updateElement(element.id, { points: newPoints });
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
