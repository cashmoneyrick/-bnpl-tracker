import { useRef, useEffect, useState, useCallback } from 'react';
import type { Stage } from 'konva/lib/Stage';
import { CanvasStage } from './CanvasStage';
import { CanvasToolbar } from './toolbar/CanvasToolbar';
import { TextCreator } from './elements/TextElement';
import { useImageUpload } from './hooks/useImageUpload';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCanvasStore } from '../../store/canvasStore';
import type { TextElement } from '../../types/canvas';

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const viewport = useCanvasStore((state) => state.viewport);
  const zoomIn = useCanvasStore((state) => state.zoomIn);
  const zoomOut = useCanvasStore((state) => state.zoomOut);
  const resetZoom = useCanvasStore((state) => state.resetZoom);
  const gridSettings = useCanvasStore((state) => state.gridSettings);
  const toggleGrid = useCanvasStore((state) => state.toggleGrid);
  const isLightMode = useCanvasStore((state) => state.isLightMode);
  const toggleLightMode = useCanvasStore((state) => state.toggleLightMode);
  const centerView = useCanvasStore((state) => state.centerView);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const textCreationState = useCanvasStore((state) => state.textCreationState);
  const cancelTextCreation = useCanvasStore((state) => state.cancelTextCreation);
  const toolSettings = useCanvasStore((state) => state.toolSettings);
  const addElement = useCanvasStore((state) => state.addElement);

  // Text creation handlers
  const handleTextComplete = useCallback(
    (text: string) => {
      if (!text.trim()) {
        cancelTextCreation();
        return;
      }

      const textElement: Omit<TextElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'> = {
        type: 'text',
        x: textCreationState.x,
        y: textCreationState.y,
        text: text.trim(),
        fontSize: toolSettings.text.fontSize,
        fontFamily: toolSettings.text.fontFamily,
        fontStyle: 'normal',
        fill: toolSettings.text.color,
        align: 'left',
        padding: 4,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
      };

      addElement(textElement);
      cancelTextCreation();
    },
    [textCreationState.x, textCreationState.y, toolSettings.text, addElement, cancelTextCreation]
  );

  const handleTextCancel = useCallback(() => {
    cancelTextCreation();
  }, [cancelTextCreation]);

  // Image upload hook
  const { openFilePicker } = useImageUpload(stageRef, containerRef);

  // Keyboard shortcuts hook
  useKeyboardShortcuts();

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-dark-bg overflow-hidden">
      {/* Toolbar */}
      <CanvasToolbar />

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <CanvasStage
          width={dimensions.width}
          height={dimensions.height}
          stageRef={stageRef}
        />

        {/* Text Creator Overlay */}
        {textCreationState.isCreating && (
          <TextCreator
            x={textCreationState.screenX}
            y={textCreationState.screenY}
            onComplete={handleTextComplete}
            onCancel={handleTextCancel}
            settings={toolSettings.text}
          />
        )}

        {/* Image Upload Prompt - shown when image tool is selected */}
        {activeTool === 'image' && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
            onClick={openFilePicker}
          >
            <div className="bg-dark-card border border-dark-border rounded-lg p-6 text-center shadow-xl">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-300 mb-1">Click to upload an image</p>
              <p className="text-sm text-gray-500">Or drag & drop / paste from clipboard</p>
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-dark-card border border-dark-border rounded-lg px-2 py-1">
            <button
              onClick={zoomOut}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={resetZoom}
              className="px-2 text-sm text-gray-300 hover:text-white transition-colors min-w-[50px]"
              title="Reset Zoom"
            >
              {Math.round(viewport.scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Grid Toggle */}
          <button
            onClick={toggleGrid}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              gridSettings.showGrid
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                : 'bg-dark-card border-dark-border text-gray-400 hover:text-white'
            }`}
            title="Toggle Grid"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            <span className="text-sm">Grid</span>
          </button>

          {/* Light Mode Toggle */}
          <button
            onClick={toggleLightMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              isLightMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-dark-card border-dark-border text-gray-400 hover:text-white'
            }`}
            title="Toggle Light Mode"
          >
            {isLightMode ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            <span className="text-sm">{isLightMode ? 'Light' : 'Dark'}</span>
          </button>

          {/* Center View Button */}
          <button
            onClick={() => centerView(dimensions.width, dimensions.height)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-dark-card border-dark-border text-gray-400 hover:text-white transition-colors"
            title="Center View on Content"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
            <span className="text-sm">Center</span>
          </button>
        </div>
      </div>
    </div>
  );
}
