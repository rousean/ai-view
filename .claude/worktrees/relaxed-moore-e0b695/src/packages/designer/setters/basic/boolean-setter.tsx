import * as React from 'react';
import type { SetterProps } from '../setter.interface';

interface BooleanSetterProps {
  /** Render as switch ('switch', default) or checkbox ('checkbox'). */
  variant?: 'switch' | 'checkbox';
}

export const BooleanSetter: React.FC<SetterProps<boolean>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as BooleanSetterProps;
  const v = !!value;

  if (opts.variant === 'checkbox') {
    return (
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input accent-primary"
          checked={v}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={v}
      disabled={disabled}
      onClick={() => onChange(!v)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50 ${
        v ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition ${
          v ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  );
};
