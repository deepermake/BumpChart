import { useEffect, useState } from 'react';
import { bitable } from '@lark-base-open/js-sdk';
import type { ITableMeta, IViewMeta, IFieldMeta } from '@lark-base-open/js-sdk';
import type { RawRecord } from '../components/BumpChart/types';

export interface TableMeta {
  id: string;
  name: string;
}

export interface ViewMeta {
  id: string;
  name: string;
}

export interface FieldMeta {
  id: string;
  name: string;
}

export interface UseTableDataResult {
  /** 所有数据表列表 */
  tables: TableMeta[];
  /** 当前选中数据表下的视图列表 */
  views: ViewMeta[];
  /** 当前选中数据表下的字段列表 */
  fields: FieldMeta[];
  /** 当前选中表/视图读取到的记录（扁平化为 RawRecord） */
  records: RawRecord[];
  loading: boolean;
  error: string | null;
}

/**
 * 加载多维表格数据表列表、视图列表、字段列表，以及当前选中表/视图的记录。
 * tableId 变化时重新加载视图列表、字段列表和记录；viewId 变化时仅重新加载记录。
 */
export function useTableData(tableId?: string, viewId?: string): UseTableDataResult {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [views, setViews] = useState<ViewMeta[]>([]);
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [records, setRecords] = useState<RawRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load table list once on mount
  useEffect(() => {
    bitable.base.getTableMetaList().then((metas: ITableMeta[]) => {
      setTables(metas.map((m) => ({ id: m.id, name: m.name })));
    }).catch((e: unknown) => {
      console.error('[useTableData] getTableMetaList failed', e);
    });
  }, []);

  // Reload views + fields when tableId changes.
  // Fields are fetched via view.getFieldMetaList() to guarantee ordered results.
  useEffect(() => {
    if (!tableId) {
      setViews([]);
      setFields([]);
      setRecords([]);
      return;
    }
    let cancelled = false;

    const loadTableMeta = async () => {
      try {
        const table = await bitable.base.getTableById(tableId);
        const viewMetas: IViewMeta[] = await table.getViewMetaList();
        if (cancelled) return;
        setViews(viewMetas.map((v) => ({ id: v.id, name: v.name })));

        // Use the first view to get an ordered field list.
        // view.getFieldMetaList() respects view column order; table.getFieldMetaList() does not.
        const viewList = await table.getViewList();
        if (cancelled) return;
        const defaultView = viewList[0];
        if (defaultView) {
          const fieldMetas: IFieldMeta[] = await defaultView.getFieldMetaList();
          if (cancelled) return;
          setFields(fieldMetas.map((f) => ({ id: f.id, name: f.name })));
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[useTableData] load table meta failed', e);
          setError(String(e));
        }
      }
    };

    loadTableMeta();
    return () => { cancelled = true; };
  }, [tableId]);

  // Reload records when tableId or viewId changes
  useEffect(() => {
    if (!tableId) {
      setRecords([]);
      return;
    }
    let cancelled = false;

    const loadRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const table = await bitable.base.getTableById(tableId);

        // Get an ordered field list via the first view to build fieldId→fieldName mapping.
        // view.getFieldMetaList() guarantees column order; table.getFieldMetaList() does not.
        const viewList = await table.getViewList();
        const defaultView = viewList[0];
        const fieldMetas: IFieldMeta[] = defaultView
          ? await defaultView.getFieldMetaList()
          : [];
        if (cancelled) return;

        const idToName: Record<string, string> = {};
        for (const f of fieldMetas) {
          idToName[f.id] = f.name;
        }

        // Paginate through all records (max 200 per page)
        const allRecords: RawRecord[] = [];
        let pageToken: string | undefined;
        do {
          const params: { pageSize: number; viewId?: string; pageToken?: string } = {
            pageSize: 200,
          };
          if (viewId) params.viewId = viewId;
          if (pageToken) params.pageToken = pageToken;

          const resp = await table.getRecords(params);
          if (cancelled) return;

          for (const record of resp.records) {
            const row: RawRecord = {};
            for (const [fieldId, cellValue] of Object.entries(record.fields)) {
              const name = idToName[fieldId] || fieldId;
              row[name] = extractCellText(cellValue);
            }
            allRecords.push(row);
          }

          pageToken = resp.hasMore ? (resp.pageToken ?? undefined) : undefined;
        } while (pageToken);

        if (!cancelled) {
          setRecords(allRecords);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[useTableData] load records failed', e);
          setError(String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRecords();
    return () => { cancelled = true; };
  }, [tableId, viewId]);

  return { tables, views, fields, records, loading, error };
}

/**
 * 将 IOpenCellValue 转换为可读的字符串或数字，用于 BumpChart 的 RawRecord。
 * 优先返回 number（数值字段）；文本、枚举等返回 string；其余返回 undefined。
 */
function extractCellText(value: unknown): string | number | undefined {
  if (value === null || value === undefined) return undefined;

  // Number / currency / progress / rating / auto-number
  if (typeof value === 'number') return value;

  // IOpenNumber: { type, value }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    if (typeof v['value'] === 'number') return v['value'] as number;
    if (typeof v['text'] === 'string') return v['text'] as string;
  }

  // IOpenSegment[] — text / URL / mention etc.
  if (Array.isArray(value)) {
    return (value as Array<Record<string, unknown>>)
      .map((seg) => String(seg['text'] ?? seg['value'] ?? ''))
      .join('');
  }

  // IOpenSingleSelect / IOpenMultiSelect: { id, text }
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v['text'] === 'string') return v['text'] as string;
  }

  if (typeof value === 'string') return value;
  return String(value);
}
