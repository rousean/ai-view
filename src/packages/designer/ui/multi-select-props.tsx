import * as React from 'react'
import { Trash2 } from 'lucide-react'
import type { Layout, WidgetNode } from '@schema/types'
import { Button } from '~/components/ui/button'
import { unionBBox } from '../canvas/transformer/geometry'
import { useDashboardEditor, useDocumentState, useEditorState } from '../editor/editor-context'
import { selectCurrentPage } from '../stores/selectors'
import { NumInput, PropRow, PropSection } from './property-controls'

/**
 * Property panel surface for 2+ selected widgets.
 *
 * What it shows:
 *   - Header card: "已选中 N 个部件" + bulk delete
 *   - 位置和大小: union bbox X/Y are editable (translates the whole
 *     selection as a group); W/H are read-only (scaling a heterogeneous
 *     selection is a UX trap — defer until we have a dedicated transform
 *     handle interaction)
 *   - 旋转 / 不透明度: bulk-set across the selection; values that already
 *     agree across the selection render literally, mixed values show
 *     "—" placeholder until the user types one in
 *
 * Per-widget `props` editing is intentionally absent — even when the
 * selection is homogeneous we'd need to compute the intersection of
 * propsConfig.visible / .disabled, and that's its own task.
 */
export function MultiSelectProps() {
  const editor = useDashboardEditor()
  const selectedIds = useEditorState((s) => s.selectedIds)
  const widgets = useDocumentState((s) => {
    const page = selectCurrentPage(s)
    if (!page) return []
    const set = new Set(selectedIds)
    return page.widgets.filter((w) => set.has(w.id))
  })

  if (widgets.length < 2) return null

  const bb = unionBBox(widgets) ?? { x: 0, y: 0, width: 0, height: 0 }

  const commonRotate = allEqual(widgets, (w) => w.layout.rotate)
  const commonOpacity = allEqual(widgets, (w) => w.layout.opacity)

  // ── Bulk update helpers ───────────────────────────────────────────
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

  return (
    <>
      {/* Header card */}
      <div className="border-border flex items-center gap-2 border-b px-3 pt-2.5 pb-3">
        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded text-xs font-medium tabular-nums">
          {widgets.length}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">已选中 {widgets.length} 个部件</div>
          <div className="text-muted-foreground/80 text-[11px]">
            修改下方字段将应用到所有选中
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          aria-label="批量删除"
          onClick={() => editor.removeWidgets(selectedIds)}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Position / size — union bbox */}
      <PropSection title="位置和大小">
        <PropRow label="X / Y">
          <NumInput
            value={Math.round(bb.x)}
            prefix="X"
            onChange={(x) => translateAllTo(x, bb.y)}
          />
          <NumInput
            value={Math.round(bb.y)}
            prefix="Y"
            onChange={(y) => translateAllTo(bb.x, y)}
          />
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
        </PropRow>
        <PropRow label="不透明度">
          <NumInput
            value={commonOpacity !== null ? Math.round(commonOpacity * 100) : undefined}
            suffix="%"
            min={0}
            max={100}
            onChange={(p) => setOpacityAll(Math.max(0, Math.min(1, p / 100)))}
          />
        </PropRow>
      </PropSection>
    </>
  )
}

/** Returns the shared value if every widget has the same one, else null. */
function allEqual<T>(widgets: WidgetNode[], pick: (w: WidgetNode) => T): T | null {
  if (widgets.length === 0) return null
  const first = pick(widgets[0]!)
  for (let i = 1; i < widgets.length; i++) {
    if (pick(widgets[i]!) !== first) return null
  }
  return first
}
