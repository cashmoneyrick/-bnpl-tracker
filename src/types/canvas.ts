// =============================================================================
// Canvas Element Types
// =============================================================================

/** Base properties shared by all canvas elements */
export interface BaseCanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type CanvasElementType =
  | 'freehand'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'image'
  | 'mindmap-node'
  | 'mindmap-connection';

// -----------------------------------------------------------------------------
// Freehand Drawing
// -----------------------------------------------------------------------------
export interface FreehandElement extends BaseCanvasElement {
  type: 'freehand';
  points: number[]; // Flat array: [x1, y1, x2, y2, ...]
  stroke: string;
  strokeWidth: number;
  tension: number; // Bezier curve smoothing (0-1)
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
}

// -----------------------------------------------------------------------------
// Shapes
// -----------------------------------------------------------------------------
export interface RectangleElement extends BaseCanvasElement {
  type: 'rectangle';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface CircleElement extends BaseCanvasElement {
  type: 'circle';
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface LineElement extends BaseCanvasElement {
  type: 'line';
  points: number[]; // [x1, y1, x2, y2] or more for polyline
  stroke: string;
  strokeWidth: number;
  lineCap: 'butt' | 'round' | 'square';
  dash: number[]; // e.g., [10, 5] for dashed
}

export interface ArrowElement extends BaseCanvasElement {
  type: 'arrow';
  points: number[]; // [x1, y1, x2, y2]
  stroke: string;
  strokeWidth: number;
  pointerLength: number;
  pointerWidth: number;
  fill: string; // Arrow head fill
}

// -----------------------------------------------------------------------------
// Text
// -----------------------------------------------------------------------------
export interface TextElement extends BaseCanvasElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  fill: string;
  align: 'left' | 'center' | 'right';
  width?: number; // For text wrapping
  padding: number;
}

// -----------------------------------------------------------------------------
// Image
// -----------------------------------------------------------------------------
export interface ImageElement extends BaseCanvasElement {
  type: 'image';
  src: string; // Base64 data URL or blob URL
  width: number;
  height: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// -----------------------------------------------------------------------------
// Mind Map
// -----------------------------------------------------------------------------
export interface MindMapNodeElement extends BaseCanvasElement {
  type: 'mindmap-node';
  text: string;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  parentId: string | null; // null for root node
  childIds: string[];
  collapsed: boolean;
}

export interface MindMapConnectionElement extends BaseCanvasElement {
  type: 'mindmap-connection';
  fromNodeId: string;
  toNodeId: string;
  stroke: string;
  strokeWidth: number;
  controlPoints?: number[]; // Bezier control points (calculated dynamically)
}

// -----------------------------------------------------------------------------
// Union Type
// -----------------------------------------------------------------------------
export type CanvasElement =
  | FreehandElement
  | RectangleElement
  | CircleElement
  | LineElement
  | ArrowElement
  | TextElement
  | ImageElement
  | MindMapNodeElement
  | MindMapConnectionElement;

// =============================================================================
// Canvas State Types
// =============================================================================

export type CanvasTool =
  | 'select'
  | 'pan'
  | 'pen'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'image'
  | 'mindmap';

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

export interface GridSettings {
  enabled: boolean;
  size: number; // Grid cell size in pixels
  snapToGrid: boolean;
  showGrid: boolean;
  gridColor: string;
}

export interface ToolSettings {
  pen: {
    color: string;
    size: number;
    opacity: number;
  };
  eraser: {
    size: number;
  };
  shapes: {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
  };
  text: {
    fontFamily: string;
    fontSize: number;
    color: string;
  };
  mindmap: {
    nodeColor: string;
    connectionColor: string;
  };
}

// =============================================================================
// Canvas Document (Persisted)
// =============================================================================

export interface CanvasDocument {
  id: string;
  name: string;
  elements: CanvasElement[];
  viewport: CanvasViewport;
  gridSettings: GridSettings;
  backgroundColor: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string; // Base64 thumbnail for preview
}

// =============================================================================
// History/Undo System
// =============================================================================

export interface CanvasHistoryEntry {
  id: string;
  timestamp: string;
  action: CanvasAction;
  elements: CanvasElement[]; // Snapshot of elements
}

export type CanvasAction =
  | { type: 'add'; elementIds: string[] }
  | { type: 'delete'; elementIds: string[] }
  | { type: 'modify'; elementIds: string[] }
  | { type: 'move'; elementIds: string[] }
  | { type: 'resize'; elementIds: string[] }
  | { type: 'rotate'; elementIds: string[] }
  | { type: 'reorder'; elementIds: string[] };

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  enabled: true,
  size: 20,
  snapToGrid: true,
  showGrid: true,
  gridColor: '#262626',
};

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  pen: {
    color: '#ffffff',
    size: 3,
    opacity: 1,
  },
  eraser: {
    size: 20,
  },
  shapes: {
    fillColor: 'transparent',
    strokeColor: '#ffffff',
    strokeWidth: 2,
  },
  text: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    color: '#ffffff',
  },
  mindmap: {
    nodeColor: '#1f1f1f',
    connectionColor: '#3b82f6',
  },
};

export const DEFAULT_VIEWPORT: CanvasViewport = {
  x: 0,
  y: 0,
  scale: 1,
};

// =============================================================================
// Utility Types for Element Creation
// =============================================================================

export type NewElementInput<T extends CanvasElement> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'zIndex'
>;
