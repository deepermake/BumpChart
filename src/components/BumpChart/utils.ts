import type { RawRecord, AxisConfig, SeriesData } from './types';

const DEFAULT_COLORS = [
  '#5b8ff9', '#5ad8a6', '#f6bd16', '#e86452', '#6dc8ec',
  '#945fb9', '#ff9845', '#1e9493', '#ff99c3', '#7262fd',
  '#e8745a', '#7fc2cc', '#e2c08d', '#d3a4ff', '#ff9d4d',
  '#82d588', '#ff6b84', '#61ddaa', '#748b9e', '#c76fdf',
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

  // Sort categories: numerically if all values are numeric, otherwise lexicographically.
  const rawCategories = Array.from(groupedByCategory.keys());
  const allNumeric = rawCategories.every((c) => !isNaN(Number(c)) && c.trim() !== '');
  const categories = allNumeric
    ? rawCategories.sort((a, b) => Number(a) - Number(b))
    : rawCategories.sort();

  const seriesMap = new Map<string, SeriesData>();

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
        // Color is a placeholder — the component assigns real colors via coloredSeries.
        seriesMap.set(seriesName, {
          name: seriesName,
          color: '',
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
          categoryIndex: series.points.length,
        });
      }

      series.points.push({
        category,
        seriesName,
        rank,
        value: item.value,
        categoryIndex,
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
        categoryIndex: series.points.length,
      });
    }
  }

  return { categories, series: Array.from(seriesMap.values()) };
}
