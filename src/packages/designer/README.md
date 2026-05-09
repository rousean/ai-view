# @designer

设计器主体：编辑器门面、状态、工具、吸附、命中测试、UI、插件。

## 职责

- `DashboardEditor` 主类（命令分发、事件总线、钩子、插件）
- 三 Store：DocumentStore / EditorStore / RuntimeStore
- HistoryManager（immer patch 时间旅行）
- Tools：Select / Place / Pan / Zoom
- SnapManager（5 种吸附策略）
- HitTest（OBB + SAT）
- DataSourceManager
- Setters（属性面板控件库）
- Canvas 交互层与 overlay
- 内置 UI（Toolbar、MaterialsPanel、PropertyPanel、Minimap...）
- 内置插件（AutoSave、KeyboardShortcuts、LayersPanel...）

## 依赖

- ✅ `@schema`、`@widgets`、`@renderer`
- ✅ React 19、zustand、immer、@dnd-kit、shadcn、radix、d3、lucide
- ❌ 不被任何包反向 import

## 公开 API

通过 `./index.ts` 导出。
