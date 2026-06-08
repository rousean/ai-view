import type { Dataset, FieldDef } from './common'
import type { TransformStep } from './widget-node'

// `FieldDef` lives in `common.ts` now — it's also used by inline widget
// data. Re-exported here so legacy imports of `@schema/types`'s
// `FieldDef` keep working.
export type { FieldDef }

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

/**
 * Static inline data — useful for design-time and demos.
 *
 * `dataset` carries both field metadata and rows so widgets binding to
 * a static source get the same `fields + rows` shape they'd get from a
 * remote source, without an inference step. (Older projects that stored
 * `data: unknown[]` are migrated at load time.)
 */
export interface StaticDataSource extends DataSourceBase {
  type: 'static'
  dataset: Dataset
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
 * WebSocket source — a persistent connection that pushes updates. Each
 * message is parsed (JSON) into a Dataset and published like an API fetch,
 * so bound widgets refresh in real time. Auto-reconnects on drop.
 */
export interface WsDataSource extends DataSourceBase {
  type: 'ws'
  /** ws:// or wss:// endpoint. */
  url: string
  /** Path into each message to pluck the array, e.g. 'data.items'. */
  responsePath?: string
  /** Auto-reconnect on close. Defaults to true. */
  reconnect?: boolean
}

/**
 * CSV data source — the user pastes (or uploads) text, we parse it once
 * into a Dataset and snapshot it on the source. Useful for "no backend,
 * make a chart from a spreadsheet I have right now" workflows.
 *
 * The raw text is kept so the user can re-parse with different options
 * later (delimiter, header row) without re-typing.
 */
export interface CsvDataSource extends DataSourceBase {
  type: 'csv'
  raw: string
  delimiter?: string
  /** Defaults to true. */
  hasHeader?: boolean
  /** Parsed result; refreshed on raw/delimiter/hasHeader changes. */
  dataset?: Dataset
}

/**
 * Inline JSON array — for quick mocks or when an upstream system already
 * delivers a JSON file. `dataset` holds the parsed result so widgets get
 * a Dataset without rerunning JSON.parse on every read.
 */
export interface JsonDataSource extends DataSourceBase {
  type: 'json'
  /** Pasted JSON text. */
  raw: string
  /** Parsed records (object array). Refreshed on raw change. */
  dataset?: Dataset
}

/**
 * Open union: built-ins listed explicitly; third-party types fall through
 * the catch-all. Consumers narrow via `type` field.
 */
export type DataSource =
  | StaticDataSource
  | ApiDataSource
  | WsDataSource
  | CsvDataSource
  | JsonDataSource
  | (DataSourceBase & { type: string; [key: string]: unknown })
