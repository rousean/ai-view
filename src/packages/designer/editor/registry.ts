/**
 * Generic registry pattern. Used by every "this-list-can-grow" subsystem:
 * widgets, setters, tools, commands, data-source types, transforms,
 * triggers, actions, animations, exporters, panels, shortcuts.
 *
 * Items must carry a `type` (or compatible discriminator) — but the
 * registry doesn't enforce uniqueness on any other field.
 */
export type RegistryEvent<T> = { kind: 'add'; item: T } | { kind: 'remove'; item: T }

export type RegistryListener<T> = (event: RegistryEvent<T>) => void

export interface RegistryKeyed {
  type: string
}

export class Registry<T extends RegistryKeyed> {
  protected items = new Map<string, T>()
  private listeners = new Set<RegistryListener<T>>()

  constructor(public readonly name: string) {}

  register(item: T): void {
    if (this.items.has(item.type)) {
      console.warn(`[Registry/${this.name}] overriding existing entry "${item.type}"`)
    }
    this.items.set(item.type, item)
    this.emit({ kind: 'add', item })
  }

  unregister(type: string): void {
    const item = this.items.get(type)
    if (!item) return
    this.items.delete(type)
    this.emit({ kind: 'remove', item })
  }

  get(type: string): T | undefined {
    return this.items.get(type)
  }

  has(type: string): boolean {
    return this.items.has(type)
  }

  list(): T[] {
    return [...this.items.values()]
  }

  size(): number {
    return this.items.size
  }

  subscribe(listener: RegistryListener<T>): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  clear(): void {
    const all = [...this.items.values()]
    this.items.clear()
    for (const item of all) this.emit({ kind: 'remove', item })
  }

  private emit(event: RegistryEvent<T>): void {
    for (const fn of this.listeners) {
      try {
        fn(event)
      } catch (err) {
        console.error(`[Registry/${this.name}] listener threw`, err)
      }
    }
  }
}
