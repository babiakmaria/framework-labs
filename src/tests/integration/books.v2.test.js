import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { buildApp } from '../helpers/buildApp.js';
import { makeDrizzleDb } from '../helpers/mockDrizzle.js';
import { makeMockRedis } from '../helpers/mockDb.js';

vi.mock('../../repositories/books.repository.js', () => {
  const repo = {
    getAll: vi.fn(),
    getPaginated: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createStream: vi.fn(),
  };
  return {
    BooksRepository: vi.fn(() => repo),
    createBooksRepository: vi.fn(() => repo),
    initRepository: vi.fn(),
    default: repo,
  };
});

import booksRepository from '../../repositories/books.repository.js';

let app;
let redis;

const PAGINATED_RESULT = {
  data: [
    { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965, genre: 'Sci-Fi', image: null },
    { id: 2, title: 'Foundation', author: 'Isaac Asimov', year: 1951, genre: 'Sci-Fi', image: null },
  ],
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1,
};

beforeAll(async () => {
  redis = makeMockRedis();
  app = await buildApp({ db: makeDrizzleDb(), redis });
});

beforeEach(() => {
  vi.clearAllMocks();
  redis._clear();
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/v2/books', () => {
  it('returns 200 with paginated structure', async () => {
    booksRepository.getPaginated.mockResolvedValue(PAGINATED_RESULT);

    const res = await app.inject({ method: 'GET', url: '/api/v2/books' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
    expect(body).toHaveProperty('totalPages');
  });

  it('returns data from repository when cache is empty', async () => {
    booksRepository.getPaginated.mockResolvedValue(PAGINATED_RESULT);

    const res = await app.inject({ method: 'GET', url: '/api/v2/books?page=1&limit=10' });

    expect(res.statusCode).toBe(200);
    expect(booksRepository.getPaginated).toHaveBeenCalledTimes(1);
  });

  it('returns cached data on second request without hitting repository', async () => {
    booksRepository.getPaginated.mockResolvedValue(PAGINATED_RESULT);

    await app.inject({ method: 'GET', url: '/api/v2/books?page=1&limit=10' });
    vi.clearAllMocks();
    const res = await app.inject({ method: 'GET', url: '/api/v2/books?page=1&limit=10' });

    expect(res.statusCode).toBe(200);
    expect(booksRepository.getPaginated).not.toHaveBeenCalled();
  });

  it('uses separate cache keys for different pages', async () => {
    const page2Result = { ...PAGINATED_RESULT, page: 2, data: [] };
    booksRepository.getPaginated
      .mockResolvedValueOnce(PAGINATED_RESULT)
      .mockResolvedValueOnce(page2Result);

    await app.inject({ method: 'GET', url: '/api/v2/books?page=1&limit=10' });
    await app.inject({ method: 'GET', url: '/api/v2/books?page=2&limit=10' });

    expect(booksRepository.getPaginated).toHaveBeenCalledTimes(2);
  });

  it('accepts page and limit query params', async () => {
    booksRepository.getPaginated.mockResolvedValue({ ...PAGINATED_RESULT, page: 2, limit: 5 });

    const res = await app.inject({ method: 'GET', url: '/api/v2/books?page=2&limit=5' });

    expect(res.statusCode).toBe(200);
    expect(booksRepository.getPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 5 })
    );
  });

  it('returns 400 when limit exceeds maximum (100)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v2/books?limit=200' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when page is less than 1', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v2/books?page=0' });
    expect(res.statusCode).toBe(400);
  });

  it('filters by author and passes it to repository', async () => {
    booksRepository.getPaginated.mockResolvedValue({ ...PAGINATED_RESULT, data: [PAGINATED_RESULT.data[0]] });

    const res = await app.inject({ method: 'GET', url: '/api/v2/books?author=Herbert' });

    expect(res.statusCode).toBe(200);
    expect(booksRepository.getPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ author: 'Herbert' })
    );
  });

  it('returns empty data array when no books found', async () => {
    booksRepository.getPaginated.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });

    const res = await app.inject({ method: 'GET', url: '/api/v2/books?author=Nobody' });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(0);
    expect(res.json().total).toBe(0);
  });
});
