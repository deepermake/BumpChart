# Bump Chart 仪表盘插件

一个 React 仪表盘插件，用于绘制**多系列排名变化图**（Bump Chart），支持横轴、纵轴与系列字段的动态选择。

## 特性

- 纯 SVG 绘制，无额外图表库依赖
- 支持横轴字段、纵轴字段、系列字段的自由选择
- 平滑的贝塞尔曲线连接相邻排名
- 可配置颜色、间距、图例、排名前缀/后缀等样式
- 提供仪表盘插件注册对象 `bumpChartPlugin`
- 内置示例数据，还原示例图排名变化

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173 即可查看演示。

## 使用方式

### 作为 React 组件使用

```tsx
import { BumpChart } from 'bump-chart-dashboard-plugin';

const data = [
  { year: '2021年', city: '广州', value: 1000 },
  { year: '2021年', city: '上海', value: 950 },
  // ...
];

<BumpChart
  data={data}
  config={{
    xAxisField: 'year',
    yAxisField: 'value',
    seriesField: 'city',
  }}
  style={{
    colors: ['#e8745a', '#7fc2cc', '#e2c08d'],
    rankPrefix: '第',
    rankSuffix: '名',
  }}
  width={900}
  height={560}
  title="多系列排名变化图"
/>
```

### 作为仪表盘插件注册

```ts
import { bumpChartPlugin } from 'bump-chart-dashboard-plugin';

dashboard.register(bumpChartPlugin);
```

## API

### BumpChartProps

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| data | `RawRecord[]` | - | 原始数据 |
| config | `AxisConfig` | - | 字段映射配置 |
| style | `BumpChartStyle` | - | 图表样式 |
| width | `number` | 800 | 图表宽度 |
| height | `number` | 520 | 图表高度 |
| title | `string` | - | 标题 |
| loading | `boolean` | false | 加载状态 |
| emptyText | `string` | 暂无数据 | 空数据提示 |

### AxisConfig

| 属性 | 说明 |
|------|------|
| xAxisField | 横轴字段，如时间/分类 |
| yAxisField | 纵轴字段，数值用于计算排名 |
| seriesField | 系列字段，如同一城市/产品 |

### BumpChartStyle

| 属性 | 说明 |
|------|------|
| colors | 主题色数组 |
| leftLabelWidth | 左侧排名标签宽度 |
| rightLabelWidth | 右侧留白宽度 |
| nodeWidth | 节点矩形宽度 |
| nodeHeight | 节点矩形高度 |
| columnGap | 列间距 |
| padding | 内边距 |
| showLegend | 是否显示图例 |
| rankPrefix | 排名前缀，如“第” |
| rankSuffix | 排名后缀，如“名” |

## 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录：

- `bump-chart-plugin.js` ES 模块
- `bump-chart-plugin.umd.cjs` UMD 模块
- `index.d.ts` 类型声明

## 许可

MIT
