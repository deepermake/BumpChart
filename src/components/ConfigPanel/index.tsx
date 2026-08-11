import { useTranslation } from 'react-i18next';
import { Button, Form, Select } from '@douyinfe/semi-ui';
import { dashboard } from '@lark-base-open/js-sdk';
import type { IConfig } from '@lark-base-open/js-sdk';
import type { IBumpChartConfig } from '../../App';
import type { TableMeta, ViewMeta, FieldMeta } from '../../hooks/useTableData';
import './style.scss';

export interface ConfigPanelProps {
  config: IBumpChartConfig;
  /** The full SDK config including dataConditions — preserved for save round-trip */
  sdkConfig: IConfig;
  /** Synchronous getter for the latest SDK config (avoids React async state issues) */
  getSdkConfig: () => IConfig;
  tables: TableMeta[];
  views: ViewMeta[];
  fields: FieldMeta[];
  onChange: (config: IBumpChartConfig) => void;
}

export function ConfigPanel({ config, sdkConfig, getSdkConfig, tables, views, fields, onChange }: ConfigPanelProps) {
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
    // Build customConfig: include ALL config fields (no filtering).
    const customConfig: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(config)) {
      if (v !== undefined) {
        customConfig[k] = v;
      }
    }

    // Read the latest SDK config from the ref (synchronous).
    const latestSdkConfig = getSdkConfig();
    const hasSdkDataConditions = latestSdkConfig.dataConditions
      && latestSdkConfig.dataConditions.length > 0;

    console.log('[ConfigPanel] saveConfig start:', {
      hasSdkDataConditions,
      customConfig,
    });

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Step 1: Save with SDK's existing dataConditions, or empty if first time.
    // On first-time save, we pass empty dataConditions — the SDK will establish
    // its own data scope and send it back via onConfigChange.
    const initialDC = hasSdkDataConditions ? latestSdkConfig.dataConditions : [];
    try {
      await dashboard.saveConfig({ customConfig, dataConditions: initialDC });
      console.log('[ConfigPanel] step 1 save success');
    } catch (err) {
      console.error('[ConfigPanel] step 1 save failed:', err);
    }

    // Step 2: Wait for SDK to process and fire onConfigChange (updates the ref).
    // Then re-save with the SDK's normalized dataConditions.
    await delay(800);
    const refreshed = getSdkConfig();
    const finalDC = (refreshed.dataConditions && refreshed.dataConditions.length > 0)
      ? refreshed.dataConditions
      : initialDC;

    console.log('[ConfigPanel] step 2 re-save:', {
      dataConditions: JSON.parse(JSON.stringify(finalDC)),
      fromSdk: refreshed.dataConditions?.length > 0,
    });

    try {
      await dashboard.saveConfig({ customConfig, dataConditions: finalDC });
      console.log('[ConfigPanel] step 2 re-save success');
    } catch (err) {
      console.error('[ConfigPanel] step 2 re-save failed:', err);
      // Step 3: final retry after another delay
      await delay(1000);
      const retry = getSdkConfig();
      try {
        await dashboard.saveConfig({
          customConfig,
          dataConditions: retry.dataConditions?.length ? retry.dataConditions : finalDC,
        });
        console.log('[ConfigPanel] step 3 retry success');
      } catch (err2) {
        console.error('[ConfigPanel] step 3 retry failed:', err2);
      }
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
