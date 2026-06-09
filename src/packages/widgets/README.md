# @widgets

所有 widget 类型的 `WidgetMeta` 定义与渲染组件。widget 必须能脱离设计器独立挂载渲染。

## 职责

- 定义 `WidgetMeta<TProps>` 契约（`widget-meta.ts`）——widget 的完整描述：类型、分类、默认 props/布局、属性面板结构、数据契约、渲染组件。
- 内置 widget 实现（5 大分类，共 **14 个**）。
- 共享渲染基础设施（`shared/`）。
- 自动收集并导出 `builtinWidgets`（`index.ts`）。

## 内置 widget（按分类）

| 分类 (category) | 物料 tab | widgets |
| --------------- | -------- | ------- |
| `chart`         | 图表     | bar-chart · line-chart · **area-chart** · donut-chart · **pie-chart** · gauge-chart |
| `basic`         | 基础     | text · table · **clock** |
| `indicator`     | 指标     | number-card（支持条件格式） |
| `media`         | 媒体     | image |
| `decoration`    | 装饰     | rect · **divider** · **frame**（type 为 `decoration-frame`） |

- 渲染引擎：bar/line/area/gauge = **ECharts**（经 `shared/use-echarts.ts` 管理生命周期）；donut/pie = **D3 SVG**；text/table/clock/image/rect/divider/frame/number-card 为纯组件。
- **预设 widget**：`area-chart` 复用 line-chart 组件（`area:true`），`pie-chart` 复用 donut-chart 组件（`innerRadiusPercent:0`）——它们只有 `default-props / index / preview` 三文件，不重复写 component/types。
- 物料面板按 `category` 自动生成横向分类 tab（标签映射在 `designer/ui/materials-panel.tsx`）。

## widget 文件夹规范（6 文件集）

```
charts/bar-chart/
├── types.ts          # TProps 接口
├── default-props.ts  # 默认 props（必须能通过自身 zod schema）
├── props-config.ts   # 属性面板：propsGroups（嵌套，推荐）或 propsConfig（扁平，遗留）
├── component.tsx     # 渲染组件，吃 WidgetRenderProps<TProps>
├── preview.tsx       # 物料库缩略图（无需数据）
└── index.ts          # 组装并导出 WidgetMeta（含 propsSchema）
```

新增一个 widget = 建该 6 文件集 + 在 `widgets/index.ts` 的 `builtinWidgets` 数组追加一项。

## 共享设施（shared/）

- `use-echarts.ts` — ECharts 实例的创建 / resize / option 更新 / 销毁 hook。
- `conditional.ts` — 条件格式：`ConditionalRule`（gt/gte/lt/lte/eq/between）+ `evalRuleColor(n, rules)`，按阈值给数值上色（number-card 等使用）。

## 组件契约

`WidgetMeta.Component` 是纯组件，接收 `{ node, props, data, layout, designMode, onInteract? }`：

- `data` 是已解析的 `ResolvedWidgetData`（slot 投影、sample 回退完成）——由 `@renderer` 的 resolver 产出。
- `onInteract(trigger, detail?)` 把图表数据点点击等交互上抛给宿主容器（供 `filter` 等交互动作消费）。
- `dataSchema.slots`（`DataSlotDef`：role = dimension/measure/attribute）是数据契约；`.sample` 是设计期回退数据；table 不声明 slots，直接渲染 `data.fields/rows`。

## 依赖

- ✅ `@schema`
- ✅ `react`、`echarts`、`d3`、`lucide-react`、`zod`
- ❌ 不得依赖 `renderer` / `designer`
- ❌ 不得依赖 `zustand`（widget 不知 store 的存在）

## 公开 API

通过 `./index.ts` 导出（`WidgetMeta` 及相关类型、各 widget meta、`builtinWidgets`、`useEcharts`）。
