# @renderer

运行期渲染包：吃 schema JSON → 渲染为 DOM。**不含**设计器。

部署到生产的页面只引入这个包 + `@widgets` + `@schema`，不带设计器代码与 UI。

## 职责

- `<DashboardRenderer project={...} />` 入口
- `<PageRenderer />` / `<WidgetRenderer />`
- `<ScaleToFit />` 大屏分辨率适配
- 简化版数据获取（不含 mock 模式、设计期工具）
- 主题注入

## 依赖

- ✅ `@schema`、`@widgets`
- ✅ `react`、`react-dom`
- ❌ 不得依赖 `designer`
- ❌ 不得依赖 `zustand`、`immer`、`@dnd-kit`、设计器专用库

## 公开 API

通过 `./index.ts` 导出。
