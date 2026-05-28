import type {
  Dataset,
  DataSource,
  FieldDef,
  SlotMapping,
  StaticDataSource,
  WidgetData,
  WidgetNode,
} from '@schema/types'
import type { DataSlotDef, WidgetMeta } from '@widgets/widget-meta'
import { useRuntimeStore } from '../stores/runtime-store'
import type { ResolvedSlot, ResolvedWidgetData } from './types'

/**
 * Build the `ResolvedWidgetData` payload that gets handed to a widget's
 * render component.
 *
 * Pipeline:
 *   1. Pick a `Dataset` + `SlotMapping` based on `node.data?.mode`:
 *      - `'inline'` → the widget's own dataset
 *      - `'bound'`  → the referenced DataSource's fetched data
 *                     (currently only `StaticDataSource.dataset` is
 *                     supported; remote sources will come with the
 *                     DataSource manager work)
 *      - undefined  → the widget meta's `sample` dataset, with a
 *                     name-match default mapping. Marked `isSample`.
 *   2. Project that dataset through the slot mapping into the
 *      per-slot `values`/`types` arrays the components actually read.
 *
 * `transform` arrays on `WidgetData` are reserved for a later phase
 * (filter/sort/TopN/aggregate UI) — the resolver passes through
 * unchanged for now.
 */
/**
 * Active per-widget filter — written by `filter` actions in preview
 * mode, read here to prune rows before slot projection.
 */
export interface ResolveFilter {
  field: string
  value: unknown
}

export function resolveWidgetData(
  node: WidgetNode,
  meta: WidgetMeta | undefined,
  /**
   * Project-level data sources, indexed by id. Pass an empty object at
   * design time before any source is registered — bound nodes
   * gracefully fall back to the meta's sample so the canvas stays
   * meaningful.
   */
  dataSources: Record<string, DataSource> = {},
  /**
   * Optional active filter from the interaction layer. Rows where
   * `row[field] !== value` are dropped before slot projection. The
   * filter is ignored at design time (caller passes `undefined`).
   */
  activeFilter?: ResolveFilter,
): ResolvedWidgetData {
  const dataSchema = meta?.dataSchema
  const slots = dataSchema?.slots ?? []

  // ── 1. Pick the source dataset + mapping ──────────────────────────
  let dataset: Dataset
  let mapping: SlotMapping
  let isSample = false

  if (node.data?.mode === 'inline') {
    dataset = node.data.dataset
    mapping = node.data.mapping
  } else if (node.data?.mode === 'bound') {
    const src = dataSources[node.data.sourceId]
    const fromSrc = extractDatasetFromSource(src)
    if (fromSrc) {
      dataset = fromSrc
      mapping = node.data.mapping
    } else {
      // Source missing / no data yet — render the meta sample so the
      // canvas isn't blank. Same code path as the no-data case below.
      dataset = dataSchema?.sample ?? { fields: [], rows: [] }
      mapping = autoMapToSlots(dataset.fields, slots)
      isSample = true
    }
  } else {
    dataset = dataSchema?.sample ?? { fields: [], rows: [] }
    mapping = autoMapToSlots(dataset.fields, slots)
    isSample = true
  }

  // ── 1.5. Apply interaction-layer filter ───────────────────────────
  // Cheaper to do this once, on dataset.rows, than during slot
  // projection — every slot reads the same row stream.
  let effectiveRows = dataset.rows
  if (
    activeFilter &&
    activeFilter.field &&
    dataset.fields.some((f) => f.name === activeFilter.field)
  ) {
    effectiveRows = dataset.rows.filter(
      (r) => Object.is(r[activeFilter.field], activeFilter.value),
    )
  }

  // ── 2. Project through slot mapping ───────────────────────────────
  const resolved: Record<string, ResolvedSlot> = {}
  const fieldByName = new Map(dataset.fields.map((f) => [f.name, f]))

  for (const slot of slots) {
    const map = mapping[slot.name]
    if (map == null) continue

    const columnNames = Array.isArray(map) ? map : [map]
    const valid = columnNames.filter((c) => fieldByName.has(c))
    if (valid.length === 0) continue

    resolved[slot.name] = {
      columnNames: valid,
      values: valid.map((c) => effectiveRows.map((r) => r[c])),
      types: valid.map((c) => fieldByName.get(c)!.type),
    }
  }

  return {
    fields: dataset.fields,
    rows: effectiveRows,
    slots: resolved,
    isSample,
  }
}

