import { PanTool } from './pan-tool'
import { PlaceTool } from './place-tool'
import { SelectTool } from './select-tool'
import type { ToolRegistry } from './tool-registry'

export { ToolRegistry } from './tool-registry'
export type { Tool, ToolContext } from './tool.interface'
export { SelectTool } from './select-tool'
export { PlaceTool } from './place-tool'
export { PanTool } from './pan-tool'

export const builtinTools = [SelectTool, PlaceTool, PanTool]

export function registerBuiltinTools(registry: ToolRegistry): void {
  for (const t of builtinTools) registry.register(t)
}
