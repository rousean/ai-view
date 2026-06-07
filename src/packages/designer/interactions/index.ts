export type {
  TriggerDef,
  ActionDef,
  ParamFieldDef,
  InteractionRegistry,
} from './interaction-types'
export {
  BUILTIN_TRIGGERS,
  BUILTIN_ACTIONS,
  BUILTIN_INTERACTION_REGISTRY,
  findTrigger,
  findAction,
} from './builtin-interactions'
export {
  dispatchEvent,
  findMatchingBindings,
  type DispatchContext,
  type DispatchHost,
} from './runtime/event-dispatcher'
