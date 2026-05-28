import type { Command } from '../command-registry'

export interface ProjectRenamePayload {
  name: string
}

export interface ProjectSetDescriptionPayload {
  description: string
}

export interface ProjectSetExtensionPayload {
  /** Key under `project.extensions` to write. */
  key: string
  /** Value — set to `null` to delete the key. */
  value: unknown
}

export const projectRenameCommand: Command<ProjectRenamePayload> = {
  type: 'project.rename',
  label: '重命名项目',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    draft.name = payload.name
  },
}

export const projectSetDescriptionCommand: Command<ProjectSetDescriptionPayload> = {
  type: 'project.setDescription',
  label: '修改项目描述',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    draft.description = payload.description
  },
}

/**
 * Generic writer for `project.extensions[key]`. Editor-level features
 * (theme selection, saved presets, layout prefs) park their state here
 * so the core Project schema stays untouched and round-trippable.
 *
 * `null` deletes the key. Other values overwrite outright — partial
 * merges are the caller's responsibility (they already have the prior
 * extension value via `editor.getProject()`).
 */
export const projectSetExtensionCommand: Command<ProjectSetExtensionPayload> = {
  type: 'project.setExtension',
  label: '更新项目扩展',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    if (!draft.extensions) draft.extensions = {}
    if (payload.value === null) delete draft.extensions[payload.key]
    else draft.extensions[payload.key] = payload.value
  },
}

export const projectCommands: Command<any>[] = [
  projectRenameCommand,
  projectSetDescriptionCommand,
  projectSetExtensionCommand,
]
