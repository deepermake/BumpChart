import { useMemo, useState, useCallback } from 'react';
import classnames from 'classnames';
import { processData, getColors } from './utils';
import type { BumpChartProps, BumpChartStyle, SeriesData } from './types';
import './style.scss';

// ─── Breakpoints ──────────────────────────────────────────────────────────────
// These thresholds control which elements are hidden at small sizes.
const BP_HIDE_TITLE = 260;      // hide chart title below this width
const BP_HIDE_RANK  = 200;      // hide left rank labels below this width
const BP_HIDE_LABEL = 180;      // hide right series-name labels below this width
const BP_MIN_HEIGHT = 100;      // minimum usable height

// ─── Scale factor ─────────────────────────────────────────────────────────────
// All pixel constants are defined at a "base" size of 800×520.
// At any other container size we derive a single scale factor so that
// fonts, spacing and node geometry shrink/grow proportionally.
const BASE_W = 800;
const BASE_H = 520;

function getScale(width: number, height: number): number {
  const sw = width  / BASE_W;
  const sh = height / BASE_H;
  // Use the smaller axis so nothing ever overflows its dimension.
  // Clamp to [0.35 … 1.6] so extreme containers still look reasonable.
  return Math.min(Math.max(Math.min(sw, sh), 0.35), 1.6);
}

// ─── Scaled defaults ──────────────────────────────────────────────────────────
function getScaledStyle(
  base: Required<BumpChartStyle>,
  scale: number,
  showRankLabels: boolean,
  showSeriesLabels: boolean,
): Required<BumpChartStyle> & {
  fontSize: { title: number; category: number; rank: number; label: number; state: number };
  strokeWidth: number;
} {
  const s = (v: number) => Math.round(v * scale);
  return {
    ...base,
    leftLabelWidth:  showRankLabels   ? s(base.leftLabelWidth)  : 4,
    rightLabelWidth: showSeriesLabels ? s(base.rightLabelWidth) : 4,
    nodeWidth:   Math.max(4,  s(base.nodeWidth)),
    nodeHeight:  Math.max(8,  s(base.nodeHeight)),
    padding: {
      top:    s(base.padding.top),
      right:  s(base.padding.right),
      bottom: s(base.padding.bottom),
      left:   s(base.padding.left),
    },
    fontSize: {
      title:    Math.max(10, s(17)),
      category: Math.max(8,  s(14)),
      rank:     Math.max(8,  s(14)),
      label:    Math.max(8,  s(14)),
      state:    Math.max(10, s(14)),
    },
    strokeWidth: Math.max(2, s(6)),
  };
}

// ─── Layout ───────────────────────────────────────────────────────────────────
function useLayout(
  width: number,
  height: number,
  hasTitle: boolean,
  style: ReturnType<typeof getScaledStyle>,
  categories: string[],
  series: SeriesData[],
) {
  return useMemo(() => {
    const { padding, leftLabelWidth, rightLabelWidth, nodeWidth, nodeHeight } = style;

    const titleHeight          = hasTitle ? style.fontSize.title + 16 : 0;
    const categoryHeaderHeight = style.fontSize.category + 14;

    // Data area: title at top, x-axis labels at bottom
    const plotTop    = padding.top + titleHeight;
    const plotBottom = height - padding.bottom - categoryHeaderHeight;
    const plotHeight = Math.max(1, plotBottom - plotTop);

    const rankCount = Math.max(
      1,
      series.reduce((max, s) => Math.max(max, ...s.points.map((p) => p.rank)), 0),
    );
    const rowHeight = rankCount > 1 ? plotHeight / (rankCount - 1) : plotHeight;

    const plotLeft  = padding.left + leftLabelWidth;
    const plotRight = width - padding.right - rightLabelWidth;
    const plotWidth = Math.max(1, plotRight - plotLeft);
    const columnCount = Math.max(1, categories.length);

    const nodeHalf = nodeWidth / 2;
    const edgeGap  = Math.max(4, Math.round(12 * (width / BASE_W)));
    const firstNodeX = plotLeft  + nodeHalf + edgeGap;
    const lastNodeX  = plotRight - nodeHalf - edgeGap;

    const columns = categories.map((label, index) => ({
      label,
      x:
        columnCount === 1
          ? plotLeft + plotWidth / 2
          : firstNodeX + (index * (lastNodeX - firstNodeX)) / (columnCount - 1),
    }));

    // rank 1 (highest value) maps to the bottom; rank N maps to the top.
    // This produces an ascending y-axis: small values at top, large values at bottom.
    const rankY = (rank: number) =>
      rank >= 1 ? plotBottom - (rank - 1) * rowHeight : plotBottom;

    // Build rank → representative y-axis value mapping.
    // For each rank position, collect the yAxisField values across all series
    // and pick the median value.
    const rankValueMap = new Map<number, number>();
    for (let rank = 1; rank <= rankCount; rank++) {
      const values: number[] = [];
      for (const s of series) {
        const pt = s.points.find((p) => p.rank === rank);
        if (pt && pt.value !== 0) values.push(pt.value);
      }
      if (values.length > 0) {
        values.sort((a, b) => a - b); // ascending — rank 1 = highest, shown at bottom
        rankValueMap.set(rank, values[Math.floor(values.length / 2)]);
      }
    }

    return {
      columns,
      titleHeight,
      categoryHeaderHeight,
      rankY,
      nodeWidth,
      nodeHeight,
      rankCount,
      plotTop,
      rowHeight,
      rankValueMap,
    };
  }, [width, height, hasTitle, style, categories, series]);
}

