import { useRef, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import { GridLayer } from './grid/GridLayer';
import { FreehandPath, CurrentStroke } from './elements/FreehandPath';
import { RectangleShape, CircleShape } from './elements/ShapeElement';
import { LineShape, ArrowShape } from './elements/LineElement';
import { TextShape } from './elements/TextElement';
import { ImageShape } from './elements/ImageElement';
import { SelectionTransformer } from './elements/SelectionTransformer';
import { MindMapLayer } from './mindmap/MindMapLayer';
import { useDrawing } from './hooks/useDrawing';
import { useEraser } from './hooks/useEraser';
import { useShapes, ShapePreview } from './hooks/useShapes';
import { useText } from './hooks/useText';
import { useMindMap } from './hooks/useMindMap';
import { useCanvasStore } from '../../store/canvasStore';

interface CanvasStageProps {
  width: number;
  height: number;
  stageRef?: React.RefObject<StageType | null>;
}

export function CanvasStage({ width, height, stageRef: externalStageRef }: CanvasStageProps) {
  const internalStageRef = useRef<StageType>(null);
  const stageRef = externalStageRef || internalStageRef;
  const shapeRefs = useRef<Map<string, Konva.Node>>(new Map());

  const viewport = useCanvasStore((state) => state.viewport);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const isPanning = useCanvasStore((state) => state.isPanning);
  const setIsPanning = useCanvasStore((state) => state.setIsPanning);
  const isSpacebarPanning = useCanvasStore((state) => state.isSpacebarPanning);
  const gridSettings = useCanvasStore((state) => state.gridSettings);
  const isLightMode = useCanvasStore((state) => state.isLightMode);
  const elements = useCanvasStore((state) => state.elements);
  const selectedElementIds = useCanvasStore((state) => state.selectedElementIds);
  const selectElements = useCanvasStore((state) => state.selectElements);
  const deselectAll = useCanvasStore((state) => state.deselectAll);
  const toolSettings = useCanvasStore((state) => state.toolSettings);

  // Drawing hook
  const { drawingState, handleDrawStart, handleDrawMove, handleDrawEnd } =
    useDrawing(stageRef);

  // Eraser hook
  const { handleEraseStart, handleEraseMove, handleEraseEnd, hoveredElementIdsSet } =
    useEraser(stageRef);

  // Shapes hook
  const { shapeState, isShapeTool, handleShapeStart, handleShapeMove, handleShapeEnd } =
    useShapes(stageRef);

  // Text hook
  const { isTextTool, handleTextStart } = useText(stageRef);

  // Mind map hook
  const {
    visibleNodes: mindMapNodes,
    isMindMapTool,
    handleMindMapClick,
    addChildNode,
    toggleCollapse,
  } = useMindMap(stageRef);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = viewport.scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.1;
      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

      // Clamp scale
      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      // Adjust position to zoom toward cursor
      const mousePointTo = {
        x: (pointer.x - viewport.x) / oldScale,
        y: (pointer.y - viewport.y) / oldScale,
      };

      setViewport({
        scale: clampedScale,
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
    },
    [viewport, setViewport]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const currentTool = useCanvasStore.getState().activeTool;

      // Pan with middle mouse button, pan tool, or spacebar held
      if (e.evt.button === 1 || currentTool === 'pan' || isSpacebarPanning) {
        setIsPanning(true);
        e.evt.preventDefault();
        return;
      }

      // Drawing
      if (activeTool === 'pen') {
        handleDrawStart(e);
        return;
      }

      // Erasing
      if (activeTool === 'eraser') {
        handleEraseStart(e);
        return;
      }

      // Shape drawing
      if (isShapeTool) {
        handleShapeStart(e);
        return;
      }

      // Text creation - read fresh state to avoid stale closure
      if (useCanvasStore.getState().activeTool === 'text') {
        handleTextStart(e);
        return;
      }

      // Mind map tool
      if (isMindMapTool) {
        handleMindMapClick(e);
        return;
      }

      // Deselect on empty space click
      if (e.target === stageRef.current && activeTool === 'select') {
        deselectAll();
      }
    },
    [activeTool, setIsPanning, isSpacebarPanning, deselectAll, handleDrawStart, handleEraseStart, isShapeTool, handleShapeStart, isTextTool, handleTextStart, isMindMapTool, handleMindMapClick]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Panning
      if (isPanning) {
        setViewport({
          x: viewport.x + e.evt.movementX,
          y: viewport.y + e.evt.movementY,
        });
        return;
      }

      // Drawing
      if (activeTool === 'pen') {
        handleDrawMove(e);
        return;
      }

      // Erasing
      if (activeTool === 'eraser') {
        handleEraseMove(e);
        return;
      }

      // Shape drawing
      if (isShapeTool) {
        handleShapeMove(e);
      }
    },
    [isPanning, viewport, setViewport, activeTool, handleDrawMove, handleEraseMove, isShapeTool, handleShapeMove]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (activeTool === 'pen') {
      handleDrawEnd();
    }

    if (activeTool === 'eraser') {
      handleEraseEnd();
    }

    if (isShapeTool) {
      handleShapeEnd();
    }
  }, [isPanning, setIsPanning, activeTool, handleDrawEnd, handleEraseEnd, isShapeTool, handleShapeEnd]);

  // Handle element selection with shift for multi-select
  const handleElementSelect = useCallback(
    (elementId: string, e?: KonvaEventObject<MouseEvent>) => {
      if (activeTool !== 'select' && activeTool !== 'mindmap') return;
      const addToSelection = e?.evt.shiftKey ?? false;
      selectElements([elementId], addToSelection);
    },
    [activeTool, selectElements]
  );

  // Cursor style based on tool
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (isSpacebarPanning) return 'grab';
    switch (activeTool) {
      case 'pan':
        return 'grab';
      case 'pen':
      case 'eraser':
      case 'rectangle':
      case 'circle':
      case 'line':
      case 'arrow':
        return 'crosshair';
      case 'text':
        return 'text';
      case 'mindmap':
        return 'pointer';
      default:
        return 'default';
    }
  };

  // Store ref to shape node
  const setShapeRef = (id: string, node: Konva.Node | null) => {
    if (node) {
      shapeRefs.current.set(id, node);
    } else {
      shapeRefs.current.delete(id);
    }
  };

  // Render elements by type
  const renderElement = (element: (typeof elements)[0]) => {
    const isSelected = selectedElementIds.includes(element.id);
    const isEraserHovering = hoveredElementIdsSet.has(element.id);

    switch (element.type) {
      case 'freehand':
        return (
          <FreehandPath
            key={element.id}
            element={element}
            isSelected={isSelected}
            isEraserHovering={isEraserHovering}
          />
        );

      case 'rectangle':
        return (
          <RectangleShape
            key={element.id}
            element={element}
            isSelected={isSelected}
            isEraserHovering={isEraserHovering}
            onSelect={() => handleElementSelect(element.id)}
            ref={(node: Konva.Rect | null) => setShapeRef(element.id, node)}
          />
        );

      case 'circle':
        return (
          <CircleShape
            key={element.id}
            element={element}
            isSelected={isSelected}
            isEraserHovering={isEraserHovering}
            onSelect={() => handleElementSelect(element.id)}
            ref={(node: Konva.Circle | null) => setShapeRef(element.id, node)}
          />
        );

      case 'line':
        return (
          <LineShape
            key={element.id}
            element={element}
            isSelected={isSelected}
            isEraserHovering={isEraserHovering}
            onSelect={() => handleElementSelect(element.id)}
            ref={(node: Konva.Line | null) => setShapeRef(element.id, node)}
          />
        );

      case 'arrow':
        return (
          <ArrowShape
            key={element.id}
            element={element}
            isSelected={isSelected}
            isEraserHovering={isEraserHovering}
            onSelect={() => handleElementSelect(element.id)}
            ref={(node: Konva.Arrow | null) => setShapeRef(element.id, node)}
          />
        );

      case 'text':
        return (
          <TextShape
            key={element.id}
            element={element}
            isSelected={isSelected}
            isEraserHovering={isEraserHovering}
            onSelect={() => handleElementSelect(element.id)}
            ref={(node: Konva.Group | null) => setShapeRef(element.id, node)}
          />
        );

      case 'image':
        return (
          <ImageShape
            key={element.id}
            element={element}
            isSelected={isSelected}
            isEraserHovering={isEraserHovering}
            onSelect={() => handleElementSelect(element.id)}
            ref={(node: Konva.Group | null) => setShapeRef(element.id, node)}
          />
        );

      default:
        return null;
    }
  };

  // Get selected nodes for transformer
  const selectedNodes = selectedElementIds
    .map((id) => shapeRefs.current.get(id) ?? null)
    .filter((node): node is Konva.Node => node !== null);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={viewport.x}
      y={viewport.y}
      scaleX={viewport.scale}
      scaleY={viewport.scale}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: getCursor(), backgroundColor: isLightMode ? '#f5f5f5' : '#0a0a0a' }}
    >
      {/* Grid Layer */}
      {gridSettings.showGrid && (
        <Layer listening={false}>
          <GridLayer
            width={width}
            height={height}
            gridSize={gridSettings.size}
            gridColor={isLightMode ? '#aaaaaa' : gridSettings.gridColor}
            viewport={viewport}
          />
        </Layer>
      )}

      {/* Elements Layer */}
      <Layer>
        {/* Render saved elements (excluding mindmap nodes which are rendered separately) */}
        {elements
          .slice()
          .filter((el) => el.type !== 'mindmap-node' && el.type !== 'mindmap-connection')
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(renderElement)}

        {/* Render mind map layer */}
        {mindMapNodes.length > 0 && (
          <MindMapLayer
            nodes={mindMapNodes}
            selectedIds={selectedElementIds}
            onSelectNode={handleElementSelect}
            onAddChild={addChildNode}
            onToggleCollapse={toggleCollapse}
            setNodeRef={setShapeRef}
          />
        )}

        {/* Render current drawing stroke */}
        {drawingState.isDrawing && (
          <CurrentStroke
            points={drawingState.currentPoints}
            color={toolSettings.pen.color}
            size={toolSettings.pen.size}
            opacity={toolSettings.pen.opacity}
          />
        )}

        {/* Render shape preview */}
        {shapeState.isDrawing && (
          <ShapePreview
            shapeState={shapeState}
            tool={activeTool}
            strokeColor={toolSettings.shapes.strokeColor}
            fillColor={toolSettings.shapes.fillColor}
            strokeWidth={toolSettings.shapes.strokeWidth}
          />
        )}

        {/* Selection Transformer */}
        {activeTool === 'select' && selectedNodes.length > 0 && (
          <SelectionTransformer selectedNodes={selectedNodes} />
        )}
      </Layer>
    </Stage>
  );
}
