import * as React from 'react';
import {
  Hand,
  MousePointer2,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  useDashboardEditor,
  useEditorState,
} from '../editor/editor-context';

interface ToolbarProps {
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ className }) => {
  const editor = useDashboardEditor();
  const tool = useEditorState((s) => s.tool);
  const scale = useEditorState((s) => s.camera.scale);

  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => editor.bus.on('history.applied', () => force()), [editor]);
  React.useEffect(() => editor.bus.on('history.undone', () => force()), [editor]);
  React.useEffect(() => editor.bus.on('history.redone', () => force()), [editor]);

  const Btn: React.FC<{
    active?: boolean;
    onClick?: () => void;
    title?: string;
    children: React.ReactNode;
    disabled?: boolean;
  }> = ({ active, onClick, title, children, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`grid h-8 w-8 place-items-center rounded transition disabled:opacity-30 ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div
      className={`flex h-12 items-center gap-1 border-b bg-card px-3 ${className ?? ''}`}
    >
      <div className="flex items-center gap-1">
        <Btn
          active={tool === 'select'}
          onClick={() => editor.setTool('select')}
          title="选择 (V)"
        >
          <MousePointer2 className="h-4 w-4" />
        </Btn>
        <Btn
          active={tool === 'pan'}
          onClick={() => editor.setTool('pan')}
          title="平移 (H)"
        >
          <Hand className="h-4 w-4" />
        </Btn>
      </div>

      <div className="mx-2 h-5 w-px bg-border" />

      <div className="flex items-center gap-1">
        <Btn
          onClick={() => editor.undo()}
          title="撤销 (Ctrl+Z)"
          disabled={!editor.canUndo()}
        >
          <Undo2 className="h-4 w-4" />
        </Btn>
        <Btn
          onClick={() => editor.redo()}
          title="重做 (Ctrl+Shift+Z)"
          disabled={!editor.canRedo()}
        >
          <Redo2 className="h-4 w-4" />
        </Btn>
      </div>

      <div className="mx-2 h-5 w-px bg-border" />

      <div className="flex items-center gap-1">
        <Btn onClick={() => editor.zoomBy(-0.1)} title="缩小">
          <ZoomOut className="h-4 w-4" />
        </Btn>
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <Btn onClick={() => editor.zoomBy(0.1)} title="放大">
          <ZoomIn className="h-4 w-4" />
        </Btn>
        <Btn onClick={() => editor.resetView()} title="100%">
          <RotateCcw className="h-4 w-4" />
        </Btn>
      </div>

      <div className="mx-2 h-5 w-px bg-border" />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => editor.save()}
          className="flex h-8 items-center gap-1.5 rounded bg-primary px-3 text-xs text-primary-foreground hover:opacity-90"
        >
          <Save className="h-3.5 w-3.5" />
          保存
        </button>
      </div>
    </div>
  );
};
