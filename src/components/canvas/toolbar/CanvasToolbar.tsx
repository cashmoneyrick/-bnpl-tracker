import { useCanvasStore } from '../../../store/canvasStore';
import { ColorPicker } from './ColorPicker';
import { SizeSlider } from './SizeSlider';
import type { CanvasTool } from '../../../types/canvas';

interface ToolButtonProps {
  tool: CanvasTool;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

function ToolButton({ tool, icon, label, shortcut }: ToolButtonProps) {
  const activeTool = useCanvasStore((state) => state.activeTool);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const isActive = activeTool === tool;

  return (
    <button
      onClick={() => setActiveTool(tool)}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-500/20 text-blue-400'
          : 'text-gray-400 hover:bg-dark-hover hover:text-white'
      }`}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
    </button>
  );
}

export function CanvasToolbar() {
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const history = useCanvasStore((state) => state.history);
  const historyIndex = useCanvasStore((state) => state.historyIndex);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const toolSettings = useCanvasStore((state) => state.toolSettings);
  const updateToolSettings = useCanvasStore((state) => state.updateToolSettings);
  const selectedElementIds = useCanvasStore((state) => state.selectedElementIds);
  const deleteElements = useCanvasStore((state) => state.deleteElements);
  const gridSettings = useCanvasStore((state) => state.gridSettings);
  const updateGridSettings = useCanvasStore((state) => state.updateGridSettings);
  const toggleSnapToGrid = useCanvasStore((state) => state.toggleSnapToGrid);
  const toggleGrid = useCanvasStore((state) => state.toggleGrid);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const hasSelection = selectedElementIds.length > 0;

  const showPenSettings = activeTool === 'pen';
  const showEraserSettings = activeTool === 'eraser';
  const showShapeSettings = ['rectangle', 'circle', 'line', 'arrow'].includes(activeTool);
  const showTextSettings = activeTool === 'text';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-dark-card border-b border-dark-border">
      {/* Left: Tools */}
      <div className="flex items-center gap-1">
        {/* Select */}
        <ToolButton
          tool="select"
          label="Select"
          shortcut="V"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          }
        />

        {/* Pan */}
        <ToolButton
          tool="pan"
          label="Pan"
          shortcut="H"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
              />
            </svg>
          }
        />

        <div className="w-px h-6 bg-dark-border mx-1" />

        {/* Pen */}
        <ToolButton
          tool="pen"
          label="Pen"
          shortcut="P"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          }
        />

        {/* Eraser */}
        <ToolButton
          tool="eraser"
          label="Eraser"
          shortcut="E"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          }
        />

        {/* Pen Settings */}
        {showPenSettings && (
          <>
            <div className="w-px h-6 bg-dark-border mx-1" />
            <ColorPicker
              color={toolSettings.pen.color}
              onChange={(color) => updateToolSettings('pen', { color })}
            />
            <SizeSlider
              size={toolSettings.pen.size}
              min={1}
              max={50}
              onChange={(size) => updateToolSettings('pen', { size })}
              label="Brush Size"
            />
          </>
        )}

        {/* Eraser Settings */}
        {showEraserSettings && (
          <>
            <div className="w-px h-6 bg-dark-border mx-1" />
            <SizeSlider
              size={toolSettings.eraser.size}
              min={5}
              max={100}
              onChange={(size) => updateToolSettings('eraser', { size })}
              label="Eraser Size"
            />
          </>
        )}

        <div className="w-px h-6 bg-dark-border mx-1" />

        {/* Rectangle */}
        <ToolButton
          tool="rectangle"
          label="Rectangle"
          shortcut="R"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
              />
            </svg>
          }
        />

        {/* Circle */}
        <ToolButton
          tool="circle"
          label="Circle"
          shortcut="O"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
            </svg>
          }
        />

        {/* Line */}
        <ToolButton
          tool="line"
          label="Line"
          shortcut="L"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20L20 4" />
            </svg>
          }
        />

        {/* Arrow */}
        <ToolButton
          tool="arrow"
          label="Arrow"
          shortcut="A"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          }
        />

        {/* Shape Settings */}
        {showShapeSettings && (
          <>
            <div className="w-px h-6 bg-dark-border mx-1" />
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Fill:</span>
              <ColorPicker
                color={toolSettings.shapes.fillColor === 'transparent' ? '#000000' : toolSettings.shapes.fillColor}
                onChange={(color) => updateToolSettings('shapes', { fillColor: color })}
              />
              <button
                onClick={() => updateToolSettings('shapes', { fillColor: 'transparent' })}
                className={`p-1.5 rounded border transition-colors ${
                  toolSettings.shapes.fillColor === 'transparent'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-dark-border hover:border-gray-500'
                }`}
                title="No Fill"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Stroke:</span>
              <ColorPicker
                color={toolSettings.shapes.strokeColor}
                onChange={(color) => updateToolSettings('shapes', { strokeColor: color })}
              />
            </div>
            <SizeSlider
              size={toolSettings.shapes.strokeWidth}
              min={1}
              max={20}
              onChange={(strokeWidth) => updateToolSettings('shapes', { strokeWidth })}
              label="Stroke Width"
            />
          </>
        )}

        <div className="w-px h-6 bg-dark-border mx-1" />

        {/* Text */}
        <ToolButton
          tool="text"
          label="Text"
          shortcut="T"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          }
        />

        {/* Text Settings */}
        {showTextSettings && (
          <>
            <div className="w-px h-6 bg-dark-border mx-1" />
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Color:</span>
              <ColorPicker
                color={toolSettings.text.color}
                onChange={(color) => updateToolSettings('text', { color })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Size:</span>
              <select
                value={toolSettings.text.fontSize}
                onChange={(e) => updateToolSettings('text', { fontSize: Number(e.target.value) })}
                className="bg-dark-card border border-dark-border rounded px-2 py-1 text-sm text-gray-300 outline-none focus:border-blue-500"
              >
                {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96].map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Image */}
        <ToolButton
          tool="image"
          label="Image"
          shortcut="I"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />

        <div className="w-px h-6 bg-dark-border mx-1" />

        {/* Mind Map */}
        <ToolButton
          tool="mindmap"
          label="Mind Map"
          shortcut="M"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          }
        />

        {/* Grid Settings */}
        <div className="w-px h-6 bg-dark-border mx-1" />

        {/* Grid visibility toggle */}
        <button
          onClick={toggleGrid}
          className={`p-2 rounded-lg transition-colors ${
            gridSettings.showGrid
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:text-white hover:bg-dark-hover'
          }`}
          title="Toggle Grid"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
        </button>

        {/* Snap to grid toggle */}
        <button
          onClick={toggleSnapToGrid}
          className={`p-2 rounded-lg transition-colors ${
            gridSettings.snapToGrid
              ? 'bg-green-500/20 text-green-400'
              : 'text-gray-400 hover:text-white hover:bg-dark-hover'
          }`}
          title={`Snap to Grid: ${gridSettings.snapToGrid ? 'On' : 'Off'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
        </button>

        {/* Grid size slider */}
        <SizeSlider
          size={gridSettings.size}
          min={10}
          max={100}
          onChange={(size) => updateGridSettings({ size })}
          label="Grid Size"
        />

        {/* Grid color picker */}
        <ColorPicker
          color={gridSettings.gridColor}
          onChange={(color) => updateGridSettings({ gridColor: color })}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Delete Selected */}
        {hasSelection && (
          <>
            <button
              onClick={() => deleteElements(selectedElementIds)}
              className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
              title="Delete Selected (Delete)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <div className="w-px h-6 bg-dark-border mx-1" />
          </>
        )}

        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-colors ${
            canUndo
              ? 'text-gray-400 hover:bg-dark-hover hover:text-white'
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="Undo (Cmd+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-colors ${
            canRedo
              ? 'text-gray-400 hover:bg-dark-hover hover:text-white'
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="Redo (Cmd+Shift+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
