import { useEffect, useState, forwardRef } from 'react';
import { Image, Group } from 'react-konva';
import type Konva from 'konva';
import type { ImageElement as ImageElementType } from '../../../types/canvas';
import { useCanvasStore } from '../../../store/canvasStore';

interface ImageElementProps {
  element: ImageElementType;
  isSelected?: boolean;
  isEraserHovering?: boolean;
  onSelect: () => void;
}

export const ImageShape = forwardRef<Konva.Group, ImageElementProps>(
  ({ element, isSelected, isEraserHovering, onSelect }, ref) => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [loadError, setLoadError] = useState(false);
    const updateElement = useCanvasStore((state) => state.updateElement);
    const activeTool = useCanvasStore((state) => state.activeTool);
    const gridSettings = useCanvasStore((state) => state.gridSettings);

    const snapToGrid = (value: number) => {
      if (!gridSettings.snapToGrid) return value;
      return Math.round(value / gridSettings.size) * gridSettings.size;
    };

    // Load image when src changes
    useEffect(() => {
      if (!element.src) {
        setImage(null);
        return;
      }

      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        setImage(img);
        setLoadError(false);
      };

      img.onerror = () => {
        setLoadError(true);
        setImage(null);
      };

      img.src = element.src;

      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }, [element.src]);

    const handleDragEnd = (e: { target: { x: () => number; y: () => number } }) => {
      updateElement(element.id, {
        x: snapToGrid(e.target.x()),
        y: snapToGrid(e.target.y()),
      });
    };

    if (loadError) {
      // Render placeholder for broken images
      return (
        <Group
          ref={ref}
          id={element.id}
          x={element.x}
          y={element.y}
          rotation={element.rotation}
          scaleX={element.scaleX}
          scaleY={element.scaleY}
          opacity={element.opacity}
          visible={element.visible}
          draggable={activeTool === 'select' && !element.locked}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={handleDragEnd}
        >
          {/* Placeholder for broken image */}
        </Group>
      );
    }

    if (!image) {
      // Loading state
      return null;
    }

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
      <Group
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        rotation={element.rotation}
        scaleX={element.scaleX}
        scaleY={element.scaleY}
        opacity={isEraserHovering ? 0.7 : element.opacity}
        visible={element.visible}
        draggable={activeTool === 'select' && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
      >
        <Image
          image={image}
          width={element.width}
          height={element.height}
          crop={element.crop}
          stroke={isEraserHovering ? '#ef4444' : undefined}
          strokeWidth={isEraserHovering ? 3 : 0}
          shadowColor={getShadowColor()}
          shadowBlur={getShadowBlur()}
          shadowOpacity={isEraserHovering || isSelected ? 0.5 : 0}
        />
      </Group>
    );
  }
);

ImageShape.displayName = 'ImageShape';
