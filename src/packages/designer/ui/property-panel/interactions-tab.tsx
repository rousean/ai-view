import * as React from 'react'
import { ArrowRight, ChevronDown, MousePointerClick, Plus, Trash2 } from 'lucide-react'
import type { EventBinding, WidgetNode } from '@schema/types'
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
import { useDashboardEditor } from '../../editor/editor-context'
import {
  BUILTIN_ACTIONS,
  BUILTIN_TRIGGERS,
  findAction,
  findTrigger,
  type ActionDef,
  type ParamFieldDef,
} from '../../interactions'
import { PropRow, PropSection } from '../property-controls'

/**
 * Replaces the Sprint-1 placeholder InteractionsTab. Renders an
 * EventBinding list with inline trigger / action pickers + a schema-
 * driven parameter form per action.
 *
 *   ┌ 交互（1）                                      [+ 添加] ┐
 *   │ ┌ ► [trigger ▾]  →  [action ▾]    [●enabled]  [🗑] ─┐    │
 *   │ │ url:    https://...                                │    │
 *   │ │ newTab: ●                                          │    │
 *   │ └────────────────────────────────────────────────────┘    │
 *   └──────────────────────────────────────────────────────────┘
 *
 * All writes go through `widget.setEvents` so undo behaves coherently.
 */
export function InteractionsTab({ widget }: { widget: WidgetNode }) {
  const editor = useDashboardEditor()
  const events = widget.events ?? []

  const updateEvents = React.useCallback(
    (next: EventBinding[]) => {
      editor.execute('widget.setEvents', { id: widget.id, events: next })
    },
    [editor, widget.id],
  )

  const addBinding = (trigger: string) => {
    const next: EventBinding = {
      id: createEventId(),
      trigger,
      action: { type: 'openUrl', params: defaultParams(findAction('openUrl')) },
      enabled: true,
    }
    updateEvents([...events, next])
  }

  return (
    <>
      <PropSection title={`事件绑定 · ${events.length}`}>
        <div className="px-3 pt-1 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="xs" className="w-full justify-center">
                <Plus size={12} />
                <span className="ml-1">添加事件绑定</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {BUILTIN_TRIGGERS.map((t) => (
                <DropdownMenuItem key={t.type} onSelect={() => addBinding(t.type)}>
                  <t.icon />
                  <span>{t.label}</span>
                  <span className="text-muted-foreground/60 ml-auto text-[10px]">
                    {t.type}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PropSection>

      {events.length === 0 ? (
        <div className="text-muted-foreground/70 px-6 py-6 text-center">
          <MousePointerClick size={20} className="text-muted-foreground/40 mx-auto mb-1.5" />
          <div className="text-[11px]">还没有交互。点击上方按钮添加。</div>
        </div>
      ) : (
        events.map((ev, idx) => (
          <BindingCard
            key={ev.id}
            binding={ev}
            hostWidget={widget}
            onChange={(patch) => {
              const next = events.slice()
              next[idx] = { ...next[idx]!, ...patch }
              updateEvents(next)
            }}
            onDelete={() => updateEvents(events.filter((e) => e.id !== ev.id))}
          />
        ))
      )}
    </>
  )
}

// ─── Single binding card ───────────────────────────────────────────

function BindingCard({
  binding,
  hostWidget,
  onChange,
  onDelete,
}: {
  binding: EventBinding
  hostWidget: WidgetNode
  onChange: (patch: Partial<EventBinding>) => void
  onDelete: () => void
}) {
  const trigger = findTrigger(binding.trigger)
  const action = findAction(binding.action.type)
  const [open, setOpen] = React.useState(true)

  const setTrigger = (next: string) => onChange({ trigger: next })
  const setAction = (next: string) => {
    const def = findAction(next)
    onChange({
      action: { type: next, params: defaultParams(def) },
    })
  }
  const setParam = (key: string, value: unknown) =>
    onChange({
      action: {
        type: binding.action.type,
        params: { ...binding.action.params, [key]: value },
      },
    })

  return (
    <div className="border-border/60 border-b">
      <div className="hover:bg-muted/40 flex items-center gap-1 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground/70 cursor-pointer"
          aria-label={open ? '折叠' : '展开'}
        >
          <ChevronDown
            size={12}
            className="transition-transform"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
        </button>
        {/* Trigger picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'bg-muted hover:bg-muted/80 flex h-6 cursor-pointer items-center gap-1 rounded-sm px-1.5 text-[11px]',
              )}
            >
              {trigger?.icon && <trigger.icon size={11} />}
              <span>{trigger?.label ?? binding.trigger}</span>
              <ChevronDown size={10} className="text-muted-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {BUILTIN_TRIGGERS.map((t) => (
              <DropdownMenuItem key={t.type} onSelect={() => setTrigger(t.type)}>
                <t.icon />
                <span>{t.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <ArrowRight size={10} className="text-muted-foreground/60" />
        {/* Action picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'bg-muted hover:bg-muted/80 flex h-6 min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-sm px-1.5 text-[11px]',
              )}
            >
              {action?.icon && <action.icon size={11} />}
              <span className="truncate">{action?.label ?? binding.action.type}</span>
              <ChevronDown size={10} className="text-muted-foreground/60 ml-auto shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {BUILTIN_ACTIONS.map((a) => (
              <DropdownMenuItem key={a.type} onSelect={() => setAction(a.type)}>
                <a.icon />
                <span>{a.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Switch
          size="sm"
          checked={binding.enabled}
          onCheckedChange={(v) => onChange({ enabled: v })}
          aria-label="启用此交互"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label="删除交互"
            >
              <Trash2 size={11} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>删除交互</TooltipContent>
        </Tooltip>
      </div>

      {open && action?.params && action.params.length > 0 && (
        <div className="pb-2">
          {action.params.map((p) => (
            <ParamRow
              key={p.key}
              field={p}
              value={binding.action.params[p.key]}
              onChange={(v) => setParam(p.key, v)}
              hostWidget={hostWidget}
            />
          ))}
          {action.description && (
            <div className="text-muted-foreground/60 px-3 pt-0.5 pb-1 text-[10px] italic">
              {action.description}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ParamRow({
  field,
  value,
  onChange,
  hostWidget,
}: {
  field: ParamFieldDef
  value: unknown
  onChange: (v: unknown) => void
  /** The widget the interaction binding lives on — passed via context so
   *  setters like WidgetSelector can grey it out (you rarely want to
   *  target your own widget). */
  hostWidget: WidgetNode
}) {
  const editor = useDashboardEditor()
  const setterDef = editor.registry.setters.get(field.setter)
  if (!setterDef) {
    return (
      <PropRow label={field.label}>
        <span className="text-destructive text-[11px]">未注册 setter: {field.setter}</span>
      </PropRow>
    )
  }
  const SetterComp = setterDef.component
  return (
    <PropRow label={field.label}>
      <SetterComp
        value={value}
        onChange={onChange}
        setterProps={field.setterProps}
        context={{ node: hostWidget, editor }}
      />
    </PropRow>
  )
}

/** Pre-populate an action's params bag with its declared defaults. */
function defaultParams(def: ActionDef | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const p of def?.params ?? []) {
    if (p.defaultValue !== undefined) out[p.key] = p.defaultValue
  }
  return out
}

/**
 * Generate a stable-enough id for a fresh EventBinding. Pulled to the
 * top level so the impure `Date.now()` / `Math.random()` calls don't
 * trip the react-hooks/purity rule when colocated with component code.
 */
function createEventId(): string {
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}
