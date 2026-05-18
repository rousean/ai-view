import { Registry, type RegistryKeyed } from './registry'
import { CommandRegistry } from './command-registry'
import { SetterRegistry } from '../setters/setter-registry'
import { ToolRegistry } from '../tools/tool-registry'

/**
 * Aggregate of all registries on a DashboardEditor instance. Plugins
 * receive this through PluginContext.
 *
 * Each registry is typed loosely (RegistryKeyed) here; concrete shapes
 * are introduced as the corresponding subsystems land in P4+.
 */
export class RegistryHub {
  /** WidgetMeta — concrete shape lives in @widgets. */
  readonly widgets = new Registry<RegistryKeyed>('widgets')

  /** Setter components for the property panel. */
  readonly setters = new SetterRegistry()

  /** Tool definitions (Select / Place / Pan / ...). */
  readonly tools = new ToolRegistry()

  /** Editor commands. */
  readonly commands = new CommandRegistry()

  /** DataSource type registry (static / api / websocket / ...). */
  readonly dataSourceTypes = new Registry<RegistryKeyed>('dataSourceTypes')

  /** Transform step definitions (filter / aggregate / ...). */
  readonly transforms = new Registry<RegistryKeyed>('transforms')

  /** Event triggers (click / hover / dataPointClick / ...). */
  readonly triggers = new Registry<RegistryKeyed>('triggers')

  /** Event actions (jumpToPage / showModal / ...). */
  readonly actions = new Registry<RegistryKeyed>('actions')

  /** Animation types (fade / slide / scale / ...). */
  readonly animations = new Registry<RegistryKeyed>('animations')

  /** Exporters (PNG / PDF / JSON / ...). */
  readonly exporters = new Registry<RegistryKeyed>('exporters')

  /** Sidebar / overlay panels. */
  readonly panels = new Registry<RegistryKeyed>('panels')

  /** Themes registry (project also stores them, but here for plugin presets). */
  readonly themes = new Registry<RegistryKeyed>('themes')

  /** Slot fill registry (UI extension points). */
  readonly slots = new Registry<RegistryKeyed>('slots')
}
