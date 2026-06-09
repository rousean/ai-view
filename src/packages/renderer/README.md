# @renderer

编辑器无关的**纯渲染 + 数据解析**接缝。设计器画布与独立运行时（如 `features/management` 的 `ProjectRuntime`、`/preview/$id` 路由）都经由本包渲染 widget，因此发布的大屏不必引入整个 `@designer`。

> 不是一个「整页渲染器」——它提供解析数据 + 渲染单个 widget 的纯函数/组件；整页组装与分辨率适配由上层应用（`ProjectRuntime`）完成。

## 职责

- **数据解析**（`resolve.ts`）：`resolveWidgetData(node, meta, dataSources, activeFilter?, fetchedData?, variables?)` → `ResolvedWidgetData`。
  - 按 `node.data.mode`（inline / bound / 缺省 sample）选取 Dataset + SlotMapping；
  - 依次执行：变量替换 → 作者级 transforms → 交互 filter → slot 投影；
  - 配套：`autoMapToSlots`、`indexDataSources`、`initInlineFromSample`、`initEmptyInline`。
- **数据变换**（`transforms.ts`，内部）：`applyTransforms`（filter / sort / aggregate / limit，执行 `node.data.transform`，在 slot 投影前）；`substituteVars(steps, vars)` 把 transform 参数里的 `$key` 替换为全局变量值。
- **纯渲染**（`widget-view.tsx`）：`WidgetView` 在 `WidgetErrorBoundary` 内渲染 `meta.Component`，并挂载 CSS 入场动画。
- **入场动画**（`animations/`，内部）：内置 enter 动画与类型。

## 目录结构

```
renderer/
├── resolve.ts              # 数据解析（@designer/data/resolve 仅做再导出）
├── transforms.ts           # applyTransforms / substituteVars（内部）
├── widget-view.tsx         # WidgetView（纯渲染）
├── widget-error-boundary.tsx
├── animations/             # 内置入场动画（内部）
└── index.ts                # 公开出口
```

## 依赖

- ✅ `@schema`、`@widgets`
- ✅ `react`
- ❌ 不得依赖 `designer`
- ❌ 不得依赖 `zustand`、`immer`、`@dnd-kit` 等设计器专用库（live 数据由调用方以 `fetchedData` 形参注入，而非从 store 读取——保证设计器与运行时行为一致）

## 公开 API

通过 `./index.ts` 导出：`WidgetView` / `WidgetViewProps`、`WidgetErrorBoundary`、`resolveWidgetData`、`autoMapToSlots`、`initInlineFromSample`、`initEmptyInline`、`indexDataSources`、`ResolveFilter`。（`transforms` 与 `animations` 为内部实现，不对外。）
