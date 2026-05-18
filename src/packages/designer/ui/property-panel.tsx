import * as React from 'react'
import type { PropConfig, WidgetMeta } from '@widgets/widget-meta'
import type { WidgetNode } from '@schema/types'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useDashboardEditor, useDocumentState, useEditorState } from '../editor/editor-context'
import { selectWidget } from '../stores/selectors'
import { getByPath, setByPath } from '../setters/path-utils'

interface PropertyPanelProps {
  className?: string
}

/**
 * Selection-driven, schema-driven property panel.
 *
 * Resolves the selected widget, looks up its WidgetMeta in the registry,
 * groups propsConfig by tab and renders one Setter per field. Changes
 * commit via editor.updateProps (undo-aware via command pipeline).
 *
 * All chrome uses shadcn primitives (Tabs / ScrollArea / Input / Label)
 * so the panel inherits the project theme automatically.
 */

const PanelRoot: React.FC<{
  className?: string
  children: React.ReactNode
}> = ({ className, children }) => (
  <aside className={`flex min-h-0 flex-col overflow-hidden ${className ?? ''}`}>{children}</aside>
)

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ className }) => {
  const editor = useDashboardEditor()
  const selectedIds = useEditorState((s) => s.selectedIds)
  const primaryId = useEditorState((s) => s.primarySelectionId)
  const widget = useDocumentState((s) => (primaryId ? (selectWidget(primaryId)(s) ?? null) : null))

  if (selectedIds.length === 0) {
    return (
      <PanelRoot className={className}>
        <Empty hint="未选中组件" />
      </PanelRoot>
    )
  }
  if (selectedIds.length > 1) {
    return (
      <PanelRoot className={className}>
        <Empty hint={`已选中 ${selectedIds.length} 个组件\n（多选编辑暂未实现）`} />
      </PanelRoot>
    )
  }
  if (!widget) {
    return (
      <PanelRoot className={className}>
        <Empty hint="组件不存在" />
      </PanelRoot>
    )
  }

  const meta = editor.registry.widgets.get(widget.type) as WidgetMeta | undefined
  if (!meta) {
    return (
      <PanelRoot className={className}>
        <Empty hint={`未注册的组件类型: ${widget.type}`} />
      </PanelRoot>
    )
  }

  return (
    <PanelRoot className={className}>
      <Header widget={widget} />
      <PropertyForm widget={widget} meta={meta} />
    </PanelRoot>
  )
}

// ─────────────────────────────────────────────────────────────────────

const Empty: React.FC<{ hint: string }> = ({ hint }) => (
  <div className="flex flex-1 items-center justify-center whitespace-pre-wrap p-6 text-center text-xs text-muted-foreground">
    {hint}
  </div>
)

const Header: React.FC<{ widget: WidgetNode }> = ({ widget }) => {
  const editor = useDashboardEditor()
  const [name, setName] = React.useState(widget.name)
  React.useEffect(() => setName(widget.name), [widget.name])

  return (
    <div className="shrink-0 space-y-1 border-b px-4 py-3">
      <Input
        type="text"
        className="h-8 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== widget.name) editor.renameWidget(widget.id, name)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
      <p className="text-xs text-muted-foreground">{widget.type}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────

interface PropertyFormProps {
  widget: WidgetNode
  meta: WidgetMeta
}

const PropertyForm: React.FC<PropertyFormProps> = ({ widget, meta }) => {
  const groups = React.useMemo(() => groupConfigs(meta.propsConfig), [meta.propsConfig])
  const groupKeys = Object.keys(groups)
  const [activeGroup, setActiveGroup] = React.useState(groupKeys[0] ?? '配置')

  if (groupKeys.length === 0) {
    return <Empty hint="该组件未声明可配置属性" />
  }

  // Single group → skip the Tabs chrome entirely (just render the fields).
  if (groupKeys.length === 1) {
    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {(groups[groupKeys[0]] ?? []).map((cfg) => (
            <PropertyField key={cfg.path} widget={widget} cfg={cfg} />
          ))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <Tabs
      value={activeGroup}
      onValueChange={setActiveGroup}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <TabsList className="w-full shrink-0 rounded-none border-b bg-transparent p-0">
        {groupKeys.map((g) => (
          <TabsTrigger
            key={g}
            value={g}
            className="flex-1 rounded-none border-b-2 border-transparent bg-transparent text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {g}
          </TabsTrigger>
        ))}
      </TabsList>
      {groupKeys.map((g) => (
        <TabsContent key={g} value={g} className="m-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              {(groups[g] ?? []).map((cfg) => (
                <PropertyField key={cfg.path} widget={widget} cfg={cfg} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  )
}

function groupConfigs(configs: PropConfig[]): Record<string, PropConfig[]> {
  const out: Record<string, PropConfig[]> = {}
  for (const c of configs) {
    const g = c.group ?? '配置'
    if (!out[g]) out[g] = []
    out[g].push(c)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────

interface PropertyFieldProps {
  widget: WidgetNode
  cfg: PropConfig
}

const PropertyField: React.FC<PropertyFieldProps> = ({ widget, cfg }) => {
  const editor = useDashboardEditor()
  const setterDef = editor.registry.setters.get(cfg.setter)

  const visible = cfg.visible ? cfg.visible(widget.props) : true
  const disabled = cfg.disabled ? cfg.disabled(widget.props) : false
  if (!visible) return null

  if (!setterDef) {
    return (
      <Field label={cfg.label} description={cfg.description}>
        <span className="text-xs text-destructive">未注册的 setter: {cfg.setter}</span>
      </Field>
    )
  }

  const SetterComp = setterDef.component
  const value = getByPath(widget.props, cfg.path)

  const handleChange = (next: unknown) => {
    const nextProps = setByPath(widget.props, cfg.path, next)
    editor.updateProps(widget.id, nextProps)
  }

  return (
    <Field label={cfg.label} description={cfg.description}>
      <SetterComp
        value={value}
        onChange={handleChange}
        setterProps={cfg.setterProps}
        context={{ node: widget, editor }}
        disabled={disabled}
      />
    </Field>
  )
}

const Field: React.FC<{
  label: string
  description?: string
  children: React.ReactNode
}> = ({ label, description, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium">{label}</Label>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    {children}
  </div>
)
