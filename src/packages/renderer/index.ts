// Public API of the @renderer package.
//
// Pure, editor-agnostic widget rendering. The designer canvas and the
// (future) standalone runtime both render widgets through here, so a
// published project doesn't need to pull in the whole @designer package.
export { WidgetView, type WidgetViewProps } from './widget-view'
export { WidgetErrorBoundary } from './widget-error-boundary'
export {
  resolveWidgetData,
  autoMapToSlots,
  initInlineFromSample,
  initEmptyInline,
  indexDataSources,
  type ResolveFilter,
} from './resolve'
