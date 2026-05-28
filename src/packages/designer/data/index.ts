/**
 * `@designer/data` — schema-driven data pipeline.
 *
 * The single entry point everything else should import from. Re-exports
 * the resolver, the dataset utilities (used by both commands and the
 * table editor), and the resolved data types (consumed by widget
 * Components).
 */

export * from './types'
export * from './resolve'
export * from './dataset-utils'
export { parseCsv } from './csv-parser'
export type { ParseCsvOptions } from './csv-parser'
export { parseJson } from './json-parser'
export type { ParseJsonResult } from './json-parser'
export {
  startApiFetcher,
  reconcileFetchers,
  stopAllFetchers,
  fetchApiSourceOnce,
} from './fetch-service'
export type { FetcherHandle } from './fetch-service'
