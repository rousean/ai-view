import type {
  Dataset,
  DataSource,
  FieldDef,
  SlotMapping,
  StaticDataSource,
  WidgetData,
  WidgetNode,
} from '@schema/types'
import type {
  DataSlotDef,
  ResolvedSlot,
  ResolvedWidgetData,
  WidgetMeta,
} from '@widgets/widget-meta'
import { applyTransforms, substituteVars } from './transforms'

/**
 * Active per-widget filter — written by `filter` actions in preview mode,
 * read here to prune rows before slot projection.
 */
export interface ResolveFilter {
  field: string
  value: unknown
}

/**
 * Build the `ResolvedWidgetData` payload handed to a widget's component.
 *
 * Pure + editor-agnostic: live remote data is passed in via `fetchedData`
 * (keyed by data-source id) rather than read from a store, so this runs
 * identically in the designer and in the standalone runtime.
 *
 * Pipeline: pick a Dataset + SlotMapping based on `node.data?.mode`
 * (inline / bound / sample), apply the interaction filter, then project
 * through the slot mapping into the per-slot value/type arrays components
 * read.
 */
export function resolveWidgetData(
  node: WidgetNode,
  meta: WidgetMeta | undefined,
  dataSources: Record<string, DataSource> = {},
  activeFilter?: ResolveFilter,
  /** dataSourceId → fetched dataset (e.g. RuntimeStore.fetchedData). */
  fetchedData: Record<string, unknown> = {},
  /** Global variable values (key → value) for `$var` substitution. */
  variables: Record<string, unknown> = {},
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
    const fromSrc = extractDatasetFromSource(src, fetchedData)
    if (fromSrc) {
      dataset = fromSrc
      mapping = node.data.mapping
    } else {
      // Source missing / no data yet — render the meta sample so the
      // canvas isn't blank.
      dataset = dataSchema?.sample ?? { fields: [], rows: [] }
      mapping = autoMapToSlots(dataset.fields, slots)
      isSample = true
    }
  } else {
    dataset = dataSchema?.sample ?? { fields: [], rows: [] }
    mapping = autoMapToSlots(dataset.fields, slots)
    isSample = true
  }

  // ── 1.25. Author data pipeline (filter / sort / aggregate / limit) ─
  // Declared on the widget's `data.transform` — previously modelled in the
  // schema but never executed. Runs before the interaction filter + slot
  // projection so charts see the shaped dataset.
  const transforms = node.data?.transform
  if (transforms && transforms.length > 0) {
    dataset = applyTransforms(dataset, substituteVars(transforms, variables))
  }

  // ── 1.5. Apply interaction-layer filter ───────────────────────────
  let effectiveRows = dataset.rows
  if (
    activeFilter &&
    activeFilter.field &&
    dataset.fields.some((f) => f.name === activeFilter.field)
  ) {
    effectiveRows = dataset.rows.filter((r) => Object.is(r[activeFilter.field], activeFilter.value))
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

  return { fields: dataset.fields, rows: effectiveRows, slots: resolved, isSample }
}

// ─── helpers ──────────────────────────────────────────────────────

/**
 * Best-effort auto-map: for each slot, find the first dataset field whose
 * type is accepted. Used for the sample fallback and as the default when
 * the user first binds a source.
 */
export function autoMapToSlots(fields: FieldDef[], slots: DataSlotDef[]): SlotMapping {
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
 * Pull a `Dataset` out of a `DataSource`. `static` / `csv` / `json` carry
 * their dataset inline; `api` data is supplied by the caller via
 * `fetchedData` (the designer feeds it from RuntimeStore; the runtime can
 * pass its own fetch results). Returns null when nothing is available — the
 * resolver then falls back to the meta sample.
 */
function extractDatasetFromSource(
  src: DataSource | undefined,
  fetchedData: Record<string, unknown>,
): Dataset | null {
  if (!src) return null
  switch (src.type) {
    case 'static':
      return (src as StaticDataSource).dataset ?? null

    case 'csv':
    case 'json': {
      const ds = (src as unknown as { dataset?: Dataset }).dataset
      return ds ?? null
    }

    case 'api':
    case 'ws':
      return (fetchedData[src.id] as Dataset | undefined) ?? null

    default:
      return null
  }
}

/**
 * Deep-copy a meta's sample dataset into inline widget data — used when the
 * user first edits inline data so later edits don't mutate the shared
 * meta-level sample.
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
 * Build an empty inline dataset with no columns. Used by "清空数据" in the
 * table editor.
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
