import * as React from 'react';
import { useEditorStore } from '../stores/editor-store';

/**
 * Horizontal/vertical rulers that line up with the canvas viewport.
 *
 * Ported from the original `coordinate.tsx`. Ticks are computed in
 * canvas-space and projected to screen pixels using the live camera.
 *
 * Subscribes to `editorStore.camera` so the labels update on pan/zoom.
 * Render this OUTSIDE the camera-transformed layer.
 */

const RULER_THICKNESS = 20;

function getTickStep(scale: number, minPixelStep = 8): number {
  return getNiceStep(minPixelStep / scale);
}

function getNiceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(rawStep));
  const base = 10 ** exponent;
  const normalized = rawStep / base;
  if (normalized <= 1) return base;
  if (normalized <= 2) return 2 * base;
  if (normalized <= 5) return 5 * base;
  return 10 * base;
}

function getVisibleTicks(start: number, end: number, step = 10): number[] {
  const first = Math.floor(start / step) * step;
  const ticks: number[] = [];
  for (let t = first; t <= end; t += step) ticks.push(t);
  return ticks;
}

function isMajorTick(value: number, tickStep = 10): boolean {
  const majorStep = tickStep * 10;
  return Math.abs(value / majorStep - Math.round(value / majorStep)) < 1e-6;
}

interface AxisProps {
  width: number;
  height: number;
}

export const AxisX: React.FC<AxisProps> = ({ width, height = RULER_THICKNESS }) => {
  const camera = useEditorStore((s) => s.camera);
  const { x, scale } = camera;
  const left = -x / scale;
  const right = left + width / scale;
  const tickStep = getTickStep(scale);
  const xTicks = React.useMemo(
    () => getVisibleTicks(left, right, tickStep),
    [left, right, tickStep],
  );

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g fill="currentColor">
        <line
          x1={0}
          y1={height}
          x2={width}
          y2={height}
          stroke="currentColor"
          strokeWidth={0.5}
        />
        {xTicks.map((tick) => {
          const X = (tick - left) * scale;
          if (X < 0 || X > width) return null;
          const major = isMajorTick(tick, tickStep);
          return (
            <g key={`x-${tick}`}>
              <line
                x1={X}
                y1={height}
                x2={X}
                y2={height - (major ? 6 : 3)}
                stroke="currentColor"
                strokeWidth={0.5}
              />
              {major && (
                <text
                  x={X + 6}
                  y={height - 12}
                  fontSize={10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {Math.round(tick)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export const AxisY: React.FC<AxisProps> = ({ width = RULER_THICKNESS, height }) => {
  const camera = useEditorStore((s) => s.camera);
  const { y, scale } = camera;
  const top = -y / scale;
  const bottom = top + height / scale;
  const tickStep = getTickStep(scale);
  const yTicks = React.useMemo(
    () => getVisibleTicks(top, bottom, tickStep),
    [top, bottom, tickStep],
  );

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g fill="currentColor">
        <line
          x1={width}
          y1={0}
          x2={width}
          y2={height}
          stroke="currentColor"
          strokeWidth={0.5}
        />
        {yTicks.map((tick) => {
          const Y = (tick - top) * scale;
          if (Y < 0 || Y > height) return null;
          const major = isMajorTick(tick, tickStep);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={width}
                y1={Y}
                x2={width - (major ? 6 : 3)}
                y2={Y}
                stroke="currentColor"
                strokeWidth={0.5}
              />
              {major && (
                <text
                  x={width - 12}
                  y={Y + 6}
                  fontSize={10}
                  writingMode="tb"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {Math.round(tick)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export const RULER_SIZE = RULER_THICKNESS;
