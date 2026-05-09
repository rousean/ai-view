import type {
  Asset,
  Camera,
  DataSource,
  Project,
  Theme,
  WidgetNode,
} from '@schema/types';

/**
 * Strongly-typed event map. Plugin-defined events use the `plugin.*` prefix
 * and are typed as `unknown`.
 */
export interface EditorEventMap {
  // Document lifecycle
  'document.loaded': { project: Project };
  'document.saved': { project: Project };
  'document.dirty': { dirty: boolean };

  // Widget mutations
  'widget.added': { widget: WidgetNode };
  'widget.removed': { ids: string[] };
  'widget.updated': { id: string; before: WidgetNode; after: WidgetNode };
  'widget.moved': { ids: string[]; dx: number; dy: number };

  // Selection / hover
  'selection.changed': { ids: string[] };
  'hover.changed': { id: string | null };

  // Camera
  'camera.changed': { camera: Camera };

  // Tool
  'tool.changed': { from: string; to: string };

  // History
  'history.applied': { label: string; canUndo: boolean; canRedo: boolean };
  'history.cleared': Record<string, never>;
  'history.undone': { label: string };
  'history.redone': { label: string };

  // Data source
  'dataSource.added': { dataSource: DataSource };
  'dataSource.fetching': { sourceId: string };
  'dataSource.fetched': { sourceId: string; data: unknown };
  'dataSource.failed': { sourceId: string; error: Error };

  // Theme / asset
  'theme.changed': { themeId: string };
  'asset.added': { asset: Asset };

  // Page
  'page.changed': { pageId: string };
  'page.added': { pageId: string };
  'page.removed': { pageId: string };

  // Command lifecycle (introspection)
  'command.before': { key: string; payload: unknown };
  'command.after': { key: string; payload: unknown };
  'command.failed': { key: string; payload: unknown; error: Error };

  // Plugin namespace (open)
  [key: `plugin.${string}`]: unknown;
}

export type EditorEventKey = keyof EditorEventMap;
type Listener<T> = (payload: T) => void;

/**
 * Tiny typed pub-sub. ~50 lines, zero deps.
 *
 * Listeners attached via `on()` get a disposer back. `once()` listeners
 * detach themselves after the first emit. Errors thrown in listeners are
 * logged but do not break the emit loop (one bad subscriber must not
 * break the rest of the editor).
 */
export class EventBus {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  on<K extends EditorEventKey>(
    event: K,
    handler: Listener<EditorEventMap[K]>,
  ): () => void;
  on(event: string, handler: Listener<unknown>): () => void;
  on(event: string, handler: Listener<unknown>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  once<K extends EditorEventKey>(
    event: K,
    handler: Listener<EditorEventMap[K]>,
  ): () => void {
    const wrap: Listener<unknown> = (payload) => {
      this.off(event, wrap);
      (handler as Listener<unknown>)(payload);
    };
    return this.on(event, wrap);
  }

  off(event: string, handler: Listener<unknown>): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<K extends EditorEventKey>(event: K, payload: EditorEventMap[K]): void;
  emit(event: string, payload: unknown): void;
  emit(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[EventBus] listener for "${event}" threw`, err);
      }
    }
  }

  /** Remove all listeners (used during editor disposal). */
  clear(): void {
    this.listeners.clear();
  }
}
