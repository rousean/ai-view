import type { Command } from '../command-registry'

export interface ProjectRenamePayload {
  name: string
}

export interface ProjectSetDescriptionPayload {
  description: string
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

export const projectCommands: Command<any>[] = [
  projectRenameCommand,
  projectSetDescriptionCommand,
]
