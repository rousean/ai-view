import * as React from 'react';
import { useDocumentState, useEditorState } from '../editor/editor-context';
import { selectCurrentPage } from '../stores/selectors';

/**
 * Two-tier line grid covering the artboard, ported from the legacy
 * `Gridding`. Thin "minor" lines every `grid.size` px, thicker "major"
 * lines every `MAJOR_EVERY * grid.size` px.
 *
 * Implemented with two stacked SVG `<pattern>`s so the browser tiles them
 * efficiently — no React work proportional to canvas dimensions.
 */
const MAJOR_EVERY = 5;

export const GridLayer: React.FC = () => {
  const page = useDocumentState((s) => selectCurrentPage(s));
  const showGrid = useEditorState((s) => s.view.showGrid);
  if (!page || !showGrid || !page.grid.enabled) return null;

  const { width, height } = page.canvas;
  const minor = page.grid.size;
  const major = minor * MAJOR_EVERY;
  // Colours come from theme tokens that ThemeStyleProvider has injected
  // onto a wrapping element. The fallback is a neutral mid-gray that
  // survives on both dark and light canvases — never assume a palette.
  // page.grid.color (if explicitly set on the document) takes precedence.
  const minorStroke =
    page.grid.color ?? 'var(--grid-color, rgba(127,127,127,0.18))';
  const majorStroke = `var(--grid-major-color, ${
    page.grid.color ?? 'rgba(127,127,127,0.32)'
  })`;

  // Unique IDs so multiple GridLayer instances (multi-page in the future)
  // don't clobber each other's pattern defs.
  const minorId = React.useId();
  const majorId = React.useId();

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <pattern
          id={minorId}
          width={minor}
          height={minor}
          patternUnits="userSpaceOnUse"
        >
          {/* L-shaped stroke at the cell's top + left so tiling makes a grid. */}
          <path
            d={`M ${minor} 0 L 0 0 L 0 ${minor}`}
            fill="none"
            stroke={minorStroke}
            strokeWidth={0.5}
          />
        </pattern>
        <pattern
          id={majorId}
          width={major}
          height={major}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${major} 0 L 0 0 L 0 ${major}`}
            fill="none"
            stroke={majorStroke}
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${minorId})`} />
      <rect width="100%" height="100%" fill={`url(#${majorId})`} />
    </svg>
  );
};
