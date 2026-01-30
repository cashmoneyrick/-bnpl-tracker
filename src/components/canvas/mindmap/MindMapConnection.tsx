import { Shape } from 'react-konva';
import type { Context } from 'konva/lib/Context';
import type { MindMapNodeElement } from '../../../types/canvas';

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
  // Calculate connection points
  // From: right side of parent node
  // To: left side of child node
  const fromX = fromNode.x + fromNode.width;
  const fromY = fromNode.y + fromNode.height / 2;
  const toX = toNode.x;
  const toY = toNode.y + toNode.height / 2;

  // Calculate control points for smooth Bezier curve
  const dx = toX - fromX;
  const controlPointOffset = Math.min(Math.abs(dx) / 2, 80);

  return (
    <Shape
      sceneFunc={(context: Context, shape) => {
        context.beginPath();
        context.moveTo(fromX, fromY);

        // Cubic Bezier curve
        context.bezierCurveTo(
          fromX + controlPointOffset, fromY,  // First control point
          toX - controlPointOffset, toY,      // Second control point
          toX, toY                             // End point
        );

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
