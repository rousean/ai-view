import { Registry } from '../editor/registry';
import type { SetterDefinition } from './setter.interface';

/**
 * Registry for property-panel setters. Plugins register their setters
 * here and reference them by key in WidgetMeta.propsConfig[].setter.
 */
export class SetterRegistry extends Registry<SetterDefinition> {
  constructor() {
    super('setters');
  }
}
