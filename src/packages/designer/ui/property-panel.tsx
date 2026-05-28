/**
 * Compatibility re-export. The PropertyPanel implementation lives in
 * `./property-panel/index.tsx` now (split into header / toolbar / tabs
 * for the redesign). This module preserves the legacy import path so
 * `EditorRoot` and external consumers keep working.
 */
export { PropertyPanel } from './property-panel/index'
