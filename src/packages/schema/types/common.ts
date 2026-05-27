/** Geometric primitives in canvas (logical) coordinate space. */

/** Tabular data primitives — shared by DataSource and inline widget data. */

export type FieldType = 'string' | 'number' | 'date' | 'boolean'

/**
 * Self-describing column metadata. One per column in a `Dataset`. `label`
 * is for display only — `name` is the storage key in each row record.
 */
export interface FieldDef {
  name: string
  type: FieldType
  label?: string
}

/**
 * A tiny self-describing dataset — used both for inline widget data and
 * for the "fields + rows" payload coming out of a DataSource fetch.
 *
 * Rows are records keyed by `FieldDef.name`. Type checking is the
 * responsibility of whoever writes the rows (the table editor enforces
 * it for inline data; the source-fetcher coerces remote payloads).
 */
export interface Dataset {
  fields: FieldDef[]
  rows: Record<string, unknown>[]
}

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Oriented bounding box (used by HitTest for rotated widgets). */
export interface OBB {
  center: Point
  size: Size
  /** rotation in degrees */
  angle: number
}

/** Camera state — design-time viewport. Not persisted in document by default. */
export interface Camera {
  x: number
  y: number
  scale: number
}

/** Linear or radial gradient. */
export interface GradientConfig {
  type: 'linear' | 'radial'
  /** angle in degrees (linear only) */
  angle?: number
  stops: Array<{ offset: number; color: string }>
}

/** Page background union. */
export type Background =
  | { type: 'color'; color: string }
  | { type: 'gradient'; gradient: GradientConfig }
  | { type: 'image'; assetId: string; fit: 'cover' | 'contain' | 'fill' }
  | { type: 'transparent' }
