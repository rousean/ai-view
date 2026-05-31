import * as React from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import type { WidgetNode } from '@schema/types'
import type { PropConfig, PropGroupDef } from '@widgets/widget-meta'
import { Switch } from '~/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'
import { useDashboardEditor } from '../../editor/editor-context'
import { getByPath, setByPath } from '../../setters/path-utils'
import { PresetManager } from './preset-manager'

/** PropGroupDef keys that are rendered by bespoke sub-components rather
 *  than the default field list. Centralised here so adding new ones
 *  (e.g. SeriesListSetter, EventBindings) stays a single switch. */
const SPECIAL_GROUP_KEYS = new Set(['theme', 'preset', 'theme-preset'])

/**
 * Renders the nested {@link PropGroupDef} structure inside a tab.
 *
 *   - Top-level groups are collapsible cards with their own toolbar
 *     (master Switch, chevron).
 *   - When the master Switch is off and `collapsedWhenOff` is true,
 *     the body is hidden — the section becomes a one-line summary.
 *   - One level of nested children (rendered as sub-headings inside
 *     the body), each of which may itself carry a Switch.
 *   - Leaves are `PropConfig` rows rendered identically to the legacy
 *     PropertyPanel.
 *
 * The `searchQuery` prop hides any group / field whose label doesn't
 * match. A hit re-opens the wrapping group so the user lands on the
 * match without having to expand anything.
 */
export function PropGroupRenderer({
  widget,
  groups,
  defaults,
  searchQuery,
}: {
  widget: WidgetNode
  groups: PropGroupDef[]
  defaults: Record<string, unknown>
  searchQuery: string
}) {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  // First pass: filter the tree (and recursively child groups) so we
  // don't render empty headers when the search query rules everything
  // out. A group is kept if its own title matches, OR if any descendant
  // field matches.
  const matchedGroups = React.useMemo(
    () => groups.filter((g) => groupMatches(g, normalizedQuery)),
    [groups, normalizedQuery],
  )

  if (matchedGroups.length === 0) {
    return (
      <div className="text-muted-foreground/60 px-3 py-6 text-center text-[11px]">
        没有匹配「{searchQuery}」的属性
      </div>
    )
  }

  return (
    <>
      {matchedGroups.map((group) => (
        <PropGroupSection
          key={group.key}
          widget={widget}
          group={group}
          defaults={defaults}
          searchQuery={normalizedQuery}
        />
      ))}
    </>
  )
}

