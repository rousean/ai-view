import * as React from 'react';
import { ChartBar } from 'lucide-react';
import type { WidgetMeta } from '@widgets/widget-meta';
import { useDashboardEditor } from '../editor/editor-context';

interface MaterialsPanelProps {
  className?: string;
}

/**
 * Left panel — lists registered widget metas grouped by category. Click
 * a card to switch to PlaceTool with that widget queued; subsequent
 * canvas click drops the widget.
 */
export const MaterialsPanel: React.FC<MaterialsPanelProps> = ({
  className,
}) => {
  const editor = useDashboardEditor();
  const [, force] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    return editor.registry.widgets.subscribe(() => force());
  }, [editor]);

  const all = editor.registry.widgets.list() as unknown as WidgetMeta[];
  const grouped = React.useMemo(() => groupByCategory(all), [all]);

  const handlePick = (meta: WidgetMeta) => {
    // Quick add at canvas center (zero camera offset → canvas 0,0 area).
    const page = editor.getCurrentPage();
    const cx = page ? page.canvas.width / 2 - meta.defaultLayout.width / 2 : 0;
    const cy = page ? page.canvas.height / 2 - meta.defaultLayout.height / 2 : 0;
    editor.addWidget(meta.type, {
      position: { x: cx, y: cy },
      size: meta.defaultLayout,
      props: meta.defaultProps as Record<string, unknown>,
    });
  };

  return (
    <aside className={`flex flex-col border-r bg-card ${className ?? ''}`}>
      <div className="border-b px-4 py-3 text-sm font-medium">组件库</div>
      <div className="flex-1 overflow-y-auto p-3">
        {Object.keys(grouped).length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            暂无组件
          </p>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-4">
              <h4 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {categoryLabel(cat)}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {items.map((meta) => (
                  <button
                    key={meta.type}
                    type="button"
                    onClick={() => handlePick(meta)}
                    className="group flex flex-col items-center gap-1 rounded border bg-background p-2 transition hover:border-primary hover:bg-accent"
                    title={meta.description ?? meta.title}
                  >
                    <div className="flex h-12 w-full items-center justify-center rounded bg-muted/50 text-muted-foreground group-hover:text-foreground">
                      {meta.icon ? (
                        <meta.icon className="h-6 w-6" />
                      ) : (
                        <ChartBar className="h-6 w-6" />
                      )}
                    </div>
                    <span className="text-xs">{meta.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

function groupByCategory(items: WidgetMeta[]): Record<string, WidgetMeta[]> {
  const out: Record<string, WidgetMeta[]> = {};
  for (const m of items) {
    const c = m.category ?? 'other';
    if (!out[c]) out[c] = [];
    out[c].push(m);
  }
  return out;
}

function categoryLabel(c: string): string {
  return (
    {
      chart: '图表',
      media: '媒体',
      text: '文字',
      decoration: '装饰',
      container: '容器',
      other: '其他',
    }[c] ?? c
  );
}
