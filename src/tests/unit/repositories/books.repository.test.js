import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BooksRepository } from '../../../repositories/books.repository.js';

// stateful drizzle mock; stores books in memory and simulates query chains
function makeDb(initialBooks = []) {
  let books = initialBooks.map((b, i) => ({
    createdAt: new Date('2024-01-01'),
    ...b,
    id: b.id ?? i + 1,
  }));
  let nextId = (books.at(-1)?.id ?? 0) + 1;

  // resolved promise chain for await
  const resolved = (val) => Promise.resolve(val);

  function selectChain(rows) {
    const chain = {
      where: vi.fn(() => resolved(rows)),
      orderBy: vi.fn(() => ({
        ...chain,
        limit: vi.fn(() => ({
          offset: vi.fn(() => resolved(rows)),
        })),
        then: (r) => r(rows), // thenable so the chain is awaitable
      })),
    };
    return { from: vi.fn(() => chain) };
  }

  return {
    _books: () => books,

    select: vi.fn((fields) => {
      if (fields && 'total' in fields) {
        // count query path
        return { from: vi.fn(() => ({ where: vi.fn(() => resolved([{ total: books.length }])) })) };
      }
      return selectChain([...books]);
    }),

    insert: vi.fn(() => ({
      values: vi.fn(async (data) => {
        const book = { id: nextId++, createdAt: new Date(), ...data };
        books.push(book);
        return [{ insertId: book.id }];
      }),
    })),

    update: vi.fn(() => ({
      set: vi.fn((patch) => ({
        where: vi.fn(async () => {
          // in-memory patch
          const idx = books.findIndex((b) => Object.values(patch).some((v) => typeof v !== 'undefined'));
          if (idx !== -1) Object.assign(books[idx], patch);
          return [];
        }),
      })),
    })),

    delete: vi.fn(() => ({
      where: vi.fn(async () => {
        return [];
      }),
    })),

    _setBooks: function (b) {
      books = b.map((book, i) => ({
        createdAt: new Date('2024-01-01'),
        ...book,
        id: book.id ?? i + 1,
      }));
      nextId = (books.at(-1)?.id ?? 0) + 1;
    },
  };
}

const SEED = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965, genre: 'Sci-Fi', image: null },
  { id: 2, title: 'Foundation', author: 'Isaac Asimov', year: 1951, genre: 'Sci-Fi', image: null },
  { id: 3, title: '1984', author: 'George Orwell', year: 1949, genre: 'Dystopia', image: null },
];

describe('BooksRepository.getAll', () => {
  it('returns all books with ISO createdAt strings', async () => {
    const db = makeDb(SEED);
    const repo = new BooksRepository(db);

    const result = await repo.getAll();

    expect(result).toHaveLength(3);
    expect(typeof result[0].createdAt).toBe('string');
    expect(result[0].title).toBe('Dune');
  });

  it('returns empty array when no books', async () => {
    const db = makeDb([]);
    const repo = new BooksRepository(db);

    const result = await repo.getAll();

    expect(result).toHaveLength(0);
  });
});

describe('BooksRepository.getById', () => {
  it('returns the book when found', async () => {
    const db = makeDb(SEED);
    // route select to return a single match
    const original = db.select.bind(db);
    db.select = vi.fn((fields) => {
      if (fields && 'total' in fields) return original(fields);
      return {
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([SEED[0]]),
          orderBy: vi.fn().mockResolvedValue(SEED),
        })),
      };
    });

    const repo = new BooksRepository(db);
    const result = await repo.getById(1);

    expect(result).not.toBeNull();
    expect(result.title).toBe('Dune');
  });

  it('returns null when book not found', async () => {
    const db = makeDb(SEED);
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    }));
    const repo = new BooksRepository(db);

    const result = await repo.getById(9999);

    expect(result).toBeNull();
  });
});

