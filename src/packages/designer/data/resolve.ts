/**
 * The widget-data resolver now lives in `@renderer` (it's editor-agnostic
 * — pure projection of node + meta + sources into the shape components
 * read). Re-exported here so the existing `@designer/data` and
 * `../data/resolve` import paths keep working unchanged.
 */
export * from '@renderer/resolve'
