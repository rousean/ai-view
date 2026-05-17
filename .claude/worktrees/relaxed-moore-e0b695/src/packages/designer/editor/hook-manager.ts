/**
 * HookManager — tldraw-inspired beforeChange/afterChange interception.
 *
 * Hooks fire around document mutations. `beforeChange` may rewrite the
 * payload (return a new value) or veto the change (return false).
 * `afterChange` is for cascading side effects.
 */

export type ChangeKind = 'create' | 'update' | 'delete';

export type ChangeTarget =
  | 'widget'
  | 'page'
  | 'dataSource'
  | 'theme'
  | 'asset'
  | 'guide';

export interface ChangePayload<T> {
  kind: ChangeKind;
  target: ChangeTarget;
  next: T;
  prev: T | null;
}

export type BeforeHandler<T> = (
  payload: ChangePayload<T>,
) => T | false;

export type AfterHandler<T> = (payload: ChangePayload<T>) => void;

export class HookManager {
  private before = new Map<ChangeTarget, Set<BeforeHandler<unknown>>>();
  private after = new Map<ChangeTarget, Set<AfterHandler<unknown>>>();

  beforeChange<T>(
    target: ChangeTarget,
    handler: BeforeHandler<T>,
  ): () => void {
    let set = this.before.get(target);
    if (!set) {
      set = new Set();
      this.before.set(target, set);
    }
    set.add(handler as BeforeHandler<unknown>);
    return () => set!.delete(handler as BeforeHandler<unknown>);
  }

  afterChange<T>(
    target: ChangeTarget,
    handler: AfterHandler<T>,
  ): () => void {
    let set = this.after.get(target);
    if (!set) {
      set = new Set();
      this.after.set(target, set);
    }
    set.add(handler as AfterHandler<unknown>);
    return () => set!.delete(handler as AfterHandler<unknown>);
  }

  /**
   * Run all beforeChange handlers. Returns the (possibly rewritten) `next`
   * value, or `false` if any handler vetoed the change.
   */
  runBefore<T>(payload: ChangePayload<T>): T | false {
    const set = this.before.get(payload.target);
    if (!set) return payload.next;
    let current: T = payload.next;
    for (const fn of set) {
      try {
        const result = (fn as BeforeHandler<T>)({ ...payload, next: current });
        if (result === false) return false;
        current = result;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[HookManager] beforeChange handler threw', err);
      }
    }
    return current;
  }

  runAfter<T>(payload: ChangePayload<T>): void {
    const set = this.after.get(payload.target);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as AfterHandler<T>)(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[HookManager] afterChange handler threw', err);
      }
    }
  }

  clear(): void {
    this.before.clear();
    this.after.clear();
  }
}
