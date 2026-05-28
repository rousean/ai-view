import * as React from 'react'
import { ChevronDown, Play, PlayCircle, RefreshCw } from 'lucide-react'
import type { AnimationConfig, WidgetNode } from '@schema/types'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Switch } from '~/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import {
  BUILTIN_EASINGS,
  BUILTIN_ENTER_ANIMATIONS,
  DEFAULT_ENTER_ANIMATION,
  DEFAULT_UPDATE_ANIMATION,
  findEasing,
  findEnterAnimation,
} from '../../animations'
import { useDashboardEditor } from '../../editor/editor-context'
import { useRuntimeStore } from '../../stores/runtime-store'
import { NumInput, PropRow, PropSection } from '../property-controls'

/**
 * 动画 Tab — replaces the Sprint-1 placeholder.
 *
 *   ┌ 入场动画                       [●]                ┐
 *   │ 类型    [淡入 ▾]                                  │
 *   │ 时长    600 ms                                    │
 *   │ 延迟    0   ms                                    │
 *   │ 缓动    [Ease-Out ▾]                              │
 *   │ [▶ 预览]                                          │
 *   ├──────────────────────────────────────────────────┤
 *   │ 数据更新                       [●]                │
 *   │ 时长    400 ms                                    │
 *   └──────────────────────────────────────────────────┘
 *
 * Persists via `widget.setAnimation` so undo behaves naturally. The
 * preview button bumps a runtime token; WidgetContainer keys off it
 * to re-mount and replay the keyframe.
 */
export function AnimationsTab({ widget }: { widget: WidgetNode }) {
  const editor = useDashboardEditor()
  const bumpPreview = useRuntimeStore((s) => s.actions.bumpAnimationPreview)

  const animation = widget.animation
  const enter = animation?.enter
  const update = animation?.update

  const setAnimation = (next: AnimationConfig | undefined) => {
    editor.execute('widget.setAnimation', { id: widget.id, animation: next })
  }

  // ── Enter animation toggle/edit handlers ────────────────────────
  const enterEnabled = !!enter
  const toggleEnter = (on: boolean) => {
    if (on) {
      setAnimation({
        ...animation,
        enter: { type: 'fade', ...DEFAULT_ENTER_ANIMATION },
      })
    } else {
      const next: AnimationConfig | undefined = update
        ? { update }
        : undefined
      setAnimation(next)
    }
  }
  const patchEnter = (patch: Partial<NonNullable<AnimationConfig['enter']>>) => {
    if (!enter) return
    setAnimation({ ...animation, enter: { ...enter, ...patch } })
  }

  // ── Update animation toggle ──────────────────────────────────────
  const updateEnabled = !!update
  const toggleUpdate = (on: boolean) => {
    if (on) {
      setAnimation({
        ...animation,
        update: { type: 'fade', ...DEFAULT_UPDATE_ANIMATION },
      })
    } else {
      const next: AnimationConfig | undefined = enter ? { enter } : undefined
      setAnimation(next)
    }
  }
  const patchUpdate = (patch: Partial<NonNullable<AnimationConfig['update']>>) => {
    if (!update) return
    setAnimation({ ...animation, update: { ...update, ...patch } })
  }

  const handlePreview = () => bumpPreview(widget.id)

  // ── Render helpers for enum dropdowns ────────────────────────────
  const enterMeta = enter ? findEnterAnimation(enter.type) : undefined
  const enterEasingMeta = enter ? findEasing(enter.easing) : undefined

  return (
    <>
      {/* Enter animation */}
      <SectionHeader
        title="入场动画"
        icon={PlayCircle}
        checked={enterEnabled}
        onCheckedChange={toggleEnter}
      />
      {enterEnabled && enter && (
        <div className="border-border/60 border-b">
          <PropRow label="类型">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  className="min-w-0 flex-1 justify-between text-[11px]"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {enterMeta?.icon && <enterMeta.icon />}
                    <span className="truncate">{enterMeta?.label ?? enter.type}</span>
                  </span>
                  <ChevronDown className="text-muted-foreground/80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {BUILTIN_ENTER_ANIMATIONS.map((a) => (
                  <DropdownMenuItem key={a.type} onSelect={() => patchEnter({ type: a.type })}>
                    <a.icon />
                    <span>{a.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </PropRow>
          <PropRow label="时长">
            <NumInput
              value={enter.duration}
              suffix="ms"
              min={50}
              max={5000}
              step={50}
              onChange={(n) => patchEnter({ duration: n })}
            />
          </PropRow>
          <PropRow label="延迟">
            <NumInput
              value={enter.delay}
              suffix="ms"
              min={0}
              max={5000}
              step={50}
              onChange={(n) => patchEnter({ delay: n })}
            />
          </PropRow>
          <PropRow label="缓动">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  className="min-w-0 flex-1 justify-between text-[11px]"
                >
                  <span className="truncate">{enterEasingMeta?.label ?? enter.easing}</span>
                  <ChevronDown className="text-muted-foreground/80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {BUILTIN_EASINGS.map((e) => (
                  <DropdownMenuItem key={e.value} onSelect={() => patchEnter({ easing: e.value })}>
                    {e.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </PropRow>
          <div className="px-3 pt-1 pb-2">
            <Button
              variant="outline"
              size="xs"
              onClick={handlePreview}
              className="w-full justify-center"
            >
              <Play size={11} />
              <span className="ml-1">预览动画</span>
            </Button>
            <div className="text-muted-foreground/60 mt-1 text-center text-[10px]">
              动画在画布上重放，运行时按此配置触发
            </div>
          </div>
        </div>
      )}

      {/* Update animation */}
      <SectionHeader
        title="数据更新过渡"
        icon={RefreshCw}
        checked={updateEnabled}
        onCheckedChange={toggleUpdate}
      />
      {updateEnabled && update && (
        <div>
          <PropRow label="时长">
            <NumInput
              value={update.duration}
              suffix="ms"
              min={50}
              max={3000}
              step={50}
              onChange={(n) => patchUpdate({ duration: n })}
            />
          </PropRow>
          <div className="text-muted-foreground/60 px-3 pt-0.5 pb-2 text-[10px] italic">
            数据更新时的过渡时长（ECharts 等图表的 animationDurationUpdate）
          </div>
        </div>
      )}

      {!enterEnabled && !updateEnabled && (
        <div className="text-muted-foreground/70 px-6 py-6 text-center">
          <PlayCircle size={20} className="text-muted-foreground/40 mx-auto mb-1.5" />
          <div className="text-[11px]">尚未配置动画。打开上方任一开关启用。</div>
        </div>
      )}
    </>
  )
}

// ─── Section header — title + master switch ─────────────────────────

function SectionHeader({
  title,
  icon: Icon,
  checked,
  onCheckedChange,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  checked: boolean
  onCheckedChange: (next: boolean) => void
}) {
  return (
    <div
      className={cn(
        'border-border/60 hover:bg-muted/40 flex items-center gap-1.5 border-b px-3 py-2',
      )}
    >
      <Icon size={12} className="text-foreground/80 shrink-0" />
      <span className="text-foreground/85 flex-1 text-[12px] font-medium">{title}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Switch size="sm" checked={checked} onCheckedChange={onCheckedChange} />
        </TooltipTrigger>
        <TooltipContent>{checked ? '禁用' : '启用'} {title}</TooltipContent>
      </Tooltip>
    </div>
  )
}

// Pull in PropSection's vertical rhythm without rendering its chevron
// — needed because the animations tab doesn't want collapsible sections,
// it wants always-visible sections gated by switches.
void PropSection
