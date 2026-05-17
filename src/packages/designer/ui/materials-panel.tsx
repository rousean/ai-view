import * as React from 'react';
import { ChartBar } from 'lucide-react';
import { Feedback } from '@dnd-kit/dom';
import { useDraggable } from '@dnd-kit/react';
import type { WidgetMeta } from '@widgets/widget-meta';
import { useDashboardEditor } from '../editor/editor-context';

interface MaterialsPanelProps {
  className?: string;
}

/**
 * Left panel — lists registered widget metas grouped by category.
 *
 * Each card is a `useDraggable` source with type='materials' and the
 * meta object as its payload. The actual drop handler lives in
 * EditorRoot (via DragDropProvider); the canvas registers itself as a
 * droppable with id='canvas'.
 *
 * No onClick — only drag works. Mirrors the legacy editor's UX.
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
                  <MaterialCard key={meta.type} meta={meta} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────

const MaterialCard: React.FC<{ meta: WidgetMeta }> = ({ meta }) => {
  // Stable id per card instance.
  const id = React.useId();
  const { ref } = useDraggable({
    id,
    type: 'materials',
    data: meta,
    // Feedback: while dragging, render a clone that follows the cursor.
    // Disabling dropAnimation keeps the drop snappy.
    plugins: [Feedback.configure({ feedback: 'clone', dropAnimation: null })],
  });

  return (
    <div
      ref={ref}
      title={meta.description ?? meta.title}
      className="group flex cursor-grab flex-col items-center gap-1 rounded border bg-background p-2 transition hover:border-primary hover:bg-accent active:cursor-grabbing"
    >
      <div className="flex h-12 w-full items-center justify-center rounded bg-muted/50 text-muted-foreground group-hover:text-foreground">
        {meta.icon ? <meta.icon className="h-6 w-6" /> : <ChartBar className="h-6 w-6" />}
      </div>
      <span className="text-xs">{meta.title}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────

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
