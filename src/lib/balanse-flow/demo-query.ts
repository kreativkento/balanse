import { getTable, scopeRows, setTable } from './demo-store.ts';

type Filter =
  | { kind: 'eq'; col: string; value: unknown }
  | { kind: 'neq'; col: string; value: unknown }
  | { kind: 'in'; col: string; value: unknown[] }
  | { kind: 'is'; col: string; value: unknown };

function applyFilters(rows: Record<string, unknown>[], filters: Filter[]): Record<string, unknown>[] {
  return rows.filter((row) =>
    filters.every((filter) => {
      const current = row[filter.col];
      if (filter.kind === 'eq') return current === filter.value;
      if (filter.kind === 'neq') return current !== filter.value;
      if (filter.kind === 'in') return filter.value.includes(current);
      if (filter.kind === 'is') return current == null && filter.value == null;
      return true;
    }),
  );
}

function result(data: unknown, error: { message: string } | null = null) {
  return { data, error, count: Array.isArray(data) ? data.length : data ? 1 : 0, status: error ? 400 : 200, statusText: error ? 'Error' : 'OK' };
}

export function createDemoQuery(table: string) {
  const filters: Filter[] = [];
  let limitCount: number | null = null;
  let single = false;
  let maybeSingle = false;
  let headOnly = false;
  let pendingWrite: (() => Record<string, unknown>[] | Record<string, unknown> | null) | null = null;

  const runRead = () => {
    let rows = scopeRows(table, getTable(table).map((row) => ({ ...row })));
    rows = applyFilters(rows, filters);
    if (limitCount != null) rows = rows.slice(0, limitCount);
    if (single) {
      if (rows.length !== 1) return result(null, { message: 'Expected one row' });
      return result(rows[0]);
    }
    if (maybeSingle) return result(rows[0] ?? null);
    if (headOnly) return { ...result(null), count: rows.length };
    return result(rows);
  };

  const builder: Record<string, unknown> = {};

  const chain = () => builder;

  builder.select = (_cols?: unknown, opts?: { head?: boolean; count?: string }) => {
    if (opts?.head) headOnly = true;
    return chain();
  };
  builder.eq = (col: string, value: unknown) => {
    filters.push({ kind: 'eq', col, value });
    return chain();
  };
  builder.neq = (col: string, value: unknown) => {
    filters.push({ kind: 'neq', col, value });
    return chain();
  };
  builder.in = (col: string, value: unknown[]) => {
    filters.push({ kind: 'in', col, value });
    return chain();
  };
  builder.is = (col: string, value: unknown) => {
    filters.push({ kind: 'is', col, value });
    return chain();
  };
  builder.gte = () => chain();
  builder.lte = () => chain();
  builder.gt = () => chain();
  builder.lt = () => chain();
  builder.like = () => chain();
  builder.ilike = () => chain();
  builder.contains = () => chain();
  builder.or = () => chain();
  builder.not = () => chain();
  builder.match = (values: Record<string, unknown>) => {
    Object.entries(values).forEach(([col, value]) => filters.push({ kind: 'eq', col, value }));
    return chain();
  };
  builder.order = () => chain();
  builder.range = () => chain();
  builder.limit = (count: number) => {
    limitCount = count;
    return chain();
  };
  builder.single = () => {
    single = true;
    return chain();
  };
  builder.maybeSingle = () => {
    maybeSingle = true;
    return chain();
  };
  builder.insert = (payload: Record<string, unknown> | Record<string, unknown>[]) => {
    pendingWrite = () => {
      const rows = Array.isArray(payload) ? payload : [payload];
      const withIds = rows.map((row) => ({
        id: row.id ?? `demo-${table}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...row,
      }));
      setTable(table, [...getTable(table), ...withIds]);
      return Array.isArray(payload) ? withIds.map((row) => ({ ...row })) : { ...withIds[0] };
    };
    return chain();
  };
  builder.upsert = (payload: Record<string, unknown> | Record<string, unknown>[]) => builder.insert(payload);
  builder.update = (patch: Record<string, unknown>) => {
    pendingWrite = () => {
      const next = getTable(table).map((row) => {
        const matches = applyFilters([row], filters).length === 1;
        return matches ? { ...row, ...patch } : row;
      });
      setTable(table, next);
      const changed = applyFilters(next, filters).map((row) => ({ ...row }));
      return maybeSingle || single ? (changed[0] ?? null) : changed;
    };
    return chain();
  };
  builder.delete = () => {
    pendingWrite = () => {
      const kept = getTable(table).filter((row) => applyFilters([row], filters).length === 0);
      const removed = getTable(table).filter((row) => applyFilters([row], filters).length === 1);
      setTable(table, kept);
      return maybeSingle || single ? (removed[0] ?? null) : removed.map((row) => ({ ...row }));
    };
    return chain();
  };

  const execute = async () => {
    if (pendingWrite) {
      const data = pendingWrite();
      pendingWrite = null;
      return result(data);
    }
    return runRead();
  };

  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    execute().then(resolve, reject);
  builder.catch = (reject: (reason: unknown) => unknown) => execute().catch(reject);

  return builder;
}

export function demoRpc() {
  return Promise.resolve({ data: null, error: null });
}
