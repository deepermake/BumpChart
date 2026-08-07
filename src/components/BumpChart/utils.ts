import type { RawRecord, AxisConfig, SeriesData } from './types';

const DEFAULT_COLORS = [
  '#e8745a',
  '#7fc2cc',
  '#e2c08d',
  '#5b8ff9',
  '#f6bd16',
  '#6dc8ec',
  '#d3a4ff',
  '#ff9d4d',
  '#82d588',
  '#ff6b84',
];

export function getColors(colors?: string[]): string[] {
  return colors && colors.length > 0 ? colors : DEFAULT_COLORS;
}

function toNumber(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(num) ? 0 : num;
}

function toString(value: string | number | undefined): string {
  return value === undefined || value === null ? '' : String(value);
}

export function processData(
  data: RawRecord[],
  config: AxisConfig
): { categories: string[]; series: SeriesData[] } {
  const { xAxisField, yAxisField, seriesField } = config;

  if (!xAxisField || !yAxisField || !seriesField) {
    return { categories: [], series: [] };
  }

  const groupedByCategory = new Map<string, RawRecord[]>();
  for (const record of data) {
    const category = toString(record[xAxisField]);
    if (!category) continue;
    if (!groupedByCategory.has(category)) {
      groupedByCategory.set(category, []);
    }
    groupedByCategory.get(category)!.push(record);
  }

  const categories = Array.from(groupedByCategory.keys());
  const seriesMap = new Map<string, SeriesData>();
  const colors = getColors();

  for (const [categoryIndex, category] of categories.entries()) {
    const records = groupedByCategory.get(category) || [];
    const ranked = records
      .map((record) => ({
        record,
        value: toNumber(record[yAxisField]),
        seriesName: toString(record[seriesField]),
      }))
      .filter((item) => item.seriesName)
      .sort((a, b) => b.value - a.value);

    for (const [index, item] of ranked.entries()) {
      const rank = index + 1;
      const seriesName = item.seriesName;

      if (!seriesMap.has(seriesName)) {
        const colorIndex = seriesMap.size % colors.length;
        seriesMap.set(seriesName, {
          name: seriesName,
          color: colors[colorIndex],
          points: [],
        });
      }

      const series = seriesMap.get(seriesName)!;
      while (series.points.length < categoryIndex) {
        series.points.push({
          category: categories[series.points.length],
          seriesName,
          rank: -1,
          value: 0,
        });
      }

      series.points.push({
        category,
        seriesName,
        rank,
        value: item.value,
      });
    }
  }

  for (const series of seriesMap.values()) {
    while (series.points.length < categories.length) {
      series.points.push({
        category: categories[series.points.length],
        seriesName: series.name,
        rank: -1,
        value: 0,
      });
    }
  }

  return { categories, series: Array.from(seriesMap.values()) };
}
