import * as React from 'react';
import type { SetterProps } from '../setter.interface';

interface SliderSetterProps {
  min?: number;
  max?: number;
  step?: number;
  /** Show numeric input alongside the slider. */
  showInput?: boolean;
  unit?: string;
}

export const SliderSetter: React.FC<SetterProps<number>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as SliderSetterProps;
  const min = opts.min ?? 0;
  const max = opts.max ?? 100;
  const step = opts.step ?? 1;
  const v = typeof value === 'number' ? value : min;

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        className="flex-1 accent-primary disabled:opacity-50"
        min={min}
        max={max}
        step={step}
        value={v}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {opts.showInput !== false && (
        <input
          type="number"
          className="w-16 rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={v}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
        />
      )}
      {opts.unit && (
        <span className="text-xs text-muted-foreground">{opts.unit}</span>
      )}
    </div>
  );
};
