import * as React from 'react';
import type { PropConfig, WidgetMeta } from '@widgets/widget-meta';
import type { WidgetNode } from '@schema/types';
import {
  useDashboardEditor,
  useDocumentState,
  useEditorState,
} from '../editor/editor-context';
import { selectWidget } from '../stores/selectors';
import { getByPath, setByPath } from '../setters/path-utils';

interface PropertyPanelProps {
  className?: string;
}

/**
 * Property panel — selection-driven, schema-driven.
 *
 * Resolves the selected widget(s), looks up its WidgetMeta in the registry,
 * and renders one Setter per PropConfig grouped into tabs. Changes commit
 * via `editor.updateProps` (undo-aware).
 */
/**
 * Root <aside> wrapper. Always flex-column with min-h-0 and overflow-hidden
 * so the inner scrollable form never pushes the panel past its parent's
 * height (which used to leak a scrollbar onto the viewport).
 */
const PanelRoot: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => (
  <aside
    className={`flex min-h-0 flex-col overflow-hidden ${className ?? ''}`}
  >
    {children}
  </aside>
);

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ className }) => {
  const editor = useDashboardEditor();
  const selectedIds = useEditorState((s) => s.selectedIds);
  const primaryId = useEditorState((s) => s.primarySelectionId);
  const widget = useDocumentState((s) =>
    primaryId ? selectWidget(primaryId)(s) ?? null : null,
  );

  if (selectedIds.length === 0) {
    return (
      <PanelRoot className={className}>
        <Empty hint="未选中组件" />
      </PanelRoot>
    );
  }
  if (selectedIds.length > 1) {
    return (
      <PanelRoot className={className}>
        <Empty hint={`已选中 ${selectedIds.length} 个组件\n（多选编辑暂未实现）`} />
      </PanelRoot>
    );
  }
  if (!widget) {
    return (
      <PanelRoot className={className}>
        <Empty hint="组件不存在" />
      </PanelRoot>
    );
  }

  const meta = editor.registry.widgets.get(widget.type) as
    | WidgetMeta
    | undefined;
  if (!meta) {
    return (
      <PanelRoot className={className}>
        <Empty hint={`未注册的组件类型: ${widget.type}`} />
      </PanelRoot>
    );
  }

  return (
    <PanelRoot className={className}>
      <Header widget={widget} />
      <PropertyForm widget={widget} meta={meta} />
    </PanelRoot>
  );
};

// ─────────────────────────────────────────────────────────────────────

const Empty: React.FC<{ hint: string }> = ({ hint }) => (
  <div className="flex flex-1 items-center justify-center whitespace-pre-wrap p-6 text-center text-xs text-muted-foreground">
    {hint}
  </div>
);

const Header: React.FC<{ widget: WidgetNode }> = ({ widget }) => {
  const editor = useDashboardEditor();
  const [name, setName] = React.useState(widget.name);
  React.useEffect(() => setName(widget.name), [widget.name]);

  return (
    <div className="shrink-0 border-b px-4 py-3">
      <input
        type="text"
        className="w-full bg-transparent text-sm font-medium focus:outline-none"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== widget.name) editor.renameWidget(widget.id, name);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      <p className="mt-1 text-xs text-muted-foreground">{widget.type}</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────

interface PropertyFormProps {
  widget: WidgetNode;
  meta: WidgetMeta;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ widget, meta }) => {
  const groups = React.useMemo(
    () => groupConfigs(meta.propsConfig),
    [meta.propsConfig],
  );
  const groupKeys = Object.keys(groups);
  const [activeGroup, setActiveGroup] = React.useState(
    groupKeys[0] ?? '配置',
  );

  if (groupKeys.length === 0) {
    return <Empty hint="该组件未声明可配置属性" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {groupKeys.length > 1 && (
        <div className="flex shrink-0 border-b">
          {groupKeys.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGroup(g)}
              className={`flex-1 px-3 py-2 text-xs transition ${
                activeGroup === g
                  ? 'border-b-2 border-primary font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {(groups[activeGroup] ?? []).map((cfg) => (
            <PropertyField key={cfg.path} widget={widget} cfg={cfg} />
          ))}
        </div>
      </div>
    </div>
  );
};

function groupConfigs(configs: PropConfig[]): Record<string, PropConfig[]> {
  const out: Record<string, PropConfig[]> = {};
  for (const c of configs) {
    const g = c.group ?? '配置';
    if (!out[g]) out[g] = [];
    out[g].push(c);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────

interface PropertyFieldProps {
  widget: WidgetNode;
  cfg: PropConfig;
}

const PropertyField: React.FC<PropertyFieldProps> = ({ widget, cfg }) => {
  const editor = useDashboardEditor();
  const setterDef = editor.registry.setters.get(cfg.setter);

  // Conditional visibility / disabled.
  const visible = cfg.visible ? cfg.visible(widget.props) : true;
  const disabled = cfg.disabled ? cfg.disabled(widget.props) : false;
  if (!visible) return null;

  if (!setterDef) {
    return (
      <Field label={cfg.label} description={cfg.description}>
        <span className="text-xs text-destructive">
          未注册的 setter: {cfg.setter}
        </span>
      </Field>
    );
  }

  const SetterComp = setterDef.component;
  const value = getByPath(widget.props, cfg.path);

  const handleChange = (next: unknown) => {
    const nextProps = setByPath(widget.props, cfg.path, next);
    editor.updateProps(widget.id, nextProps);
  };

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
  );
};

const Field: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div>
    <div className="mb-1 flex items-center justify-between">
      <label className="text-xs font-medium text-foreground">{label}</label>
    </div>
    {description && (
      <p className="mb-1 text-xs text-muted-foreground">{description}</p>
    )}
    {children}
  </div>
);
