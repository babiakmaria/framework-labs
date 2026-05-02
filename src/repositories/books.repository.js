import { Readable } from 'stream';

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    year: row.year,
    genre: row.genre,
    image: row.image,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export class BooksRepository {
  constructor(db) {
    this.db = db;
  }

  async getAll() {
    const [rows] = await this.db.query('SELECT * FROM books ORDER BY id ASC');
    return rows.map(mapRow);
  }

  async getPaginated({ page = 1, limit = 10, author, year, genre } = {}) {
    const conditions = [];
    const params = [];

    if (author) {
      conditions.push('author LIKE ?');
      params.push(`%${author}%`);
    }
    if (year) {
      conditions.push('year = ?');
      params.push(Number(year));
    }
    if (genre) {
      conditions.push('genre LIKE ?');
      params.push(`%${genre}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const [[{ total }]] = await this.db.query(
      `SELECT COUNT(*) as total FROM books ${where}`,
      params
    );

    const [rows] = await this.db.query(
      `SELECT * FROM books ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    return {
      data: rows.map(mapRow),
      total: Number(total),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(Number(total) / Number(limit))
    };
  }

  async getById(id) {
    const [rows] = await this.db.query('SELECT * FROM books WHERE id = ?', [parseInt(id)]);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(data) {
    const { title, author, year, genre = null, image = null } = data;
    const [result] = await this.db.query(
      'INSERT INTO books (title, author, year, genre, image) VALUES (?, ?, ?, ?, ?)',
      [title, author, year, genre, image]
    );
    return this.getById(result.insertId);
  }

  async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) return null;
    const { title, author, year, genre, image } = { ...existing, ...data };
    await this.db.query(
      'UPDATE books SET title = ?, author = ?, year = ?, genre = ?, image = ? WHERE id = ?',
      [title, author, year, genre ?? null, image ?? null, parseInt(id)]
    );
    return this.getById(id);
  }

  async delete(id) {
    await this.db.query('DELETE FROM books WHERE id = ?', [parseInt(id)]);
  }

  createStream() {
    const db = this.db;
    async function* gen() {
      const [rows] = await db.query('SELECT * FROM books ORDER BY id ASC');
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
