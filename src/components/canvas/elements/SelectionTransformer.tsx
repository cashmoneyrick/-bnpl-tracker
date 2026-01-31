import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type { Transformer as TransformerType } from 'konva/lib/shapes/Transformer';
import type Konva from 'konva';
import { useCanvasStore } from '../../../store/canvasStore';

interface SelectionTransformerProps {
  selectedNodes: (Konva.Node | null)[];
}

export function SelectionTransformer({ selectedNodes }: SelectionTransformerProps) {
  const transformerRef = useRef<TransformerType>(null);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const gridSettings = useCanvasStore((state) => state.gridSettings);

  // Filter out null nodes
  const validNodes = selectedNodes.filter((node): node is Konva.Node => node !== null);

  useEffect(() => {
    if (transformerRef.current && validNodes.length > 0) {
      transformerRef.current.nodes(validNodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [validNodes]);

  const snapToGrid = (value: number) => {
    if (!gridSettings.snapToGrid) return value;
    return Math.round(value / gridSettings.size) * gridSettings.size;
  };

  const handleTransformEnd = () => {
    validNodes.forEach((node) => {
      const id = node.id();
      if (!id) return;

      // Get the transformed attributes
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rotation = node.rotation();

      // For shapes like rect and circle, we want to apply the scale to width/height
      // and reset scale to 1
      const nodeType = node.getClassName();

      if (nodeType === 'Rect') {
        const width = node.width() * scaleX;
        const height = node.height() * scaleY;
        updateElement(id, {
          x: snapToGrid(node.x()),
          y: snapToGrid(node.y()),
          width: Math.abs(width),
          height: Math.abs(height),
          rotation,
          scaleX: 1,
          scaleY: 1,
        });
        node.scaleX(1);
        node.scaleY(1);
      } else if (nodeType === 'Circle') {
        const radius = node.attrs.radius * Math.max(Math.abs(scaleX), Math.abs(scaleY));
        updateElement(id, {
          x: snapToGrid(node.x()),
          y: snapToGrid(node.y()),
          radius,
          rotation,
          scaleX: 1,
          scaleY: 1,
        });
        node.scaleX(1);
        node.scaleY(1);
      } else if (nodeType === 'Line') {
        // Lines (freehand paths, arrows, regular lines) store coords in points array
        // Need to offset all points by the drag delta
        const dx = node.x();
        const dy = node.y();
        const element = useCanvasStore.getState().elements.find((el) => el.id === id);
        if (element && 'points' in element && (dx !== 0 || dy !== 0)) {
          const newPoints = (element as { points: number[] }).points.map((p: number, i: number) =>
            i % 2 === 0 ? snapToGrid(p + dx) : snapToGrid(p + dy)
          );
          updateElement(id, { points: newPoints });
          node.x(0);
          node.y(0);
        } else {
          updateElement(id, {
            x: snapToGrid(node.x()),
            y: snapToGrid(node.y()),
            rotation,
            scaleX,
            scaleY,
          });
        }
      } else {
        // For other shapes, keep the scale
        updateElement(id, {
          x: snapToGrid(node.x()),
          y: snapToGrid(node.y()),
          rotation,
          scaleX,
          scaleY,
        });
      }
    });
  };

  if (validNodes.length === 0) {
    return null;
  }

  return (
    <Transformer
      ref={transformerRef}
      boundBoxFunc={(oldBox, newBox) => {
        // Limit minimum size
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      }}
      onTransformEnd={handleTransformEnd}
      rotateEnabled={true}
      enabledAnchors={[
        'top-left',
        'top-center',
        'top-right',
        'middle-left',
        'middle-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ]}
      anchorFill="#3b82f6"
      anchorStroke="#1d4ed8"
      anchorSize={10}
      anchorCornerRadius={2}
      borderStroke="#3b82f6"
      borderStrokeWidth={1}
      borderDash={[4, 4]}
      rotateAnchorOffset={30}
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={5}
    />
  );
}
