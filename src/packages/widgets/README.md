# @widgets

所有 widget 类型的 meta 定义与渲染组件。

## 职责

- 提供 `WidgetMeta` 类型（widget 完整描述）
- 内置 widget 实现（charts / media / text / decoration / containers）
- ECharts / D3 等渲染基础设施（shared/）
- builtin 自动收集与导出

## 依赖

- ✅ `@schema`
- ✅ `react`、`echarts`、`d3`、`lucide-react`、`zod`
- ❌ 不得依赖 `renderer` / `designer`（widget 必须能独立挂载渲染）
- ❌ 不得依赖 `zustand`（不知 store 的存在）

## widget 文件夹规范

```
charts/bar-chart/
├── meta.ts             # WidgetMeta 实例
├── component.tsx       # 渲染组件（吃 WidgetRenderProps）
├── default-props.ts
├── props-config.ts     # PropConfig[]
├── thumbnail.svg
└── index.ts            # 导出 meta
```

## 公开 API

通过 `./index.ts` 导出。
