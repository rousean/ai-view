import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import type {
  Camera,
  Point,
  Rect,
  ResizeHandle,
  WidgetNode,
} from '@schema/types';

/** Discriminated union of in-flight gesture states. */
export type Interaction =
  | { kind: 'idle' }
  | { kind: 'moving'; ids: string[]; startedAt: number }
  | { kind: 'resizing'; ids: string[]; handle: ResizeHandle }
  | { kind: 'rotating'; ids: string[]; pivot: Point }
  | { kind: 'marquee'; rect: Rect }
  | { kind: 'panning' };

export interface EditorViewOptions {
  showGrid: boolean;
  showGuides: boolean;
  showRulers: boolean;
  showAlignmentGuides: boolean;
  snapToGrid: boolean;
  snapToElements: boolean;
  snapToGuides: boolean;
}

export interface EditorPanelVisibility {
  materials: boolean;
  property: boolean;
  layers: boolean;
  minimap: boolean;
}

export interface EditorPreferences {
  theme: 'light' | 'dark';
  autoSave: boolean;
  /** ms */
  autoSaveInterval: number;
}

export interface EditorClipboard {
  widgets: WidgetNode[];
  copiedAt: number;
}

export interface EditorState {
  // Camera
  camera: Camera;

  // Selection
  selectedIds: string[];
  hoverId: string | null;
  primarySelectionId: string | null;

  // Tool
  tool: string;
  toolLocked: boolean;
  toolContext: Record<string, unknown>;

  // Interaction state machine
  interaction: Interaction;

  // Clipboard
  clipboard: EditorClipboard | null;

  // Panels & view options
  panels: EditorPanelVisibility;
  view: EditorViewOptions;

  // Preferences (persisted)
  preferences: EditorPreferences;

  // Actions
  actions: {
    setCamera: (camera: Partial<Camera>) => void;
    setSelected: (ids: string[]) => void;
    setHover: (id: string | null) => void;
    setPrimarySelection: (id: string | null) => void;
    setTool: (tool: string, ctx?: Record<string, unknown>) => void;
    setToolLocked: (locked: boolean) => void;
    setInteraction: (interaction: Interaction) => void;
    setClipboard: (cb: EditorClipboard | null) => void;
    togglePanel: (key: keyof EditorPanelVisibility) => void;
    setPanel: (key: keyof EditorPanelVisibility, visible: boolean) => void;
    setView: (view: Partial<EditorViewOptions>) => void;
    setPreferences: (prefs: Partial<EditorPreferences>) => void;
    /** Reset volatile state (selection, interaction, clipboard) on document load. */
    resetVolatile: () => void;
  };
}

const DEFAULT_VIEW: EditorViewOptions = {
  showGrid: true,
  showGuides: true,
  showRulers: true,
  showAlignmentGuides: true,
  snapToGrid: false,
  snapToElements: true,
  snapToGuides: true,
};

const DEFAULT_PANELS: EditorPanelVisibility = {
  materials: true,
  property: true,
  layers: false,
  minimap: false,
};

const DEFAULT_PREFERENCES: EditorPreferences = {
  theme: 'dark',
  autoSave: true,
  autoSaveInterval: 30_000,
};

export const useEditorStore = create<EditorState>()(
  devtools(
    persist(
      subscribeWithSelector((set) => ({
        camera: { x: 0, y: 0, scale: 1 },
        selectedIds: [],
        hoverId: null,
        primarySelectionId: null,
        tool: 'select',
        toolLocked: false,
        toolContext: {},
        interaction: { kind: 'idle' },
        clipboard: null,
        panels: { ...DEFAULT_PANELS },
        view: { ...DEFAULT_VIEW },
        preferences: { ...DEFAULT_PREFERENCES },

        actions: {
          setCamera: (camera) =>
            set(
              (s) => ({ camera: { ...s.camera, ...camera } }),
              false,
              'editor/setCamera',
            ),
          setSelected: (ids) =>
            set(
              {
                selectedIds: ids,
                primarySelectionId: ids[0] ?? null,
              },
              false,
              'editor/setSelected',
            ),
          setHover: (id) => set({ hoverId: id }, false, 'editor/setHover'),
          setPrimarySelection: (id) =>
            set({ primarySelectionId: id }, false, 'editor/setPrimary'),
          setTool: (tool, ctx) =>
            set(
              { tool, toolContext: ctx ?? {} },
              false,
              'editor/setTool',
            ),
          setToolLocked: (locked) =>
            set({ toolLocked: locked }, false, 'editor/setToolLocked'),
          setInteraction: (interaction) =>
            set({ interaction }, false, 'editor/setInteraction'),
          setClipboard: (cb) =>
            set({ clipboard: cb }, false, 'editor/setClipboard'),
          togglePanel: (key) =>
            set(
              (s) => ({ panels: { ...s.panels, [key]: !s.panels[key] } }),
              false,
              'editor/togglePanel',
            ),
          setPanel: (key, visible) =>
            set(
              (s) => ({ panels: { ...s.panels, [key]: visible } }),
              false,
              'editor/setPanel',
            ),
          setView: (view) =>
            set(
              (s) => ({ view: { ...s.view, ...view } }),
              false,
              'editor/setView',
            ),
          setPreferences: (prefs) =>
            set(
              (s) => ({ preferences: { ...s.preferences, ...prefs } }),
              false,
              'editor/setPreferences',
            ),
          resetVolatile: () =>
            set(
              {
                selectedIds: [],
                hoverId: null,
                primarySelectionId: null,
                interaction: { kind: 'idle' },
                clipboard: null,
              },
              false,
              'editor/resetVolatile',
            ),
        },
      })),
      {
        name: 'aiview:editor-prefs',
        // Only persist user preferences across sessions; everything else
        // is intentionally session-scoped.
        partialize: (s) => ({
          preferences: s.preferences,
          panels: s.panels,
          view: s.view,
        }),
      },
    ),
    { name: 'EditorStore' },
  ),
);
