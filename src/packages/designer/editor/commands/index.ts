import type { CommandRegistry } from '../command-registry'
import { canvasCommands } from './canvas-commands'
import { dataSourceCommands } from './data-source-commands'
import { guideCommands } from './guide-commands'
import { pageCommands } from './page-commands'
import { projectCommands } from './project-commands'
import { widgetCommands } from './widget-commands'

/** Register all built-in commands on a registry. */
export function registerBuiltinCommands(registry: CommandRegistry): void {
  for (const cmd of [
    ...projectCommands,
    ...widgetCommands,
    ...pageCommands,
    ...canvasCommands,
    ...guideCommands,
    ...dataSourceCommands,
  ]) {
    registry.register(cmd)
  }
}

export * from './widget-commands'
export * from './page-commands'
export * from './canvas-commands'
export * from './guide-commands'
export * from './data-source-commands'
export * from './project-commands'
export * from './helpers'
