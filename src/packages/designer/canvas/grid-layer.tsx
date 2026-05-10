import * as React from 'react';
import { useDocumentState, useEditorState } from '../editor/editor-context';
import { selectCurrentPage } from '../stores/selectors';

/** Subtle SVG dot grid covering the artboard. Cheap; CSS background works too. */
export const GridLayer: React.FC = () => {
  const page = useDocumentState((s) => selectCurrentPage(s));
  const showGrid = useEditorState((s) => s.view.showGrid);
  if (!page || !showGrid || !page.grid.enabled) return null;

  const size = page.grid.size;
  const color = page.grid.color ?? 'rgba(255,255,255,0.06)';
  return (
    <svg
      width={page.canvas.width}
      height={page.canvas.height}
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
    >
      <defs>
        <pattern
          id="grid-pattern"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={0} cy={0} r={1} fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
};
