import { useTranslation } from 'react-i18next';
import { Button, Form, Select } from '@douyinfe/semi-ui';
import { dashboard, SourceType } from '@lark-base-open/js-sdk';
import type { IDataCondition } from '@lark-base-open/js-sdk';
import type { IBumpChartConfig } from '../../App';
import type { TableMeta, ViewMeta, FieldMeta } from '../../hooks/useTableData';
import './style.scss';

export interface ConfigPanelProps {
  config: IBumpChartConfig;
  tables: TableMeta[];
  views: ViewMeta[];
  fields: FieldMeta[];
  onChange: (config: IBumpChartConfig) => void;
}

export function ConfigPanel({ config, tables, views, fields, onChange }: ConfigPanelProps) {
  const { t } = useTranslation();

  const update = (key: keyof IBumpChartConfig, value: unknown) => {
    const next = { ...config, [key]: value };
    // When the table changes, clear downstream selections
    if (key === 'tableId') {
      next.viewId = undefined;
      next.xAxisField = undefined;
      next.yAxisField = undefined;
      next.seriesField = undefined;
    }
    // When the view changes, do NOT clear field mappings (fields are per-table, not per-view)
    onChange(next);
  };

  const onSaveConfig = () => {
    // Strip undefined fields so JSON serialization is stable and SDK won't
    // detect a spurious "config data changed" diff on round-trip.
    const cleanConfig = Object.fromEntries(
      Object.entries(config).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;

    const dataConditions: IDataCondition[] = config.tableId
      ? [
          {
            tableId: config.tableId,
            ...(config.viewId
              ? {
                  dataRange: {
                    type: SourceType.VIEW,
                    viewId: config.viewId,
                    // Resolve actual view name; fall back to id if not found
                    viewName: views.find((v) => v.id === config.viewId)?.name ?? config.viewId,
                  },
                }
              : { dataRange: { type: SourceType.ALL } }),
          },
        ]
      : [];

    dashboard.saveConfig({ customConfig: cleanConfig, dataConditions });
  };

  // Convert meta arrays to Semi Select option shapes
  const tableOptions = tables.map((tb) => ({ value: tb.id,   label: tb.name }));
  const viewOptions  = views.map((v)  => ({ value: v.id,    label: v.name }));
  const fieldOptions = fields.map((f) => ({ value: f.name,  label: f.name }));

  return (
    <div className="config-panel">
      <Form className="config-form" layout="vertical">

        {/* Data table selector */}
        <Form.Section text={t('config.table')}>
          <Select
            value={config.tableId ?? undefined}
            placeholder={t('config.table.tip')}
            optionList={tableOptions}
            filter
            showClear
            style={{ width: '100%' }}
            onChange={(val) => update('tableId', val ?? undefined)}
          />
        </Form.Section>

        {/* View selector — only shown when a table is chosen */}
        {config.tableId && (
          <Form.Section text={t('config.view')}>
            <Select
              value={config.viewId ?? undefined}
              placeholder={t('config.view.all')}
              optionList={viewOptions}
              filter
              showClear
              style={{ width: '100%' }}
              onChange={(val) => update('viewId', val ?? undefined)}
            />
          </Form.Section>
        )}

        {/* Field selectors — only shown when fields are loaded */}
        {fields.length > 0 && (
          <>
            <Form.Section text={t('config.axis.x')}>
              <Select
                value={config.xAxisField ?? undefined}
                placeholder={t('config.axis.x.tip')}
                optionList={fieldOptions}
                filter
                showClear
                style={{ width: '100%' }}
                onChange={(val) => update('xAxisField', val ?? undefined)}
              />
            </Form.Section>

            <Form.Section text={t('config.axis.y')}>
              <Select
                value={config.yAxisField ?? undefined}
                placeholder={t('config.axis.y.tip')}
                optionList={fieldOptions}
                filter
                showClear
                style={{ width: '100%' }}
                onChange={(val) => update('yAxisField', val ?? undefined)}
              />
            </Form.Section>

            <Form.Section text={t('config.series')}>
              <Select
                value={config.seriesField ?? undefined}
                placeholder={t('config.series.tip')}
                optionList={fieldOptions}
                filter
                showClear
                style={{ width: '100%' }}
                onChange={(val) => update('seriesField', val ?? undefined)}
              />
            </Form.Section>
          </>
        )}

        <Form.Section text={t('config.color.scheme')}>
          <div className="color-radio-group">
            <label className="color-radio">
              <input
                type="radio"
                value="image"
                checked={config.useImageColors === true}
                onChange={() => update('useImageColors', true)}
              />
              {t('config.color.image')}
            </label>
            <label className="color-radio">
              <input
                type="radio"
                value="default"
                checked={!config.useImageColors}
                onChange={() => update('useImageColors', false)}
              />
              {t('config.color.default')}
            </label>
          </div>
        </Form.Section>

        {/* Bottom padding so the last form item clears the fixed footer */}
        <div style={{ height: 16 }} />
      </Form>

      {/* Fixed 70px footer with confirm button */}
      <div className="config-footer">
        <Button
          className="config-save"
          theme="solid"
          onClick={onSaveConfig}
        >
          {t('confirm')}
        </Button>
      </div>
    </div>
  );
}
