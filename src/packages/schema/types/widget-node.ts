import type { Point } from './common'

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
 * Bind a widget to a data source. The widget receives data after the
 * source-level transforms, the binding-level transforms, and the
 * field mapping have been applied (in that order).
 */
export interface DataBinding {
  /** Reference to Project.dataSources[].id */
  sourceId: string

  /**
   * Field mapping: widget schema field name → data column name.
   * e.g. { x: 'date', y: 'sales', series: 'category' }
   */
  mapping: Record<string, string>

  /** Widget-level transforms. Run after the data-source's transforms. */
  transform?: TransformStep[]

  /** Design-time mock override. When mock.enabled, widget gets mock.data. */
  mock?: { enabled: boolean; data: unknown[] }
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

  dataBinding?: DataBinding
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
