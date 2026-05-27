import type { Dataset, Point } from './common'

/**
 * Visual layout — position, size, transform. All in canvas-space pixels,
 * absolute (relative to page canvas origin, NOT to parent group).
 *
 * z-order is determined by the position of the node in `Page.widgets[]`,
 * not stored on Layout.
 */
export interface Layout {
  x: number
  y: number
  width: number
  height: number
  /** rotation in degrees */
  rotate: number
  flipX: boolean
  flipY: boolean
  /** 0..1 */
  opacity: number
}

/** Boolean flags affecting widget participation in editor / runtime. */
export interface WidgetFlags {
  /** Cannot be selected/edited; click passes through. */
  locked: boolean
  /** Not rendered. */
  hidden: boolean
}

/**
 * Per-slot column mapping. A slot can accept a single column (`'salesY'`)
 * or multiple columns (`['salesY', 'costY']`) when the widget's slot
 * cardinality allows it (multi-series). Unmapped slots are simply absent.
 */
export type SlotMapping = Record<string, string | string[]>

/**
 * Data attached to a widget. Two modes, intentionally exclusive:
 *
 *   - `inline` — the widget owns its dataset. The user edits a typed
 *     table directly in the data tab. Most demos, mock-ups, and small
 *     fixed-list widgets live here. Initialised by copying the widget's
 *     `WidgetMeta.dataSchema.sample` on first edit.
 *   - `bound`  — the widget pulls from a project-level `DataSource` and
 *     maps its columns into the widget's declared slots.
 *
 * A `WidgetNode` with no `data` field falls back to the meta's `sample`
 * dataset at render time — so a freshly dropped widget always shows
 * something sensible without forcing the user through configuration.
 */
export type WidgetData = InlineWidgetData | BoundWidgetData

export interface InlineWidgetData {
  mode: 'inline'
  /** Self-contained dataset; editable in the table editor. */
  dataset: Dataset
  /** Slot name → column name(s) in `dataset.fields`. */
  mapping: SlotMapping
  /** Per-widget transforms applied to the inline dataset. */
  transform?: TransformStep[]
}

export interface BoundWidgetData {
  mode: 'bound'
  /** Reference to `Project.dataSources[].id`. */
  sourceId: string
  /** Slot name → column name(s) from the source's fields. */
  mapping: SlotMapping
  /** Per-widget transforms run after source-level transforms. */
  transform?: TransformStep[]
}

/** A single step in a data transformation chain. */
export interface TransformStep {
  id: string
  /** Registry key, e.g. 'filter' | 'aggregate' | 'sort' | 'jsExpression' */
  type: string
  enabled: boolean
  params: Record<string, unknown>
}

/** Wire a runtime event (click, hover…) to an action (jump, modal…). */
export interface EventBinding {
  id: string
  /** Registry key for trigger type. */
  trigger: string
  action: {
    /** Registry key for action type. */
    type: string
    params: Record<string, unknown>
  }
  enabled: boolean
}

/** Animation configuration. MVP: enter only; keyframes is reserved. */
export interface AnimationConfig {
  /** Played when widget mounts (page load / page switch). */
  enter?: {
    /** Registry key, e.g. 'fade' | 'slideUp' | 'scale' */
    type: string
    duration: number
    delay: number
    easing: string
  }
  /** Played when bound data updates. */
  update?: {
    type: string
    duration: number
  }
  /** Reserved for future timeline support. */
  keyframes?: unknown
}

/**
 * Widget — the unit of content on a page.
 *
 * `props` is opaque at the schema layer; each widget type provides its own
 * zod schema (via WidgetMeta) for runtime validation. Renderers receive
 * the typed `props` after the meta-level schema parses it.
 */
export interface WidgetNode {
  id: string

  /** Registry key (e.g. 'bar-chart', 'image', 'text'). */
  type: string

  /** User-editable display name (shown in layers panel). */
  name: string

  layout: Layout
  flags: WidgetFlags

  /** Type-specific properties. Validated by WidgetMeta.propsSchema. */
  props: Record<string, unknown>

  /**
   * Data attached to this widget. Undefined → the widget renders with
   * `WidgetMeta.dataSchema.sample` (so freshly dropped widgets always
   * have something to show). On first edit the data tab populates this
   * with `{ mode: 'inline', dataset: <copy of sample>, mapping: {...} }`.
   */
  data?: WidgetData
  events?: EventBinding[]
  animation?: AnimationConfig

  /**
   * Selection group: widgets sharing a groupId are selected/moved together
   * but do NOT inherit transforms (no nested coordinate space).
   */
  groupId?: string

  /** Reserved for future Frame/Container widget. Not yet used. */
  parentId?: string

  /** Plugin-private namespace. Core ignores this field. */
  extensions: Record<string, unknown>
}

/** Resize handle identifier. Used by tools and ShapeUtil-style hooks. */
export type ResizeHandle =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'

/** Information passed to onResize hooks during a resize gesture. */
export interface ResizeInfo {
  handle: ResizeHandle
  initialLayout: Layout
  pointerStart: Point
  pointerCurrent: Point
  /** Whether shift is held (typically: lock aspect ratio). */
  shift: boolean
  /** Whether alt/option is held (typically: scale from center). */
  alt: boolean
}
