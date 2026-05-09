import booksRepository from '../repositories/books.repository.js';
import { REDIS_KEYS, ITEMS_CACHE_PATTERN } from '../constants/redis.keys.js';

const ITEMS_CACHE_TTL_S = 86_400; // 24 hours

class BooksService {
  #redis;

  constructor(redis) {
    this.#redis = redis;
  }

  async getAll(query = {}) {
    let books = await booksRepository.getAll();

    if (query.author) {
      books = books.filter((b) =>
        b.author?.toLowerCase().includes(query.author.toLowerCase())
      );
    }

    if (query.year) {
      books = books.filter((b) => Number(b.year) === Number(query.year));
    }

    if (query.genre) {
      books = books.filter((b) =>
        b.genre?.toLowerCase().includes(query.genre.toLowerCase())
      );
    }

    return books;
  }

  async getAllPaginated(query = {}) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const key = REDIS_KEYS.ITEMS_PAGE(page, limit);

    const cached = await this.#redis.get(key);
    if (cached) return JSON.parse(cached);

    const result = await booksRepository.getPaginated({ ...query, page, limit });
    await this.#redis.setex(key, ITEMS_CACHE_TTL_S, JSON.stringify(result));
    return result;
  }

  async getById(id) {
    return booksRepository.getById(id);
  }

  async create(data) {
    const result = await booksRepository.create({
      ...data,
      image: data.image ?? null,
    });
    await this.#invalidateItemsCache();
    return result;
  }

  async update(id, data) {
    const result = await booksRepository.update(id, data);
    if (result) await this.#invalidateItemsCache();
    return result;
  }

  async patch(id, updateData) {
    const book = await this.getById(id);
    if (!book) return null;
    const result = await booksRepository.update(id, { ...book, ...updateData });
    await this.#invalidateItemsCache();
    return result;
  }

  async delete(id) {
    const book = await this.getById(id);
    if (!book) return false;
    await booksRepository.delete(id);
    await this.#invalidateItemsCache();
    return true;
  }

  async #invalidateItemsCache() {
    const keys = await this.#redis.keys(ITEMS_CACHE_PATTERN);
    if (keys.length > 0) {
      await this.#redis.del(keys);
    }
  }
}

export function createBooksService(redis) {
  return new BooksService(redis);
}
