import type * as React from 'react'
import type { z } from 'zod'
import type {
  Dataset,
  FieldDef,
  FieldType,
  Layout,
  ResizeInfo,
  SlotMapping,
  WidgetNode,
} from '@schema/types'

/** Tab bucket for the property panel. Convention follows DataV. */
export type PropGroup = '配置' | '样式' | '数据' | '交互' | '动画' | string

/**
 * Configuration for a single property field on the property panel.
 *
 * `path` is a dot/bracket path into `props` (e.g. 'series[0].color') and
 * `setter` references a SetterRegistry key.
 */
export interface PropConfig {
  /** Dot/bracket path into widget.props. */
  path: string

  /** SetterRegistry key. */
  setter: string

  label: string
  description?: string

  /** Forwarded to the setter component as `setterProps`. */
  setterProps?: Record<string, unknown>

  /** Tab bucket. */
  group?: PropGroup
  /** Collapsible section title within a group. */
  section?: string

  /** Conditional visibility. Receives current props object. */
  visible?: (props: Record<string, unknown>) => boolean
  /** Conditional read-only. */
  disabled?: (props: Record<string, unknown>) => boolean

  /** Initial collapsed state when wrapped in a section. */
  collapsed?: boolean
}

/** Capability flags advertised by the widget. */
export interface WidgetCapabilities {
  /** true | 'horizontal' | 'vertical' | false. Default true. */
  resizable?: boolean | 'horizontal' | 'vertical'
  rotatable?: boolean
  /** Lock aspect ratio while resizing. */
  aspectRatio?: number | 'auto'
  minSize?: { width: number; height: number }
  maxSize?: { width: number; height: number }
}

/**
 * Semantic role of a data slot.
 *
 *   - `dimension` — categorical key (x-axis category, slice name, group)
 *   - `measure`   — numeric value mapped to a visual encoding
 *   - `attribute` — secondary visual binding (colour, size, etc.)
 *
 * Used by the data-tab UI to colour slot rows and to suggest which
 * source field types fit which slot during auto-mapping.
 */
export type DataSlotRole = 'dimension' | 'measure' | 'attribute'

/**
 * How many columns a single slot can hold. `'one'` for X-axis (exactly
 * 1), `'many'` for series-like slots (any number). The numeric form
 * pins min/max for slots that need an explicit range (e.g. scatter's
 * size slot which accepts 0 or 1).
 */
export type SlotCardinality = 'one' | 'many' | { min: number; max: number }

/**
 * Declaration of a single data slot — the widget's "data contract".
 *
 * Slots are how a widget tells the editor "I need a category column
 * called X, and one or more numeric columns called Y". The data tab
 * renders one row per slot in the mapping panel; the resolver uses
 * them to project mapped columns into `ResolvedWidgetData.slots`.
 */
export interface DataSlotDef {
  /** Stable id used in `SlotMapping` keys (e.g. 'x', 'y', 'series'). */
  name: string
  /** Human-readable label shown in the mapping panel. */
  label: string
  role: DataSlotRole
  /** Source-column types this slot will accept. */
  accepts: FieldType[]
  /** How many columns this slot consumes. */
  cardinality: SlotCardinality
  /** Slot can be left unmapped. */
  optional?: boolean
  description?: string
}

/**
 * Widget data contract — what columns the widget expects, plus a
 * built-in sample dataset used as the initial template when the user
 * first switches to inline mode (and as the design-time fallback when
 * `WidgetNode.data` is undefined).
 */
export interface WidgetDataSchema {
  slots: DataSlotDef[]
  /** Built-in sample dataset (also used as inline-mode initial template). */
  sample: Dataset
  /**
   * Auto-map sourcefields → slot mapping when the user picks a data
   * source. Defaults to a name-match strategy in the resolver if absent.
   */
  defaultMapping?: (sourceFields: FieldDef[]) => SlotMapping
}

/**
 * One slot's resolved view of the dataset — what the widget Component
 * actually reads.
 *
 * `values[i]` is the array of cell values for column `columnNames[i]`
 * — parallel arrays, not interleaved, so the common single-column case
 * stays `slot.values[0]`-indexed.
 */
export interface ResolvedSlot {
  columnNames: string[]
  values: unknown[][]
  types: FieldType[]
}

/**
 * The single contract every widget Component reads. Produced by the
 * resolver (`@designer/data`) from a `WidgetNode + WidgetMeta +
 * dataSources`. Components index `slots` by the slot names they
 * declared in `WidgetMeta.dataSchema.slots`.
 */
export interface ResolvedWidgetData {
  fields: FieldDef[]
  rows: Record<string, unknown>[]
  slots: Record<string, ResolvedSlot>
  /** Widget is rendering the meta's built-in sample (no user data yet). */
  isSample: boolean
}

/**
 * Props passed to a widget's render component. Pure: no editor reference,
 * no store reach-through. The container resolves and provides everything.
 */
export interface WidgetRenderProps<TProps extends object = Record<string, unknown>> {
  node: WidgetNode
  props: TProps
  /**
   * Resolved data — slot-projected, sample-resolved. Always present; if
   * the widget has no `dataSchema.slots` declared, `slots` is empty and
   * `rows` is empty. Components that don't take data ignore this.
   */
  data: ResolvedWidgetData
  layout: Layout
  /** True in the designer; false in the runtime renderer. */
  designMode: boolean
}

/**
 * Full description of a widget type. Registered into RegistryHub.widgets.
 *
 * The generic <TProps> is the shape of `WidgetNode.props` for this type.
 */
export interface WidgetMeta<TProps extends object = Record<string, unknown>> {
  /** Unique registry key (e.g. 'bar-chart'). */
  type: string
  version: string
  category: string // 'chart' | 'media' | 'text' | 'decoration' | ...
  title: string
  description?: string

  /** Material-library icon (left panel). */
  icon?: React.ComponentType<{ className?: string }>
  /** Drag preview / library thumbnail. */
  thumbnail?: string
  /** Search keywords. */
  tags?: string[]

  // Defaults applied when an instance is created via editor.addWidget().
  defaultProps: TProps
  defaultLayout: { width: number; height: number }
  /** Optional: produce a default name e.g. ('柱状图 1'). */
  defaultName?: (existingCount: number) => string

  /** zod schema for runtime validation of props. Optional. */
  propsSchema?: z.ZodType<TProps>

  /** Property-panel field config, in display order. */
  propsConfig: PropConfig[]

  /** Optional data input schema for this widget. */
  dataSchema?: WidgetDataSchema

  /** Render component (designer + runtime). */
  Component: React.ComponentType<WidgetRenderProps<TProps>>
  /** Compact preview for the materials library (no data needed). */
  Preview?: React.ComponentType

  // Lifecycle hooks
  onCreate?: (node: WidgetNode) => Partial<WidgetNode>
  onResize?: (node: WidgetNode, info: ResizeInfo) => Partial<Layout>
  onDataChange?: (node: WidgetNode, data: unknown) => void

  capabilities?: WidgetCapabilities
}
