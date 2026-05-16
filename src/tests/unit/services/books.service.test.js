import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBooksService } from '../../../services/books.service.js';

// repository is mocked at module level
vi.mock('../../../repositories/books.repository.js', () => {
  const repo = {
    getAll: vi.fn(),
    getPaginated: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return { default: repo };
});

import booksRepository from '../../../repositories/books.repository.js';

function makeRedis(keys = []) {
  const store = new Map();
  return {
    get: vi.fn(async (key) => store.get(key) ?? null),
    setex: vi.fn(async (key, _ttl, value) => store.set(key, value)),
    keys: vi.fn(async () => keys),
    del: vi.fn(async () => {}),
    _store: store,
  };
}

const BOOKS = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965, genre: 'Sci-Fi', image: null },
  { id: 2, title: 'Foundation', author: 'Isaac Asimov', year: 1951, genre: 'Sci-Fi', image: null },
  { id: 3, title: 'Neuromancer', author: 'William Gibson', year: 1984, genre: 'Cyberpunk', image: null },
];

describe('BooksService.getAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all books when no filters', async () => {
    booksRepository.getAll.mockResolvedValue(BOOKS);
    const service = createBooksService(makeRedis());

    const result = await service.getAll();

    expect(result).toHaveLength(3);
  });

  it('filters by author case-insensitively', async () => {
    booksRepository.getAll.mockResolvedValue(BOOKS);
    const service = createBooksService(makeRedis());

    const result = await service.getAll({ author: 'frank' });

    expect(result).toHaveLength(1);
    expect(result[0].author).toBe('Frank Herbert');
  });

  it('filters by year exactly', async () => {
    booksRepository.getAll.mockResolvedValue(BOOKS);
    const service = createBooksService(makeRedis());

    const result = await service.getAll({ year: '1965' });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Dune');
  });

  it('filters by genre case-insensitively', async () => {
    booksRepository.getAll.mockResolvedValue(BOOKS);
    const service = createBooksService(makeRedis());

    const result = await service.getAll({ genre: 'sci-fi' });

    expect(result).toHaveLength(2);
  });

  it('returns empty array when no books match filters', async () => {
    booksRepository.getAll.mockResolvedValue(BOOKS);
    const service = createBooksService(makeRedis());

    const result = await service.getAll({ author: 'Unknown Author' });

    expect(result).toHaveLength(0);
  });
});

describe('BooksService.getAllPaginated', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated result from repository on cache miss', async () => {
    const paginatedResult = { data: BOOKS.slice(0, 2), total: 3, page: 1, limit: 2, totalPages: 2 };
    booksRepository.getPaginated.mockResolvedValue(paginatedResult);
    const redis = makeRedis();
    const service = createBooksService(redis);

    const result = await service.getAllPaginated({ page: 1, limit: 2 });

    expect(result).toEqual(paginatedResult);
    expect(redis.setex).toHaveBeenCalled();
  });

  it('returns cached result without hitting repository', async () => {
    const cached = { data: BOOKS, total: 3, page: 1, limit: 10, totalPages: 1 };
    const redis = makeRedis();
    redis._store.set('items:page:1:limit:10', JSON.stringify(cached));
    redis.get.mockImplementation(async (key) => redis._store.get(key) ?? null);
    const service = createBooksService(redis);

    const result = await service.getAllPaginated({ page: 1, limit: 10 });

    expect(result).toEqual(cached);
    expect(booksRepository.getPaginated).not.toHaveBeenCalled();
  });

  it('uses default page=1 and limit=10', async () => {
    booksRepository.getPaginated.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    const redis = makeRedis();
    const service = createBooksService(redis);

    await service.getAllPaginated({});

    expect(booksRepository.getPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 })
    );
  });
});

describe('BooksService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates book and invalidates cache', async () => {
    const newBook = { id: 4, title: 'New', author: 'Author', year: 2020, genre: 'Drama', image: null };
    booksRepository.create.mockResolvedValue(newBook);
    const redis = makeRedis(['items:page:1:limit:10']);
    const service = createBooksService(redis);

    const result = await service.create({ title: 'New', author: 'Author', year: 2020, genre: 'Drama' });

    expect(result).toEqual(newBook);
    expect(redis.del).toHaveBeenCalledWith(['items:page:1:limit:10']);
  });

  it('passes null for missing image', async () => {
    booksRepository.create.mockResolvedValue({ id: 5, image: null });
    const redis = makeRedis();
    const service = createBooksService(redis);

    await service.create({ title: 'T', author: 'A', year: 2000 });

    expect(booksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ image: null })
    );
  });
});

describe('BooksService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns updated book and invalidates cache on success', async () => {
    const updated = { ...BOOKS[0], title: 'Updated' };
    booksRepository.update.mockResolvedValue(updated);
    const redis = makeRedis(['items:page:1:limit:10']);
    const service = createBooksService(redis);

    const result = await service.update(1, { title: 'Updated' });

    expect(result).toEqual(updated);
    expect(redis.del).toHaveBeenCalled();
  });

  it('returns null and does NOT invalidate cache when book not found', async () => {
    booksRepository.update.mockResolvedValue(null);
    const redis = makeRedis(['items:page:1:limit:10']);
    const service = createBooksService(redis);

    const result = await service.update(999, { title: 'Ghost' });

    expect(result).toBeNull();
    expect(redis.del).not.toHaveBeenCalled();
  });
});

describe('BooksService.patch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('merges fields and returns updated book', async () => {
    booksRepository.getById.mockResolvedValue(BOOKS[0]);
    const merged = { ...BOOKS[0], title: 'Dune Messiah' };
    booksRepository.update.mockResolvedValue(merged);
    const redis = makeRedis();
    const service = createBooksService(redis);

    const result = await service.patch(1, { title: 'Dune Messiah' });

    expect(result.title).toBe('Dune Messiah');
    expect(booksRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ title: 'Dune Messiah', author: 'Frank Herbert' })
    );
  });

  it('returns null when book not found', async () => {
    booksRepository.getById.mockResolvedValue(null);
    const service = createBooksService(makeRedis());

    const result = await service.patch(999, { title: 'Ghost' });

    expect(result).toBeNull();
    expect(booksRepository.update).not.toHaveBeenCalled();
  });
});

describe('BooksService.delete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true and invalidates cache when book exists', async () => {
    booksRepository.getById.mockResolvedValue(BOOKS[0]);
    booksRepository.delete.mockResolvedValue(undefined);
    const redis = makeRedis(['items:page:1:limit:10']);
    const service = createBooksService(redis);

    const result = await service.delete(1);

    expect(result).toBe(true);
    expect(redis.del).toHaveBeenCalled();
  });

  it('returns false when book does not exist', async () => {
    booksRepository.getById.mockResolvedValue(null);
    const redis = makeRedis();
    const service = createBooksService(redis);

    const result = await service.delete(999);

    expect(result).toBe(false);
    expect(booksRepository.delete).not.toHaveBeenCalled();
  });
});

describe('BooksService cache invalidation', () => {
  it('does not call del when no cache keys exist', async () => {
    booksRepository.create.mockResolvedValue({ id: 10, title: 'T', author: 'A', year: 2020 });
    const redis = makeRedis([]); // empty cache
    const service = createBooksService(redis);

    await service.create({ title: 'T', author: 'A', year: 2020 });

    expect(redis.del).not.toHaveBeenCalled();
  });
});
