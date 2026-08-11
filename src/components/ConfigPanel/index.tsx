import { useTranslation } from 'react-i18next';
import { Button, Form, Select } from '@douyinfe/semi-ui';
import { dashboard, SourceType } from '@lark-base-open/js-sdk';
import type { IConfig, IDataCondition } from '@lark-base-open/js-sdk';
import type { IBumpChartConfig } from '../../App';
import type { TableMeta, ViewMeta, FieldMeta } from '../../hooks/useTableData';
import './style.scss';

export interface ConfigPanelProps {
  config: IBumpChartConfig;
  /** The full SDK config including dataConditions — preserved for save round-trip */
  sdkConfig: IConfig;
  tables: TableMeta[];
  views: ViewMeta[];
  fields: FieldMeta[];
  onChange: (config: IBumpChartConfig) => void;
}

export function ConfigPanel({ config, sdkConfig, tables, views, fields, onChange }: ConfigPanelProps) {
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

  const onSaveConfig = async () => {
    // Only save data-related fields to customConfig.
    const dataFields = ['tableId', 'viewId', 'xAxisField', 'yAxisField', 'seriesField'];
    const cleanConfig = Object.fromEntries(
      Object.entries(config)
        .filter(([k, v]) => dataFields.includes(k) && v !== undefined && v !== ''),
    ) as Record<string, unknown>;

    // Use the SDK's original dataConditions if available (ensures round-trip consistency).
    // Only construct new ones if the table changed or there are no existing conditions.
    const tableChanged = !sdkConfig.dataConditions.some(
      (dc) => dc.tableId === config.tableId,
    );
    let dataConditions: IDataCondition[];
    if (sdkConfig.dataConditions.length > 0 && !tableChanged) {
      dataConditions = sdkConfig.dataConditions;
    } else if (config.tableId) {
      dataConditions = [
        {
          tableId: config.tableId,
          ...(config.viewId
            ? {
                dataRange: {
                  type: SourceType.VIEW,
                  viewId: config.viewId,
                  viewName: views.find((v) => v.id === config.viewId)?.name ?? config.viewId,
                },
              }
            : {}),
        },
      ];
    } else {
      dataConditions = [];
    }

    console.log('[ConfigPanel] saveConfig:', {
      customConfig: JSON.parse(JSON.stringify(cleanConfig)),
      dataConditions: JSON.parse(JSON.stringify(dataConditions)),
      usingOriginalDC: sdkConfig.dataConditions.length > 0 && !tableChanged,
    });

    try {
      await dashboard.saveConfig({ customConfig: cleanConfig, dataConditions });
      console.log('[ConfigPanel] saveConfig success');
    } catch (err) {
      console.error('[ConfigPanel] saveConfig failed:', err);
    }
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