describe('BooksRepository.getPaginated', () => {
  it('returns paginated structure with totalPages', async () => {
    const db = makeDb(SEED);
    // count returns 3, data returns seed
    db.select = vi.fn((fields) => {
      if (fields && 'total' in fields) {
        return { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ total: 3 }]) })) };
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn().mockResolvedValue(SEED.slice(0, 2)),
              })),
            })),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn().mockResolvedValue(SEED.slice(0, 2)),
            })),
          })),
        })),
      };
    });

    const repo = new BooksRepository(db);
    const result = await repo.getPaginated({ page: 1, limit: 2 });

    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.data).toHaveLength(2);
  });

  it('calculates offset correctly for page > 1', async () => {
    const db = makeDb(SEED);
    let capturedOffsetFn;
    db.select = vi.fn((fields) => {
      if (fields && 'total' in fields) {
        return { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ total: 3 }]) })) };
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: (capturedOffsetFn = vi.fn().mockResolvedValue([SEED[2]])),
              })),
            })),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: (capturedOffsetFn = vi.fn().mockResolvedValue([SEED[2]])),
            })),
          })),
        })),
      };
    });

    const repo = new BooksRepository(db);
    const result = await repo.getPaginated({ page: 2, limit: 2 });

    // offset must be 2 for page 2 with limit 2
    expect(result.page).toBe(2);
    expect(capturedOffsetFn).toHaveBeenCalledWith(2);
    expect(result.data).toHaveLength(1);
  });

  it('returns zero totalPages when no books', async () => {
    const db = makeDb([]);
    db.select = vi.fn((fields) => {
      if (fields && 'total' in fields) {
        return { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ total: 0 }]) })) };
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({ offset: vi.fn().mockResolvedValue([]) })),
            })),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({ offset: vi.fn().mockResolvedValue([]) })),
          })),
        })),
      };
    });

    const repo = new BooksRepository(db);
    const result = await repo.getPaginated({ page: 1, limit: 10 });

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.data).toHaveLength(0);
  });
});

describe('BooksRepository.create', () => {
  it('inserts book and returns the created record', async () => {
    const db = makeDb([]);
    const newBook = { id: 1, title: 'New Book', author: 'Author', year: 2020, genre: 'Drama', image: null, createdAt: new Date() };
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([newBook]),
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    }));

    const repo = new BooksRepository(db);
    const result = await repo.create({ title: 'New Book', author: 'Author', year: 2020, genre: 'Drama' });

    expect(result).not.toBeNull();
    expect(db.insert).toHaveBeenCalled();
  });

  it('defaults genre and image to null if not provided', async () => {
    const db = makeDb([]);
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: 1, title: 'T', author: 'A', year: 2020, genre: null, image: null, createdAt: new Date() }]),
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    }));

    const repo = new BooksRepository(db);
    await repo.create({ title: 'T', author: 'A', year: 2020 });

    expect(db.insert).toHaveBeenCalledWith(expect.anything());
    const valuesCall = db.insert.mock.results[0].value.values;
    const insertData = valuesCall.mock.calls[0][0];
    expect(insertData.genre).toBeNull();
    expect(insertData.image).toBeNull();
  });
});

describe('BooksRepository.update', () => {
  it('returns null when book does not exist', async () => {
    const db = makeDb([]);
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    }));

    const repo = new BooksRepository(db);
    const result = await repo.update(999, { title: 'Ghost' });

    expect(result).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('updates fields and returns updated book', async () => {
    const existing = { id: 1, title: 'Old', author: 'A', year: 2000, genre: null, image: null, createdAt: new Date() };
    const updated = { ...existing, title: 'New' };
    const db = makeDb([]);
    let callCount = 0;
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          return callCount === 1 ? [existing] : [updated];
        }),
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    }));

    const repo = new BooksRepository(db);
    const result = await repo.update(1, { title: 'New' });

    expect(db.update).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });
});

describe('BooksRepository.delete', () => {
  it('executes delete and invokes WHERE clause exactly once', async () => {
    const whereFn = vi.fn().mockResolvedValue([]);
    const db = makeDb(SEED);
    // intercept delete to verify the WHERE chain
    db.delete = vi.fn(() => ({ where: whereFn }));
    const repo = new BooksRepository(db);

    await repo.delete(1);

    expect(db.delete).toHaveBeenCalledTimes(1);
    // without WHERE this would wipe the whole table
    expect(whereFn).toHaveBeenCalledTimes(1);
    // eq condition must be present
    expect(whereFn.mock.calls[0][0]).toBeDefined();
  });

  it('does not throw when deleting a non-existent id', async () => {
    const db = makeDb(SEED);
    db.delete = vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) }));
    const repo = new BooksRepository(db);

    await expect(repo.delete(9999)).resolves.not.toThrow();
    expect(db.delete).toHaveBeenCalledTimes(1);
  });
});

describe('BooksRepository.createStream', () => {
  it('returns a readable stream that yields all books', async () => {
    const db = makeDb(SEED);
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(SEED),
        orderBy: vi.fn().mockResolvedValue(SEED),
      })),
    }));

    const repo = new BooksRepository(db);
    const stream = repo.createStream();

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[0].title).toBe('Dune');
  });

  it('createdAt is converted to ISO string in stream output', async () => {
    const bookWithDate = [{ id: 1, title: 'Test', author: 'A', year: 2000, genre: null, image: null, createdAt: new Date('2024-06-01') }];
    const db = makeDb([]);
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(bookWithDate),
        orderBy: vi.fn().mockResolvedValue(bookWithDate),
      })),
    }));

    const repo = new BooksRepository(db);
    const stream = repo.createStream();

    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);

    expect(typeof chunks[0].createdAt).toBe('string');
  });
});
