import * as React from 'react';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import type { SetterProps } from '../setter.interface';

interface StringSetterProps {
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  rows?: number;
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
      <Textarea
        rows={opts.rows ?? 3}
        value={v}
        placeholder={opts.placeholder}
        maxLength={opts.maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <Input
      type="text"
      value={v}
      placeholder={opts.placeholder}
      maxLength={opts.maxLength}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};
