import * as React from 'react'
import { ChevronDown, Lock, Trash2, Unlock } from 'lucide-react'
import type { Background } from '@schema/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { useDashboardEditor, useDocumentState, useEditorState } from '../../editor/editor-context'
import { DEFAULT_COLUMN_GRID } from '../../canvas/column-grid'
import { selectCurrentPage } from '../../stores/selectors'
import { DataSourcesPanel } from '../data-sources-panel'
import {
  ColorInput,
  NumInput,
  PropRow,
  PropSection,
  Segmented,
  Toggle,
} from '../property-controls'

/**
 * 画布 tab — page-level config: size, background, grid.
 *
 * Lifted verbatim from the legacy PropertyPanel so the page-level flow
 * stays unchanged when the user has nothing selected. (Long-term we'd
 * fold "background" into a richer setter, but the redesign focus is on
 * the widget-property side.)
 */
export function CanvasProps() {
  const editor = useDashboardEditor()
  const page = useDocumentState((s) => selectCurrentPage(s))
  const view = useEditorState((s) => s.view)
  if (!page) return null

  const cg = page.columnGrid ?? DEFAULT_COLUMN_GRID

  const bg = page.canvas.background
  const bgType = bg.type
  const startColor =
    bg.type === 'color'
      ? bg.color
      : bg.type === 'gradient'
        ? (bg.gradient.stops[0]?.color ?? '#ffffff')
        : '#ffffff'
  const endColor =
    bg.type === 'gradient'
      ? (bg.gradient.stops[bg.gradient.stops.length - 1]?.color ?? '#000000')
      : '#000000'
  const angle = bg.type === 'gradient' ? (bg.gradient.angle ?? 180) : 180

  const setBackground = (next: Background) =>
    editor.execute('canvas.setBackground', { background: next })

  return (
    <>
      <PropSection title="尺寸">
        <PropRow label="预设">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="border-border bg-background hover:bg-muted flex h-7 w-full cursor-pointer items-center justify-between rounded-sm border px-2 text-xs"
              >
                <span className="truncate">
                  {presetLabel(page.canvas.width, page.canvas.height)}
                </span>
                <ChevronDown size={12} className="text-muted-foreground/60 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {SIZE_PRESETS.map((p) => (
                <DropdownMenuItem
                  key={p.label}
                  onSelect={() => editor.setCanvasSize(p.w, p.h)}
                  className="justify-between gap-4"
                >
                  <span>{p.label}</span>
                  <span className="text-muted-foreground/60 tabular-nums">
                    {p.w}×{p.h}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </PropRow>
        <PropRow label="宽 × 高">
          <NumInput
            value={page.canvas.width}
            prefix="W"
            onChange={(w) => editor.setCanvasSize(w, page.canvas.height)}
          />
          <NumInput
            value={page.canvas.height}
            prefix="H"
            onChange={(h) => editor.setCanvasSize(page.canvas.width, h)}
          />
        </PropRow>
        <PropRow label="方向">
          <Segmented
            value={page.canvas.width >= page.canvas.height ? '横屏' : '竖屏'}
            onChange={(v) => {
              const isLandscape = page.canvas.width >= page.canvas.height
              if ((v === '横屏') !== isLandscape) editor.toggleOrientation()
            }}
            options={[
              { value: '横屏', label: '横屏' },
              { value: '竖屏', label: '竖屏' },
            ]}
          />
        </PropRow>
        <PropRow label="比例">
          <Segmented
            value={ratioOf(page.canvas.width, page.canvas.height)}
            onChange={(r) => {
              const presets: Record<string, [number, number]> = {
                '16:9': [1920, 1080],
                '21:9': [2560, 1080],
                '4:3': [1600, 1200],
              }
              const target = presets[r]
              if (target) editor.setCanvasSize(target[0], target[1])
            }}
            options={[
              { value: '16:9', label: '16:9' },
              { value: '21:9', label: '21:9' },
              { value: '4:3', label: '4:3' },
              { value: '自由', label: '自由' },
            ]}
          />
        </PropRow>
      </PropSection>

      <PropSection title="背景">
        <PropRow label="类型">
          <Segmented
            value={bgType === 'color' ? '纯色' : bgType === 'gradient' ? '渐变' : '图片'}
            onChange={(t) => {
              if (t === '纯色') setBackground({ type: 'color', color: startColor })
              else if (t === '渐变')
                setBackground({
                  type: 'gradient',
                  gradient: {
                    type: 'linear',
                    angle,
                    stops: [
                      { offset: 0, color: startColor },
                      { offset: 1, color: endColor },
                    ],
                  },
                })
              else setBackground({ type: 'image', assetId: '', fit: 'cover' })
            }}
            options={[
              { value: '纯色', label: '纯色' },
              { value: '渐变', label: '渐变' },
              { value: '图片', label: '图片' },
            ]}
          />
        </PropRow>
        {bgType === 'color' && (
          <PropRow label="颜色">
            <ColorInput
              value={startColor}
              onChange={(c) => setBackground({ type: 'color', color: c })}
            />
          </PropRow>
        )}
        {bgType === 'gradient' && (
          <>
            <PropRow label="起始色">
              <ColorInput
                value={startColor}
                onChange={(c) =>
                  setBackground({
                    type: 'gradient',
                    gradient: {
                      type: 'linear',
                      angle,
                      stops: [
                        { offset: 0, color: c },
                        { offset: 1, color: endColor },
                      ],
                    },
                  })
                }
              />
            </PropRow>
            <PropRow label="终止色">
              <ColorInput
                value={endColor}
                onChange={(c) =>
                  setBackground({
                    type: 'gradient',
                    gradient: {
                      type: 'linear',
                      angle,
                      stops: [
                        { offset: 0, color: startColor },
                        { offset: 1, color: c },
                      ],
                    },
                  })
                }
              />
            </PropRow>
            <PropRow label="角度">
              <NumInput
                value={angle}
                suffix="°"
                onChange={(a) =>
                  setBackground({
                    type: 'gradient',
                    gradient: {
                      type: 'linear',
                      angle: a,
                      stops: [
                        { offset: 0, color: startColor },
                        { offset: 1, color: endColor },
                      ],
                    },
                  })
                }
              />
            </PropRow>
          </>
        )}
      </PropSection>

      <PropSection title="栅格">
        <PropRow label="显示栅格">
          <Toggle on={page.grid.enabled} onChange={(on) => editor.setGrid({ enabled: on })} />
        </PropRow>
        <PropRow label="栅格尺寸">
          <NumInput
            value={page.grid.size}
            min={1}
            suffix="px"
            onChange={(n) => editor.setGrid({ size: Math.max(1, Math.round(n)) })}
          />
        </PropRow>
        <PropRow label="网格样式">
          <Segmented
            value={(page.grid.style ?? 'lines') === 'dots' ? '点阵' : '线框'}
            onChange={(v) => editor.setGrid({ style: v === '点阵' ? 'dots' : 'lines' })}
            options={[
              { value: '线框', label: '线框' },
              { value: '点阵', label: '点阵' },
            ]}
          />
        </PropRow>
        <PropRow label="对齐栅格">
          <Toggle on={view.snapToGrid} onChange={() => editor.toggleView('snapToGrid')} />
        </PropRow>
        <PropRow label="栅格颜色">
          <ColorInput
            value={page.grid.color ?? '#888888'}
            onChange={(c) => editor.setGrid({ color: c })}
          />
        </PropRow>
      </PropSection>

      <PropSection title="列栅格">
        <PropRow label="启用">
          <Toggle
            on={!!page.columnGrid?.enabled}
            onChange={(on) => editor.setColumnGrid({ enabled: on })}
          />
        </PropRow>
        <PropRow label="列数">
          <NumInput
            value={cg.columns}
            min={1}
            disabled={!page.columnGrid?.enabled}
            onChange={(n) => editor.setColumnGrid({ columns: Math.max(1, Math.round(n)) })}
          />
        </PropRow>
        <PropRow label="列间距">
          <NumInput
            value={cg.gutter}
            suffix="px"
            min={0}
            disabled={!page.columnGrid?.enabled}
            onChange={(n) => editor.setColumnGrid({ gutter: n })}
          />
        </PropRow>
        <PropRow label="外边距">
          <NumInput
            value={cg.margin}
            suffix="px"
            min={0}
            disabled={!page.columnGrid?.enabled}
            onChange={(n) => editor.setColumnGrid({ margin: n })}
          />
        </PropRow>
        <PropRow label="颜色">
          <ColorInput
            value={cg.color ?? '#7c3aed'}
            onChange={(c) => editor.setColumnGrid({ color: c })}
          />
        </PropRow>
      </PropSection>

      <PropSection title="安全区">
        <PropRow label="显示">
          <Toggle
            on={!!page.canvas.safeArea?.enabled}
            onChange={(on) =>
              editor.setSafeArea({ enabled: on, margin: page.canvas.safeArea?.margin ?? 60 })
            }
          />
        </PropRow>
        <PropRow label="边距">
          <NumInput
            value={page.canvas.safeArea?.margin ?? 60}
            suffix="px"
            min={0}
            disabled={!page.canvas.safeArea?.enabled}
            onChange={(m) =>
              editor.setSafeArea({ enabled: page.canvas.safeArea?.enabled ?? true, margin: m })
            }
          />
        </PropRow>
      </PropSection>

      <PropSection title="参考线">
        {page.guides.length === 0 ? (
          <div className="text-muted-foreground/60 px-3 py-2 text-[11px]">
            从标尺拖出，或双击标尺添加
          </div>
        ) : (
          <>
            {page.guides.map((g) => (
              <PropRow key={g.id} label={g.orientation === 'vertical' ? 'X' : 'Y'}>
                <NumInput
                  value={Math.round(g.position)}
                  disabled={g.locked}
                  onChange={(p) => editor.updateGuide(g.id, p)}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label={g.locked ? '解锁' : '锁定'}
                      onClick={() => editor.setGuideLocked(g.id, !g.locked)}
                    >
                      {g.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{g.locked ? '已锁定' : '锁定'}</TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground/60 hover:text-destructive shrink-0"
                  aria-label="删除参考线"
                  onClick={() => editor.removeGuide(g.id)}
                >
                  <Trash2 size={12} />
                </Button>
              </PropRow>
            ))}
            <div className="px-3 pt-1">
              <Button variant="ghost" size="xs" onClick={() => editor.clearGuides()}>
                清除全部
              </Button>
            </div>
          </>
        )}
      </PropSection>

      <PropSection title="数据源">
        <DataSourcesPanel />
      </PropSection>
    </>
  )
}

const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: '720P', w: 1280, h: 720 },
  { label: '1080P · FHD', w: 1920, h: 1080 },
  { label: '2K · QHD', w: 2560, h: 1440 },
  { label: '4K · UHD', w: 3840, h: 2160 },
  { label: '带鱼屏 · 21:9', w: 2560, h: 1080 },
  { label: '带鱼屏 · 2K', w: 3440, h: 1440 },
  { label: '竖屏 · 1080P', w: 1080, h: 1920 },
]

function presetLabel(w: number, h: number): string {
  const hit = SIZE_PRESETS.find((p) => p.w === w && p.h === h)
  return hit ? hit.label : `自定义 · ${Math.round(w)}×${Math.round(h)}`
}

function ratioOf(w: number, h: number): string {
  const r = w / h
  if (Math.abs(r - 16 / 9) < 0.02) return '16:9'
  if (Math.abs(r - 21 / 9) < 0.02) return '21:9'
  if (Math.abs(r - 4 / 3) < 0.02) return '4:3'
  return '自由'
}
