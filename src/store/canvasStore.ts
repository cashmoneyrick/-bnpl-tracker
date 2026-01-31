import { create } from 'zustand';
import type {
  CanvasDocument,
  CanvasElement,
  CanvasTool,
  CanvasViewport,
  GridSettings,
  ToolSettings,
  CanvasHistoryEntry,
  CanvasAction,
} from '../types/canvas';
import {
  DEFAULT_GRID_SETTINGS,
  DEFAULT_TOOL_SETTINGS,
  DEFAULT_VIEWPORT,
} from '../types/canvas';
import { canvasStorage } from '../services/canvasStorage';

interface TextInputState {
  isInputting: boolean;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  fontSize: number;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
}

interface CanvasStore {
  // Document State
  currentDocumentId: string | null;
  documents: CanvasDocument[];
  elements: CanvasElement[];

  // Tool State
  activeTool: CanvasTool;
  toolSettings: ToolSettings;

  // Selection
  selectedElementIds: string[];

  // Viewport
  viewport: CanvasViewport;

  // Grid
  gridSettings: GridSettings;

  // History
  history: CanvasHistoryEntry[];
  historyIndex: number;

  // UI State
  isDrawing: boolean;
  isPanning: boolean;
  isSpacebarPanning: boolean;
  isLightMode: boolean;

  // Text Input State
  textInputState: TextInputState;

  // Loading State
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;

  // Document Actions
  createDocument: (name: string) => Promise<CanvasDocument>;
  loadDocument: (id: string) => Promise<void>;
  saveCurrentDocument: () => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  renameDocument: (id: string, name: string) => Promise<void>;

