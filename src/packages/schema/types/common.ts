/** Geometric primitives in canvas (logical) coordinate space. */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Oriented bounding box (used by HitTest for rotated widgets). */
export interface OBB {
  center: Point;
  size: Size;
  /** rotation in degrees */
  angle: number;
}

/** Camera state — design-time viewport. Not persisted in document by default. */
export interface Camera {
  x: number;
  y: number;
  scale: number;
}

/** Linear or radial gradient. */
export interface GradientConfig {
  type: 'linear' | 'radial';
  /** angle in degrees (linear only) */
  angle?: number;
  stops: Array<{ offset: number; color: string }>;
}

/** Page background union. */
export type Background =
  | { type: 'color'; color: string }
  | { type: 'gradient'; gradient: GradientConfig }
  | { type: 'image'; assetId: string; fit: 'cover' | 'contain' | 'fill' }
  | { type: 'transparent' };
