/**
 * Project-scoped global variables — a small set of named parameters the
 * viewer can change at runtime (a region picker, a metric toggle…) that
 * many widgets react to. Stored at `project.extensions.variables` so the
 * core schema stays unchanged and the runtime reads them the same way.
 *
 * Consumption is via the data pipeline: a transform step's value can
 * reference a variable as `$key`, and the resolver substitutes the current
 * value before running transforms. "Pick once, many widgets react."
 */
export type VariableType = 'select' | 'text' | 'number'

export interface ProjectVariable {
  id: string
  /** Referenced in transform params as `$key`. */
  key: string
  label: string
  type: VariableType
  /** Choices for `select` type. */
  options?: string[]
  defaultValue: string | number
}

/** Project-level extension key under `project.extensions[VARIABLES_EXT_KEY]`. */
export const VARIABLES_EXT_KEY = 'variables'

export interface ProjectVariablesExtension {
  variables: ProjectVariable[]
}
