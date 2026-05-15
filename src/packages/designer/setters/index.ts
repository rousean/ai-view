import { BooleanSetter } from './basic/boolean-setter';
import { NumberSetter } from './basic/number-setter';
import { SelectSetter } from './basic/select-setter';
import { SliderSetter } from './basic/slider-setter';
import { StringSetter } from './basic/string-setter';
import { ColorSetter } from './style/color-setter';
import { OpacitySetter } from './style/opacity-setter';
import { SetterRegistry } from './setter-registry';

export { SetterRegistry } from './setter-registry';
export type {
  SetterProps,
  SetterComponent,
  SetterDefinition,
} from './setter.interface';

export { StringSetter } from './basic/string-setter';
export { NumberSetter } from './basic/number-setter';
export { BooleanSetter } from './basic/boolean-setter';
export { SelectSetter } from './basic/select-setter';
export type { SelectOption } from './basic/select-setter';
export { SliderSetter } from './basic/slider-setter';
export { ColorSetter } from './style/color-setter';
export { OpacitySetter } from './style/opacity-setter';

export * from './path-utils';

/** Built-in setter list. Plugins (or BuiltinSettersPlugin) call this. */
export function registerBuiltinSetters(registry: SetterRegistry): void {
  const builtin: Array<{ type: string; component: any }> = [
    { type: 'StringSetter', component: StringSetter },
    { type: 'NumberSetter', component: NumberSetter },
    { type: 'BooleanSetter', component: BooleanSetter },
    { type: 'SelectSetter', component: SelectSetter },
    { type: 'SliderSetter', component: SliderSetter },
    { type: 'ColorSetter', component: ColorSetter },
    { type: 'OpacitySetter', component: OpacitySetter },
  ];
  for (const def of builtin) registry.register(def);
}
