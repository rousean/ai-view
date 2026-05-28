import type { Dataset, FieldDef } from '@schema/types'

/**
 * Minimal CSV parser — handles quoted fields, escaped quotes, and
 * \r\n / \n line endings. No streaming, no multi-byte exotica. For the
 * dashboard's "paste a small CSV in" use case this is enough; we'd
 * swap to PapaParse if the user starts feeding it megabytes.
 *
 * Field types are inferred per column from the first 20 non-empty
 * values: all numbers → 'number', all ISO-ish dates → 'date', else
 * 'string'. Boolean is intentionally NOT auto-detected — too many
 * spreadsheets have "True"/"YES"/"1" mixed.
 */
export interface ParseCsvOptions {
  delimiter?: string
  hasHeader?: boolean
}

export function parseCsv(raw: string, opts: ParseCsvOptions = {}): Dataset {
  const delimiter = opts.delimiter ?? ','
  const hasHeader = opts.hasHeader !== false

  const rows = tokenize(raw, delimiter)
  if (rows.length === 0) return { fields: [], rows: [] }

  const headerRow = hasHeader ? rows[0]! : rows[0]!.map((_, i) => `列${i + 1}`)
  const dataRows = hasHeader ? rows.slice(1) : rows

  // Coerce cell strings into typed values, accumulating samples for
  // type inference along the way.
  const sampled: Array<Array<string | number | null>> = headerRow.map(() => [])
  const coerced: Array<Record<string, unknown>> = []
  for (const r of dataRows) {
    const row: Record<string, unknown> = {}
    for (let i = 0; i < headerRow.length; i++) {
      const key = headerRow[i]!
      const cell = (r[i] ?? '').trim()
      if (cell === '') {
        row[key] = null
        continue
      }
      const num = Number(cell)
      if (Number.isFinite(num) && /^-?[\d.eE+-]+$/.test(cell)) {
        row[key] = num
        sampled[i]!.push(num)
        continue
      }
      row[key] = cell
      sampled[i]!.push(cell)
    }
    coerced.push(row)
  }

  const fields: FieldDef[] = headerRow.map((name, i) => ({
    name,
    type: inferType(sampled[i]!),
  }))

  return { fields, rows: coerced }
}

// ── helpers ─────────────────────────────────────────────────────────

function tokenize(raw: string, delimiter: string): string[][] {
  const out: string[][] = []
  let cell = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!
    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote (CSV doubles them: "")
        if (raw[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }
    if (ch === '\r') continue
    if (ch === '\n') {
      row.push(cell)
      // Drop blank trailing lines so a stray `\n` at EOF doesn't
      // create an extra empty row in the output.
      if (row.length > 1 || row[0] !== '') out.push(row)
      row = []
      cell = ''
      continue
    }
    cell += ch
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    if (row.length > 1 || row[0] !== '') out.push(row)
  }
  return out
}

function inferType(samples: Array<string | number | null>): FieldDef['type'] {
  if (samples.length === 0) return 'string'
  let allNumber = true
  let allDate = true
  for (const v of samples) {
    if (typeof v === 'number') {
      allDate = false
      continue
    }
    if (typeof v !== 'string') continue
    if (allNumber && !/^-?\d+(\.\d+)?$/.test(v)) allNumber = false
    if (allDate && !looksLikeDate(v)) allDate = false
  }
  if (allNumber) return 'number'
  if (allDate) return 'date'
  return 'string'
}

function looksLikeDate(s: string): boolean {
  // ISO 8601-ish (2024-01-31 / 2024-01-31T10:00:00Z) plus a few common
  // shorter forms. Aggressive enough to catch real dates without
  // false-flagging codes like 12-345.
  return (
    /^\d{4}-\d{2}-\d{2}/.test(s) ||
    /^\d{4}\/\d{2}\/\d{2}/.test(s)
  )
}
