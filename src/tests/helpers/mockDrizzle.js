import { vi } from 'vitest';

// drizzle-like mock for auth tests; supports select/insert/update/delete chains
export function makeDrizzleDb() {
  let users = [];
  let nextInsertId = 1;

  const makeSelectChain = (rows) => ({
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(rows),
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => ({
          offset: vi.fn().mockResolvedValue(rows),
        })),
        mockResolvedValue: undefined,
      })),
    })),
  });

  const db = {
    _users: users,

    select: vi.fn((fields) => {
      // count query path
      if (fields && typeof fields === 'object' && 'total' in fields) {
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ total: users.length }]),
          })),
        };
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn(async () => [...users]),
          orderBy: vi.fn(async () => [...users]),
        })),
      };
    }),

    insert: vi.fn(() => ({
      values: vi.fn(async (data) => {
        const id = nextInsertId++;
        users.push({ id, ...data });
        return [{ insertId: id }];
      }),
    })),

    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),

    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),

    _setUsers: function (u) { users = u; this._users = u; },
    _addUser: function (u) { users.push(u); },
    _resetUsers: function () { users = []; nextInsertId = 1; },
    _getUserByEmail: function (email) { return users.find((u) => u.email === email) ?? null; },
  };

  return db;
}

// drizzle-like mock scoped to books queries
export function makeBooksDb(initialBooks = []) {
  let books = [...initialBooks];
  let nextId = (initialBooks.at(-1)?.id ?? 0) + 1;

  return {
    _books: books,
    _reset: function (b = []) { books = [...b]; nextId = (b.at(-1)?.id ?? 0) + 1; },
    _getAll: function () { return [...books]; },

    select: vi.fn((fields) => {
      if (fields && typeof fields === 'object' && 'total' in fields) {
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([{ total: books.length }]),
          })),
        };
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn(async () => [...books]),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn().mockResolvedValue([...books]),
            })),
            then: (resolve) => resolve([...books]),
          })),
        })),
      };
    }),

    insert: vi.fn(() => ({
      values: vi.fn(async (data) => {
        const book = { id: nextId++, createdAt: new Date(), ...data };
        books.push(book);
        return [{ insertId: book.id }];
      }),
    })),

    update: vi.fn(() => ({
      set: vi.fn((data) => ({
        where: vi.fn(async () => {
          // caller re-queries after update; just return empty
          return [];
        }),
      })),
    })),

    delete: vi.fn(() => ({
      where: vi.fn(async (cond) => {
        return [];
      }),
    })),
  };
}
