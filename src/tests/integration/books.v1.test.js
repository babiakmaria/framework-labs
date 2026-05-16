import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { buildApp } from '../helpers/buildApp.js';
import { makeDrizzleDb } from '../helpers/mockDrizzle.js';
import { makeMockRedis } from '../helpers/mockDb.js';

// repository is mocked; unit tests cover its internals
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
    _repo: repo,
  };
});

import booksRepository from '../../repositories/books.repository.js';

let app;
let redis;
let accessToken;

const SAMPLE_BOOKS = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965, genre: 'Sci-Fi', image: null, createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 2, title: 'Foundation', author: 'Isaac Asimov', year: 1951, genre: 'Sci-Fi', image: null, createdAt: '2024-01-02T00:00:00.000Z' },
];

async function getToken(fastifyApp) {
  const db = makeDrizzleDb();
  await fastifyApp.ready();
  return fastifyApp.jwt.sign({ sub: 1, email: 'admin@test.com', jti: 'test-jti-v1' }, { expiresIn: 900 });
}

beforeAll(async () => {
  redis = makeMockRedis();
  const db = makeDrizzleDb();
  app = await buildApp({ db, redis });
  accessToken = await getToken(app);
});

beforeEach(() => {
  vi.clearAllMocks();
  redis._clear();
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/v1/books', () => {
  it('returns 200 with array of books', async () => {
    booksRepository.getAll.mockResolvedValue(SAMPLE_BOOKS);

    const res = await app.inject({ method: 'GET', url: '/api/v1/books' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  it('returns response with all required book fields', async () => {
    booksRepository.getAll.mockResolvedValue(SAMPLE_BOOKS);

    const res = await app.inject({ method: 'GET', url: '/api/v1/books' });

    expect(res.statusCode).toBe(200);
    const book = res.json()[0];
    // only fields declared in getBooksSchema are serialized; createdAt is excluded
    expect(book).toHaveProperty('id');
    expect(book).toHaveProperty('title');
    expect(book).toHaveProperty('author');
    expect(book).toHaveProperty('year');
    expect(book).toHaveProperty('genre');
    // schema defines id as type:'string', so Fastify coerces it
    expect(typeof book.id).toBe('string');
    expect(typeof book.title).toBe('string');
    expect(typeof book.year).toBe('number');
  });

  it('returns 400 for invalid query param type', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/books?year=notanumber' });
    expect(res.statusCode).toBe(400);
  });

  it('accepts multiple query params simultaneously without error', async () => {
    booksRepository.getAll.mockResolvedValue(SAMPLE_BOOKS);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/books?author=Frank&genre=Sci-Fi',
    });

    // filtering logic is unit-tested; this just verifies routing handles combined params
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/v1/books/:id', () => {
  it('returns 200 with book data', async () => {
    booksRepository.getById.mockResolvedValue(SAMPLE_BOOKS[0]);

    const res = await app.inject({ method: 'GET', url: '/api/v1/books/1' });

    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('Dune');
  });

  it('returns 404 when id param is non-numeric (schema accepts string, controller gets NaN)', async () => {
    // schema passes 'abc' through; parseInt returns NaN, repo finds nothing
    booksRepository.getById.mockResolvedValue(null);
    const res = await app.inject({ method: 'GET', url: '/api/v1/books/abc' });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when book not found', async () => {
    booksRepository.getById.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: '/api/v1/books/9999' });

    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/v1/books', () => {
  const newBook = { title: 'Neuromancer', author: 'William Gibson', year: 1984, genre: 'Cyberpunk' };

  it('returns 201 with created book when authenticated', async () => {
    const created = { id: 3, ...newBook, image: null, createdAt: '2024-01-03T00:00:00.000Z' };
    booksRepository.create.mockResolvedValue(created);
    booksRepository.getById.mockResolvedValue(created);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/books',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: newBook,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().title).toBe('Neuromancer');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/books',
      payload: newBook,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when title is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/books',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { author: 'Gibson', year: 1984 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when year is below minimum (1000)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/books',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Old Book', author: 'Author Name', year: 500 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when author is too short (< 2 chars)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/books',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Book', author: 'A', year: 2000 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /api/v1/books/:id', () => {
  it('returns 200 with updated book', async () => {
    const updated = { ...SAMPLE_BOOKS[0], title: 'Dune Messiah' };
    booksRepository.update.mockResolvedValue(updated);
    booksRepository.getById.mockResolvedValue(SAMPLE_BOOKS[0]);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/books/1',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Dune Messiah', author: 'Frank Herbert', year: 1969 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('Dune Messiah');
  });

  it('returns 404 when book does not exist', async () => {
    booksRepository.getById.mockResolvedValue(null);
    booksRepository.update.mockResolvedValue(null);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/books/9999',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: 'Ghost', author: 'Nobody', year: 2000 },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/books/1',
      payload: { title: 'T', author: 'A', year: 2000 },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /api/v1/books/:id', () => {
  it('returns 200 with partially updated book', async () => {
    const patched = { ...SAMPLE_BOOKS[0], genre: 'Space Opera' };
    booksRepository.getById.mockResolvedValue(SAMPLE_BOOKS[0]);
    booksRepository.update.mockResolvedValue(patched);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/books/1',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { genre: 'Space Opera' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().genre).toBe('Space Opera');
  });

  it('returns 404 when book not found', async () => {
    booksRepository.getById.mockResolvedValue(null);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/books/9999',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { genre: 'Horror' },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/v1/books/:id', () => {
  it('returns 204 when book deleted', async () => {
    booksRepository.getById.mockResolvedValue(SAMPLE_BOOKS[0]);
    booksRepository.delete.mockResolvedValue(undefined);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/books/1',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(204);
  });

  it('returns 404 when book does not exist', async () => {
    booksRepository.getById.mockResolvedValue(null);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/books/9999',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/books/1' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/items/stream', () => {
  it('returns 200 with NDJSON content', async () => {
    const { Readable } = await import('stream');
    booksRepository.createStream.mockReturnValue(Readable.from(SAMPLE_BOOKS));

    const res = await app.inject({ method: 'GET', url: '/api/v1/items/stream' });

    expect(res.statusCode).toBe(200);
    const lines = res.body.trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(() => JSON.parse(lines[0])).not.toThrow();
  });
});

describe('GET /api/v1/items/export', () => {
  it('returns 200 with CSV content-type', async () => {
    const { Readable } = await import('stream');
    booksRepository.createStream.mockReturnValue(Readable.from(SAMPLE_BOOKS));

    const res = await app.inject({ method: 'GET', url: '/api/v1/items/export' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  it('returns CSV with age column when transform=true', async () => {
    const { Readable } = await import('stream');
    booksRepository.createStream.mockReturnValue(Readable.from(SAMPLE_BOOKS));

    const res = await app.inject({ method: 'GET', url: '/api/v1/items/export?transform=true' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('age');
  });
});
