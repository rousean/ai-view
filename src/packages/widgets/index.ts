/**
 * @widgets — widget meta definitions and rendering components.
 *
 * This package owns the WidgetMeta interface and exports an array of
 * built-in widgets. The designer is responsible for taking that array
 * and registering each entry into its WidgetRegistry.
 */

export * from './widget-meta';

import type { WidgetMeta } from './widget-meta';

/**
 * Built-in widget collection. Each P-phase that adds a widget appends
 * to this array. Designer plugins (BuiltinWidgetsPlugin) iterate it.
 */
export const builtinWidgets: WidgetMeta[] = [
  // Populated in P5+
];
