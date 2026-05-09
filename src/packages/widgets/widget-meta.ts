import type * as React from 'react';
import type { z } from 'zod';
import type {
  Layout,
  ResizeInfo,
  Theme,
  WidgetNode,
} from '@schema/types';

/** Tab bucket for the property panel. Convention follows DataV. */
export type PropGroup = '配置' | '样式' | '数据' | '交互' | '动画' | string;

/**
 * Configuration for a single property field on the property panel.
 *
 * `path` is a dot/bracket path into `props` (e.g. 'series[0].color') and
 * `setter` references a SetterRegistry key.
 */
export interface PropConfig {
  /** Dot/bracket path into widget.props. */
  path: string;

  /** SetterRegistry key. */
  setter: string;

  label: string;
  description?: string;

  /** Forwarded to the setter component as `setterProps`. */
  setterProps?: Record<string, unknown>;

  /** Tab bucket. */
  group?: PropGroup;
  /** Collapsible section title within a group. */
  section?: string;

  /** Conditional visibility. Receives current props object. */
  visible?: (props: Record<string, unknown>) => boolean;
  /** Conditional read-only. */
  disabled?: (props: Record<string, unknown>) => boolean;

  /** Initial collapsed state when wrapped in a section. */
  collapsed?: boolean;
}

/** Capability flags advertised by the widget. */
export interface WidgetCapabilities {
  /** true | 'horizontal' | 'vertical' | false. Default true. */
  resizable?: boolean | 'horizontal' | 'vertical';
  rotatable?: boolean;
  /** Lock aspect ratio while resizing. */
  aspectRatio?: number | 'auto';
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
}

/** Data field declaration (drives the field-mapping setter). */
export interface WidgetDataField {
  /** Internal name used in mapping object keys (e.g. 'x', 'y', 'series'). */
  name: string;
  /** Display label. */
  label: string;
  /** Allowed source field types. */
  type: 'string' | 'number' | 'date' | 'boolean';
  required?: boolean;
}

export interface WidgetDataSchema {
  fields: WidgetDataField[];
  /** Whether the widget supports an arbitrary number of series. */
  multiSeries?: boolean;
}

/**
 * Props passed to a widget's render component. Pure: no editor reference,
 * no store reach-through. The container resolves and provides everything.
 */
export interface WidgetRenderProps<TProps = Record<string, unknown>> {
  node: WidgetNode;
  props: TProps;
  /** Already mapped + transformed. May be undefined when no binding / loading. */
  data: unknown;
  layout: Layout;
  theme: Theme | null;
  /** True in the designer; false in the runtime renderer. */
  designMode: boolean;
}

/**
 * Full description of a widget type. Registered into RegistryHub.widgets.
 *
 * The generic <TProps> is the shape of `WidgetNode.props` for this type.
 */
export interface WidgetMeta<TProps extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique registry key (e.g. 'bar-chart'). */
  type: string;
  version: string;
  category: string; // 'chart' | 'media' | 'text' | 'decoration' | ...
  title: string;
  description?: string;

  /** Material-library icon (left panel). */
  icon?: React.ComponentType<{ className?: string }>;
  /** Drag preview / library thumbnail. */
  thumbnail?: string;
  /** Search keywords. */
  tags?: string[];

  // Defaults applied when an instance is created via editor.addWidget().
  defaultProps: TProps;
  defaultLayout: { width: number; height: number };
  /** Optional: produce a default name e.g. ('柱状图 1'). */
  defaultName?: (existingCount: number) => string;

  /** zod schema for runtime validation of props. Optional. */
  propsSchema?: z.ZodType<TProps>;

  /** Property-panel field config, in display order. */
  propsConfig: PropConfig[];

  /** Optional data input schema for this widget. */
  dataSchema?: WidgetDataSchema;

  /** Render component (designer + runtime). */
  Component: React.ComponentType<WidgetRenderProps<TProps>>;
  /** Compact preview for the materials library (no data needed). */
  Preview?: React.ComponentType;

  // Lifecycle hooks
  onCreate?: (node: WidgetNode) => Partial<WidgetNode>;
  onResize?: (node: WidgetNode, info: ResizeInfo) => Partial<Layout>;
  onDataChange?: (node: WidgetNode, data: unknown) => void;

  capabilities?: WidgetCapabilities;
}
