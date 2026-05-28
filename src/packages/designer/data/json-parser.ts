import type { Dataset, FieldDef } from '@schema/types'

/**
 * Parse a pasted JSON blob into a Dataset. Accepts:
 *   - top-level array of objects (`[{a:1}, {a:2}]`)
 *   - top-level object wrapping an array under a single key
 *     (`{ data: [...] }`) — we pick the first array-valued property
 *   - top-level array of arrays — coerced into `col1, col2…`
 *
 * Returns an empty dataset for anything else (rather than throwing, so
 * the editor surfaces a friendly preview error instead of a stack trace).
 */
export interface ParseJsonResult {
  dataset: Dataset
  error?: string
}

export function parseJson(raw: string): ParseJsonResult {
  const trimmed = raw.trim()
  if (!trimmed) return { dataset: { fields: [], rows: [] } }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    return { dataset: { fields: [], rows: [] }, error: (e as Error).message }
  }
  const arr = pickArray(parsed)
  if (!arr) {
    return {
      dataset: { fields: [], rows: [] },
      error: '未在 JSON 中找到数组（顶层数组或包含数组的对象）',
    }
  }
  return { dataset: arrayToDataset(arr) }
}

function pickArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (Array.isArray(v)) return v
    }
  }
  return null
}

function arrayToDataset(arr: unknown[]): Dataset {
  if (arr.length === 0) return { fields: [], rows: [] }

  // Array of arrays — synthesise column names.
  if (Array.isArray(arr[0])) {
    const first = arr[0] as unknown[]
    const fields: FieldDef[] = first.map((_, i) => ({
      name: `列${i + 1}`,
      type: 'string',
    }))
    const rows = arr.map((r) => {
      const row: Record<string, unknown> = {}
      const cells = Array.isArray(r) ? r : []
      fields.forEach((f, i) => {
        row[f.name] = cells[i] ?? null
      })
      return row
    })
    refineFieldTypes(fields, rows)
    return { fields, rows }
  }

  // Array of objects — union all keys for the field set.
  const keys = new Set<string>()
  for (const r of arr) {
    if (r && typeof r === 'object') {
      for (const k of Object.keys(r as Record<string, unknown>)) keys.add(k)
    }
  }
  const fields: FieldDef[] = Array.from(keys).map((k) => ({
    name: k,
    type: 'string',
  }))
  const rows = arr.map((r) => {
    const row: Record<string, unknown> = {}
    const obj = (r as Record<string, unknown>) ?? {}
    for (const f of fields) row[f.name] = obj[f.name] ?? null
    return row
  })
  refineFieldTypes(fields, rows)
  return { fields, rows }
}

/**
 * Walk the first 20 rows per field and tighten the type if every
 * sample looks numeric / dateish. Mirrors the heuristic the CSV
 * parser uses, kept in sync intentionally.
 */
function refineFieldTypes(fields: FieldDef[], rows: Record<string, unknown>[]): void {
  for (const f of fields) {
    let allNumber = true
    let allDate = true
    const cap = Math.min(rows.length, 20)
    let seen = 0
    for (let i = 0; i < cap; i++) {
      const v = rows[i]![f.name]
      if (v == null || v === '') continue
      seen++
      if (typeof v === 'number') {
        allDate = false
        continue
      }
      if (typeof v !== 'string') {
        allNumber = false
        allDate = false
        continue
      }
      if (allNumber && !/^-?\d+(\.\d+)?$/.test(v)) allNumber = false
      if (allDate && !/^\d{4}[-/]\d{2}[-/]\d{2}/.test(v)) allDate = false
    }
    if (seen === 0) continue
    if (allNumber) f.type = 'number'
    else if (allDate) f.type = 'date'
  }
}
