/**
 * @schema — types, validation, ID, persistence interface.
 *
 * This package has zero front-end dependencies (only `zod`). It is consumed
 * by every other package and must not import from any of them.
 */

// Types
export * from './types'

// zod schemas (re-exported under a namespace to avoid name collisions
// with the type exports above).
export * as Schemas from './schemas'

// Migrations
export { migrate, compareVersion } from './migrations'
export type { Migration } from './migrations'

// Persistence
export type { PersistenceAdapter } from './persistence'
export {
  LocalStoragePersistence,
  createEmptyProject,
  createDefaultPage,
  createDefaultTheme,
  createSampleStaticDataSource,
} from './persistence'

// IDs
export {
  createId,
  createWidgetId,
  createPageId,
  createDataSourceId,
  createThemeId,
  createAssetId,
  createGuideId,
  createGroupId,
  createProjectId,
} from './id'

// Version
export { SCHEMA_VERSION } from './version'
