import { useCallback, useMemo } from 'react';
import type { Stage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore } from '../../../store/canvasStore';
import type { MindMapNodeElement } from '../../../types/canvas';

// Layout constants
const NODE_WIDTH = 150;
const NODE_HEIGHT = 40;
const HORIZONTAL_SPACING = 60;
const VERTICAL_SPACING = 20;

interface TreeNode {
  id: string;
  element: MindMapNodeElement;
  children: TreeNode[];
  depth: number;
  subtreeHeight: number;
  y: number;
}

export function useMindMap(stageRef: React.RefObject<Stage | null>) {
  const elements = useCanvasStore((state) => state.elements);
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const deleteElements = useCanvasStore((state) => state.deleteElements);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const toolSettings = useCanvasStore((state) => state.toolSettings);
  const viewport = useCanvasStore((state) => state.viewport);
  const gridSettings = useCanvasStore((state) => state.gridSettings);

  // Get all mind map nodes
  const mindMapNodes = useMemo(() => {
    return elements.filter(
      (el): el is MindMapNodeElement => el.type === 'mindmap-node'
    );
  }, [elements]);

  // Build tree structure from flat nodes
  const buildTree = useCallback((nodes: MindMapNodeElement[]): TreeNode | null => {
    const nodeMap = new Map<string, TreeNode>();

    // Create tree nodes
    nodes.forEach((node) => {
      nodeMap.set(node.id, {
        id: node.id,
        element: node,
        children: [],
        depth: 0,
        subtreeHeight: 0,
        y: 0,
      });
    });

    // Build parent-child relationships
    let root: TreeNode | null = null;
    nodes.forEach((node) => {
      const treeNode = nodeMap.get(node.id)!;
      if (node.parentId === null) {
        root = treeNode;
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent && !node.locked) {
          parent.children.push(treeNode);
        }
      }
    });

    if (!root) return null;

    // Calculate depths
    const calculateDepths = (node: TreeNode, depth: number) => {
      node.depth = depth;
      node.children.forEach((child) => calculateDepths(child, depth + 1));
    };
    calculateDepths(root, 0);

    // Sort children by their current y position for stability
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => a.element.y - b.element.y);
      node.children.forEach(sortChildren);
    };
    sortChildren(root);

    return root;
  }, []);

  // Calculate subtree heights (for layout)
  const calculateSubtreeHeights = useCallback((node: TreeNode): number => {
    if (node.element.collapsed || node.children.length === 0) {
      node.subtreeHeight = NODE_HEIGHT;
      return node.subtreeHeight;
    }

    const childrenHeight = node.children.reduce((sum, child) => {
      return sum + calculateSubtreeHeights(child) + VERTICAL_SPACING;
    }, -VERTICAL_SPACING); // Remove last spacing

    node.subtreeHeight = Math.max(NODE_HEIGHT, childrenHeight);
    return node.subtreeHeight;
  }, []);

  // Layout the tree
  const layoutTree = useCallback((root: TreeNode, startX: number, startY: number) => {
    const positions: Map<string, { x: number; y: number }> = new Map();

    const layout = (node: TreeNode, x: number, y: number) => {
      // Position this node centered in its subtree
      const nodeY = y + (node.subtreeHeight - NODE_HEIGHT) / 2;
      positions.set(node.id, { x, y: nodeY });

      if (node.element.collapsed) return;

      // Position children
      let childY = y;
      node.children.forEach((child) => {
        layout(child, x + NODE_WIDTH + HORIZONTAL_SPACING, childY);
        childY += child.subtreeHeight + VERTICAL_SPACING;
      });
    };

    layout(root, startX, startY);
    return positions;
  }, []);

  // Auto-layout all mind map nodes
  const autoLayout = useCallback(() => {
    const tree = buildTree(mindMapNodes);
    if (!tree) return;

    calculateSubtreeHeights(tree);

    // Get the root's current position as anchor
    const rootX = tree.element.x;
    const rootY = tree.element.y - (tree.subtreeHeight - NODE_HEIGHT) / 2;

    const positions = layoutTree(tree, rootX, rootY);

    // Update all node positions
    positions.forEach((pos, id) => {
      const node = mindMapNodes.find((n) => n.id === id);
      if (node && (node.x !== pos.x || node.y !== pos.y)) {
        updateElement(id, { x: pos.x, y: pos.y });
      }
    });
  }, [mindMapNodes, buildTree, calculateSubtreeHeights, layoutTree, updateElement]);

  // Get visible nodes (respecting collapsed state)
  const visibleNodes = useMemo(() => {
    const visible = new Set<string>();
    const nodeMap = new Map(mindMapNodes.map((n) => [n.id, n]));

    const traverse = (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      visible.add(nodeId);

      if (!node.collapsed) {
        node.childIds.forEach(traverse);
      }
    };

    // Start from root nodes
    mindMapNodes
      .filter((n) => n.parentId === null)
      .forEach((n) => traverse(n.id));

    return mindMapNodes.filter((n) => visible.has(n.id));
  }, [mindMapNodes]);

  // Snap to grid helper
  const snapToGrid = useCallback(
    (value: number) => {
      if (!gridSettings.snapToGrid) return value;
      return Math.round(value / gridSettings.size) * gridSettings.size;
    },
    [gridSettings]
  );

  // Create root node
  const createRootNode = useCallback(
    (_e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const x = snapToGrid((pointer.x - viewport.x) / viewport.scale);
      const y = snapToGrid((pointer.y - viewport.y) / viewport.scale);

      const rootNode: Omit<MindMapNodeElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
        type: 'mindmap-node',
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        text: 'Central Idea',
        fill: toolSettings.mindmap.nodeColor,
        stroke: toolSettings.mindmap.connectionColor,
        strokeWidth: 2,
        cornerRadius: 8,
        fontSize: 14,
        fontFamily: 'Inter, system-ui, sans-serif',
        textColor: '#ffffff',
        parentId: null,
        childIds: [],
        collapsed: false,
      };

      addElement(rootNode);
    },
    [stageRef, viewport, snapToGrid, toolSettings.mindmap, addElement]
  );

  // Add child node
  const addChildNode = useCallback(
    (parentId: string) => {
      const parent = mindMapNodes.find((n) => n.id === parentId);
      if (!parent) return;

      // Position child to the right of parent
      const childX = parent.x + NODE_WIDTH + HORIZONTAL_SPACING;
      const childY = parent.y + (parent.childIds.length * (NODE_HEIGHT + VERTICAL_SPACING));

      const childNode: Omit<MindMapNodeElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
        type: 'mindmap-node',
        x: childX,
        y: childY,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        text: 'New Topic',
        fill: toolSettings.mindmap.nodeColor,
        stroke: '#404040',
        strokeWidth: 1,
        cornerRadius: 6,
        fontSize: 13,
        fontFamily: 'Inter, system-ui, sans-serif',
        textColor: '#e5e5e5',
        parentId,
        childIds: [],
        collapsed: false,
      };

      // Add the child and get its ID
      const newElementId = addElement(childNode);

      // Update parent's childIds
      if (newElementId) {
        updateElement(parentId, {
          childIds: [...parent.childIds, newElementId],
        });
      }

      // Auto-layout after adding
      setTimeout(autoLayout, 50);
    },
    [mindMapNodes, toolSettings.mindmap, addElement, updateElement, autoLayout]
  );

  // Toggle collapse/expand
  const toggleCollapse = useCallback(
    (nodeId: string) => {
      const node = mindMapNodes.find((n) => n.id === nodeId);
      if (!node) return;

      updateElement(nodeId, { collapsed: !node.collapsed });
    },
    [mindMapNodes, updateElement]
  );

  // Delete node and its subtree
  const deleteNode = useCallback(
    (nodeId: string) => {
      const node = mindMapNodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Collect all descendant IDs
      const toDelete: string[] = [nodeId];
      const collectDescendants = (id: string) => {
        const n = mindMapNodes.find((x) => x.id === id);
        if (n) {
          n.childIds.forEach((childId) => {
            toDelete.push(childId);
            collectDescendants(childId);
          });
        }
      };
      collectDescendants(nodeId);

      // Update parent's childIds
      if (node.parentId) {
        const parent = mindMapNodes.find((n) => n.id === node.parentId);
        if (parent) {
          updateElement(node.parentId, {
            childIds: parent.childIds.filter((id) => id !== nodeId),
          });
        }
      }

      // Delete all nodes
      deleteElements(toDelete);
    },
    [mindMapNodes, updateElement, deleteElements]
  );

  // Handle click on canvas with mindmap tool
  const handleMindMapClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (activeTool !== 'mindmap') return;
      if (e.evt.type === 'mousedown' && (e.evt as MouseEvent).button !== 0) return;

      // Only create root node if clicking on empty space
      if (e.target === stageRef.current) {
        // Check if there's already a root node
        const hasRoot = mindMapNodes.some((n) => n.parentId === null);
        if (!hasRoot) {
          createRootNode(e);
        }
      }
    },
    [activeTool, stageRef, mindMapNodes, createRootNode]
  );

  return {
    mindMapNodes,
    visibleNodes,
    isMindMapTool: activeTool === 'mindmap',
    handleMindMapClick,
    createRootNode,
    addChildNode,
    toggleCollapse,
    deleteNode,
    autoLayout,
  };
}
