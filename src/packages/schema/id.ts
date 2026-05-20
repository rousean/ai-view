/**
 * ID generation utilities.
 *
 * Uses native crypto.randomUUID when available (modern browsers + Node 19+),
 * falls back to a Math.random based generator. Output format is opaque —
 * consumers must not rely on shape.
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function fallbackId(size = 16): string {
  let out = ''
  for (let i = 0; i < size; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return out
}

export function createId(prefix?: string): string {
  let raw: string
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    raw = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  } else {
    raw = fallbackId(16)
  }
  return prefix ? `${prefix}_${raw}` : raw
}

export const createWidgetId = () => createId('w')
export const createPageId = () => createId('p')
export const createDataSourceId = () => createId('ds')
export const createAssetId = () => createId('as')
export const createGuideId = () => createId('g')
export const createGroupId = () => createId('grp')
export const createProjectId = () => createId('proj')
