import type { Dataset, FieldDef, TransformStep } from '@schema/types'

/**
 * Author-defined data pipeline. Runs the widget's `data.transform` steps in
 * order against the resolved dataset (before the interaction filter + slot
 * projection). Each step is pure (dataset → dataset); a throwing or
 * malformed step is skipped rather than blanking the widget.
 *
 * Supported step types: `filter` | `sort` | `limit` | `aggregate`.
 * Unknown types (e.g. `jsExpression`) are ignored for now.
 */
/**
 * Substitute `$key` references in transform params with current global
 * variable values, so a `filter` step like `value: '$region'` reacts to
 * the viewer's filter-bar pick. Strings that aren't `$`-prefixed (or
 * reference an unknown var) pass through unchanged.
 */
export function substituteVars(
  steps: TransformStep[] | undefined,
  vars: Record<string, unknown>,
): TransformStep[] | undefined {
  if (!steps || steps.length === 0) return steps
  if (!vars || Object.keys(vars).length === 0) return steps
  const subValue = (v: unknown): unknown => {
    if (typeof v === 'string' && v.startsWith('$')) {
      const key = v.slice(1)
      return key in vars ? vars[key] : v
    }
    if (Array.isArray(v)) return v.map(subValue)
    if (v && typeof v === 'object') return subParams(v as Record<string, unknown>)
    return v
  }
  const subParams = (params: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(params)) out[k] = subValue(val)
    return out
  }
  return steps.map((s) => ({ ...s, params: subParams(s.params) }))
}

export function applyTransforms(
  dataset: Dataset,
  steps: TransformStep[] | undefined,
): Dataset {
  if (!steps || steps.length === 0) return dataset
  let ds = dataset
  for (const step of steps) {
    if (!step.enabled) continue
    try {
      switch (step.type) {
        case 'filter':
          ds = applyFilter(ds, step.params)
          break
        case 'sort':
          ds = applySort(ds, step.params)
          break
        case 'limit':
          ds = applyLimit(ds, step.params)
          break
        case 'aggregate':
          ds = applyAggregate(ds, step.params)
          break
        default:
          break
      }
    } catch {
      // A bad step shouldn't take the whole chart down — skip it.
    }
  }
  return ds
}

type Params = Record<string, unknown>

function hasField(ds: Dataset, name: string): boolean {
  return ds.fields.some((f) => f.name === name)
}

// ── filter ───────────────────────────────────────────────────────────

type FilterOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains'

function matchOp(cell: unknown, op: FilterOp, value: unknown): boolean {
  switch (op) {
    case 'eq':
      return String(cell) === String(value)
    case 'ne':
      return String(cell) !== String(value)
    case 'gt':
      return Number(cell) > Number(value)
    case 'gte':
      return Number(cell) >= Number(value)
    case 'lt':
      return Number(cell) < Number(value)
    case 'lte':
      return Number(cell) <= Number(value)
    case 'contains':
      return String(cell ?? '').includes(String(value ?? ''))
    default:
      return true
  }
}

function applyFilter(ds: Dataset, params: Params): Dataset {
  const field = String(params.field ?? '')
  const op = (String(params.op ?? 'eq') as FilterOp) || 'eq'
  if (!field || !hasField(ds, field)) return ds
  return { fields: ds.fields, rows: ds.rows.filter((r) => matchOp(r[field], op, params.value)) }
}

// ── sort ─────────────────────────────────────────────────────────────

function applySort(ds: Dataset, params: Params): Dataset {
  const field = String(params.field ?? '')
  const dir = params.order === 'desc' ? -1 : 1
  if (!field || !hasField(ds, field)) return ds
  const rows = [...ds.rows].sort((a, b) => {
    const av = a[field]
    const bv = b[field]
    const an = Number(av)
    const bn = Number(bv)
    if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir
  })
  return { fields: ds.fields, rows }
}

// ── limit ────────────────────────────────────────────────────────────

function applyLimit(ds: Dataset, params: Params): Dataset {
  const count = Math.max(0, Math.floor(Number(params.count ?? 0)))
  const offset = Math.max(0, Math.floor(Number(params.offset ?? 0)))
  if (!count && !offset) return ds
  const end = count ? offset + count : undefined
  return { fields: ds.fields, rows: ds.rows.slice(offset, end) }
}

// ── aggregate ────────────────────────────────────────────────────────

type AggOp = 'sum' | 'avg' | 'count' | 'max' | 'min'

interface MeasureSpec {
  field: string
  op: AggOp
  as?: string
}

function reduceMeasure(nums: number[], op: AggOp): number {
  if (op === 'count') return nums.length
  const finite = nums.filter((n) => Number.isFinite(n))
  if (finite.length === 0) return 0
  switch (op) {
    case 'sum':
      return finite.reduce((a, b) => a + b, 0)
    case 'avg':
      return finite.reduce((a, b) => a + b, 0) / finite.length
    case 'max':
      return Math.max(...finite)
    case 'min':
      return Math.min(...finite)
    default:
      return 0
  }
}

function applyAggregate(ds: Dataset, params: Params): Dataset {
  const groupBy = String(params.groupBy ?? '')
  const measures = (Array.isArray(params.measures) ? params.measures : []) as MeasureSpec[]
  if (!groupBy || !hasField(ds, groupBy) || measures.length === 0) return ds

  const groups = new Map<string, Record<string, unknown>[]>()
  const order: string[] = []
  for (const r of ds.rows) {
    const key = String(r[groupBy] ?? '')
    let bucket = groups.get(key)
    if (!bucket) {
      bucket = []
      groups.set(key, bucket)
      order.push(key)
    }
    bucket.push(r)
  }

  const groupField = ds.fields.find((f) => f.name === groupBy)!
  const measureFields: FieldDef[] = measures.map((m) => ({
    name: m.as || `${m.op}_${m.field}`,
    type: 'number',
  }))

  const rows = order.map((key) => {
    const bucket = groups.get(key)!
    const out: Record<string, unknown> = { [groupBy]: bucket[0][groupBy] }
    for (const m of measures) {
      const name = m.as || `${m.op}_${m.field}`
      out[name] = reduceMeasure(
        bucket.map((r) => Number(r[m.field])),
        m.op,
      )
    }
    return out
  })

  return { fields: [groupField, ...measureFields], rows }
}
