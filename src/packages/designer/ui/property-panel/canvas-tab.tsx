import * as React from 'react'
import type { Background } from '@schema/types'
import { useDashboardEditor, useDocumentState } from '../../editor/editor-context'
import { selectCurrentPage } from '../../stores/selectors'
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
  if (!page) return null

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
        <PropRow label="宽 × 高">
          <NumInput
            value={page.canvas.width}
            onChange={(w) => editor.setCanvasSize(w, page.canvas.height)}
          />
          <span className="text-muted-foreground/60">×</span>
          <NumInput
            value={page.canvas.height}
            onChange={(h) => editor.setCanvasSize(page.canvas.width, h)}
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
            suffix="px"
            onChange={(n) => editor.setGrid({ size: n })}
          />
        </PropRow>
        <PropRow label="对齐栅格">
          <Toggle on={page.grid.snap} onChange={(on) => editor.setGrid({ snap: on })} />
        </PropRow>
      </PropSection>
    </>
  )
}

function ratioOf(w: number, h: number): string {
  const r = w / h
  if (Math.abs(r - 16 / 9) < 0.02) return '16:9'
  if (Math.abs(r - 21 / 9) < 0.02) return '21:9'
  if (Math.abs(r - 4 / 3) < 0.02) return '4:3'
  return '自由'
}