function PropGroupSection({
  widget,
  group,
  defaults,
  searchQuery,
  depth = 0,
}: {
  widget: WidgetNode
  group: PropGroupDef
  defaults: Record<string, unknown>
  searchQuery: string
  depth?: number
}) {
  const editor = useDashboardEditor()
  // All hooks must run on every render — keep them above any early
  // returns. The `visible()` gate lives below as a render-time guard.
  const [open, setOpen] = React.useState(group.defaultOpen ?? true)
  const searchHitInBody = React.useMemo(
    () => (searchQuery ? groupHasFieldMatch(group, searchQuery) : false),
    [group, searchQuery],
  )

  // Visibility — props-dependent. Hide outright if the visible fn
  // says no.
  if (group.visible && !group.visible(widget.props)) return null

  // Toggle state — read the master switch's current value from props.
  const toggle = group.enableToggle
  const isToggled = toggle ? Boolean(getByPath(widget.props, toggle.path)) : true
  // A disabled section normally collapses its body to a single header
  // row. But when a search query *matches a field inside* that body,
  // hiding it would leave the user staring at a header for a section
  // they searched into with nothing to show — so we force the body open
  // for the duration of the search even though the master switch is off.
  const shouldHideBody =
    toggle != null &&
    !isToggled &&
    (toggle.collapsedWhenOff ?? true) &&
    !searchHitInBody

  // Search hit → force-open. We use the memoised `searchHitInBody`
  // computed above (kept here for readability).
  const effectiveOpen = searchHitInBody ? true : open

  const Icon = group.icon

  const handleToggle = (next: boolean) => {
    if (!toggle) return
    const nextProps = setByPath(widget.props, toggle.path, next)
    editor.updateProps(widget.id, nextProps)
    // Auto-open the body when turning on; auto-collapse stays governed
    // by `collapsedWhenOff`.
    if (next) setOpen(true)
  }

  return (
    <div
      className={cn(
        'group/section',
        depth === 0 ? 'border-border/60 border-b last:border-b-0' : 'pl-3',
      )}
    >
      <div
        className={cn(
          'flex w-full cursor-pointer items-center gap-1.5 px-3 py-2',
          depth > 0 && 'border-border/40 border-t py-1.5',
        )}
        onClick={() => {
          // Don't toggle the body if the click landed on the switch.
          // Radix takes care of that, but defensive guard for our own
          // wrapper click.
          if (shouldHideBody) return
          setOpen((o) => !o)
        }}
      >
        {!shouldHideBody && (
          <ChevronDown
            size={12}
            className="text-muted-foreground/70 shrink-0 transition-transform duration-150"
            style={{ transform: effectiveOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
        )}
        {shouldHideBody && <span className="w-3 shrink-0" />}
        {Icon && (
          <Icon
            size={12}
            className={cn(
              'shrink-0',
              isToggled ? 'text-foreground/80' : 'text-muted-foreground/50',
            )}
          />
        )}
        <span
          className={cn(
            'flex-1 truncate font-medium',
            depth === 0
              ? 'text-foreground/80 text-[12px]'
              : 'text-muted-foreground/80 text-[11px]',
            !isToggled && 'text-muted-foreground/50',
          )}
        >
          {group.title}
        </span>
        {toggle && (
          <span onClick={(e) => e.stopPropagation()}>
            <Switch
              size="sm"
              checked={isToggled}
              onCheckedChange={handleToggle}
              aria-label={`${group.title} 启用`}
            />
          </span>
        )}
      </div>

      {!shouldHideBody && effectiveOpen && (
        <div className={cn('pb-2', depth === 0 && 'pt-0.5')}>
          {group.description && (
            <div className="text-muted-foreground/70 px-3 pb-1.5 text-[10px] italic">
              {group.description}
            </div>
          )}
          {group.fields?.map((cfg) => (
            <SchemaFieldRow
              key={cfg.path}
              widget={widget}
              cfg={cfg}
              defaults={defaults}
              searchQuery={searchQuery}
            />
          ))}
          {group.children?.map((child) => (
            <PropGroupSection
              key={child.key}
              widget={widget}
              group={child}
              defaults={defaults}
              searchQuery={searchQuery}
              depth={depth + 1}
            />
          ))}
          {SPECIAL_GROUP_KEYS.has(group.key) && (
            <PresetManager widget={widget} />
          )}
          {group.fields?.length === 0 &&
            !group.children?.length &&
            !SPECIAL_GROUP_KEYS.has(group.key) && (
              <div className="text-muted-foreground/50 px-3 py-1.5 text-[10px]">
                暂无可配置项
              </div>
            )}
        </div>
      )}
    </div>
  )
}

// ─── Single field row ────────────────────────────────────────────

/**
 * One PropConfig leaf — wraps the legacy setter render but adds:
 *   - search-match highlight on the label
 *   - hover-revealed reset button (visible when value ≠ default)
 *   - "modified" dot on the left of the label
 */
function SchemaFieldRow({
  widget,
  cfg,
  defaults,
  searchQuery,
}: {
  widget: WidgetNode
  cfg: PropConfig
  defaults: Record<string, unknown>
  searchQuery: string
}) {
  const editor = useDashboardEditor()
  const setterDef = editor.registry.setters.get(cfg.setter)

  // Conditional visibility / disabled.
  const visible = cfg.visible ? cfg.visible(widget.props) : true
  if (!visible) return null
  const disabled = cfg.disabled ? cfg.disabled(widget.props) : false

  // Search filter — if there's a query and *this* label doesn't match,
  // skip rendering. The group title still anchors the group.
  if (searchQuery && !cfg.label.toLowerCase().includes(searchQuery)) {
    return null
  }

  const value = getByPath(widget.props, cfg.path)
  const defaultValue = getByPath(defaults, cfg.path)
  const isModified = !isEqualForReset(value, defaultValue)

  const handleChange = (next: unknown) => {
    const nextProps = setByPath(widget.props, cfg.path, next)
    editor.updateProps(widget.id, nextProps)
  }
  const handleReset = () => {
    if (defaultValue === undefined) return
    const nextProps = setByPath(widget.props, cfg.path, defaultValue)
    editor.updateProps(widget.id, nextProps)
  }

  return (
    <div className="group/row hover:bg-muted/40 flex min-h-7 items-center gap-2 px-3 py-1">
      <div className="relative w-14 shrink-0">
        {isModified && (
          <span
            className="bg-primary absolute top-1/2 -left-1.5 h-1 w-1 -translate-y-1/2 rounded-full"
            aria-label="已修改"
          />
        )}
        <span
          className={cn(
            'text-muted-foreground/80 block truncate text-[11px]',
            isModified && 'text-foreground/85',
          )}
          title={cfg.label}
        >
          {searchQuery ? <HighlightLabel text={cfg.label} query={searchQuery} /> : cfg.label}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {setterDef ? (
          <setterDef.component
            value={value}
            onChange={handleChange}
            setterProps={cfg.setterProps}
            context={{ node: widget, editor }}
            disabled={disabled}
          />
        ) : (
          <span className="text-destructive text-[11px]">
            未注册 setter: {cfg.setter}
          </span>
        )}
        {isModified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleReset}
                className={cn(
                  'text-muted-foreground/60 hover:text-foreground shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover/row:opacity-100',
                  'cursor-pointer',
                )}
                aria-label="重置为默认值"
              >
                <RotateCcw size={11} />
              </button>
            </TooltipTrigger>
            <TooltipContent>重置为默认</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

function HighlightLabel({ text, query }: { text: string; query: string }) {
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query)
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────

function groupMatches(group: PropGroupDef, q: string): boolean {
  if (!q) return true
  if (group.title.toLowerCase().includes(q)) return true
  return groupHasFieldMatch(group, q)
}

function groupHasFieldMatch(group: PropGroupDef, q: string): boolean {
  if (!q) return false
  if (group.fields?.some((f) => f.label.toLowerCase().includes(q))) return true
  if (group.children?.some((c) => groupMatches(c, q))) return true
  return false
}

/**
 * Equality check used to flag "this field differs from its default".
 *
 *   - Primitives: strict equal with a numeric tolerance for floats.
 *   - Arrays:     element-wise recursion.
 *   - Plain objects: shallow recursion on own enumerable keys.
 *   - Anything else (dates, functions): identity only.
 *
 * Returning `true` means "value matches default" — i.e. *not* modified.
 * The old version always returned false for any object, which made the
 * blue "modified" dot and reset button appear on every FontStyle row
 * even when the user hadn't touched it.
 */
function isEqualForReset(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!isEqualForReset(a[i], b[i])) return false
    }
    return true
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>
    const bo = b as Record<string, unknown>
    const aKeys = Object.keys(ao)
    const bKeys = Object.keys(bo)
    if (aKeys.length !== bKeys.length) return false
    for (const k of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(bo, k)) return false
      if (!isEqualForReset(ao[k], bo[k])) return false
    }
    return true
  }
  return false
}

// Legacy separator — kept exported so existing PropSection wrappers
// still align visually if they import it from here later.
export const PropGroupSeparator = Separator