// ─── helpers ──────────────────────────────────────────────────────

/**
 * Best-effort auto-map: for each slot, find the first dataset field
 * whose type is accepted. Used in two places:
 *
 *   - When the widget falls back to `meta.sample` (no user mapping
 *     exists yet, but we still want slots populated).
 *   - When the user binds a source for the first time and `meta.dataSchema
 *     .defaultMapping` isn't provided — the slot panel calls this to
 *     pre-fill sensible defaults.
 */
export function autoMapToSlots(
  fields: FieldDef[],
  slots: DataSlotDef[],
): SlotMapping {
  const mapping: SlotMapping = {}
  const used = new Set<string>()
  for (const slot of slots) {
    const match = fields.find((f) => !used.has(f.name) && slot.accepts.includes(f.type))
    if (match) {
      mapping[slot.name] = match.name
      used.add(match.name)
    }
  }
  return mapping
}

/**
 * Pull a `Dataset` out of a `DataSource`. Currently only `static`
 * sources carry their data inline; remote source types (`api`, etc.)
 * deliver via `RuntimeStore.fetchedData` and will be wired up when the
 * data-source manager UI lands.
 */
function extractDatasetFromSource(src: DataSource | undefined): Dataset | null {
  if (!src) return null
  switch (src.type) {
    case 'static':
      return (src as StaticDataSource).dataset ?? null

    case 'csv':
    case 'json': {
      // CSV / JSON sources cache their parsed dataset on the schema
      // node itself, computed by the data-source editor on edit. We
      // never re-parse on the read path — that's the editor's job.
      const ds = (src as unknown as { dataset?: Dataset }).dataset
      return ds ?? null
    }

    case 'api': {
      // Live HTTP data — the fetch-service writes the parsed dataset
      // to RuntimeStore.fetchedData[sourceId]; we pull it from there
      // synchronously. Returns null when the fetch hasn't completed
      // yet (the resolver then falls back to the meta sample).
      const fetched = useRuntimeStore.getState().fetchedData[src.id]
      return (fetched as Dataset | undefined) ?? null
    }

    default:
      return null
  }
}

/**
 * Make a deep-copy of a meta's sample dataset — used when the user
 * first edits inline data, so subsequent edits don't mutate the
 * widget's meta-level sample (shared across all instances of that
 * widget type).
 */
export function initInlineFromSample(meta: WidgetMeta | undefined): WidgetData | undefined {
  const sample = meta?.dataSchema?.sample
  if (!sample) return undefined
  const slots = meta?.dataSchema?.slots ?? []
  return {
    mode: 'inline',
    dataset: {
      fields: sample.fields.map((f) => ({ ...f })),
      rows: sample.rows.map((r) => ({ ...r })),
    },
    mapping: autoMapToSlots(sample.fields, slots),
  }
}

/** Index a `DataSource[]` by id for cheap lookup during resolution. */
export function indexDataSources(sources: readonly DataSource[]): Record<string, DataSource> {
  const out: Record<string, DataSource> = {}
  for (const s of sources) out[s.id] = s
  return out
}

/**
 * Build an empty inline dataset with a single string column. Used by
 * "清空数据" in the table editor.
 */
export function initEmptyInline(meta: WidgetMeta | undefined): WidgetData {
  const slots = meta?.dataSchema?.slots ?? []
  const dataset: Dataset = { fields: [], rows: [] }
  return {
    mode: 'inline',
    dataset,
    mapping: autoMapToSlots(dataset.fields, slots),
  }
}
