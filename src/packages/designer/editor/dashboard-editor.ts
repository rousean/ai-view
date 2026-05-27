import type {
  Background,
  Camera,
  DataSource,
  FieldType,
  Layout,
  Page,
  Point,
  Project,
  SlotMapping,
  WidgetData,
  WidgetNode,
} from '@schema/types'
import type { PersistenceAdapter } from '@schema/persistence'
import type { WidgetMeta } from '@widgets/widget-meta'
import { createGroupId, createWidgetId } from '@schema/index'

import { initInlineFromSample } from '../data/resolve'

import { unionBBox } from '../canvas/transformer/geometry'
import { useDocumentStore } from '../stores/document-store'
import {
  selectCurrentPage,
  selectDataSource,
  selectWidget,
  selectWidgets,
} from '../stores/selectors'
import { useEditorStore } from '../stores/editor-store'
import { useRuntimeStore } from '../stores/runtime-store'

import {
  deserializeWidgetsFromClipboard,
  serializeWidgetsForClipboard,
} from './clipboard'
import type { Command, CommandContext } from './command-registry'
import { registerBuiltinCommands } from './commands'
import { EventBus } from './event-bus'
import { HistoryManager } from './history-manager'
import { HookManager } from './hook-manager'
import { RegistryHub } from './registry-hub'
import { SnapManager } from '../snap/snap-manager'

export interface EditorOptions {
  adapter: PersistenceAdapter
  /** Built-in plugins to install on construction. */
  initialPlugins?: Plugin[]
  /** Default tool. */
  initialTool?: string
}

export interface PluginContext {
  editor: DashboardEditor
  registries: RegistryHub
  bus: EventBus
  hooks: HookManager
}

export interface Plugin {
  name: string
  version?: string
  install(ctx: PluginContext): void | (() => void)
}

/**
 * The single public surface for everything in the designer. UI components,
 * tools, and plugins all interact with the system via an instance of this
 * class. Internal state lives in DocumentStore / EditorStore / RuntimeStore;
 * this class is the orchestrator that wires them together with command
 * dispatch, history, events, hooks, and registries.
 */
export class DashboardEditor {
  readonly bus = new EventBus()
  readonly hooks = new HookManager()
  readonly registry = new RegistryHub()
  readonly history: HistoryManager
  readonly adapter: PersistenceAdapter
  readonly snap = new SnapManager()

  private installedPlugins = new Map<string, () => void>()

  // ── Save / dirty tracking ─────────────────────────────────────────
  // `_dirty` flips true on the first mutation after a save (or load)
  // and back to false on a successful save. Auto-save schedules a
  // debounced save after each mutation; pulling on the same dirty
  // signal so loading a clean document doesn't fire a no-op save.
  private _dirty = false
  private _lastSavedAt: Date | null = null
  private _saving = false
  private _autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  private _autoSaveMs = 30_000 // override via prefs.autoSaveInterval
  private _autoSaveEnabled = true

  constructor(opts: EditorOptions) {
    this.adapter = opts.adapter
    this.history = new HistoryManager(this.bus)

    registerBuiltinCommands(this.registry.commands)

    if (opts.initialTool) {
      useEditorStore.getState().actions.setTool(opts.initialTool)
    }

    for (const plugin of opts.initialPlugins ?? []) {
      this.use(plugin)
    }

    // Hook dirty tracking into every document-mutating event. We listen
    // on the bus rather than wrapping `execute()` so commands routed
    // through history (apply/undo/redo) all flow through one funnel.
    const markDirty = () => this._markDirty()
    this.bus.on('history.applied', markDirty)
    this.bus.on('history.undone', markDirty)
    this.bus.on('history.redone', markDirty)

    // Reset dirty on (re)load — a freshly loaded project is clean.
    this.bus.on('document.loaded', () => {
      this._dirty = false
      this._lastSavedAt = null
      this._cancelAutoSave()
      this.bus.emit('document.dirty', { dirty: false })
    })

    // Pick up the user's autosave preferences (interval + enabled).
    const prefs = useEditorStore.getState().preferences
    this._autoSaveEnabled = prefs.autoSave
    this._autoSaveMs = prefs.autoSaveInterval
  }

