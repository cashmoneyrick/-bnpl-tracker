import { useMemo } from 'react';
import { Shape, Line } from 'react-konva';
import type { Context } from 'konva/lib/Context';
import type { Shape as ShapeType } from 'konva/lib/Shape';
import type { CanvasViewport } from '../../../types/canvas';

interface GridLayerProps {
  width: number;
  height: number;
  gridSize: number;
  gridColor: string;
  viewport: CanvasViewport;
}

export function GridLayer({
  width,
  height,
  gridSize,
  gridColor,
  viewport,
}: GridLayerProps) {
  // Memoize based on rounded bounds to reduce recalculations
  const gridParams = useMemo(() => {
    // Calculate visible area in canvas coordinates
    const startX = Math.floor(-viewport.x / viewport.scale / gridSize) * gridSize;
    const startY = Math.floor(-viewport.y / viewport.scale / gridSize) * gridSize;
    const endX = Math.ceil((width - viewport.x) / viewport.scale / gridSize) * gridSize;
    const endY = Math.ceil((height - viewport.y) / viewport.scale / gridSize) * gridSize;

    // Adaptive grid density based on zoom level
    let effectiveGridSize = gridSize;
    let showSubdivisions = false;

    if (viewport.scale < 0.3) {
      // Very zoomed out: show every 5th line
      effectiveGridSize = gridSize * 5;
    } else if (viewport.scale < 0.6) {
      // Zoomed out: show every 2nd line
      effectiveGridSize = gridSize * 2;
    } else if (viewport.scale > 2) {
      // Zoomed in: show subdivisions
      showSubdivisions = true;
    }

    // Clamp stroke width to prevent extreme values
    const baseStrokeWidth = Math.min(2, Math.max(0.5, 1 / viewport.scale));
    const thinStrokeWidth = Math.min(1, Math.max(0.25, 0.5 / viewport.scale));

    return {
      startX,
      startY,
      endX,
      endY,
      effectiveGridSize,
      showSubdivisions,
      baseStrokeWidth,
      thinStrokeWidth,
      subdivisionSize: gridSize / 2,
    };
  }, [
    // Use rounded values to reduce recalculations during pan
    Math.round(viewport.x / 100) * 100,
    Math.round(viewport.y / 100) * 100,
    Math.round(viewport.scale * 10) / 10,
    width,
    height,
    gridSize,
  ]);

  // Main grid drawing function
  const drawGrid = useMemo(() => {
    return (context: Context, shape: ShapeType) => {
      const {
        startX,
        startY,
        endX,
        endY,
        effectiveGridSize,
        showSubdivisions,
        subdivisionSize,
      } = gridParams;

      context.beginPath();

      // Draw subdivision lines first (thinner, lower opacity)
      if (showSubdivisions) {
        for (let x = startX; x <= endX; x += subdivisionSize) {
          // Skip main grid lines
          if (x % effectiveGridSize === 0) continue;
          context.moveTo(x, startY);
          context.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += subdivisionSize) {
          if (y % effectiveGridSize === 0) continue;
          context.moveTo(startX, y);
          context.lineTo(endX, y);
        }
      }

      context.strokeShape(shape);
    };
  }, [gridParams]);

  // Main grid lines drawing function
  const drawMainGrid = useMemo(() => {
    return (context: Context, shape: ShapeType) => {
      const { startX, startY, endX, endY, effectiveGridSize } = gridParams;

      context.beginPath();

      // Draw vertical lines
      for (let x = startX; x <= endX; x += effectiveGridSize) {
        // Skip origin line (drawn separately)
        if (x === 0) continue;
        context.moveTo(x, startY);
        context.lineTo(x, endY);
      }

      // Draw horizontal lines
      for (let y = startY; y <= endY; y += effectiveGridSize) {
        if (y === 0) continue;
        context.moveTo(startX, y);
        context.lineTo(endX, y);
      }

      context.strokeShape(shape);
    };
  }, [gridParams]);

  const { startX, startY, endX, endY, baseStrokeWidth, thinStrokeWidth, showSubdivisions } = gridParams;

  return (
    <>
      {/* Subdivision lines (when zoomed in) */}
      {showSubdivisions && (
        <Shape
          sceneFunc={drawGrid}
          stroke={gridColor}
          strokeWidth={thinStrokeWidth}
          opacity={0.15}
          listening={false}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      )}

      {/* Main grid lines */}
      <Shape
        sceneFunc={drawMainGrid}
        stroke={gridColor}
        strokeWidth={baseStrokeWidth}
        opacity={0.3}
        listening={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />

      {/* Origin lines (thicker, more visible) */}
      <Line
        points={[0, startY, 0, endY]}
        stroke={gridColor}
        strokeWidth={baseStrokeWidth * 2}
        opacity={0.5}
        listening={false}
        perfectDrawEnabled={false}
      />
      <Line
        points={[startX, 0, endX, 0]}
        stroke={gridColor}
        strokeWidth={baseStrokeWidth * 2}
        opacity={0.5}
        listening={false}
        perfectDrawEnabled={false}
      />
    </>
  );
}
