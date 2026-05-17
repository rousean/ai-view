import * as React from 'react';
import { useDocumentState } from '../editor/editor-context';
import { selectCurrentTheme } from '../stores/selectors';

interface ThemeStyleProviderProps {
  children: React.ReactNode;
  /** Optional extra className for the wrapper div. */
  className?: string;
  /** Style merged onto the wrapper after theme tokens. */
  style?: React.CSSProperties;
}

/**
 * Inject the current theme's tokens as CSS custom properties on a wrapper
 * div. Any descendant can then `color: var(--grid-color)` etc. — switching
 * themes is just a state update; no component needs to re-resolve colours
 * imperatively.
 *
 * Reads tokens from documentStore via selectCurrentTheme so it always
 * matches the active project (page overrides included).
 */
export const ThemeStyleProvider: React.FC<ThemeStyleProviderProps> = ({
  children,
  className,
  style,
}) => {
  const theme = useDocumentState((s) => selectCurrentTheme(s));

  const tokenStyle = React.useMemo<React.CSSProperties>(() => {
    if (!theme) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(theme.tokens)) {
      // Honour the convention: theme tokens already start with `--`.
      out[k.startsWith('--') ? k : `--${k}`] = v;
    }
    return out as React.CSSProperties;
  }, [theme]);

  return (
    <div className={className} style={{ ...tokenStyle, ...style }}>
      {children}
    </div>
  );
};
