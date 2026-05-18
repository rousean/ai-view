import * as React from 'react';
import { Switch } from '~/components/ui/switch';
import type { SetterProps } from '../setter.interface';

export const BooleanSetter: React.FC<SetterProps<boolean>> = ({
  value,
  onChange,
  disabled,
}) => {
  return (
    <Switch
      checked={!!value}
      disabled={disabled}
      onCheckedChange={(checked) => onChange(checked)}
    />
  );
};
