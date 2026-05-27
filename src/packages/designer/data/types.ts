/**
 * Re-exports the resolved-data types that the resolver constructs and
 * the widget Components read. The canonical declarations live in
 * `@widgets/widget-meta` (the widget render contract) — we re-export
 * here so the designer side has a single `@designer/data` import path
 * for "resolver + types + utilities" without forcing every consumer to
 * reach across into `@widgets`.
 */
export type { ResolvedSlot, ResolvedWidgetData } from '@widgets/widget-meta'
