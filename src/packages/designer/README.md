# @designer

设计器主体：编辑器门面、状态、命令、画布交互、属性面板、数据管线、配色/变量/交互/AI 等子系统与 UI。可 import 所有其他包，不被任何包反向 import。

## 核心模型

- **`DashboardEditor`**（`editor/dashboard-editor.ts`）——编排门面：命令分发、事件总线、钩子、注册中心、插件、脏标记 + 防抖自动保存。对外暴露大量便捷方法（`addWidget` / `updateProps` / `setScaleMode` / `setBackground` / `setPageTransition` …），内部统一走命令。
- **命令模式**：`editor.execute(type, payload)` → 可撤销的 immer `apply(draft)` 或副作用 `run`；门面方法只是 `execute` 的包装。
- **三 + 一 Store**（zustand）：
  - `document-store` — 持久化的 Project，**只**经 HistoryManager 的 immer patch 变更；
  - `editor-store` — 易失态：选区 / 相机 / 工具 / 视图 / 偏好 / 剪贴板 / 侧栏 / 隔离分组；
  - `runtime-store` — 模式（design|preview）、`fetchedData`、`fetchStatus`、高亮 id；
  - `filter-store` — 跨组件联动 filter。

## 子系统（按目录）

| 目录             | 内容 |
| ---------------- | ---- |
| `editor/`        | DashboardEditor、command-registry + `commands/`（canvas / page / project / widget / widget-data / data-source / guide）、history-manager（patch 时间旅行）、hook-manager、event-bus、registry-hub（widgets/setters/tools/commands）、clipboard、keyboard-shortcuts、editor-context |
| `stores/`        | document / editor / runtime / filter store + selectors |
| `canvas/`        | canvas-viewport、ruler、grid / column-grid / guides / safe-area / page-background 叠层、widget-layer / widget-container、`overlay/`（缩放+旋转手柄、对齐/间距/尺寸匹配辅助线）、`interaction/`（手势 hook）、`transformer/`（几何）、camera-transform-layer、context-menu、selection-toolbar |
| `setters/`       | SetterRegistry + 声明式属性控件：`basic/`（string/number/boolean/select/slider）、`style/`（color/font/gradient/opacity/**rules** 条件格式）、`reference/`（page/widget/series 选择器） |
| `tools/`         | Tool 接口 + tool-registry + select / place / pan 工具 |
| `snap/`          | SnapManager（`editor.snap`）+ snap-store + size-match-store + build-context（元素/网格/参考线吸附 + 尺寸匹配） |
| `data/`          | `resolve`（再导出 @renderer）、`fetch-service`（API 轮询 + **WebSocket** fetcher，`reconcileFetchers` 调和数据源生命周期）、csv-parser、json-parser、dataset-utils |
| `palette/`       | ProjectPalette 语义 token + 系列色、内置配色模板（含背景）、`apply-palette`（`paintPropsWithPalette` 给 widget 上色）、palette-picker、palette-store |
| `variables/`     | 全局变量：`ProjectVariable` 定义 + variable-store（定义 + 运行时覆盖值）+ `effectiveVariableValues` |
| `interactions/`  | Trigger/Action 注册表 + 运行时事件派发（交互 tab） |
| `ai/`            | BeautifyService + mockBeautifyService（「AI 美化」对话框） |
| `presets/`       | widget 样式预设 |
| `export/`        | screenshot（html-to-image 截图） |
| `animations/`    | 入场动画再导出 |
| `ui/`            | editor-root、top-bar、icon-rail、materials / layers / assets / history / data-sources 面板、`property-panel/`（design / data / canvas / animations / interactions tab + palette-editor + ai-beautify-dialog + preset-manager + prop-group-renderer）、command-palette（⌘K）、preview-overlay、floating-tools / floating-zoom、minimap、filter-bar、variables-editor、pages-tab-bar、help-sheet |

## 核心模式

命令注册表（撤销/重做）· EventBus（`editor.bus`）· HookManager（变更前后钩子）· RegistryHub（`editor.registry`）· 插件系统（`editor.use(plugin)`）· 脏标记 + 防抖自动保存 · 声明式属性面板（`WidgetMeta.propsGroups`/`propsConfig` + SetterRegistry → `editor.updateProps`）。

> DEV 逃生口：开发模式下 `window.__editor` 暴露编辑器实例，便于无头调试/脚本驱动。验证改动的方式见记忆 `avoid-auto-preview`（优先 tsc/eslint，而非浏览器）。

## 依赖

- ✅ `@schema`、`@widgets`、`@renderer`
- ✅ React 19、zustand、immer、@dnd-kit、radix/shadcn、d3、lucide-react、html-to-image、sonner
- ❌ 不被任何包反向 import

## 公开 API

通过 `./index.ts` 导出（stores / editor / setters / tools / canvas / snap / ui）。
