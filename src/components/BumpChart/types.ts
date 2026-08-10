export interface RawRecord {
  [key: string]: string | number | undefined;
}

export interface AxisConfig {
  /** 横轴字段：时间/分类维度，如 year */
  xAxisField: string;
  /** 纵轴字段：用于计算排名的数值字段，如 value */
  yAxisField: string;
  /** 系列字段：同一实体的标识，如 city */
  seriesField: string;
}

export interface BumpChartStyle {
  /** 主题色列表，循环使用 */
  colors?: string[];
  /** 左侧标签宽度（像素） */
  leftLabelWidth?: number;
  /** 右侧标签宽度（像素） */
  rightLabelWidth?: number;
  /** 节点矩形宽度（像素） */
  nodeWidth?: number;
  /** 节点矩形高度（像素） */
  nodeHeight?: number;
  /** 图表内边距 */
  padding?: { top: number; right: number; bottom: number; left: number };
  /** 标签前缀，如 "第" */
  rankPrefix?: string;
  /** 标签后缀，如 "名" */
  rankSuffix?: string;
}

export interface BumpChartProps {
  data: RawRecord[];
  config: AxisConfig;
  style?: BumpChartStyle;
  className?: string;
  width?: number;
  height?: number;
  title?: string;
  /** 加载状态 */
  loading?: boolean;
  /** 无数据提示 */
  emptyText?: string;
}

export interface SeriesPoint {
  category: string;
  seriesName: string;
  rank: number;
  value: number;
  /** Original index in the categories array — used for correct column lookup after filtering */
  categoryIndex: number;
}

export interface SeriesData {
  name: string;
  color: string;
  points: SeriesPoint[];
}
