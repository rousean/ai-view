# packages/

ai-view 大屏可视化平台的分层架构。采用"假分层 monorepo"——单仓单包，但用目录与 path alias 模拟独立包，
为未来拆真 monorepo 做准备。

## 包列表

| 包         | alias         | 职责                                                         |
| ---------- | ------------- | ------------------------------------------------------------ |
| `schema`   | `@schema/*`   | 文档模型类型、zod 校验、版本迁移、ID 生成、持久化适配器      |
| `widgets`  | `@widgets/*`  | `WidgetMeta` 契约 + 14 个内置 widget（图表/基础/指标/媒体/装饰） |
| `renderer` | `@renderer/*` | 编辑器无关的纯渲染 + 数据解析接缝（发布运行时只需它）        |
| `designer` | `@designer/*` | 设计器：编辑器门面、stores、命令、画布、属性面板、数据/配色/变量/交互/AI、UI |

每个包内有各自的 `README.md` 详述其结构与约定。

## 依赖方向（强制单向，禁止反向 import）

```
schema  ←  widgets  ←  renderer  ←  designer
                 ↑___________________|
```

具体规则：

- ❌ `schema` 不得 import 任何其他包
- ❌ `widgets` 不得 import `renderer` / `designer`
- ❌ `renderer` 不得 import `designer`
- ✅ `designer` 可 import 所有

> 目前靠目录约定 + code review 维持，可进一步用 ESLint `import/no-restricted-paths` 锁死。

## 公开 API 约定

每个包**只**通过自己的 `index.ts` 对外暴露 API。
不允许从外部 deep-import 包内部文件（除非该包明确公开了子路径，如 `@designer/data`、`@designer/palette`、`@designer/variables`）。

## 关键设计

- **schema 零前端依赖**：仅 `zod`，被所有包消费，是单向依赖链的根。
- **renderer 是接缝不是整页渲染器**：提供「解析数据 + 渲染单个 widget」的纯函数/组件；live 数据由调用方以 `fetchedData` 形参注入，使设计器画布与发布运行时（`ProjectRuntime`）行为一致。
- **designer 命令化**：所有文档变更走 `editor.execute` → immer patch，天然可撤销/重做。
