import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
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
    <Select
      value={value ?? ''}
      disabled={disabled}
      onValueChange={(v) => onChange(v)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={opts.placeholder ?? '请选择'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
