import { enablePatches, produceWithPatches, applyPatches } from 'immer'
import type { Patch } from 'immer'
import type { Project } from '@schema/types'
import { useDocumentStore } from '../stores/document-store'
import type { EventBus } from './event-bus'

// immer's patch APIs require an explicit opt-in.
enablePatches()

export interface HistoryEntry {
  id: string
  label: string
  patches: Patch[]
  inversePatches: Patch[]
  timestamp: number
  /** Subsequent applies with the same mergeKey (within mergeWindowMs) merge. */
  mergeKey?: string
}

export interface HistoryOptions {
  /** Maximum entries kept in the undo stack. Older entries are dropped. */
  limit?: number
  /** Time window (ms) within which same-mergeKey applies merge. */
  mergeWindowMs?: number
}

export interface ApplyOptions {
  /** Same key + within mergeWindowMs => merged into the previous entry. */
  mergeKey?: string
  /** Skip undo stack entirely. */
  ephemeral?: boolean
}

const DEFAULT_LIMIT = 100
const DEFAULT_MERGE_WINDOW_MS = 500

/**
 * HistoryManager — the *only* path through which DocumentStore mutates.
 * Generates immer patches for every change, supports merge-coalescing
 * during continuous gestures, and emits events on the bus.
 */
export class HistoryManager {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private nextEntryId = 1
  private pendingMark: string | null = null
  private inBatch = false
  private batchEntries: HistoryEntry[] = []
  private batchLabel = ''

  private readonly limit: number
  private readonly mergeWindowMs: number

  constructor(
    private readonly bus: EventBus,
    opts: HistoryOptions = {},
  ) {
    this.limit = opts.limit ?? DEFAULT_LIMIT
    this.mergeWindowMs = opts.mergeWindowMs ?? DEFAULT_MERGE_WINDOW_MS
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Apply a mutation. The recipe gets a draft of the current project and
   * mutates it (immer style). Patches are computed and pushed to the undo
   * stack unless `ephemeral` is set.
   */
  apply(label: string, recipe: (draft: Project) => void, opts: ApplyOptions = {}): void {
    const project = useDocumentStore.getState().project
    if (!project) {
      // No project loaded — silently ignore. Callers shouldn't reach here
      // in normal flow; throwing would break HMR resets.
      return
    }

    const [next, patches, inversePatches] = produceWithPatches(project, recipe)
    if (patches.length === 0) return

    useDocumentStore.getState()._setProject(next as Project)

    if (opts.ephemeral) {
      this.bus.emit('history.applied', {
        label,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      })
      return
    }

    const entry: HistoryEntry = {
      id: `h${this.nextEntryId++}`,
      label: this.pendingMark ?? label,
      patches,
      inversePatches,
      timestamp: Date.now(),
      mergeKey: opts.mergeKey,
    }
    this.pendingMark = null

    if (this.inBatch) {
      this.batchEntries.push(entry)
    } else {
      this.pushEntry(entry)
    }

    this.redoStack = []
    this.bus.emit('history.applied', {
      label: entry.label,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    })
  }

  /** Apply without producing an undo entry. Used for ephemeral state. */
  applyEphemeral(recipe: (draft: Project) => void): void {
    this.apply('ephemeral', recipe, { ephemeral: true })
  }

  /** Set a label for the next apply (ignored if not used). */
  mark(label?: string): void {
    this.pendingMark = label ?? null
  }

  /** Group multiple applies into a single undo entry. */
  batch(label: string, fn: () => void): void {
    if (this.inBatch) {
      // Re-entrant batch — just run inline.
      fn()
      return
    }
    this.inBatch = true
    this.batchLabel = label
    this.batchEntries = []
    try {
      fn()
    } finally {
      this.inBatch = false
      if (this.batchEntries.length > 0) {
        const merged: HistoryEntry = {
          id: `h${this.nextEntryId++}`,
          label: this.batchLabel,
          patches: this.batchEntries.flatMap((e) => e.patches),
          inversePatches: this.batchEntries
            .slice()
            .reverse()
            .flatMap((e) => e.inversePatches),
          timestamp: Date.now(),
        }
        this.pushEntry(merged)
        this.bus.emit('history.applied', {
          label: merged.label,
          canUndo: this.canUndo(),
          canRedo: this.canRedo(),
        })
      }
      this.batchEntries = []
      this.batchLabel = ''
    }
  }

  undo(): void {
    const entry = this.undoStack.pop()
    if (!entry) return
    useDocumentStore.getState()._applyPatches(entry.inversePatches)
    this.redoStack.push(entry)
    this.bus.emit('history.undone', { label: entry.label })
  }

  redo(): void {
    const entry = this.redoStack.pop()
    if (!entry) return
    useDocumentStore.getState()._applyPatches(entry.patches)
    this.undoStack.push(entry)
    this.bus.emit('history.redone', { label: entry.label })
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.pendingMark = null
    this.bus.emit('history.cleared', {})
  }

  /** Snapshot of stacks for a history panel UI. */
  getHistory(): { undo: HistoryEntry[]; redo: HistoryEntry[] } {
    return { undo: [...this.undoStack], redo: [...this.redoStack] }
  }

  // ── Internals ───────────────────────────────────────────────────

  private pushEntry(entry: HistoryEntry): void {
    const top = this.undoStack[this.undoStack.length - 1]
    if (
      top &&
      entry.mergeKey &&
      top.mergeKey === entry.mergeKey &&
      entry.timestamp - top.timestamp <= this.mergeWindowMs
    ) {
      // Merge: append new patches; prepend new inverse to keep ordering correct.
      top.patches.push(...entry.patches)
      top.inversePatches.unshift(...entry.inversePatches)
      top.timestamp = entry.timestamp
      return
    }
    this.undoStack.push(entry)
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }
  }
}

/** Re-export immer's applyPatches for tools that need to apply patches manually. */
export { applyPatches }
