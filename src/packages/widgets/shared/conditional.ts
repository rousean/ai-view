/**
 * Conditional formatting — data-driven styling shared by widgets that want
 * "colour the value by threshold" behaviour (number card, gauge, table…).
 * Rules are evaluated top-to-bottom; the first match wins.
 */
export interface ConditionalRule {
  id: string
  op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between'
  value: number
  /** Upper bound for the `between` operator. */
  value2?: number
  /** Colour applied when the rule matches. */
  color: string
}

function matchRule(n: number, r: ConditionalRule): boolean {
  if (!Number.isFinite(n)) return false
  switch (r.op) {
    case 'gt':
      return n > r.value
    case 'gte':
      return n >= r.value
    case 'lt':
      return n < r.value
    case 'lte':
      return n <= r.value
    case 'eq':
      return n === r.value
    case 'between': {
      const lo = Math.min(r.value, r.value2 ?? r.value)
      const hi = Math.max(r.value, r.value2 ?? r.value)
      return n >= lo && n <= hi
    }
    default:
      return false
  }
}

/** The first matching rule's colour, or `undefined` when none match. */
export function evalRuleColor(
  n: number,
  rules: ConditionalRule[] | undefined,
): string | undefined {
  if (!rules || rules.length === 0) return undefined
  for (const r of rules) {
    if (matchRule(n, r)) return r.color
  }
  return undefined
}