  // ── Dirty / save accessors ────────────────────────────────────────

  isDirty(): boolean {
    return this._dirty
  }

  isSaving(): boolean {
    return this._saving
  }

  /** Last successful save timestamp, or null if never saved this session. */
  getLastSavedAt(): Date | null {
    return this._lastSavedAt
  }

  private _markDirty(): void {
    if (!this._dirty) {
      this._dirty = true
      this.bus.emit('document.dirty', { dirty: true })
    }
    if (this._autoSaveEnabled) this._scheduleAutoSave()
  }

  private _scheduleAutoSave(): void {
    this._cancelAutoSave()
    this._autoSaveTimer = setTimeout(() => {
      this._autoSaveTimer = null
      void this.save().catch((err) => {
        console.error('[autosave] save failed', err)
      })
    }, this._autoSaveMs)
  }

  private _cancelAutoSave(): void {
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer)
      this._autoSaveTimer = null
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async load(projectId: string): Promise<void> {
    const project = await this.adapter.load(projectId)
    useDocumentStore.getState()._setProject(project)
    useEditorStore.getState().actions.resetVolatile()
    useRuntimeStore.getState().actions.clearAll()
    this.history.clear()
    this.bus.emit('document.loaded', { project })
  }

  async loadFromProject(project: Project): Promise<void> {
    useDocumentStore.getState()._setProject(project)
    useEditorStore.getState().actions.resetVolatile()
    useRuntimeStore.getState().actions.clearAll()
    this.history.clear()
    this.bus.emit('document.loaded', { project })
  }

  async save(): Promise<void> {
    const project = useDocumentStore.getState().project
    if (!project) return
    // Reentrancy guard — a slow save shouldn't get a second save fired
    // on top of it (Cmd+S during autosave, etc.).
    if (this._saving) return
    this._cancelAutoSave()
    this._saving = true
    try {
      await this.adapter.save(project)
      this._dirty = false
      this._lastSavedAt = new Date()
      this.bus.emit('document.saved', { project })
      this.bus.emit('document.dirty', { dirty: false })
    } finally {
      this._saving = false
    }
  }

  async close(): Promise<void> {
    for (const dispose of this.installedPlugins.values()) {
      try {
        dispose()
      } catch (err) {
        console.error('[DashboardEditor] plugin dispose threw', err)
      }
    }
    this.installedPlugins.clear()
    useDocumentStore.getState()._setProject(null)
    this.bus.clear()
    this.hooks.clear()
    this.history.clear()
  }

  isLoaded(): boolean {
    return !!useDocumentStore.getState().project
  }

  // ── Plugins ──────────────────────────────────────────────────────

  use(plugin: Plugin): this {
    if (this.installedPlugins.has(plugin.name)) {
      console.warn(`[DashboardEditor] plugin "${plugin.name}" already installed`)
      return this
    }
    const ctx: PluginContext = {
      editor: this,
      registries: this.registry,
      bus: this.bus,
      hooks: this.hooks,
    }
    const dispose = plugin.install(ctx)
    this.installedPlugins.set(plugin.name, dispose ?? (() => {}))
    return this
  }

  unuse(name: string): void {
    const dispose = this.installedPlugins.get(name)
    if (!dispose) return
    try {
      dispose()
    } catch (err) {
      console.error(`[DashboardEditor] plugin "${name}" dispose threw`, err)
    }
    this.installedPlugins.delete(name)
  }

  // ── Layer 2: command dispatch ────────────────────────────────────

  execute<P = unknown>(type: string, payload: P): void {
    const cmd = this.registry.commands.get(type) as Command<P> | undefined
    if (!cmd) {
      console.warn(`[DashboardEditor] unknown command "${type}"`)
      return
    }
    const ctx: CommandContext = { editor: this }
    if (cmd.canExecute && !cmd.canExecute(ctx, payload)) return

    this.bus.emit('command.before', { key: type, payload })
    try {
      if (cmd.apply) {
        const label = typeof cmd.label === 'function' ? cmd.label(payload) : (cmd.label ?? type)
        const mergeKey = cmd.mergeKey?.(payload)
        if (cmd.undoable) {
          this.history.apply(label, (draft) => cmd.apply!(draft, ctx, payload), {
            mergeKey,
          })
        } else {
          this.history.applyEphemeral((draft) => cmd.apply!(draft, ctx, payload))
        }
      } else if (cmd.run) {
        cmd.run(ctx, payload)
      }
      this.bus.emit('command.after', { key: type, payload })
    } catch (err) {
      this.bus.emit('command.failed', {
        key: type,
        payload,
        error: err as Error,
      })
      throw err
    }
  }

