import * as React from 'react';
import type { SetterProps } from '../setter.interface';

interface NumberSetterProps {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}

export const NumberSetter: React.FC<SetterProps<number>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as NumberSetterProps;
  const v = typeof value === 'number' ? value : '';
  const [text, setText] = React.useState(String(v));

  React.useEffect(() => {
    setText(typeof value === 'number' ? String(value) : '');
  }, [value]);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n)) onChange(n);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        value={text}
        min={opts.min}
        max={opts.max}
        step={opts.step ?? 1}
        placeholder={opts.placeholder}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(text);
        }}
      />
      {opts.unit && (
        <span className="text-xs text-muted-foreground">{opts.unit}</span>
      )}
    </div>
  );
};
