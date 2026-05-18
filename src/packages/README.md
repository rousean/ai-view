# packages/

ai-view 大屏可视化平台的分层架构。采用"假分层 monorepo"——单仓单包，但用目录与 path alias 模拟独立包，
为未来拆真 monorepo 做准备。

## 包列表

| 包         | alias         | 职责                                           |
| ---------- | ------------- | ---------------------------------------------- |
| `schema`   | `@schema/*`   | 类型定义、zod 校验、ID 生成、持久化适配器接口  |
| `widgets`  | `@widgets/*`  | 所有 widget meta + 组件（图表/媒体/文本/装饰） |
| `renderer` | `@renderer/*` | 运行期渲染（不含设计器）                       |
| `designer` | `@designer/*` | 设计器（编辑器、stores、tools、snap、UI 等）   |

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

> 待装 ESLint 后用 `import/no-restricted-paths` 锁死，目前先靠 code review。

## 公开 API 约定

每个包**只**通过自己的 `index.ts` 对外暴露 API。
不允许从外部 deep-import 包内部文件（除非该包明确公开了子路径）。

## 详见

- 架构决策记录：`/docs/architecture/ADR-*.md`（待补）
- 实施计划：迁移路径见 P0–P15 的 todo 清单