  canExecute(type: string, payload: unknown): boolean {
    const cmd = this.registry.commands.get(type)
    if (!cmd) return false
    if (!cmd.canExecute) return true
    return cmd.canExecute({ editor: this }, payload)
  }

  // ── Layer 3: convenience methods ────────────────────────────────
  // These are thin wrappers around `execute()` to provide IntelliSense.

  // Widgets ────────────────────────────────────────────────────────

  addWidget(
    type: string,
    opts: {
      position?: Point
      size?: { width: number; height: number }
      props?: Record<string, unknown>
      name?: string
    } = {},
  ): void {
    this.execute('widget.add', { type, ...opts })
  }

  removeWidgets(ids: string[]): void {
    if (ids.length === 0) return
    this.execute('widget.remove', { ids })
    // Sync selection
    const remaining = useEditorStore.getState().selectedIds.filter((id) => !ids.includes(id))
    this.select(remaining)
  }

  updateProps(id: string, props: Record<string, unknown>): void {
    this.execute('widget.updateProps', { id, props })
  }

  updateLayout(id: string, layout: Partial<Layout>): void {
    this.execute('widget.updateLayout', { id, layout })
  }

  updateLayoutBatch(updates: Array<{ id: string; layout: Partial<Layout> }>): void {
    this.execute('widget.updateLayoutBatch', { updates })
  }

  renameWidget(id: string, name: string): void {
    this.execute('widget.rename', { id, name })
  }

  setLocked(ids: string[], locked: boolean): void {
    this.execute('widget.setFlag', { ids, flag: 'locked', value: locked })
  }

  setHidden(ids: string[], hidden: boolean): void {
    this.execute('widget.setFlag', { ids, flag: 'hidden', value: hidden })
  }

  flipHorizontal(ids: string[]): void {
    this.execute('widget.flip', { ids, axis: 'x' })
  }

  flipVertical(ids: string[]): void {
    this.execute('widget.flip', { ids, axis: 'y' })
  }

  bringForward(ids: string[]): void {
    this.execute('widget.moveLayer', { ids, delta: +1 })
  }

  sendBackward(ids: string[]): void {
    this.execute('widget.moveLayer', { ids, delta: -1 })
  }

  /**
   * Push the given widgets to the very top of the z-order (visually on
   * top of everything else). Goes through `widget.reorder` with a fresh
   * ordering so it stays a single undo entry.
   */
  bringToFront(ids: string[]): void {
    if (ids.length === 0) return
    const all = this.getAllWidgets().map((w) => w.id)
    const set = new Set(ids)
    const rest = all.filter((id) => !set.has(id))
    // Preserve the relative order *within* the targeted set so a multi-
    // select bring-to-front looks like the user expects: clicked stays on
    // top of its peers, peers in their original order beneath.
    const targeted = all.filter((id) => set.has(id))
    this.execute('widget.reorder', { orderedIds: [...rest, ...targeted] })
  }

  /** Mirror of bringToFront — pushes to the very bottom of the z-order. */
  sendToBack(ids: string[]): void {
    if (ids.length === 0) return
    const all = this.getAllWidgets().map((w) => w.id)
    const set = new Set(ids)
    const rest = all.filter((id) => !set.has(id))
    const targeted = all.filter((id) => set.has(id))
    this.execute('widget.reorder', { orderedIds: [...targeted, ...rest] })
  }

  reorderWidgets(orderedIds: string[]): void {
    this.execute('widget.reorder', { orderedIds })
  }

  groupWidgets(ids: string[]): void {
    if (ids.length < 2) return
    this.execute('widget.group', { ids })
  }

  ungroupWidgets(groupId: string): void {
    this.execute('widget.ungroup', { groupId })
  }

