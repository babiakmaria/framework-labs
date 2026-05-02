import { Readable } from 'stream';
import { eq, like, and, count } from 'drizzle-orm';
import { books } from '../db/schema.js';

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    year: row.year,
    genre: row.genre,
    image: row.image,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}

export class BooksRepository {
  constructor(db) {
    this.db = db;
  }

  async getAll() {
    const rows = await this.db.select().from(books).orderBy(books.id);
    return rows.map(mapRow);
  }

  async getPaginated({ page = 1, limit = 10, author, year, genre } = {}) {
    const conditions = [];

    if (author) conditions.push(like(books.author, `%${author}%`));
    if (year) conditions.push(eq(books.year, Number(year)));
    if (genre) conditions.push(like(books.genre, `%${genre}%`));

    const where = conditions.length ? and(...conditions) : undefined;
    const offset = (Number(page) - 1) * Number(limit);

    const [{ total }] = await this.db.select({ total: count() }).from(books).where(where);

    const rows = await this.db
      .select()
      .from(books)
      .where(where)
      .orderBy(books.id)
      .limit(Number(limit))
      .offset(offset);

    return {
      data: rows.map(mapRow),
      total: Number(total),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(Number(total) / Number(limit))
    };
  }

  async getById(id) {
    const rows = await this.db.select().from(books).where(eq(books.id, parseInt(id)));
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(data) {
    const { title, author, year, genre = null, image = null } = data;
    const result = await this.db.insert(books).values({ title, author, year, genre, image });
    return this.getById(result[0].insertId);
  }

  async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) return null;
    const { title, author, year, genre, image } = { ...existing, ...data };
    await this.db
      .update(books)
      .set({ title, author, year, genre: genre ?? null, image: image ?? null })
      .where(eq(books.id, parseInt(id)));
    return this.getById(id);
  }

  async delete(id) {
    await this.db.delete(books).where(eq(books.id, parseInt(id)));
  }

  createStream() {
    const db = this.db;
    async function* gen() {
      const rows = await db.select().from(books).orderBy(books.id);
      for (const row of rows) yield mapRow(row);
    }
    return Readable.from(gen());
  }
}

export function createBooksRepository(db) {
  return new BooksRepository(db);
}

let _repo = null;

export function initRepository(db) {
  _repo = createBooksRepository(db);
}

export default new Proxy(
  {},
  {
    get(_, prop) {
      if (!_repo)
        throw new Error('BooksRepository not initialized. Call initRepository(db) first.');
      const val = _repo[prop];
      return typeof val === 'function' ? val.bind(_repo) : val;
    }
  }
);
