import * as React from 'react';
import type { SetterProps } from '../setter.interface';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectSetterProps {
  options?: SelectOption[];
  placeholder?: string;
}

export const SelectSetter: React.FC<SetterProps<string>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as SelectSetterProps;
  const options = opts.options ?? [];

  return (
    <select
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {opts.placeholder && (
        <option value="" disabled>
          {opts.placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
};
