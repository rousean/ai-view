import type { Dataset, FieldDef, FieldType } from '@schema/types'

/** Deep-clone a dataset so edits don't mutate the source (e.g. meta sample). */
export function cloneDataset(d: Dataset): Dataset {
  return {
    fields: d.fields.map((f) => ({ ...f })),
    rows: d.rows.map((r) => ({ ...r })),
  }
}

/** Empty dataset of zero fields, zero rows. */
export function emptyDataset(): Dataset {
  return { fields: [], rows: [] }
}

/**
 * Coerce a raw cell value into the column's declared field type.
 *
 *   - `number`  → `Number()` round-trip; NaN preserved as NaN so the
 *     caller can detect bad input
 *   - `boolean` → `Boolean()` for everything except the literal strings
 *     `'false' | '0' | ''` which become `false` (matches what a user
 *     typing in a cell expects)
 *   - `date`    → ISO string; non-parseable input passes through
 *     unchanged so the user's draft isn't silently destroyed
 *   - `string`  → `String()` of anything non-nullish
 */
export function coerceCell(value: unknown, type: FieldType): unknown {
  if (value == null || value === '') return value
  switch (type) {
    case 'number': {
      const n = Number(value)
      return n
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase()
        if (v === 'false' || v === '0' || v === '') return false
        return true
      }
      return Boolean(value)
    }
    case 'date': {
      if (value instanceof Date) return value.toISOString()
      const d = new Date(String(value))
      return Number.isFinite(d.getTime()) ? d.toISOString() : value
    }
    case 'string':
    default:
      return String(value)
  }
}

/**
 * Append a fresh column to a dataset. Existing rows get `undefined`
 * for the new field — the table editor renders that as an empty cell,
 * which is how users want to "add a column and start typing".
 *
 * If the name collides we append a numeric suffix (`列 → 列 2`) so the
 * dataset never ends up with two fields of the same name (downstream
 * resolver indexes by name).
 */
export function addColumn(
  d: Dataset,
  field: { name?: string; type: FieldType; label?: string } = { type: 'string' },
): Dataset {
  const baseName = (field.name ?? defaultColumnName(d)).trim() || defaultColumnName(d)
  const name = uniqueColumnName(d, baseName)
  return {
    fields: [...d.fields, { name, type: field.type, label: field.label }],
    rows: d.rows.map((r) => ({ ...r, [name]: undefined })),
  }
}

/** Remove the column matching `name` and strip the key from every row. */
export function removeColumn(d: Dataset, name: string): Dataset {
  return {
    fields: d.fields.filter((f) => f.name !== name),
    rows: d.rows.map((r) => {
      const { [name]: _drop, ...rest } = r
      return rest
    }),
  }
}

/**
 * Rename a column. Updates the field def and re-keys every row so
 * `row[newName]` returns what `row[oldName]` used to.
 *
 * No-op if oldName doesn't exist; throws if newName already exists
 * (caller is expected to dedupe first — UI does this in the rename
 * input's onBlur).
 */
export function renameColumn(d: Dataset, oldName: string, newName: string): Dataset {
  if (oldName === newName) return d
  if (!d.fields.some((f) => f.name === oldName)) return d
  if (d.fields.some((f) => f.name === newName)) {
    throw new Error(`Column "${newName}" already exists`)
  }
  return {
    fields: d.fields.map((f) => (f.name === oldName ? { ...f, name: newName } : f)),
    rows: d.rows.map((r) => {
      const { [oldName]: v, ...rest } = r
      return { ...rest, [newName]: v }
    }),
  }
}

/**
 * Change a column's declared type. Existing cell values get re-coerced
 * to the new type so the user doesn't end up with "200" (string)
 * sitting in a column they just flipped to number.
 */
export function setColumnType(d: Dataset, name: string, type: FieldType): Dataset {
  if (!d.fields.some((f) => f.name === name)) return d
  return {
    fields: d.fields.map((f) => (f.name === name ? { ...f, type } : f)),
    rows: d.rows.map((r) => ({ ...r, [name]: coerceCell(r[name], type) })),
  }
}

/** Append an empty row (all fields undefined). */
export function addRow(d: Dataset, atIndex?: number): Dataset {
  const empty: Record<string, unknown> = {}
  for (const f of d.fields) empty[f.name] = undefined
  if (atIndex == null || atIndex >= d.rows.length) {
    return { ...d, rows: [...d.rows, empty] }
  }
  const rows = d.rows.slice()
  rows.splice(Math.max(0, atIndex), 0, empty)
  return { ...d, rows }
}

/** Remove a row by index. No-op for out-of-range indices. */
export function removeRow(d: Dataset, index: number): Dataset {
  if (index < 0 || index >= d.rows.length) return d
  const rows = d.rows.slice()
  rows.splice(index, 1)
  return { ...d, rows }
}

/**
 * Update a single cell, coercing the value to the column's type. Used
 * by the table editor for every keystroke commit — kept fast by
 * shallow-cloning only the touched row.
 */
export function updateCell(
  d: Dataset,
  rowIndex: number,
  columnName: string,
  value: unknown,
): Dataset {
  if (rowIndex < 0 || rowIndex >= d.rows.length) return d
  const field = d.fields.find((f) => f.name === columnName)
  if (!field) return d
  const next = coerceCell(value, field.type)
  const row = { ...d.rows[rowIndex], [columnName]: next }
  const rows = d.rows.slice()
  rows[rowIndex] = row
  return { ...d, rows }
}

// ─── internals ─────────────────────────────────────────────────────

function defaultColumnName(d: Dataset): string {
  return `列${d.fields.length + 1}`
}

function uniqueColumnName(d: Dataset, base: string): string {
  if (!d.fields.some((f) => f.name === base)) return base
  let i = 2
  while (d.fields.some((f) => f.name === `${base} ${i}`)) i++
  return `${base} ${i}`
}

/** Convenience: build a field def by name + type (label defaults to name). */
export function makeField(name: string, type: FieldType, label?: string): FieldDef {
  return { name, type, label }
}
