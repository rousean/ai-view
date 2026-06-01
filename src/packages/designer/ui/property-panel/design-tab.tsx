import * as React from 'react'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Link2,
  Lock,
  Move,
  Unlock,
} from 'lucide-react'
import type { Layout, WidgetNode } from '@schema/types'
import type { PropConfig, PropGroupDef, WidgetMeta } from '@widgets/widget-meta'
import { Button } from '~/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { unionBBox } from '../../canvas/transformer/geometry'
import { useDashboardEditor } from '../../editor/editor-context'
import { NumInput, PropRow, PropSection } from '../property-controls'
import { PropGroupRenderer } from './prop-group-renderer'

/**
 * 设计 tab — `布局` section (X/Y/W/H/rotate/opacity) + the nested
 * `propsGroups` from WidgetMeta.
 *
 * Single-select: full layout block + all groups.
 * Multi-select (homogeneous): show layout group + the *intersection* of
 *   propsGroups (only those with paths that exist on all selected
 *   widgets' default props).
 * Multi-select (mixed types): show layout group only.
 */
export function DesignTab({
  widgets,
  meta,
  searchQuery,
}: {
  widgets: WidgetNode[]
  meta: WidgetMeta | undefined
  searchQuery: string
}) {
  if (widgets.length === 0) return null

  if (widgets.length === 1) {
    const w = widgets[0]!
    const groups = resolveGroupsForTab(meta, '设计')
    return (
      <>
        <SingleLayoutSection widget={w} />
        {groups.length > 0 && (
          <PropGroupRenderer
            widget={w}
            groups={groups}
            defaults={(meta?.defaultProps ?? {}) as Record<string, unknown>}
            searchQuery={searchQuery}
          />
        )}
      </>
    )
  }

  return <MultiLayoutSection widgets={widgets} meta={meta} searchQuery={searchQuery} />
}

// ── single selection layout ───────────────────────────────────────

