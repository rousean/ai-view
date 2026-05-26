import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import type { Camera, Point, Rect, ResizeHandle, WidgetNode } from '@schema/types'

/** Discriminated union of in-flight gesture states. */
export type Interaction =
  | { kind: 'idle' }
  | { kind: 'moving'; ids: string[]; startedAt: number }
  | { kind: 'resizing'; ids: string[]; handle: ResizeHandle }
  | { kind: 'rotating'; ids: string[]; pivot: Point }
  | { kind: 'marquee'; rect: Rect }
  | { kind: 'panning' }
  /**
   * User is dragging a fresh guide out of a ruler. `position` is the
   * live canvas-space coordinate the preview line should sit at.
   */
  | { kind: 'creating-guide'; orientation: 'horizontal' | 'vertical'; position: number }
  /**
   * User is dragging an existing guide. Used to suppress widget
   * selection and to keep the preview rendering pipeline simple.
   */
  | { kind: 'moving-guide'; id: string; orientation: 'horizontal' | 'vertical'; position: number }

export interface EditorViewOptions {
  showGrid: boolean
  showGuides: boolean
  showRulers: boolean
  showAlignmentGuides: boolean
  snapToGrid: boolean
  snapToElements: boolean
  snapToGuides: boolean
}

export interface EditorPanelVisibility {
  materials: boolean
  property: boolean
  layers: boolean
  minimap: boolean
}

export interface EditorPreferences {
  theme: 'light' | 'dark'
  autoSave: boolean
  /** ms */
  autoSaveInterval: number
}

export interface EditorClipboard {
  widgets: WidgetNode[]
  copiedAt: number
}

export interface EditorState {
  // Camera
  camera: Camera

  /**
   * Live size of the canvas viewport in screen-space pixels. Written
   * from CanvasViewport via ResizeObserver, read by facades that need
   * to fit content to the viewport (e.g. `fitToScreen`).
   * `{ width: 0, height: 0 }` before the first measurement.
   */
  viewportSize: { width: number; height: number }

  /**
   * Last seen pointer position over the canvas, in canvas-space coords.
   * Updated continuously from CanvasViewport pointer-move. `null` when
   * the cursor is outside the viewport. Used by `pasteFromClipboard` so
   * "paste" lands under the cursor instead of at a fixed offset.
   */
  mouseCanvasPos: { x: number; y: number } | null

  // Selection
  selectedIds: string[]
  hoverId: string | null
  primarySelectionId: string | null
  /**
   * Group currently being "edited in isolation". When set, clicking a
   * member of this group selects only that member (instead of expanding
   * to the whole group). Clicking outside the group or pressing Esc
   * clears it. Figma's "double-click into group" idiom.
   */
  isolatedGroupId: string | null

  /**
   * Open-state of the Cmd+K command palette. Lifted to the store so
   * other UI (e.g. the canvas's "double-click empty → quick add") can
   * pop the palette without owning a ref to it.
   */
  paletteOpen: boolean

  /**
   * Sentinel that bumps every time something asks "please put widget X
   * into rename mode" (F2 shortcut, double-click on its layer row, etc).
   * The LayersPanel watches this counter and triggers inline edit on
   * the named widget. Reading via `useEditorState` is reactive so any
   * subscriber re-renders on change.
   */
  renameRequest: { id: string; nonce: number } | null

  // Tool
  tool: string
  toolLocked: boolean
  toolContext: Record<string, unknown>

  // Interaction state machine
  interaction: Interaction

  // Clipboard
  clipboard: EditorClipboard | null

  // Panels & view options
  panels: EditorPanelVisibility
  view: EditorViewOptions

  // Preferences (persisted)
  preferences: EditorPreferences

