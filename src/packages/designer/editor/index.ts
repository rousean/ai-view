export { EventBus } from './event-bus';
export type { EditorEventMap, EditorEventKey } from './event-bus';

export { HistoryManager, applyPatches } from './history-manager';
export type {
  HistoryEntry,
  HistoryOptions,
  ApplyOptions,
} from './history-manager';

export { Registry } from './registry';
export type { RegistryEvent, RegistryListener, RegistryKeyed } from './registry';

export { HookManager } from './hook-manager';
export type {
  ChangeKind,
  ChangeTarget,
  ChangePayload,
  BeforeHandler,
  AfterHandler,
} from './hook-manager';

export { CommandRegistry } from './command-registry';
export type { Command, CommandContext } from './command-registry';

export { RegistryHub } from './registry-hub';

export {
  registerBuiltinCommands,
  // payload types
} from './commands';

export { DashboardEditor } from './dashboard-editor';
export type { EditorOptions, Plugin, PluginContext } from './dashboard-editor';

export {
  EditorProvider,
  useDashboardEditor,
  useEditorState,
  useDocumentState,
  useRuntimeState,
} from './editor-context';
export type { EditorProviderProps } from './editor-context';