function SingleLayoutSection({ widget }: { widget: WidgetNode }) {
  const editor = useDashboardEditor()
  const [linked, setLinked] = React.useState(false)
  const ratioRef = React.useRef(widget.layout.width / Math.max(widget.layout.height, 1))

  React.useEffect(() => {
    ratioRef.current = widget.layout.width / Math.max(widget.layout.height, 1)
    // Only seed the ratio when the user selects a different widget — we
    // don't want every drag-resize to overwrite the locked aspect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id])

  const updateW = (width: number) => {
    if (linked) {
      const r = ratioRef.current || 1
      editor.updateLayout(widget.id, { width, height: Math.round(width / r) })
    } else {
      editor.updateLayout(widget.id, { width })
    }
  }
  const updateH = (height: number) => {
    if (linked) {
      const r = ratioRef.current || 1
      editor.updateLayout(widget.id, { width: Math.round(height * r), height })
    } else {
      editor.updateLayout(widget.id, { height })
    }
  }

  return (
    <PropSection title="布局">
      <PropRow label="X / Y">
        <NumInput
          value={Math.round(widget.layout.x)}
          prefix="X"
          onChange={(x) => editor.updateLayout(widget.id, { x })}
        />
        <NumInput
          value={Math.round(widget.layout.y)}
          prefix="Y"
          onChange={(y) => editor.updateLayout(widget.id, { y })}
        />
      </PropRow>
      <PropRow label="宽 / 高">
        <NumInput value={Math.round(widget.layout.width)} prefix="W" onChange={updateW} />
        <NumInput value={Math.round(widget.layout.height)} prefix="H" onChange={updateH} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn('shrink-0', linked && 'text-primary')}
              onClick={() => setLinked((v) => !v)}
              aria-label="锁定宽高比"
            >
              <Link2 size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{linked ? '已锁定宽高比' : '锁定宽高比'}</TooltipContent>
        </Tooltip>
      </PropRow>
      <PropRow label="旋转">
        <NumInput
          value={Math.round(widget.layout.rotate)}
          suffix="°"
          onChange={(rotate) => editor.updateLayout(widget.id, { rotate })}
        />
        <NumInput
          value={Math.round(widget.layout.opacity * 100)}
          suffix="%"
          min={0}
          max={100}
          prefix="α"
          onChange={(p) =>
            editor.updateLayout(widget.id, {
              opacity: Math.max(0, Math.min(1, p / 100)),
            })
          }
        />
      </PropRow>
      <PropRow label="对齐画布">
        <ToggleGroup type="single" size="sm" spacing={0} className="h-7">
          <AlignItem value="l" icon={AlignStartVertical} label="左对齐画布" onSelect={() => editor.alignSelection('left', 'page')} />
          <AlignItem value="cx" icon={AlignCenterVertical} label="水平居中画布" onSelect={() => editor.alignSelection('h-center', 'page')} />
          <AlignItem value="r" icon={AlignEndVertical} label="右对齐画布" onSelect={() => editor.alignSelection('right', 'page')} />
          <AlignItem value="t" icon={AlignStartHorizontal} label="顶对齐画布" onSelect={() => editor.alignSelection('top', 'page')} />
          <AlignItem value="cy" icon={AlignCenterHorizontal} label="垂直居中画布" onSelect={() => editor.alignSelection('v-center', 'page')} />
          <AlignItem value="b" icon={AlignEndHorizontal} label="底对齐画布" onSelect={() => editor.alignSelection('bottom', 'page')} />
        </ToggleGroup>
      </PropRow>
      <PropRow label="锁定">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => editor.setLocked([widget.id], !widget.flags.locked)}
              aria-label={widget.flags.locked ? '解锁' : '锁定'}
            >
              {widget.flags.locked ? <Lock size={12} /> : <Unlock size={12} />}
              <span className="ml-1 text-[11px]">
                {widget.flags.locked ? '已锁定' : '未锁定'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>锁定后无法在画布上移动或缩放</TooltipContent>
        </Tooltip>
      </PropRow>
    </PropSection>
  )
}

// ── multi selection layout ────────────────────────────────────────

function MultiLayoutSection({
  widgets,
  meta,
  searchQuery,
}: {
  widgets: WidgetNode[]
  meta: WidgetMeta | undefined
  searchQuery: string
}) {
  const editor = useDashboardEditor()
  const bb = unionBBox(widgets) ?? { x: 0, y: 0, width: 0, height: 0 }
  const commonRotate = allEqual(widgets, (w) => w.layout.rotate)
  const commonOpacity = allEqual(widgets, (w) => w.layout.opacity)

  const translateAllTo = (newX: number, newY: number) => {
    const dx = newX - bb.x
    const dy = newY - bb.y
    if (dx === 0 && dy === 0) return
    editor.updateLayoutBatch(
      widgets.map((w) => ({
        id: w.id,
        layout: { x: w.layout.x + dx, y: w.layout.y + dy } satisfies Partial<Layout>,
      })),
    )
  }
  const setRotateAll = (rotate: number) =>
    editor.updateLayoutBatch(widgets.map((w) => ({ id: w.id, layout: { rotate } })))
  const setOpacityAll = (opacity: number) =>
    editor.updateLayoutBatch(widgets.map((w) => ({ id: w.id, layout: { opacity } })))

  // Alignment & distribution operations.
  const alignAll = (mode: 'l' | 'cx' | 'r' | 't' | 'cy' | 'b') => {
    const updates = widgets.map((w) => {
      const layout: Partial<Layout> = {}
      if (mode === 'l') layout.x = bb.x
      else if (mode === 'cx') layout.x = bb.x + (bb.width - w.layout.width) / 2
      else if (mode === 'r') layout.x = bb.x + bb.width - w.layout.width
      else if (mode === 't') layout.y = bb.y
      else if (mode === 'cy') layout.y = bb.y + (bb.height - w.layout.height) / 2
      else if (mode === 'b') layout.y = bb.y + bb.height - w.layout.height
      return { id: w.id, layout }
    })
    editor.updateLayoutBatch(updates)
  }
  const distributeAll = (axis: 'x' | 'y') => {
    // Delegate to the gap-based `widget.distribute` command (the same one
    // the floating toolbar uses) so the panel and canvas agree — and so
    // spacing accounts for each widget's size, not just its top-left
    // origin (which left unequal visual gaps for differently-sized items).
    editor.distributeSelection(axis === 'x' ? 'horizontal' : 'vertical')
  }

  // Homogeneous selection → also render shared propsGroups (the
  // intersection of paths that exist on every node's defaults).
  const allSameType = widgets.every((w) => w.type === widgets[0]!.type)

  return (
    <>
      <PropSection title={`已选中 ${widgets.length} 个`}>
        <PropRow label="X / Y">
          <NumInput value={Math.round(bb.x)} prefix="X" onChange={(x) => translateAllTo(x, bb.y)} />
          <NumInput value={Math.round(bb.y)} prefix="Y" onChange={(y) => translateAllTo(bb.x, y)} />
        </PropRow>
        <PropRow label="宽 / 高">
          <NumInput value={Math.round(bb.width)} prefix="W" disabled />
          <NumInput value={Math.round(bb.height)} prefix="H" disabled />
        </PropRow>
        <PropRow label="旋转">
          <NumInput
            value={commonRotate !== null ? Math.round(commonRotate) : undefined}
            suffix="°"
            onChange={setRotateAll}
          />
          <NumInput
            value={commonOpacity !== null ? Math.round(commonOpacity * 100) : undefined}
            prefix="α"
            suffix="%"
            min={0}
            max={100}
            onChange={(p) => setOpacityAll(Math.max(0, Math.min(1, p / 100)))}
          />
        </PropRow>
        <PropRow label="对齐">
          <ToggleGroup type="single" size="sm" spacing={0} className="h-7">
            <AlignItem value="l" icon={AlignStartVertical} label="左对齐" onSelect={() => alignAll('l')} />
            <AlignItem value="cx" icon={AlignCenterVertical} label="水平居中" onSelect={() => alignAll('cx')} />
            <AlignItem value="r" icon={AlignEndVertical} label="右对齐" onSelect={() => alignAll('r')} />
            <AlignItem value="t" icon={AlignStartHorizontal} label="顶对齐" onSelect={() => alignAll('t')} />
            <AlignItem value="cy" icon={AlignCenterHorizontal} label="垂直居中" onSelect={() => alignAll('cy')} />
            <AlignItem value="b" icon={AlignEndHorizontal} label="底对齐" onSelect={() => alignAll('b')} />
          </ToggleGroup>
        </PropRow>
        <PropRow label="分布">
          <ToggleGroup type="single" size="sm" spacing={0} className="h-7">
            <AlignItem
              value="dx"
              icon={AlignHorizontalDistributeCenter}
              label="水平等距"
              onSelect={() => distributeAll('x')}
              disabled={widgets.length < 3}
            />
            <AlignItem
              value="dy"
              icon={AlignVerticalDistributeCenter}
              label="垂直等距"
              onSelect={() => distributeAll('y')}
              disabled={widgets.length < 3}
            />
          </ToggleGroup>
          {widgets.length < 3 && (
            <span className="text-muted-foreground/60 text-[10px]">需 ≥ 3 个</span>
          )}
        </PropRow>
      </PropSection>

      {allSameType && meta && (
        <SharedPropsForHomogeneous
          widgets={widgets}
          meta={meta}
          searchQuery={searchQuery}
        />
      )}
      {!allSameType && (
        <div className="text-muted-foreground/70 px-3 py-3 text-center text-[11px]">
          <Move size={20} className="text-muted-foreground/40 mx-auto mb-1.5" />
          混合类型组件 · 仅支持位置/尺寸批量编辑
        </div>
      )}
    </>
  )
}

function AlignItem({
  value,
  icon: Icon,
  label,
  onSelect,
  disabled,
}: {
  value: string
  icon: React.ComponentType<{ size?: number }>
  label: string
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupItem
          value={value}
          size="sm"
          aria-label={label}
          disabled={disabled}
          onClick={onSelect}
          className="h-7 w-7 cursor-pointer"
        >
          <Icon size={12} />
        </ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Homogeneous multi-select → shared property editing. Renders the
 * widget's propsGroups against the *primary* widget only, but commits
 * each change to all selected widgets in one batch. Values that disagree
 * across the selection appear blank (handled by setters themselves).
 *
 * For Sprint 1 we render against the primary and ignore "mixed values"
 * indication on the setter level — getting that right needs every
 * setter to accept `undefined`, which is its own task.
 */
function SharedPropsForHomogeneous({
  widgets,
  meta,
  searchQuery,
}: {
  widgets: WidgetNode[]
  meta: WidgetMeta
  searchQuery: string
}) {
  const groups = resolveGroupsForTab(meta, '设计')

  // The renderer commits against the primary widget; BatchPropsBridge
  // listens for diffs and fans them out to peers.
  return (
    <BatchPropsBridge widgets={widgets}>
      {(bridgedPrimary) => (
        <PropGroupRenderer
          widget={bridgedPrimary}
          groups={groups}
          defaults={meta.defaultProps as Record<string, unknown>}
          searchQuery={searchQuery}
        />
      )}
    </BatchPropsBridge>
  )
}

/**
 * Intercept primary widget's `updateProps` and broadcast the patch
 * (computed as the diff between old and new props) to every other
 * widget in the selection.
 *
 * Approach: we render with the real primary, but override
 * `editor.updateProps` via a context layer. Because `useDashboardEditor`
 * returns the editor instance itself we can't easily override per-tree.
 * Instead we monkey-patch the primary's `id`-targeted updates by
 * subscribing to the document store: whenever primary's props change,
 * compute the diff and apply to the rest.
 *
 * That's racy across rapid edits, so a cleaner path is to expose a
 * `selectionUpdateProps` editor method. For Sprint 1 we use the
 * subscription approach which works fine for slider drags / setter
 * commits.
 */
function BatchPropsBridge({
  widgets,
  children,
}: {
  widgets: WidgetNode[]
  children: (primary: WidgetNode) => React.ReactNode
}) {
  const editor = useDashboardEditor()
  const primary = widgets[0]!
  const peerIds = React.useMemo(
    () => widgets.slice(1).map((w) => w.id),
    [widgets],
  )

  // Track primary's prev props so we can diff and broadcast. Also tracks
  // primary.id — when the selection changes the entire props object
  // looks "different" but it represents a different widget, so we must
  // skip the broadcast and just reseat the ref.
  const prevRef = React.useRef<{ id: string; props: typeof primary.props }>({
    id: primary.id,
    props: primary.props,
  })
  React.useEffect(() => {
    const prev = prevRef.current
    if (prev.id !== primary.id) {
      prevRef.current = { id: primary.id, props: primary.props }
      return
    }
    if (prev.props === primary.props) return
    const diff: Record<string, unknown> = {}
    for (const k of Object.keys(primary.props)) {
      if (!Object.is(prev.props?.[k], primary.props[k])) {
        diff[k] = primary.props[k]
      }
    }
    prevRef.current = { id: primary.id, props: primary.props }
    if (Object.keys(diff).length === 0) return
    for (const id of peerIds) {
      const peer = editor.getWidget(id)
      if (!peer) continue
      editor.updateProps(id, { ...peer.props, ...diff })
    }
  }, [primary, editor, peerIds])

  return <>{children(primary)}</>
}

// ── helpers ────────────────────────────────────────────────────────

/**
 * Pick groups for a specific tab. Top-level groups carrying no `tab`
 * default to `设计`. Aliases ('配置' / '样式') also map to `设计` so
 * the legacy widget configs render somewhere sensible.
 */
function resolveGroupsForTab(meta: WidgetMeta | undefined, tab: string): PropGroupDef[] {
  if (!meta) return []
  const groups = meta.propsGroups
  if (!groups || groups.length === 0) {
    return tab === '设计' ? groupsFromLegacy(meta.propsConfig) : []
  }
  return groups.filter((g) => {
    const t = g.tab ?? '设计'
    if (t === tab) return true
    if (tab === '设计' && (t === '配置' || t === '样式')) return true
    return false
  })
}

/**
 * Fallback: synthesise PropGroupDef[] from a flat propsConfig so widgets
 * that haven't migrated still render the new UI. Buckets by `section`
 * (or `tab`/`group`) name, falling back to one umbrella group.
 */
function groupsFromLegacy(cfg: PropConfig[] | undefined): PropGroupDef[] {
  if (!cfg || cfg.length === 0) return []
  const byBucket = new Map<string, PropConfig[]>()
  for (const c of cfg) {
    const key = c.section ?? c.tab ?? c.group ?? '属性'
    if (!byBucket.has(key)) byBucket.set(key, [])
    byBucket.get(key)!.push(c)
  }
  return Array.from(byBucket.entries()).map(([title, fields]) => ({
    key: `legacy-${title}`,
    title,
    fields,
  }))
}

function allEqual<T>(items: WidgetNode[], pick: (w: WidgetNode) => T): T | null {
  if (items.length === 0) return null
  const first = pick(items[0]!)
  for (let i = 1; i < items.length; i++) {
    if (pick(items[i]!) !== first) return null
  }
  return first
}