  // Clipboard ──────────────────────────────────────────────────────
  // copy/cut/paste keep two layers of state:
  //   - EditorStore.clipboard for instant same-tab paste
  //   - navigator.clipboard text for cross-tab paste
  // System-clipboard ops are async (and may be denied) — facade methods
  // return Promises so callers (shortcut handlers) can `void` them.

  /** Cmd+D — clone the current selection in-place with a +10/+10 offset. */
  duplicateSelection(opts: { offset?: Point } = {}): void {
    const ids = this.getSelectedIds()
    if (ids.length === 0) return
    const newIds = ids.map(() => createWidgetId())
    this.execute('widget.duplicate', { ids, newIds, offset: opts.offset })
    this.select(newIds)
  }

  async copySelection(): Promise<void> {
    const widgets = this.getSelectedWidgets()
    if (widgets.length === 0) return
    useEditorStore.getState().actions.setClipboard({
      // Deep-clone so later edits to the source don't mutate the cached
      // copy. `structuredClone` is available everywhere we run (modern
      // browsers + Node 17+).
      widgets: widgets.map((w) => structuredClone(w)),
      copiedAt: Date.now(),
    })
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(serializeWidgetsForClipboard(widgets))
      } catch {
        // Permission denied / no secure context — in-memory clipboard still works.
      }
    }
  }

  async cutSelection(): Promise<void> {
    const ids = this.getSelectedIds()
    if (ids.length === 0) return
    await this.copySelection()
    this.removeWidgets(ids)
  }

  /**
   * Paste widgets from the system clipboard if it holds one of our
   * payloads, otherwise from the in-memory clipboard. Pasted widgets get
   * fresh ids, fresh groupIds (so a paste in the same page doesn't
   * collide with the source), and an offset (defaulting to +10/+10) so
   * they're visually distinct from the source.
   */
  async pasteFromClipboard(opts: { offset?: Point } = {}): Promise<void> {
    // Try system clipboard first (cross-tab parity).
    let nodes: Array<Omit<WidgetNode, 'id'>> | null = null
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const text = await navigator.clipboard.readText()
        nodes = deserializeWidgetsFromClipboard(text)
      } catch {
        // Permission denied — fall back below.
      }
    }
    // Fallback: in-memory clipboard (same-tab copy-paste path).
    if (!nodes || nodes.length === 0) {
      const cb = useEditorStore.getState().clipboard
      if (cb && cb.widgets.length > 0) {
        nodes = cb.widgets.map(({ id: _id, ...rest }) => rest)
      }
    }
    if (!nodes || nodes.length === 0) return

    // Remap groupIds: every distinct old groupId in the paste set maps
    // to a freshly allocated one. Keeps "paste a group" → "still a group"
    // semantics without leaking the source page's groupIds into ours.
    const groupRemap = new Map<string, string>()
    for (const n of nodes) {
      if (n.groupId && !groupRemap.has(n.groupId)) {
        groupRemap.set(n.groupId, createGroupId())
      }
    }

    // Drop location:
    //   - explicit `opts.offset` wins (callers that want exact control)
    //   - else, if the cursor is over the canvas → centre the pasted
    //     bbox under it (Figma idiom)
    //   - else → small +10/+10 fallback so things don't fully overlap
    let deltaX: number, deltaY: number
    if (opts.offset) {
      deltaX = opts.offset.x
      deltaY = opts.offset.y
    } else {
      const mouse = useEditorStore.getState().mouseCanvasPos
      if (mouse) {
        // Union bbox of the un-rotated layouts is enough for centring.
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const n of nodes) {
          const { x, y, width, height } = n.layout
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (x + width > maxX) maxX = x + width
          if (y + height > maxY) maxY = y + height
        }
        deltaX = mouse.x - (minX + (maxX - minX) / 2)
        deltaY = mouse.y - (minY + (maxY - minY) / 2)
      } else {
        deltaX = 10
        deltaY = 10
      }
    }

    const newIds = nodes.map(() => createWidgetId())
    this.execute('widget.addMany', {
      nodes: nodes.map((n, i) => ({
        ...n,
        id: newIds[i],
        layout: { ...n.layout, x: n.layout.x + deltaX, y: n.layout.y + deltaY },
        groupId: n.groupId ? groupRemap.get(n.groupId) : undefined,
      })),
    })
    this.select(newIds)
  }

  // Selection (volatile, no undo) ──────────────────────────────────

  select(ids: string[]): void {
    useEditorStore.getState().actions.setSelected(ids)
    this.bus.emit('selection.changed', { ids })
  }

  selectOne(id: string, opts: { addToSelection?: boolean } = {}): void {
    const current = useEditorStore.getState().selectedIds
    if (opts.addToSelection) {
      if (current.includes(id)) return
      this.select([...current, id])
    } else {
      this.select([id])
    }
  }

  toggleSelect(id: string): void {
    const current = useEditorStore.getState().selectedIds
    if (current.includes(id)) {
      this.select(current.filter((x) => x !== id))
    } else {
      this.select([...current, id])
    }
  }

  selectAll(): void {
    const ids = this.getAllWidgets().map((w) => w.id)
    this.select(ids)
  }

  selectNone(): void {
    this.select([])
  }

  setHover(id: string | null): void {
    useEditorStore.getState().actions.setHover(id)
    this.bus.emit('hover.changed', { id })
  }

  /**
   * Enter / leave "isolated group" mode (Figma's double-click-into-group
   * idiom). While set, click-to-select on a member of that group selects
   * just the one member instead of the whole group. `null` exits.
   */
  setIsolatedGroup(id: string | null): void {
    useEditorStore.getState().actions.setIsolatedGroup(id)
  }

  getIsolatedGroupId(): string | null {
    return useEditorStore.getState().isolatedGroupId
  }

  /** Open / close the Cmd+K command palette from anywhere. */
  setPaletteOpen(open: boolean): void {
    useEditorStore.getState().actions.setPaletteOpen(open)
  }

  /**
   * Ask any listening UI (currently the LayersPanel) to put the given
   * widget — or the primary selection if no id — into inline rename mode.
   * Bumps a nonce so the same widget can be re-requested.
   */
  requestRename(widgetId?: string): void {
    const id = widgetId ?? useEditorStore.getState().primarySelectionId
    if (!id) return
    useEditorStore.getState().actions.requestRename(id)
  }

  // Camera (volatile) ──────────────────────────────────────────────

  setCamera(camera: Partial<Camera>): void {
    useEditorStore.getState().actions.setCamera(camera)
    this.bus.emit('camera.changed', {
      camera: useEditorStore.getState().camera,
    })
  }

  getCamera(): Camera {
    return useEditorStore.getState().camera
  }

  zoomBy(delta: number, anchor?: Point): void {
    const cam = this.getCamera()
    const next = Math.max(0.1, Math.min(8, cam.scale + delta))
    if (!anchor) {
      this.setCamera({ scale: next })
      return
    }
    // Keep `anchor` (in screen space) over the same canvas point.
    const ratio = next / cam.scale
    this.setCamera({
      scale: next,
      x: anchor.x - (anchor.x - cam.x) * ratio,
      y: anchor.y - (anchor.y - cam.y) * ratio,
    })
  }

  resetView(): void {
    this.setCamera({ x: 0, y: 0, scale: 1 })
  }

  /**
   * Fit the current page's canvas into the viewport: pick the largest
   * scale that keeps both dimensions inside, then centre. `padding` is
   * the breathing-room around the canvas in *screen* pixels.
   *
   * No-ops before the first viewport measurement (CanvasViewport writes
   * `viewportSize` via ResizeObserver).
   */
  fitToScreen(padding = 40): void {
    const page = this.getCurrentPage()
    const { width: vw, height: vh } = useEditorStore.getState().viewportSize
    if (!page || vw <= 0 || vh <= 0) return
    const availW = Math.max(vw - padding * 2, 1)
    const availH = Math.max(vh - padding * 2, 1)
    const scale = Math.min(availW / page.canvas.width, availH / page.canvas.height)
    const x = (vw - page.canvas.width * scale) / 2
    const y = (vh - page.canvas.height * scale) / 2
    this.setCamera({ x, y, scale })
  }

  /**
   * Fit the current selection (union bbox) into the viewport, leaving
   * `padding` screen pixels of breathing room. With nothing selected,
   * falls back to `fitToScreen()` so the shortcut always does *something*.
   */
  fitToSelection(padding = 80): void {
    const widgets = this.getSelectedWidgets()
    if (widgets.length === 0) {
      this.fitToScreen()
      return
    }
    const bb = unionBBox(widgets)
    const { width: vw, height: vh } = useEditorStore.getState().viewportSize
    if (!bb || vw <= 0 || vh <= 0) return
    const availW = Math.max(vw - padding * 2, 1)
    const availH = Math.max(vh - padding * 2, 1)
    const scale = Math.min(availW / Math.max(bb.width, 1), availH / Math.max(bb.height, 1))
    // Cap zoom-in so a tiny widget doesn't slam to 5000% — Figma caps
    // around 200% on fit-to-selection. We allow up to 400%.
    const cappedScale = Math.min(scale, 4)
    const cx = bb.x + bb.width / 2
    const cy = bb.y + bb.height / 2
    const x = vw / 2 - cx * cappedScale
    const y = vh / 2 - cy * cappedScale
    this.setCamera({ x, y, scale: cappedScale })
  }

  panBy(dx: number, dy: number): void {
    const cam = this.getCamera()
    this.setCamera({ x: cam.x + dx, y: cam.y + dy })
  }

  /** Convert screen-space → canvas-space. */
  screenToCanvas(p: Point, viewport?: { left: number; top: number }): Point {
    const cam = this.getCamera()
    const left = viewport?.left ?? 0
    const top = viewport?.top ?? 0
    return {
      x: (p.x - left - cam.x) / cam.scale,
      y: (p.y - top - cam.y) / cam.scale,
    }
  }

  /** Convert canvas-space → screen-space. */
  canvasToScreen(p: Point, viewport?: { left: number; top: number }): Point {
    const cam = this.getCamera()
    const left = viewport?.left ?? 0
    const top = viewport?.top ?? 0
    return {
      x: p.x * cam.scale + cam.x + left,
      y: p.y * cam.scale + cam.y + top,
    }
  }

  // Pages ──────────────────────────────────────────────────────────

  switchPage(pageId: string): void {
    this.execute('page.switch', { pageId })
    useEditorStore.getState().actions.resetVolatile()
    this.bus.emit('page.changed', { pageId })
  }

  addPage(name?: string): void {
    this.execute('page.add', { name })
  }

  removePage(pageId: string): void {
    this.execute('page.remove', { pageId })
  }

  renamePage(pageId: string, name: string): void {
    this.execute('page.rename', { pageId, name })
  }

  duplicatePage(pageId: string): void {
    this.execute('page.duplicate', { pageId })
  }

  reorderPages(orderedIds: string[]): void {
    this.execute('page.reorder', { orderedIds })
  }

  // Canvas / grid / guides ─────────────────────────────────────────

  setCanvasSize(width: number, height: number): void {
    this.execute('canvas.setSize', { width, height })
  }

  toggleOrientation(): void {
    this.execute('canvas.toggleOrientation', {})
  }

  setBackground(background: Background): void {
    this.execute('canvas.setBackground', { background })
  }

  setGrid(grid: Partial<Page['grid']>): void {
    this.execute('grid.set', { grid })
  }

  addGuide(orientation: 'horizontal' | 'vertical', position: number): void {
    this.execute('guide.add', { orientation, position })
  }

  removeGuide(id: string): void {
    this.execute('guide.remove', { id })
  }

  updateGuide(id: string, position: number): void {
    this.execute('guide.update', { id, position })
  }

  clearGuides(): void {
    this.execute('guide.clear', {})
  }

  // Widget data ────────────────────────────────────────────────────

  /**
   * Set / clear the widget's `data` field directly. Passing `undefined`
   * reverts the widget to its meta's built-in sample dataset.
   */
  setWidgetData(id: string, next: WidgetData | undefined): void {
    this.execute('widget.setData', { id, next })
  }

  /**
   * Ensure the widget has inline data: if it already does, no-op; if
   * it's bound or sample, switch to inline initialised from the meta's
   * sample. Called by the data tab when the user starts editing a
   * cell on a "sample" widget (the resolver's `isSample === true`
   * fallback) — the first edit promotes them to inline.
   */
  ensureInlineWidgetData(id: string): void {
    const node = this.getWidget(id)
    if (!node) return
    if (node.data?.mode === 'inline') return
    const meta = this.registry.widgets.get(node.type) as WidgetMeta | undefined
    const next = initInlineFromSample(meta)
    if (next) this.setWidgetData(id, next)
  }

  /** Patch the slot→column mapping; pass `null` for a slot to remove it. */
  updateSlotMapping(id: string, mapping: Record<string, string | string[] | null>): void {
    this.ensureInlineWidgetData(id)
    this.execute('widget.updateSlotMapping', { id, mapping })
  }

  setBoundSource(id: string, sourceId: string, mapping?: SlotMapping): void {
    this.execute('widget.setBoundSource', { id, sourceId, mapping })
  }

  // Inline-write facades: auto-bootstrap from sample on first edit so the
  // data tab can render the meta sample table and have writes work
  // immediately. ensureInlineWidgetData is a no-op when the widget is
  // already in inline mode, so the cost is one Map lookup in the common
  // case. Two undo entries land on the very first edit (init + edit) but
  // every subsequent edit is a single entry — acceptable for the "first
  // touch promotes" semantic.

  updateInlineCell(id: string, rowIndex: number, columnName: string, value: unknown): void {
    this.ensureInlineWidgetData(id)
    this.execute('widget.inlineCell', { id, rowIndex, columnName, value })
  }

  addInlineRow(id: string, atIndex?: number): void {
    this.ensureInlineWidgetData(id)
    this.execute('widget.inlineRowAdd', { id, atIndex })
  }

  removeInlineRow(id: string, rowIndex: number): void {
    this.ensureInlineWidgetData(id)
    this.execute('widget.inlineRowRemove', { id, rowIndex })
  }

  addInlineColumn(id: string, field?: { name?: string; type?: FieldType; label?: string }): void {
    this.ensureInlineWidgetData(id)
    this.execute('widget.inlineColumnAdd', { id, field })
  }

  removeInlineColumn(id: string, columnName: string): void {
    this.ensureInlineWidgetData(id)
    this.execute('widget.inlineColumnRemove', { id, columnName })
  }

  renameInlineColumn(id: string, oldName: string, newName: string): void {
    this.ensureInlineWidgetData(id)
    this.execute('widget.inlineColumnRename', { id, oldName, newName })
  }

  setInlineColumnType(id: string, columnName: string, type: FieldType): void {
    this.ensureInlineWidgetData(id)
    this.execute('widget.inlineColumnType', { id, columnName, type })
  }

  // Data sources ───────────────────────────────────────────────────

  addDataSource(source: Omit<DataSource, 'id'> & { id?: string }): void {
    this.execute('dataSource.add', { source })
  }

  updateDataSource(id: string, patch: Partial<DataSource>): void {
    this.execute('dataSource.update', { id, patch })
  }

  removeDataSource(id: string): void {
    this.execute('dataSource.remove', { id })
  }

  // Tool / view ────────────────────────────────────────────────────

  setTool(tool: string, ctx?: Record<string, unknown>): void {
    const prev = useEditorStore.getState().tool
    useEditorStore.getState().actions.setTool(tool, ctx)
    if (prev !== tool) this.bus.emit('tool.changed', { from: prev, to: tool })
  }

  /** Flip one boolean view option (showGrid / showGuides / showRulers / …). */
  toggleView(
    key: 'showGrid' | 'showGuides' | 'showRulers' | 'showAlignmentGuides' | 'snapToGrid' | 'snapToElements' | 'snapToGuides',
  ): void {
    const s = useEditorStore.getState()
    s.actions.setView({ [key]: !s.view[key] } as Record<typeof key, boolean>)
  }

  /**
   * Toggle the `locked` flag on every currently-selected widget.
   * "All locked" → unlock all; otherwise → lock all (matches Figma's
   * keystroke behaviour on a mixed selection).
   */
  toggleLockedOnSelection(): void {
    const widgets = this.getSelectedWidgets()
    if (widgets.length === 0) return
    const allLocked = widgets.every((w) => w.flags.locked)
    this.setLocked(
      widgets.map((w) => w.id),
      !allLocked,
    )
  }

  /** Same idea for the `hidden` flag. */
  toggleHiddenOnSelection(): void {
    const widgets = this.getSelectedWidgets()
    if (widgets.length === 0) return
    const allHidden = widgets.every((w) => w.flags.hidden)
    this.setHidden(
      widgets.map((w) => w.id),
      !allHidden,
    )
  }

  /**
   * Translate every selected widget by `(dx * step, dy * step)` pixels.
   * Used by the arrow-key shortcuts (1px / 10px with Shift). Goes
   * through `widget.updateLayoutBatch` so HistoryManager's merge window
   * collapses a continuous burst of arrow presses into one undo entry.
   */
  nudgeSelection(dx: number, dy: number, step = 1): void {
    const ids = this.getSelectedIds()
    if (ids.length === 0) return
    const updates: Array<{ id: string; layout: Partial<Layout> }> = []
    for (const id of ids) {
      const w = this.getWidget(id)
      if (!w) continue
      updates.push({
        id,
        layout: { x: w.layout.x + dx * step, y: w.layout.y + dy * step },
      })
    }
    if (updates.length === 0) return
    this.execute('widget.updateLayoutBatch', { updates })
  }

  /**
   * Align the current selection. Single-selection defaults to anchoring
   * against the page (so "centre this on the page" works); multi-selection
   * defaults to the union bbox of the selection — same idiom as Figma.
   */
  alignSelection(
    mode: 'left' | 'right' | 'top' | 'bottom' | 'h-center' | 'v-center',
    anchor?: 'selection' | 'page',
  ): void {
    const ids = this.getSelectedIds()
    if (ids.length === 0) return
    const resolvedAnchor = anchor ?? (ids.length === 1 ? 'page' : 'selection')
    this.execute('widget.align', { ids, mode, anchor: resolvedAnchor })
  }

  /**
   * Tidy-up: re-space ≥ 3 selected widgets so neighbour gaps are equal.
   * Endpoints stay where they are. No-ops on <3 selection or when the
   * widgets overlap (negative total gap).
   */
  distributeSelection(axis: 'horizontal' | 'vertical'): void {
    const ids = this.getSelectedIds()
    if (ids.length < 3) return
    this.execute('widget.distribute', { ids, axis })
  }

  /**
   * Cycle selection forward through the current page's widget list.
   * Used by the `Tab` shortcut. With nothing selected, picks the first.
   */
  selectNext(): void {
    const all = this.getAllWidgets()
    if (all.length === 0) return
    const currentId = useEditorStore.getState().primarySelectionId
    const idx = currentId ? all.findIndex((w) => w.id === currentId) : -1
    const next = all[(idx + 1) % all.length]
    if (next) this.selectOne(next.id)
  }

  // History ────────────────────────────────────────────────────────

  undo(): void {
    this.history.undo()
  }

  redo(): void {
    this.history.redo()
  }

  canUndo(): boolean {
    return this.history.canUndo()
  }

  canRedo(): boolean {
    return this.history.canRedo()
  }

  mark(label?: string): void {
    this.history.mark(label)
  }

  batch(label: string, fn: () => void): void {
    this.history.batch(label, fn)
  }

  // Pure queries ────────────────────────────────────────────────────

  getProject(): Project | null {
    return useDocumentStore.getState().project
  }

  getCurrentPage(): Page | null {
    return selectCurrentPage(useDocumentStore.getState())
  }

  getAllWidgets(): WidgetNode[] {
    return selectWidgets(useDocumentStore.getState())
  }

  getWidget(id: string): WidgetNode | null {
    return selectWidget(id)(useDocumentStore.getState()) ?? null
  }

  getDataSource(id: string): DataSource | null {
    return selectDataSource(id)(useDocumentStore.getState()) ?? null
  }

  getSelectedIds(): string[] {
    return useEditorStore.getState().selectedIds
  }

  getSelectedWidgets(): WidgetNode[] {
    const ids = new Set(this.getSelectedIds())
    return this.getAllWidgets().filter((w) => ids.has(w.id))
  }
}
