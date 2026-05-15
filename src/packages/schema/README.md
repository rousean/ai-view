# @schema

零依赖前端的类型与校验层（仅依赖 `zod`）。

## 职责

- 文档结构 TS 类型（Project / Page / WidgetNode / DataSource / ...）
- zod 校验 schema
- 版本迁移钩子（migrations/）
- ID 生成（id.ts）
- 持久化适配器接口（PersistenceAdapter）
- 内置 LocalStoragePersistence 实现

## 依赖

- ✅ `zod`
- ❌ 不得依赖 React / zustand / 任何前端库
- ❌ 不得依赖其他包（`widgets` / `renderer` / `designer`）

## 公开 API

通过 `./index.ts` 导出。
