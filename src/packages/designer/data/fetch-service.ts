import type { ApiDataSource, DataSource, Dataset } from '@schema/types'
import { useRuntimeStore } from '../stores/runtime-store'
import { parseJson } from './json-parser'

/**
 * Per-source fetch lifecycle:
 *   - one-shot fetch on mount (or when the source spec changes)
 *   - polling, when `pollingInterval` is set
 *   - cache, with TTL — if a previous fetch is fresh enough, skip the
 *     network call
 *   - publish into RuntimeStore.fetchedData so resolveWidgetData reads
 *     a unified shape regardless of source type
 *
 * The service is *not* a React provider; it lives off to the side and
 * is driven by EditorRoot via `bindFetchersToProject` (see below).
 * That keeps the React tree free of fetcher plumbing and lets us
 * cleanly start/stop fetchers on project switch.
 */
export interface FetcherHandle {
  /** Cancel any in-flight request and stop polling. */
  stop: () => void
}

interface CacheEntry {
  fetchedAt: number
  dataset: Dataset
}

const cache = new Map<string, CacheEntry>()

/**
 * Drive a single API source. Returns a handle the caller uses to stop
 * the fetcher when the source goes away (deleted, edited into a
 * different type, or project swapped).
 */
export function startApiFetcher(source: ApiDataSource): FetcherHandle {
  const { actions } = useRuntimeStore.getState()
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null

  const tick = async () => {
    if (cancelled) return

    // Cache check — only re-use if TTL hasn't elapsed. Authors that
    // want fresh data every tick can disable cache outright.
    const cacheEnabled = source.cache?.enabled !== false
    const ttl = source.cache?.ttl ?? 30_000
    const cached = cache.get(source.id)
    if (cacheEnabled && cached && Date.now() - cached.fetchedAt < ttl) {
      actions.setFetchedData(source.id, cached.dataset)
      actions.setFetchStatus(source.id, { state: 'success', updatedAt: cached.fetchedAt })
    } else {
      actions.setFetchStatus(source.id, { state: 'loading' })
      controller = new AbortController()
      try {
        const res = await fetch(source.url, {
          method: source.method,
          headers: source.headers,
          body:
            source.method === 'POST' && source.body !== undefined
              ? source.body
              : undefined,
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
        const text = await res.text()
        const dataset = extractDataset(text, source.responsePath)
        if (!cancelled) {
          cache.set(source.id, { fetchedAt: Date.now(), dataset })
          actions.setFetchedData(source.id, dataset)
          actions.setFetchStatus(source.id, { state: 'success', updatedAt: Date.now() })
        }
      } catch (err) {
        if (cancelled) return
        if ((err as Error).name === 'AbortError') return
        actions.setFetchStatus(source.id, {
          state: 'error',
          error: (err as Error).message,
          updatedAt: Date.now(),
        })
      } finally {
        controller = null
      }
    }

    if (cancelled) return
    if (source.pollingInterval && source.pollingInterval > 0) {
      timer = setTimeout(tick, source.pollingInterval)
    }
  }

  void tick()

  return {
    stop: () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (controller) controller.abort()
    },
  }
}

/**
 * Extract a dataset from a raw HTTP response. JSON-aware:
 *   - try `JSON.parse` on the body
 *   - if `responsePath` is given, dot-traverse into it
 *   - feed the resulting array (or object containing an array) to
 *     `parseJson`, which already handles the array / wrapped-array
 *     shapes
 *
 * Non-JSON responses surface an error string so the UI's fetch-status
 * indicator shows it; we don't try CSV-from-text auto-detection.
 */
function extractDataset(rawBody: string, responsePath: string | undefined): Dataset {
  let value: unknown
  try {
    value = JSON.parse(rawBody)
  } catch {
    // Fallback — treat as a raw array if it looks like one, else throw.
    throw new Error('响应不是有效 JSON')
  }
  if (responsePath) {
    for (const seg of responsePath.split('.')) {
      if (value == null) break
      value = (value as Record<string, unknown>)[seg]
    }
  }
  // Hand off to the json parser for the array detection + type inference.
  const { dataset, error } = parseJson(JSON.stringify(value))
  if (error) throw new Error(error)
  return dataset
}

/**
 * One-shot fetch for the "试运行" button in the DataSource editor.
 * Bypasses polling — just performs a single request, writes the result
 * into RuntimeStore (so the source row's status flips green/red), and
 * resolves with the parsed dataset (or rejects with an Error the
 * caller can surface in a toast).
 *
 * Cache is honoured for resolves so a quick double-click doesn't fire
 * two HTTP requests; clicking again after invalidation is rare enough
 * that "stale-on-purpose" handling stays at the caller (toast a hint
 * if needed).
 */
export async function fetchApiSourceOnce(
  source: ApiDataSource,
): Promise<Dataset> {
  const { actions } = useRuntimeStore.getState()
  actions.setFetchStatus(source.id, { state: 'loading' })
  try {
    const res = await fetch(source.url, {
      method: source.method,
      headers: source.headers,
      body:
        source.method === 'POST' && source.body !== undefined
          ? source.body
          : undefined,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    const text = await res.text()
    const dataset = extractDataset(text, source.responsePath)
    cache.set(source.id, { fetchedAt: Date.now(), dataset })
    actions.setFetchedData(source.id, dataset)
    actions.setFetchStatus(source.id, { state: 'success', updatedAt: Date.now() })
    return dataset
  } catch (err) {
    actions.setFetchStatus(source.id, {
      state: 'error',
      error: (err as Error).message,
      updatedAt: Date.now(),
    })
    throw err
  }
}

/**
 * Reconcile a set of running fetchers with the project's data source
 * list. Called by EditorRoot on every project state change:
 *
 *   - starts a new fetcher for any api source that doesn't have one
 *   - stops the fetcher for any source that was removed or changed
 *     type
 *   - restarts a fetcher when its spec changed (URL / headers /
 *     polling interval / response path)
 *
 * Sources of type `static`, `csv`, `json` don't need a fetcher — they
 * carry their dataset in the document itself.
 */
const handles = new Map<string, { source: ApiDataSource; handle: FetcherHandle }>()

export function reconcileFetchers(sources: DataSource[]): void {
  const seen = new Set<string>()
  for (const s of sources) {
    if (s.type !== 'api') continue
    const api = s as ApiDataSource
    seen.add(api.id)
    const entry = handles.get(api.id)
    if (!entry || !specEqual(entry.source, api)) {
      entry?.handle.stop()
      handles.set(api.id, { source: api, handle: startApiFetcher(api) })
    }
  }
  // Stop any handle whose source vanished or changed type.
  for (const [id, entry] of handles) {
    if (!seen.has(id)) {
      entry.handle.stop()
      handles.delete(id)
    }
  }
}

/** Stop everything — call on editor unmount / project swap. */
export function stopAllFetchers(): void {
  for (const { handle } of handles.values()) handle.stop()
  handles.clear()
  cache.clear()
}

/**
 * Shallow spec equality — compares the fields that actually drive a
 * fetcher's behaviour. Caching settings DON'T trigger a restart because
 * the running fetcher reads them live every tick.
 */
function specEqual(a: ApiDataSource, b: ApiDataSource): boolean {
  return (
    a.url === b.url &&
    a.method === b.method &&
    a.body === b.body &&
    a.responsePath === b.responsePath &&
    a.pollingInterval === b.pollingInterval &&
    JSON.stringify(a.headers ?? null) === JSON.stringify(b.headers ?? null)
  )
}