  // Element Actions
  addElement: (element: Omit<CanvasElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'>) => string;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => string[];

  // Selection Actions
  selectElements: (ids: string[], addToSelection?: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;
  moveSelectedElements: (deltaX: number, deltaY: number) => void;

  // Tool Actions
  setActiveTool: (tool: CanvasTool) => void;
  updateToolSettings: <K extends keyof ToolSettings>(
    tool: K,
    settings: Partial<ToolSettings[K]>
  ) => void;

  // Viewport Actions
  setViewport: (viewport: Partial<CanvasViewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Grid Actions
  updateGridSettings: (settings: Partial<GridSettings>) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  pushHistory: (action: CanvasAction) => void;
  clearHistory: () => void;

  // UI Actions
  setIsDrawing: (isDrawing: boolean) => void;
  setIsPanning: (isPanning: boolean) => void;
  setSpacebarPanning: (isSpacebarPanning: boolean) => void;
  toggleLightMode: () => void;
  centerView: (canvasWidth: number, canvasHeight: number) => void;

  // Text Input Actions
  setTextInputState: (state: TextInputState) => void;
  clearTextInput: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial State
  currentDocumentId: null,
  documents: [],
  elements: [],
  activeTool: 'select',
  toolSettings: DEFAULT_TOOL_SETTINGS,
  selectedElementIds: [],
  viewport: { ...DEFAULT_VIEWPORT },
  gridSettings: { ...DEFAULT_GRID_SETTINGS },
  history: [],
  historyIndex: -1,
  isDrawing: false,
  isPanning: false,
  isSpacebarPanning: false,
  isLightMode: false,
  textInputState: {
    isInputting: false,
    boxX: 0,
    boxY: 0,
    boxWidth: 0,
    boxHeight: 0,
    fontSize: 16,
    screenX: 0,
    screenY: 0,
    screenWidth: 0,
    screenHeight: 0,
  },
  isLoading: false,
  isInitialized: false,

  // Initialize
  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const documents = await canvasStorage.getAllDocuments();

      if (documents.length === 0) {
        // Auto-create a default document for new users
        const defaultDoc = canvasStorage.createDefaultDocument('Untitled Canvas');
        await canvasStorage.saveDocument(defaultDoc);

        set({
          documents: [defaultDoc],
          currentDocumentId: defaultDoc.id,
          elements: [],
          viewport: { ...DEFAULT_VIEWPORT },
          gridSettings: { ...DEFAULT_GRID_SETTINGS },
          isInitialized: true,
          isLoading: false,
        });
        return;
      }

      // Load the most recently updated document
      const sortedDocs = [...documents].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      const currentDoc = sortedDocs[0];

      set({
        documents,
        currentDocumentId: currentDoc?.id || null,
        elements: currentDoc?.elements || [],
        viewport: currentDoc?.viewport || { ...DEFAULT_VIEWPORT },
        gridSettings: currentDoc?.gridSettings || { ...DEFAULT_GRID_SETTINGS },
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[CanvasStore] Initialize failed:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  // Document Actions
  createDocument: async (name: string) => {
    const doc = canvasStorage.createDefaultDocument(name);
    await canvasStorage.saveDocument(doc);

    set((state) => ({
      documents: [...state.documents, doc],
      currentDocumentId: doc.id,
      elements: [],
      viewport: { ...DEFAULT_VIEWPORT },
      gridSettings: { ...DEFAULT_GRID_SETTINGS },
      selectedElementIds: [],
      history: [],
      historyIndex: -1,
    }));

    return doc;
  },

  loadDocument: async (id: string) => {
    const doc = await canvasStorage.getDocument(id);
    if (!doc) {
      console.error('[CanvasStore] Document not found:', id);
      return;
    }

    set({
      currentDocumentId: doc.id,
      elements: doc.elements,
      viewport: doc.viewport,
      gridSettings: doc.gridSettings,
      selectedElementIds: [],
      history: [],
      historyIndex: -1,
    });
  },

  saveCurrentDocument: async () => {
    const { currentDocumentId, elements, viewport, gridSettings, documents } = get();
    if (!currentDocumentId) return;

    const doc = documents.find((d) => d.id === currentDocumentId);
    if (!doc) return;

    const updatedDoc: CanvasDocument = {
      ...doc,
      elements,
      viewport,
      gridSettings,
      updatedAt: new Date().toISOString(),
    };

    await canvasStorage.saveDocument(updatedDoc);

    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === currentDocumentId ? updatedDoc : d
      ),
    }));
  },

  deleteDocument: async (id: string) => {
    await canvasStorage.deleteDocument(id);

    const { documents, currentDocumentId } = get();
    const remaining = documents.filter((d) => d.id !== id);

    // If we deleted the current document, switch to another
    if (currentDocumentId === id) {
      const nextDoc = remaining[0];
      set({
        documents: remaining,
        currentDocumentId: nextDoc?.id || null,
        elements: nextDoc?.elements || [],
        viewport: nextDoc?.viewport || { ...DEFAULT_VIEWPORT },
        gridSettings: nextDoc?.gridSettings || { ...DEFAULT_GRID_SETTINGS },
      });
    } else {
      set({ documents: remaining });
    }
  },

  renameDocument: async (id: string, name: string) => {
    const doc = await canvasStorage.getDocument(id);
    if (!doc) return;

    const updated = { ...doc, name, updatedAt: new Date().toISOString() };
    await canvasStorage.saveDocument(updated);

    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? updated : d)),
    }));
  },

  // Element Actions
  addElement: (elementInput) => {
    const now = new Date().toISOString();
    const { elements } = get();
    const maxZIndex = elements.length > 0
      ? Math.max(...elements.map((e) => e.zIndex))
      : 0;

    const element: CanvasElement = {
      ...elementInput,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      zIndex: maxZIndex + 1,
    } as CanvasElement;

    set((state) => ({
      elements: [...state.elements, element],
    }));

    get().pushHistory({ type: 'add', elementIds: [element.id] });

    return element.id;
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id
          ? ({ ...el, ...updates, updatedAt: new Date().toISOString() } as CanvasElement)
          : el
      ),
    }));
  },

  deleteElements: (ids) => {
    if (ids.length === 0) return;

    get().pushHistory({ type: 'delete', elementIds: ids });

    set((state) => ({
      elements: state.elements.filter((el) => !ids.includes(el.id)),
      selectedElementIds: state.selectedElementIds.filter((id) => !ids.includes(id)),
    }));
  },

  duplicateElements: (ids) => {
    const { elements } = get();
    const toDuplicate = elements.filter((el) => ids.includes(el.id));

    const now = new Date().toISOString();
    const maxZIndex = Math.max(...elements.map((e) => e.zIndex));

    const newElements = toDuplicate.map((el, index) => ({
      ...el,
      id: crypto.randomUUID(),
      x: el.x + 20,
      y: el.y + 20,
      zIndex: maxZIndex + index + 1,
      createdAt: now,
      updatedAt: now,
    }));

    set((state) => ({
      elements: [...state.elements, ...newElements],
      selectedElementIds: newElements.map((el) => el.id),
    }));

    get().pushHistory({ type: 'add', elementIds: newElements.map((el) => el.id) });

    return newElements.map((el) => el.id);
  },

  // Selection Actions
  selectElements: (ids, addToSelection = false) => {
    set((state) => ({
      selectedElementIds: addToSelection
        ? [...new Set([...state.selectedElementIds, ...ids])]
        : ids,
    }));
  },

  selectAll: () => {
    set((state) => ({
      selectedElementIds: state.elements.map((el) => el.id),
    }));
  },

  deselectAll: () => {
    set({ selectedElementIds: [] });
  },

  moveSelectedElements: (deltaX, deltaY) => {
    const { selectedElementIds, elements, gridSettings } = get();
    if (selectedElementIds.length === 0) return;
    if (deltaX === 0 && deltaY === 0) return;

    const snapToGrid = (value: number) => {
      if (!gridSettings.snapToGrid) return value;
      return Math.round(value / gridSettings.size) * gridSettings.size;
    };

    // For point-based elements, snap the DELTA once, not each point
    const snappedDeltaX = gridSettings.snapToGrid
      ? Math.round(deltaX / gridSettings.size) * gridSettings.size
      : deltaX;
    const snappedDeltaY = gridSettings.snapToGrid
      ? Math.round(deltaY / gridSettings.size) * gridSettings.size
      : deltaY;

    set({
      elements: elements.map((el) => {
        if (!selectedElementIds.includes(el.id)) return el;

        // Handle point-based elements — add snapped delta WITHOUT snapping each point
        if (el.type === 'freehand' || el.type === 'line' || el.type === 'arrow') {
          const newPoints = el.points.map((p, i) =>
            i % 2 === 0 ? p + snappedDeltaX : p + snappedDeltaY
          );
          return { ...el, points: newPoints, updatedAt: new Date().toISOString() };
        }

        // Standard x/y elements — snap the final position
        return {
          ...el,
          x: snapToGrid(el.x + deltaX),
          y: snapToGrid(el.y + deltaY),
          updatedAt: new Date().toISOString(),
        } as typeof el;
      }),
    });
  },

  // Tool Actions
  setActiveTool: (tool) => {
    set({ activeTool: tool, selectedElementIds: [] });
  },

  updateToolSettings: (tool, settings) => {
    set((state) => ({
      toolSettings: {
        ...state.toolSettings,
        [tool]: { ...state.toolSettings[tool], ...settings },
      },
    }));
  },

  // Viewport Actions
  setViewport: (viewport) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },

  zoomIn: () => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        scale: Math.min(5, state.viewport.scale * 1.2),
      },
    }));
  },

  zoomOut: () => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        scale: Math.max(0.1, state.viewport.scale / 1.2),
      },
    }));
  },

  resetZoom: () => {
    set((state) => ({
      viewport: { ...state.viewport, scale: 1 },
    }));
  },

  // Grid Actions
  updateGridSettings: (settings) => {
    set((state) => ({
      gridSettings: { ...state.gridSettings, ...settings },
    }));
  },

  toggleGrid: () => {
    set((state) => ({
      gridSettings: {
        ...state.gridSettings,
        showGrid: !state.gridSettings.showGrid,
      },
    }));
  },

  toggleSnapToGrid: () => {
    set((state) => ({
      gridSettings: {
        ...state.gridSettings,
        snapToGrid: !state.gridSettings.snapToGrid,
      },
    }));
  },

  // History Actions
  pushHistory: (action) => {
    const { elements, history, historyIndex } = get();

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);

    const entry: CanvasHistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      elements: JSON.parse(JSON.stringify(elements)), // Deep clone
    };

    // Keep only last 20 history entries to prevent memory issues
    const trimmedHistory = [...newHistory, entry].slice(-20);

    set({
      history: trimmedHistory,
      historyIndex: trimmedHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const previousEntry = history[historyIndex - 1];
    if (previousEntry) {
      set({
        elements: JSON.parse(JSON.stringify(previousEntry.elements)),
        historyIndex: historyIndex - 1,
        selectedElementIds: [],
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const nextEntry = history[historyIndex + 1];
    if (nextEntry) {
      set({
        elements: JSON.parse(JSON.stringify(nextEntry.elements)),
        historyIndex: historyIndex + 1,
        selectedElementIds: [],
      });
    }
  },

  clearHistory: () => {
    set({ history: [], historyIndex: -1 });
  },

  // UI Actions
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setIsPanning: (isPanning) => set({ isPanning }),
  setSpacebarPanning: (isSpacebarPanning) => set({ isSpacebarPanning }),
  toggleLightMode: () => set((state) => ({ isLightMode: !state.isLightMode })),
  centerView: (canvasWidth, canvasHeight) => {
    // Center the origin (0,0) on screen at 100% zoom
    set({
      viewport: {
        x: canvasWidth / 2,
        y: canvasHeight / 2,
        scale: 1,
      },
    });
  },

  // Text Input Actions
  setTextInputState: (state) => set({ textInputState: state }),
  clearTextInput: () =>
    set({
      textInputState: {
        isInputting: false,
        boxX: 0,
        boxY: 0,
        boxWidth: 0,
        boxHeight: 0,
        fontSize: 16,
        screenX: 0,
        screenY: 0,
        screenWidth: 0,
        screenHeight: 0,
      },
    }),
}));

// Auto-save on element, viewport, or grid changes (debounced)
// Use shorter delay (1s) for data changes, longer delay (3s) for viewport-only changes
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
useCanvasStore.subscribe((state, prevState) => {
  if (!state.currentDocumentId) return;

  const elementsChanged = state.elements !== prevState.elements;
  const gridChanged = state.gridSettings !== prevState.gridSettings;
  const viewportChanged = state.viewport !== prevState.viewport;

  if (elementsChanged || gridChanged || viewportChanged) {
    if (saveTimeout) clearTimeout(saveTimeout);

    // Data changes save quickly, viewport-only changes use longer delay
    const delay = elementsChanged || gridChanged ? 1000 : 3000;

    saveTimeout = setTimeout(() => {
      state.saveCurrentDocument();
    }, delay);
  }
});
