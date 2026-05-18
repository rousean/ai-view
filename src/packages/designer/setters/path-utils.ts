/**
 * Tiny dot/bracket path getter and setter for arbitrarily nested objects.
 *
 * Supported syntax:
 *   - `a.b.c`         dot-only paths
 *   - `a.b[0].c`      array index notation
 *   - `a.b.0.c`       numeric segments are also treated as array indices
 *
 * The setter is *immutable*: it returns a new root object, leaving the
 * original untouched. Used by PropertyPanel to commit a single field
 * change to widget.props without trampling sibling fields.
 */

const SEG_RE = /[^.[\]]+/g

export function parsePath(path: string): Array<string | number> {
  const matches = path.match(SEG_RE) ?? []
  return matches.map((seg) => {
    const n = Number(seg)
    return Number.isInteger(n) && String(n) === seg ? n : seg
  })
}

export function getByPath(root: unknown, path: string): unknown {
  const segs = parsePath(path)
  let cur: unknown = root
  for (const s of segs) {
    if (cur == null) return undefined
    cur = (cur as Record<string | number, unknown>)[s]
  }
  return cur
}

export function setByPath<R extends object>(root: R, path: string, value: unknown): R {
  const segs = parsePath(path)
  if (segs.length === 0) return root

  function clone(parent: unknown, segIdx: number): unknown {
    const seg = segs[segIdx]
    const isArrayIdx = typeof seg === 'number'
    const base: any = isArrayIdx
      ? Array.isArray(parent)
        ? [...parent]
        : []
      : { ...(parent && typeof parent === 'object' ? (parent as object) : {}) }

    if (segIdx === segs.length - 1) {
      base[seg] = value
    } else {
      base[seg] = clone(base[seg], segIdx + 1)
    }
    return base
  }

  return clone(root, 0) as R
}
