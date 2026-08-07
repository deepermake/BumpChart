import '@lark-base-open/js-sdk/dist/style/dashboard.css';
import './App.scss';
import './locales/i18n';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardState } from '@lark-base-open/js-sdk';
import { useTheme, useConfig, dashboard } from './hooks';
import { useTableData } from './hooks/useTableData';
import { BumpChart } from './components/BumpChart';
import { ConfigPanel } from './components/ConfigPanel';
import type { AxisConfig, BumpChartStyle } from './components/BumpChart/types';

export interface IBumpChartConfig {
  /** 选中的数据表 id */
  tableId?: string;
  /** 选中的视图 id（可选，不填则读取全表数据） */
  viewId?: string;
  xAxisField?: string;
  yAxisField?: string;
  seriesField?: string;
  useImageColors?: boolean;
}

const IMAGE_STYLE_COLORS: BumpChartStyle['colors'] = [
  '#e8745a',
  '#7fc2cc',
  '#e2c08d',
  '#e8745a',
  '#7fc2cc',
  '#e2c08d',
  '#e8745a',
  '#7fc2cc',
  '#e2c08d',
  '#e8745a',
];

export default function App() {
  const { t, i18n } = useTranslation();
  const { bgColor: _bgColor } = useTheme(); // theme-mode attr is set inside useTheme; bgColor unused per spec

  // Sync the active locale to html[lang] so CSS :lang(ja) font rules apply correctly.
  useEffect(() => {
    const apply = (lng: string) => {
      document.documentElement.lang = lng.split('-')[0];
    };
    apply(i18n.language);
    i18n.on('languageChanged', apply);
    return () => i18n.off('languageChanged', apply);
  }, [i18n]);

  const isConfig = dashboard.state === DashboardState.Config;
  const isCreate = dashboard.state === DashboardState.Create;
  const inSettings = isConfig || isCreate;

  const [config, setConfig] = useState<IBumpChartConfig>({
    useImageColors: true,
  });

  const renderedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateConfig = useCallback((data: IBumpChartConfig) => {
    setConfig((prev) => ({ ...prev, ...data }));
    // Notify Lark Base the plugin has rendered (enables screenshot automation).
    if (renderedTimer.current) clearTimeout(renderedTimer.current);
    renderedTimer.current = setTimeout(() => {
      dashboard.setRendered();
    }, 3000);
  }, []);

  useConfig<IBumpChartConfig>(updateConfig);

  // Load real table/view/field/record data from Lark Base
  const { tables, views, fields, records, loading } = useTableData(
    config.tableId,
    config.viewId,
  );

  const axisConfig: AxisConfig | null =
    config.xAxisField && config.yAxisField && config.seriesField
      ? {
          xAxisField: config.xAxisField,
          yAxisField: config.yAxisField,
          seriesField: config.seriesField,
        }
      : null;

  const style: BumpChartStyle = {
    colors: config.useImageColors ? IMAGE_STYLE_COLORS : undefined,
    rankPrefix: t('rank.prefix'),
    rankSuffix: t('rank.suffix'),
  };

  const isReady = axisConfig !== null && config.tableId;

  // Measure the chart content area so the SVG fills it exactly.
  const contentRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 800, height: 520 });
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setChartSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <main className="main">
      <div className="content" ref={contentRef}>
        {isReady && axisConfig ? (
          <BumpChart
            data={records}
            config={axisConfig}
            style={style}
            loading={loading}
            width={chartSize.width}
            height={chartSize.height}
            emptyText={t('empty.title')}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-title">{t('empty.title')}</div>
            <div className="empty-tip">{t('empty.tip')}</div>
          </div>
        )}
      </div>
      {inSettings && (
        <ConfigPanel
          config={config}
          tables={tables}
          views={views}
          fields={fields}
          onChange={setConfig}
        />
      )}
    </main>
  );
}
