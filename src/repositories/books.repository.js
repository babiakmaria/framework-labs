import { Readable } from 'stream';
import '../../db/models/book.model.js';

function mapId({ _id, ...rest }) {
  return { id: _id.toString(), ...rest };
}

function buildFilter({ author, year, genre } = {}) {
  const filter = {};
  if (author) filter.author = { $regex: author, $options: 'i' };
  if (year) filter.year = Number(year);
  if (genre) filter.genre = { $regex: genre, $options: 'i' };
  return filter;
}

class BooksRepository {
  #db;

  constructor(db) {
    this.#db = db;
  }

  get #Book() {
    return this.#db.model('Book');
  }

  async getAll() {
    const books = await this.#Book.find().lean();
    return books.map(mapId);
  }

  async getPaginated({ page = 1, limit = 10, author, year, genre } = {}) {
    const filter = buildFilter({ author, year, genre });
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.#Book.find(filter).skip(skip).limit(limit).lean(),
      this.#Book.countDocuments(filter)
    ]);

    return {
      data: data.map(mapId),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getById(id) {
    try {
      const book = await this.#Book.findById(id).lean();
      return book ? mapId(book) : null;
    } catch {
      return null;
    }
  }

  async create(data) {
    const book = await this.#Book.create(data);
    return book.toJSON();
  }

  async update(id, data) {
    try {
      const { id: _, ...rest } = data;
      const book = await this.#Book.findByIdAndUpdate(id, rest, {
        returnDocument: 'after',
        runValidators: true
      }).lean();
      return book ? mapId(book) : null;
    } catch {
      return null;
    }
  }

  async delete(id) {
    try {
      await this.#Book.findByIdAndDelete(id);
    } catch {
      return;
    }
  }

  createStream() {
    const cursor = this.#Book.find().lean().cursor();
    return Readable.from(
      (async function* () {
        for await (const doc of cursor) {
          yield mapId(doc);
        }
      })()
    );
  }
}

export const createBooksRepository = (db) => new BooksRepository(db);

let _instance = null;

export const initBooksRepository = (db) => {
  _instance = createBooksRepository(db);
};

export default new Proxy(
  {},
  {
    get(_, prop) {
      if (!_instance) throw new Error('BooksRepository is not initialized. Call initBooksRepository(fastify.db) first.');
      const val = _instance[prop];
      return typeof val === 'function' ? val.bind(_instance) : val;
    }
  }
);