// ─── Bezier path ──────────────────────────────────────────────────────────────
/** Format a numeric y-axis value for display.
 * Integers shown as-is; 1 decimal if needed; large numbers abbreviated (K/M).
 */
function formatYValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${+(value / 1_000).toFixed(1)}K`;
  if (Number.isInteger(value)) return String(value);
  return String(+value.toFixed(1));
}

function generateSmoothPath(
  x1: number, y1: number,
  x2: number, y2: number,
  curvature = 0.4,
): string {
  const c1x = x1 + (x2 - x1) * curvature;
  const c2x = x2 - (x2 - x1) * curvature;
  return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
}

// ─── Default style constants (at BASE_W × BASE_H) ────────────────────────────
const DEFAULT_STYLE: Required<BumpChartStyle> = {
  colors: [
    '#e8745a', '#7fc2cc', '#e2c08d', '#5b8ff9', '#f6bd16',
    '#6dc8ec', '#d3a4ff', '#ff9d4d', '#82d588', '#ff6b84',
  ],
  leftLabelWidth:  60,
  rightLabelWidth: 60,
  nodeWidth:  10,
  nodeHeight: 22,
  padding: { top: 20, right: 20, bottom: 32, left: 20 },
  rankPrefix: '第',
  rankSuffix: '',
};

// ─── Component ────────────────────────────────────────────────────────────────
export function BumpChart({
  data,
  config,
  style: styleProp,
  className,
  width  = 800,
  height = 520,
  title,
  loading  = false,
  emptyText,
}: BumpChartProps) {
  const baseStyle = useMemo<Required<BumpChartStyle>>(
    () => ({ ...DEFAULT_STYLE, ...styleProp }),
    [styleProp],
  );

  const { categories, series } = useMemo(
    () => processData(data, config),
    [data, config],
  );

  const colors = useMemo(() => getColors(baseStyle.colors), [baseStyle.colors]);
  const coloredSeries = useMemo(
    () => series.map((s, i) => ({ ...s, color: colors[i % colors.length] })),
    [series, colors],
  );

  // Debug: verify color assignment
  if (coloredSeries.length > 0) {
    console.log('[BumpChart] colors:', {
      paletteSize: colors.length,
      seriesCount: coloredSeries.length,
      assignments: coloredSeries.map((s, i) => `${s.name}→${s.color} (idx=${i})`),
    });
  }

  // Breakpoint flags
  const showTitle        = width >= BP_HIDE_TITLE;
  const showRankLabels   = width >= BP_HIDE_RANK;
  const showSeriesLabels = width >= BP_HIDE_LABEL;
  const tooSmall         = height < BP_MIN_HEIGHT;

  const scale = getScale(width, height);
  const style = useMemo(
    () => getScaledStyle(baseStyle, scale, showRankLabels, showSeriesLabels),
    [baseStyle, scale, showRankLabels, showSeriesLabels],
  );

  const hasTitle = Boolean(title) && showTitle;
  const layout   = useLayout(width, height, hasTitle, style, categories, coloredSeries);

  const labelGap = Math.max(3, Math.round(8 * scale));

  // ── Highlight state: click a line/node to highlight its series ──────────────
  const [highlightedSeries, setHighlightedSeries] = useState<string | null>(null);

  const toggleHighlight = useCallback((seriesName: string) => {
    setHighlightedSeries((prev) => (prev === seriesName ? null : seriesName));
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedSeries(null);
  }, []);

  // Opacity helper: when a series is highlighted, dim all others
  const seriesOpacity = (name: string) =>
    highlightedSeries === null ? 0.75 : highlightedSeries === name ? 1 : 0.12;
  const nodeOpacity = (name: string) =>
    highlightedSeries === null ? 1 : highlightedSeries === name ? 1 : 0.2;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={classnames('bump-chart', className)}>
        <div className="bump-chart-state">
          <span style={{ fontSize: style.fontSize.state }}>加载中…</span>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!categories.length || !coloredSeries.length) {
    return (
      <div className={classnames('bump-chart', className)}>
        <div className="bump-chart-state">
          <span style={{ fontSize: style.fontSize.state }}>{emptyText}</span>
        </div>
      </div>
    );
  }

  // ── Too small to render meaningfully ──────────────────────────────────────
  if (tooSmall) {
    return <div className={classnames('bump-chart', className)} />;
  }

  // ── Full chart ─────────────────────────────────────────────────────────────
  return (
    <div className={classnames('bump-chart', className)}>
      <svg width={width} height={height} aria-label={title} onClick={clearHighlight}>

        {/* Title */}
        {hasTitle && (
          <text
            className="bump-chart-title"
            fontSize={style.fontSize.title}
            x={style.padding.left}
            y={style.padding.top + style.fontSize.title}
            textAnchor="start"
          >
            {title}
          </text>
        )}

        {/* X-axis category labels at the bottom, centered on each column */}
        {layout.columns.map((col) => (
          <text
            key={`cat-${col.label}`}
            className="bump-chart-category"
            fontSize={style.fontSize.category}
            x={col.x}
            y={height - style.padding.bottom / 2}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {col.label}
          </text>
        ))}

        {/* Y-axis labels — show the actual field value at each rank position */}
        {showRankLabels &&
          Array.from({ length: layout.rankCount }, (_, i) => i + 1).map((rank) => {
            const val = layout.rankValueMap.get(rank);
            const label = val !== undefined ? formatYValue(val) : String(rank);
            return (
              <text
                key={`rank-${rank}`}
                className="bump-chart-rank"
                fontSize={style.fontSize.rank}
                x={style.padding.left + style.leftLabelWidth - labelGap}
                y={layout.rankY(rank) + style.fontSize.rank * 0.35}
                textAnchor="end"
              >
                {label}
              </text>
            );
          })}

        {/* Connector lines — click to highlight */}
        {coloredSeries.map((s) => {
          const realPoints = s.points.filter((p) => p.rank >= 1);
          return realPoints.map((point, i) => {
            const next = realPoints[i + 1];
            if (!next) return null;
            // Only connect if the two points are on adjacent x-axis categories
            if (next.categoryIndex !== point.categoryIndex + 1) return null;
            const col1 = layout.columns[point.categoryIndex];
            const col2 = layout.columns[next.categoryIndex];
            if (!col1 || !col2) return null;
            const x1 = col1.x + style.nodeWidth / 2;
            const y1 = layout.rankY(point.rank);
            const x2 = col2.x - style.nodeWidth / 2;
            const y2 = layout.rankY(next.rank);
            return (
              <path
                key={`line-${s.name}-${point.categoryIndex}`}
                d={generateSmoothPath(x1, y1, x2, y2)}
                fill="none"
                stroke={s.color}
                strokeWidth={highlightedSeries === s.name ? style.strokeWidth * 1.5 : style.strokeWidth}
                strokeOpacity={seriesOpacity(s.name)}
                strokeLinecap="round"
                style={{ cursor: 'pointer', transition: 'stroke-opacity 0.2s, stroke-width 0.2s' }}
                onClick={(e) => { e.stopPropagation(); toggleHighlight(s.name); }}
              />
            );
          });
        })}

        {/* Nodes + series labels — click to highlight */}
        {coloredSeries.map((s) => {
          const realPoints = s.points.filter((p) => p.rank >= 1);
          const lastCatIdx = realPoints.length > 0
            ? realPoints[realPoints.length - 1].categoryIndex
            : -1;
          return realPoints.map((point) => {
            const col = layout.columns[point.categoryIndex];
            if (!col) return null;
            const nx = col.x - style.nodeWidth / 2;
            const ny = layout.rankY(point.rank) - style.nodeHeight / 2;
            const isLast = point.categoryIndex === lastCatIdx;
            return (
              <g
                key={`node-${s.name}-${point.categoryIndex}`}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                opacity={nodeOpacity(s.name)}
                onClick={(e) => { e.stopPropagation(); toggleHighlight(s.name); }}
              >
                <rect
                  x={nx}
                  y={ny}
                  width={style.nodeWidth}
                  height={style.nodeHeight}
                  rx={Math.max(1, Math.round(2 * scale))}
                  fill={s.color}
                />
                {showSeriesLabels && isLast && (
                  <text
                    className="bump-chart-label"
                    fontSize={style.fontSize.label}
                    x={col.x + style.nodeWidth / 2 + labelGap}
                    y={layout.rankY(point.rank) + style.fontSize.label * 0.35}
                    textAnchor="start"
                  >
                    {point.seriesName}
                  </text>
                )}
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}

export default BumpChart;
