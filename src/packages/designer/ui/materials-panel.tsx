import * as React from 'react';
import { ChartBar } from 'lucide-react';
import { Feedback } from '@dnd-kit/dom';
import { useDraggable } from '@dnd-kit/react';
import type { WidgetMeta } from '@widgets/widget-meta';
import { ScrollArea } from '~/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip';
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
 * All chrome (scrolling, hover state, tooltip) is shadcn-driven.
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
  const groupKeys = Object.keys(grouped);

  return (
    <aside
      className={`flex min-h-0 flex-col overflow-hidden border-r bg-card ${className ?? ''}`}
    >
      <div className="shrink-0 border-b px-4 py-3 text-sm font-medium">
        组件库
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {groupKeys.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              暂无组件
            </p>
          ) : (
            groupKeys.map((cat) => (
              <div key={cat} className="mb-4 last:mb-0">
                <h4 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {categoryLabel(cat)}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {grouped[cat].map((meta) => (
                    <MaterialCard key={meta.type} meta={meta} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────

const MaterialCard: React.FC<{ meta: WidgetMeta }> = ({ meta }) => {
  const id = React.useId();
  const { ref } = useDraggable({
    id,
    type: 'materials',
    data: meta,
    plugins: [Feedback.configure({ feedback: 'clone', dropAnimation: null })],
  });

  // Note: we hand-roll the card shell rather than using <Card> because the
  // dnd-kit draggable expects a ref on a single concrete element, and the
  // Card primitive renders its own data-slot wrapping that complicates ref
  // forwarding. Styling matches shadcn's outline-button look so it feels
  // native to the theme.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={ref}
          className="group flex cursor-grab flex-col items-center gap-1 rounded-md border border-border bg-background p-2 transition-colors hover:border-primary hover:bg-accent active:cursor-grabbing"
        >
          <div className="flex h-12 w-full items-center justify-center rounded bg-muted/50 text-muted-foreground group-hover:text-foreground">
            {meta.icon ? (
              <meta.icon className="h-6 w-6" />
            ) : (
              <ChartBar className="h-6 w-6" />
            )}
          </div>
          <span className="text-xs">{meta.title}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        {meta.description ?? meta.title}
      </TooltipContent>
    </Tooltip>
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
