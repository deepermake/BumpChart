---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### Bump Chart
- Definition：多系列排名变化图：横轴为时间或分类维度，纵轴表示排名（数值越大越靠前），用平滑曲线连接同一实体在不同列上的排名节点，用于观察多个实体随时间/分类的相对位次变化。
- Aliases：排名变化图、多系列排名变化图

### 仪表盘插件
- Definition：可被飞书多维表格仪表盘宿主动态加载的图表组件包，通过导出 `DashboardPlugin` 对象（含 name/version/type/component/meta/schema）并由宿主 `register` 后在仪表盘中渲染。
- Aliases：dashboard plugin、图表插件

### 横轴字段 / 纵轴字段 / 系列字段
- Definition：数据到图表维度的映射配置：`xAxisField` 指定横轴（时间/分类）字段，`yAxisField` 指定用于计算排名的数值字段，`seriesField` 标识同一条折线对应的实体名称。三者共同决定数据的分组、排序与连线。
- Aliases：axis fields、field mapping

### 排名
- Definition：对每个横轴列内按 `yAxisField` 降序排列得到的次序（1 为最高），用于确定节点在纵轴上的行位置；缺失值不参与排名。
- Aliases：rank
