import * as React from 'react';
import type { SetterProps } from '../setter.interface';

interface StringSetterProps {
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}

export const StringSetter: React.FC<SetterProps<string>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as StringSetterProps;
  const v = value ?? '';

  if (opts.multiline) {
    return (
      <textarea
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        rows={3}
        value={v}
        placeholder={opts.placeholder}
        maxLength={opts.maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      type="text"
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      value={v}
      placeholder={opts.placeholder}
      maxLength={opts.maxLength}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};
