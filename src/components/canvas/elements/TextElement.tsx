import { useRef, useEffect, useState, forwardRef } from 'react';
import { Text, Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { TextElement as TextElementType } from '../../../types/canvas';
import { useCanvasStore } from '../../../store/canvasStore';

interface TextElementProps {
  element: TextElementType;
  isSelected?: boolean;
  isEraserHovering?: boolean;
  onSelect: () => void;
}

export const TextShape = forwardRef<Konva.Group, TextElementProps>(
  ({ element, isSelected, isEraserHovering, onSelect }, ref) => {
    const textRef = useRef<Konva.Text>(null);
    const [isEditing, setIsEditing] = useState(false);
    const updateElement = useCanvasStore((state) => state.updateElement);
    const activeTool = useCanvasStore((state) => state.activeTool);
    const gridSettings = useCanvasStore((state) => state.gridSettings);

    const snapToGrid = (value: number) => {
      if (!gridSettings.snapToGrid) return value;
      return Math.round(value / gridSettings.size) * gridSettings.size;
    };

    const handleDragEnd = (e: { target: { x: () => number; y: () => number } }) => {
      updateElement(element.id, {
        x: snapToGrid(e.target.x()),
        y: snapToGrid(e.target.y()),
      });
    };

    const handleDblClick = () => {
      if (activeTool !== 'select') return;
      setIsEditing(true);
    };

    // Handle inline text editing
    useEffect(() => {
      if (!isEditing || !textRef.current) return;

      const textNode = textRef.current;
      const stage = textNode.getStage();
      if (!stage) return;

      const stageBox = stage.container().getBoundingClientRect();
      const textPosition = textNode.getAbsolutePosition();
      const scale = textNode.getAbsoluteScale();

      // Create textarea for editing
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      textarea.value = element.text;
      textarea.style.position = 'fixed';
      textarea.style.top = `${stageBox.top + textPosition.y}px`;
      textarea.style.left = `${stageBox.left + textPosition.x}px`;
      textarea.style.width = `${Math.max((element.width || 200) * scale.x, 100)}px`;
      textarea.style.height = 'auto';
      textarea.style.fontSize = `${element.fontSize * scale.x}px`;
      textarea.style.fontFamily = element.fontFamily;
      textarea.style.color = element.fill;
      textarea.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      textarea.style.border = '2px solid #3b82f6';
      textarea.style.borderRadius = '4px';
      textarea.style.padding = `${element.padding}px`;
      textarea.style.margin = '0';
      textarea.style.overflow = 'hidden';
      textarea.style.resize = 'none';
      textarea.style.outline = 'none';
      textarea.style.lineHeight = '1.4';
      textarea.style.zIndex = '10000';
      textarea.style.transformOrigin = 'left top';

      textarea.focus();
      textarea.select();

      // Auto-resize
      const resizeTextarea = () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      };
      resizeTextarea();

      textarea.addEventListener('input', resizeTextarea);

      const handleBlur = () => {
        const newText = textarea.value;
        if (newText !== element.text) {
          updateElement(element.id, { text: newText });
        }
        document.body.removeChild(textarea);
        setIsEditing(false);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          document.body.removeChild(textarea);
          setIsEditing(false);
        } else if (e.key === 'Enter' && !e.shiftKey) {
          handleBlur();
        }
      };

      textarea.addEventListener('blur', handleBlur);
      textarea.addEventListener('keydown', handleKeyDown);

      return () => {
        textarea.removeEventListener('input', resizeTextarea);
        textarea.removeEventListener('blur', handleBlur);
        textarea.removeEventListener('keydown', handleKeyDown);
        if (document.body.contains(textarea)) {
          document.body.removeChild(textarea);
        }
      };
    }, [isEditing, element, updateElement]);

    // Calculate text dimensions for selection box
    const textWidth = element.width || 200;
    const textHeight = textRef.current?.height() || element.fontSize * 1.4;

    const getBorderColor = () => {
      if (isEraserHovering) return '#ef4444';
      if (isSelected) return '#3b82f6';
      return 'transparent';
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
        visible={element.visible && !isEditing}
        draggable={activeTool === 'select' && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={handleDragEnd}
      >
        {/* Selection/eraser hover background */}
        {(isSelected || isEraserHovering) && (
          <Rect
            x={-4}
            y={-4}
            width={textWidth + 8}
            height={textHeight + 8}
            fill={isEraserHovering ? 'rgba(239, 68, 68, 0.1)' : 'transparent'}
            stroke={getBorderColor()}
            strokeWidth={isEraserHovering ? 2 : 1}
            dash={isEraserHovering ? undefined : [4, 4]}
            shadowColor={isEraserHovering ? '#ef4444' : undefined}
            shadowBlur={isEraserHovering ? 15 : 0}
            shadowOpacity={isEraserHovering ? 0.5 : 0}
          />
        )}
        <Text
          ref={textRef}
          text={element.text}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fontStyle={element.fontStyle}
          fill={element.fill}
          align={element.align}
          width={element.width}
          padding={element.padding}
          wrap="word"
        />
      </Group>
    );
  }
);

TextShape.displayName = 'TextShape';

// Component for creating new text on canvas click
interface TextCreatorProps {
  x: number;
  y: number;
  onComplete: (text: string) => void;
  onCancel: () => void;
  settings: {
    fontFamily: string;
    fontSize: number;
    color: string;
  };
}

export function TextCreator({ x, y, onComplete, onCancel, settings }: TextCreatorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleBlur = () => {
    const text = inputRef.current?.value.trim();
    if (text) {
      onComplete(text);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
  };

  return (
    <textarea
      ref={inputRef}
      className="fixed z-[10000] bg-black/80 border-2 border-blue-500 rounded px-2 py-1 outline-none resize-none text-white"
      style={{
        left: x,
        top: y,
        minWidth: 150,
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        color: settings.color,
      }}
      placeholder="Type here..."
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