  // Actions
  actions: {
    setCamera: (camera: Partial<Camera>) => void
    setViewportSize: (size: { width: number; height: number }) => void
    setMouseCanvasPos: (pos: { x: number; y: number } | null) => void
    setIsolatedGroup: (id: string | null) => void
    setPaletteOpen: (open: boolean) => void
    requestRename: (widgetId: string) => void
    setSelected: (ids: string[]) => void
    setHover: (id: string | null) => void
    setPrimarySelection: (id: string | null) => void
    setTool: (tool: string, ctx?: Record<string, unknown>) => void
    setToolLocked: (locked: boolean) => void
    setInteraction: (interaction: Interaction) => void
    setClipboard: (cb: EditorClipboard | null) => void
    togglePanel: (key: keyof EditorPanelVisibility) => void
    setPanel: (key: keyof EditorPanelVisibility, visible: boolean) => void
    setView: (view: Partial<EditorViewOptions>) => void
    setPreferences: (prefs: Partial<EditorPreferences>) => void
    /** Reset volatile state (selection, interaction, clipboard) on document load. */
    resetVolatile: () => void
  }
}

const DEFAULT_VIEW: EditorViewOptions = {
  showGrid: true,
  showGuides: true,
  showRulers: true,
  showAlignmentGuides: true,
  snapToGrid: false,
  snapToElements: true,
  snapToGuides: true,
}

const DEFAULT_PANELS: EditorPanelVisibility = {
  materials: true,
  property: true,
  layers: false,
  minimap: false,
}

const DEFAULT_PREFERENCES: EditorPreferences = {
  theme: 'dark',
  autoSave: true,
  autoSaveInterval: 30_000,
}

export const useEditorStore = create<EditorState>()(
  devtools(
    persist(
      subscribeWithSelector((set) => ({
        camera: { x: 0, y: 0, scale: 1 },
        viewportSize: { width: 0, height: 0 },
        mouseCanvasPos: null,
        selectedIds: [],
        hoverId: null,
        primarySelectionId: null,
        isolatedGroupId: null,
        paletteOpen: false,
        renameRequest: null,
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
            set((s) => ({ camera: { ...s.camera, ...camera } }), false, 'editor/setCamera'),
          setViewportSize: (size) =>
            set({ viewportSize: size }, false, 'editor/setViewportSize'),
          setMouseCanvasPos: (pos) =>
            set({ mouseCanvasPos: pos }, false, 'editor/setMouseCanvasPos'),
          setIsolatedGroup: (id) =>
            set({ isolatedGroupId: id }, false, 'editor/setIsolatedGroup'),
          setPaletteOpen: (open) =>
            set({ paletteOpen: open }, false, 'editor/setPaletteOpen'),
          requestRename: (widgetId) =>
            set(
              (s) => ({
                renameRequest: {
                  id: widgetId,
                  // Nonce bumps so identical consecutive requests still
                  // re-trigger downstream effects.
                  nonce: (s.renameRequest?.nonce ?? 0) + 1,
                },
              }),
              false,
              'editor/requestRename',
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
          setPrimarySelection: (id) => set({ primarySelectionId: id }, false, 'editor/setPrimary'),
          setTool: (tool, ctx) => set({ tool, toolContext: ctx ?? {} }, false, 'editor/setTool'),
          setToolLocked: (locked) => set({ toolLocked: locked }, false, 'editor/setToolLocked'),
          setInteraction: (interaction) => set({ interaction }, false, 'editor/setInteraction'),
          setClipboard: (cb) => set({ clipboard: cb }, false, 'editor/setClipboard'),
          togglePanel: (key) =>
            set(
              (s) => ({ panels: { ...s.panels, [key]: !s.panels[key] } }),
              false,
              'editor/togglePanel',
            ),
          setPanel: (key, visible) =>
            set((s) => ({ panels: { ...s.panels, [key]: visible } }), false, 'editor/setPanel'),
          setView: (view) =>
            set((s) => ({ view: { ...s.view, ...view } }), false, 'editor/setView'),
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
                isolatedGroupId: null,
                paletteOpen: false,
                renameRequest: null,
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
)
