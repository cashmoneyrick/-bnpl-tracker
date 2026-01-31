import { Shape } from 'react-konva';
import type { Context } from 'konva/lib/Context';
import type { MindMapNodeElement } from '../../../types/canvas';

// Smart edge detection - determines best connection points based on relative node positions
function getConnectionPoints(fromNode: MindMapNodeElement, toNode: MindMapNodeElement) {
  const fromCenterX = fromNode.x + fromNode.width / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toNode.x + toNode.width / 2;
  const toCenterY = toNode.y + toNode.height / 2;

  // Determine direction of connection
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  let fromX: number, fromY: number, toX: number, toY: number;
  let isHorizontal: boolean;

  // Choose connection points based on relative positions
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection (left-right)
    isHorizontal = true;
    if (dx > 0) {
      // Child is to the right
      fromX = fromNode.x + fromNode.width;
      toX = toNode.x;
    } else {
      // Child is to the left
      fromX = fromNode.x;
      toX = toNode.x + toNode.width;
    }
    fromY = fromNode.y + fromNode.height / 2;
    toY = toNode.y + toNode.height / 2;
  } else {
    // Vertical connection (top-bottom)
    isHorizontal = false;
    if (dy > 0) {
      // Child is below
      fromY = fromNode.y + fromNode.height;
      toY = toNode.y;
    } else {
      // Child is above
      fromY = fromNode.y;
      toY = toNode.y + toNode.height;
    }
    fromX = fromNode.x + fromNode.width / 2;
    toX = toNode.x + toNode.width / 2;
  }

  return { fromX, fromY, toX, toY, isHorizontal };
}

interface MindMapConnectionProps {
  fromNode: MindMapNodeElement;
  toNode: MindMapNodeElement;
  stroke?: string;
  strokeWidth?: number;
}

export function MindMapConnection({
  fromNode,
  toNode,
  stroke = '#3b82f6',
  strokeWidth = 2,
}: MindMapConnectionProps) {
  // Calculate smart connection points based on relative positions
  const { fromX, fromY, toX, toY, isHorizontal } = getConnectionPoints(fromNode, toNode);

  // Calculate control points for smooth Bezier curve
  const distance = isHorizontal ? Math.abs(toX - fromX) : Math.abs(toY - fromY);
  const controlPointOffset = Math.min(distance / 2, 80);

  return (
    <Shape
      sceneFunc={(context: Context, shape) => {
        context.beginPath();
        context.moveTo(fromX, fromY);

        // Cubic Bezier curve with dynamic control points
        if (isHorizontal) {
          const direction = toX > fromX ? 1 : -1;
          context.bezierCurveTo(
            fromX + controlPointOffset * direction, fromY,  // First control point
            toX - controlPointOffset * direction, toY,      // Second control point
            toX, toY                                         // End point
          );
        } else {
          const direction = toY > fromY ? 1 : -1;
          context.bezierCurveTo(
            fromX, fromY + controlPointOffset * direction,  // First control point
            toX, toY - controlPointOffset * direction,      // Second control point
            toX, toY                                         // End point
          );
        }

        context.strokeShape(shape);
      }}
      stroke={stroke}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
      listening={false}
    />
  );
}

// Render all connections for a mind map tree
interface MindMapConnectionsProps {
  nodes: MindMapNodeElement[];
  connectionColor?: string;
  connectionWidth?: number;
}

export function MindMapConnections({
  nodes,
  connectionColor = '#3b82f6',
  connectionWidth = 2,
}: MindMapConnectionsProps) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const connections: { from: MindMapNodeElement; to: MindMapNodeElement }[] = [];

  // Build connections from parent-child relationships
  nodes.forEach((node) => {
    if (node.parentId) {
      const parentNode = nodeMap.get(node.parentId);
      if (parentNode && !parentNode.collapsed) {
        connections.push({ from: parentNode, to: node });
      }
    }
  });

  return (
    <>
      {connections.map(({ from, to }) => (
        <MindMapConnection
          key={`${from.id}-${to.id}`}
          fromNode={from}
          toNode={to}
          stroke={connectionColor}
          strokeWidth={connectionWidth}
        />
      ))}
    </>
  );
}
