import { BooleanSetter } from './basic/boolean-setter'
import { NumberSetter } from './basic/number-setter'
import { SelectSetter } from './basic/select-setter'
import { SliderSetter } from './basic/slider-setter'
import { StringSetter } from './basic/string-setter'
import { PageSelectorSetter } from './reference/page-selector-setter'
import { SeriesListSetter } from './reference/series-list-setter'
import { WidgetSelectorSetter } from './reference/widget-selector-setter'
import { ColorSetter } from './style/color-setter'
import { FontSetter } from './style/font-setter'
import { GradientSetter } from './style/gradient-setter'
import { OpacitySetter } from './style/opacity-setter'
import { type SetterRegistry } from './setter-registry'

export { SetterRegistry } from './setter-registry'
export type { SetterProps, SetterComponent, SetterDefinition } from './setter.interface'

export { StringSetter } from './basic/string-setter'
export { NumberSetter } from './basic/number-setter'
export { BooleanSetter } from './basic/boolean-setter'
export { SelectSetter } from './basic/select-setter'
export type { SelectOption } from './basic/select-setter'
export { SliderSetter } from './basic/slider-setter'
export { ColorSetter } from './style/color-setter'
export { FontSetter } from './style/font-setter'
export type { FontStyle } from './style/font-setter'
export { GradientSetter } from './style/gradient-setter'
export type { LinearGradientValue, GradientFieldValue } from './style/gradient-setter'
export { OpacitySetter } from './style/opacity-setter'
export { WidgetSelectorSetter } from './reference/widget-selector-setter'
export { PageSelectorSetter } from './reference/page-selector-setter'
export { SeriesListSetter } from './reference/series-list-setter'
export type { SeriesItem } from './reference/series-list-setter'

export * from './path-utils'

/** Built-in setter list. Plugins (or BuiltinSettersPlugin) call this. */
export function registerBuiltinSetters(registry: SetterRegistry): void {
  const builtin: Array<{ type: string; component: any }> = [
    { type: 'StringSetter', component: StringSetter },
    { type: 'NumberSetter', component: NumberSetter },
    { type: 'BooleanSetter', component: BooleanSetter },
    { type: 'SelectSetter', component: SelectSetter },
    { type: 'SliderSetter', component: SliderSetter },
    { type: 'ColorSetter', component: ColorSetter },
    { type: 'FontSetter', component: FontSetter },
    { type: 'GradientSetter', component: GradientSetter },
    { type: 'OpacitySetter', component: OpacitySetter },
    { type: 'WidgetSelectorSetter', component: WidgetSelectorSetter },
    { type: 'PageSelectorSetter', component: PageSelectorSetter },
    { type: 'SeriesListSetter', component: SeriesListSetter },
  ]
  for (const def of builtin) registry.register(def)
}
