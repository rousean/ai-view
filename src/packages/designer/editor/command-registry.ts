import type { Project } from '@schema/types';
import type { DashboardEditor } from './dashboard-editor';
import { Registry } from './registry';

export interface CommandContext {
  editor: DashboardEditor;
}

/**
 * Command — the unit of editor mutation. Two execution modes:
 *
 * 1. `apply` (preferred): receives an immer draft of the project so the
 *    handler can mutate freely. The HistoryManager handles patches and
 *    undo automatically. Pass `undoable: true`.
 *
 * 2. `run` (for non-document side effects): receives only the editor.
 *    Use for selection changes, camera updates, tool switches, etc.
 *    Set `undoable: false` (these typically do not enter the undo stack).
 *
 * A command can have at most one of `apply` / `run`.
 */
export interface Command<P = unknown> {
  type: string; // Registry key
  label?: string | ((payload: P) => string);
  undoable: boolean;
  /** Optional: gate when the button is enabled / when the cmd shows in menus. */
  canExecute?: (ctx: CommandContext, payload: P) => boolean;
  /** Document-mutating handler: gets an immer draft. */
  apply?: (draft: Project, ctx: CommandContext, payload: P) => void;
  /** Side-effect handler: no draft. */
  run?: (ctx: CommandContext, payload: P) => void;
  /** mergeKey for HistoryManager coalescing (apply path only). */
  mergeKey?: (payload: P) => string | undefined;
}

export class CommandRegistry extends Registry<Command<any>> {
  constructor() {
    super('commands');
  }
}
