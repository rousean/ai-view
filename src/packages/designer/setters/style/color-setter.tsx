import * as React from 'react';
import type { SetterProps } from '../setter.interface';

interface ColorSetterProps {
  /** Show alpha channel (currently unused — native picker is rgb-only). */
  showAlpha?: boolean;
  /** Preset swatches displayed alongside the picker. */
  presets?: string[];
}

const DEFAULT_PRESETS = [
  '#5b8def',
  '#22d3ee',
  '#34d399',
  '#fbbf24',
  '#f97316',
  '#f472b6',
  '#a78bfa',
  '#0b1220',
  '#e6edf6',
  '#ffffff',
];

export const ColorSetter: React.FC<SetterProps<string>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as ColorSetterProps;
  const v = typeof value === 'string' && value.length > 0 ? value : '#ffffff';
  const presets = opts.presets ?? DEFAULT_PRESETS;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-8 w-12 cursor-pointer rounded border border-input bg-background disabled:opacity-50"
          value={v}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs uppercase focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          value={v}
          disabled={disabled}
          onChange={(e) => {
            const s = e.target.value.trim();
            if (/^#[0-9a-fA-F]{3,8}$/.test(s)) onChange(s);
            else if (s === '') onChange('');
          }}
        />
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {presets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className="h-5 w-5 rounded border border-border ring-1 ring-inset ring-black/5 transition hover:scale-110"
              style={{ backgroundColor: c }}
              aria-label={c}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};
