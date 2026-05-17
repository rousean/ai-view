import * as React from 'react';
import {
  builtinWidgets,
  type WidgetMeta,
} from '@widgets/index';
import {
  LocalStoragePersistence,
  createEmptyProject,
  type PersistenceAdapter,
  type Project,
} from '@schema/index';
import { CanvasViewport } from '../canvas/canvas-viewport';
import { DashboardEditor } from '../editor/dashboard-editor';
import { EditorProvider } from '../editor/editor-context';
import { registerBuiltinSetters } from '../setters';
import { registerBuiltinTools } from '../tools';
import { MaterialsPanel } from './materials-panel';
import { PropertyPanel } from './property-panel';
import { ThemeStyleProvider } from './theme-style-provider';
import { Toolbar } from './toolbar';

interface EditorRootProps {
  /** Persistence adapter. Defaults to LocalStoragePersistence. */
  adapter?: PersistenceAdapter;
  /** Project id to load. If omitted, creates a brand-new project in memory. */
  projectId?: string;
  className?: string;
}

/**
 * Convenience root component — instantiates a DashboardEditor with built-in
 * widgets, setters, and tools registered, then renders the standard
 * three-pane layout.
 */
export const EditorRoot: React.FC<EditorRootProps> = ({
  adapter,
  projectId,
  className,
}) => {
  const [editor, setEditor] = React.useState<DashboardEditor | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const _adapter = adapter ?? new LocalStoragePersistence();
    const ed = new DashboardEditor({ adapter: _adapter });

    // Register built-ins.
    for (const meta of builtinWidgets) {
      ed.registry.widgets.register(meta as unknown as { type: string });
    }
    registerBuiltinSetters(ed.registry.setters);
    registerBuiltinTools(ed.registry.tools);

    void (async () => {
      try {
        if (projectId) {
          await ed.load(projectId);
        } else {
          const project: Project = createEmptyProject({ name: '新建大屏' });
          await ed.loadFromProject(project);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
        return;
      }
      if (!cancelled) setEditor(ed);
    })();

    return () => {
      cancelled = true;
      void ed.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        加载失败：{error}
      </div>
    );
  }
  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        正在初始化设计器…
      </div>
    );
  }

  return (
    <EditorProvider editor={editor}>
      <ThemeStyleProvider className={`flex h-full flex-col ${className ?? ''}`}>
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <MaterialsPanel className="w-64 shrink-0" />
          <main className="relative flex-1 min-w-0">
            <CanvasViewport />
          </main>
          <PropertyPanel className="w-72 shrink-0 border-l bg-card" />
        </div>
      </ThemeStyleProvider>
    </EditorProvider>
  );
};

void (null as unknown as WidgetMeta);
