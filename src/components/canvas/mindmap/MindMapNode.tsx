import { useRef, useState, useEffect, forwardRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { MindMapNodeElement } from '../../../types/canvas';
import { useCanvasStore } from '../../../store/canvasStore';

interface MindMapNodeProps {
  element: MindMapNodeElement;
  isSelected?: boolean;
  onSelect: () => void;
  onAddChild: () => void;
  onToggleCollapse: () => void;
}

export const MindMapNode = forwardRef<Konva.Group, MindMapNodeProps>(
  ({ element, isSelected, onSelect, onAddChild, onToggleCollapse }, ref) => {
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
      if (activeTool !== 'select' && activeTool !== 'mindmap') return;
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
      textarea.style.width = `${(element.width - 16) * scale.x}px`;
      textarea.style.minHeight = '24px';
      textarea.style.fontSize = `${element.fontSize * scale.x}px`;
      textarea.style.fontFamily = element.fontFamily;
      textarea.style.color = element.textColor;
      textarea.style.backgroundColor = 'transparent';
      textarea.style.border = 'none';
      textarea.style.padding = '0';
      textarea.style.margin = '0';
      textarea.style.overflow = 'hidden';
      textarea.style.resize = 'none';
      textarea.style.outline = 'none';
      textarea.style.lineHeight = '1.4';
      textarea.style.zIndex = '10000';
      textarea.style.textAlign = 'center';

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
        const newText = textarea.value.trim() || 'New Node';
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
        } else if (e.key === 'Tab') {
          e.preventDefault();
          handleBlur();
          onAddChild();
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
    }, [isEditing, element, updateElement, onAddChild]);

    const hasChildren = element.childIds.length > 0;
    const isRoot = element.parentId === null;

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
        visible={element.visible && !isEditing}
        draggable={(activeTool === 'select' || activeTool === 'mindmap') && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={handleDragEnd}
      >
        {/* Node background */}
        <Rect
          width={element.width}
          height={element.height}
          fill={element.fill}
          stroke={isSelected ? '#3b82f6' : element.stroke}
          strokeWidth={isSelected ? 2 : element.strokeWidth}
          cornerRadius={element.cornerRadius}
          shadowColor={isSelected ? '#3b82f6' : undefined}
          shadowBlur={isSelected ? 8 : 0}
          shadowOpacity={isSelected ? 0.4 : 0}
        />

        {/* Node text */}
        <Text
          ref={textRef}
          x={8}
          y={(element.height - element.fontSize * 1.4) / 2}
          width={element.width - 16}
          text={element.text}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fill={element.textColor}
          align="center"
          verticalAlign="middle"
          wrap="word"
        />

        {/* Collapse/Expand button (only if has children) */}
        {hasChildren && (
          <Group
            x={element.width + 4}
            y={element.height / 2 - 8}
            onClick={(e) => {
              e.cancelBubble = true;
              onToggleCollapse();
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onToggleCollapse();
            }}
          >
            <Rect
              width={16}
              height={16}
              fill="#1f1f1f"
              stroke="#404040"
              strokeWidth={1}
              cornerRadius={3}
            />
            <Text
              x={0}
              y={0}
              width={16}
              height={16}
              text={element.collapsed ? '+' : '-'}
              fontSize={12}
              fill="#9ca3af"
              align="center"
              verticalAlign="middle"
            />
          </Group>
        )}

        {/* Add child button (shown when selected) */}
        {isSelected && !isRoot && (
          <Group
            x={element.width + 4}
            y={element.height / 2 + 12}
            onClick={(e) => {
              e.cancelBubble = true;
              onAddChild();
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onAddChild();
            }}
          >
            <Rect
              width={16}
              height={16}
              fill="#1f1f1f"
              stroke="#3b82f6"
              strokeWidth={1}
              cornerRadius={3}
            />
            <Text
              x={0}
              y={0}
              width={16}
              height={16}
              text="+"
              fontSize={12}
              fill="#3b82f6"
              align="center"
              verticalAlign="middle"
            />
          </Group>
        )}

        {/* Root node always shows add button */}
        {isRoot && isSelected && (
          <Group
            x={element.width + 4}
            y={element.height / 2 - 8}
            onClick={(e) => {
              e.cancelBubble = true;
              onAddChild();
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onAddChild();
            }}
          >
            <Rect
              width={16}
              height={16}
              fill="#1f1f1f"
              stroke="#3b82f6"
              strokeWidth={1}
              cornerRadius={3}
            />
            <Text
              x={0}
              y={0}
              width={16}
              height={16}
              text="+"
              fontSize={12}
              fill="#3b82f6"
              align="center"
              verticalAlign="middle"
            />
          </Group>
        )}
      </Group>
    );
  }
);

MindMapNode.displayName = 'MindMapNode';
