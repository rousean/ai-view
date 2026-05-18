import type { TransformStep } from './widget-node'

/** Field metadata used by widget data-mapping setters. */
export interface FieldDef {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  label?: string
}

/** Common fields shared by all DataSource variants. */
export interface DataSourceBase {
  id: string
  name: string
  /** Registry key. Built-ins: 'static' | 'api'. */
  type: string

  /** Declared output fields (drives field-mapping UI). Optional. */
  schema?: { fields: FieldDef[] }

  /** Source-level transforms. Run before any binding-level transforms. */
  transform?: TransformStep[]

  /** Cache configuration. */
  cache?: { enabled: boolean; ttl?: number }

  /** Plugin-private namespace. */
  extensions: Record<string, unknown>
}

/** Static inline data — useful for design-time and demos. */
export interface StaticDataSource extends DataSourceBase {
  type: 'static'
  data: unknown[]
}

/** HTTP-based source. Polling is supported via pollingInterval > 0. */
export interface ApiDataSource extends DataSourceBase {
  type: 'api'
  url: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  /** Body payload, JSON string. POST only. */
  body?: string
  /** Path into the response object to pluck the array, e.g. 'data.items'. */
  responsePath?: string
  /** Polling interval in ms; 0 or undefined = one-shot. */
  pollingInterval?: number
}

/**
 * Open union: built-ins listed explicitly; third-party types fall through
 * the catch-all. Consumers narrow via `type` field.
 */
export type DataSource =
  | StaticDataSource
  | ApiDataSource
  | (DataSourceBase & { type: string; [key: string]: unknown })
