import { vi } from 'vitest';

export function makeMockDb(rows = []) {
  const selectResult = { where: vi.fn().mockResolvedValue(rows) };
  const fromResult = { where: selectResult.where, orderBy: vi.fn().mockResolvedValue(rows) };

  const mockDb = {
    _rows: rows,
    select: vi.fn(() => ({ from: vi.fn(() => fromResult) })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([{ insertId: 1 }]) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
    _setRows: function (newRows) {
      this._rows = newRows;
      selectResult.where.mockResolvedValue(newRows);
      fromResult.orderBy.mockResolvedValue(newRows);
    },
  };

  return mockDb;
}

// in-memory Redis mock backed by a Map
export function makeMockRedis() {
  const store = new Map();

  return {
    _store: store,
    get: vi.fn(async (key) => store.get(key) ?? null),
    set: vi.fn(async (key, value, _ex, _ttl) => { store.set(key, value); return 'OK'; }),
    setex: vi.fn(async (key, _ttl, value) => { store.set(key, value); return 'OK'; }),
    del: vi.fn(async (...keys) => {
      const flatKeys = keys.flat();
      flatKeys.forEach((k) => store.delete(k));
      return flatKeys.length;
    }),
    exists: vi.fn(async (key) => (store.has(key) ? 1 : 0)),
    keys: vi.fn(async (pattern) => {
      const prefix = pattern.replace('*', '');
      return [...store.keys()].filter((k) => k.startsWith(prefix));
    }),
    _clear: function () { store.clear(); },
  };
}
