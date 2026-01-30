import { useRef } from 'react';
import { Group } from 'react-konva';
import type Konva from 'konva';
import { MindMapNode } from './MindMapNode';
import { MindMapConnections } from './MindMapConnection';
import type { MindMapNodeElement } from '../../../types/canvas';
import { useCanvasStore } from '../../../store/canvasStore';

interface MindMapLayerProps {
  nodes: MindMapNodeElement[];
  selectedIds: string[];
  onSelectNode: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  setNodeRef: (id: string, node: Konva.Node | null) => void;
}

export function MindMapLayer({
  nodes,
  selectedIds,
  onSelectNode,
  onAddChild,
  onToggleCollapse,
  setNodeRef,
}: MindMapLayerProps) {
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());
  const toolSettings = useCanvasStore((state) => state.toolSettings);

  // Store ref for a node
  const handleSetRef = (id: string, node: Konva.Group | null) => {
    if (node) {
      nodeRefs.current.set(id, node);
    } else {
      nodeRefs.current.delete(id);
    }
    setNodeRef(id, node);
  };

  return (
    <Group>
      {/* Render connections first (behind nodes) */}
      <MindMapConnections
        nodes={nodes}
        connectionColor={toolSettings.mindmap.connectionColor}
        connectionWidth={2}
      />

      {/* Render nodes */}
      {nodes.map((node) => (
        <MindMapNode
          key={node.id}
          element={node}
          isSelected={selectedIds.includes(node.id)}
          onSelect={() => onSelectNode(node.id)}
          onAddChild={() => onAddChild(node.id)}
          onToggleCollapse={() => onToggleCollapse(node.id)}
          ref={(ref) => handleSetRef(node.id, ref)}
        />
      ))}
    </Group>
  );
}
