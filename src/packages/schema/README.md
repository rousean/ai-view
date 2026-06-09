# @schema

文档模型的类型与校验层。零前端依赖（仅依赖 `zod`），被其他所有包消费，自身不得反向 import 任何包。

## 职责

- **文档结构 TS 类型**（`types/`）：`Project → Page[] → WidgetNode[]`，外加项目级 `DataSource[]` / `Asset[]` / `Guide`。
- **zod 校验 schema**（`schemas/`）：与 `types/` 一一对应，用于加载时校验与导入。
- **版本迁移**（`migrations/`）：`migrate(data)` 把旧版文档升级到当前 `SCHEMA_VERSION`。
- **ID 生成**（`id.ts`）：`createWidgetId` / `createPageId` / `createProjectId` / `createDataSourceId` / `createAssetId` / `createGuideId` / `createGroupId`。
- **持久化**（`persistence/`）：`PersistenceAdapter` 接口 + 内置 `LocalStoragePersistence` + 工厂（`createEmptyProject` / `createDefaultPage`）。

## 目录结构

```
schema/
├── types/            # 纯 TS 类型（无运行时代码）
│   ├── project.ts    # Project / ProjectSummary / ProjectStatus
│   ├── page.ts       # Page / CanvasConfig（含 scaleMode 适配方式）/ GridConfig
│   ├── widget-node.ts# WidgetNode / Layout / WidgetData(inline|bound) / TransformStep / EventBinding / AnimationConfig
│   ├── data-source.ts# DataSource 联合：static | api | ws | csv | json | (catch-all)
│   ├── asset.ts · guide.ts · common.ts  # Dataset / FieldDef / Background / GradientConfig …
│   └── index.ts
├── schemas/          # 上述类型的 zod 镜像（widget props 用 z.record 宽松校验）
├── migrations/       # 版本迁移钩子
├── persistence/      # adapter 接口 + LocalStoragePersistence + factory
├── id.ts · version.ts
└── index.ts          # 唯一对外出口
```

## 关键约定

- **WidgetNode.props 在 schema 层是不透明的**（`z.record(z.unknown())`）——具体 props 由各 widget 的 `WidgetMeta` 在渲染期校验。因此只要 `layout / flags / extensions` 完整，程序化构造的节点即可通过 `ProjectSchema`（模板系统正依赖这点）。
- **`WidgetData`** 两种互斥模式：`inline`（自带 Dataset + SlotMapping）/ `bound`（引用 DataSource id + mapping）；缺省时渲染回退到 meta 的 `sample`。
- **`extensions` 命名空间**：项目级扩展挂在 `Project.extensions` 下，已用键有 `palette`（配色板）、`variables`（全局变量）。核心 schema 不感知其内容。

## 依赖

- ✅ `zod`
- ❌ 不得依赖 React / zustand / 任何前端库
- ❌ 不得依赖其他包（`widgets` / `renderer` / `designer`）

## 公开 API

通过 `./index.ts` 导出（类型、`Schemas` 命名空间、`migrate`、`PersistenceAdapter`、`LocalStoragePersistence`、各 `createXxxId`、`SCHEMA_VERSION`）。
