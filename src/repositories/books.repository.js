import path from "path";
import crypto from "crypto";
import { Readable } from "stream";

import {
  getAllFiles,
  readFile,
  deleteFile,
  atomicWrite,
  itemsPath
} from "../utils/file.utils.js";

import ItemModel from "../models/item.model.js";

class BooksRepository {
  async getAll() {
    const files = await getAllFiles();
    const books = [];

    for (const file of files) {
      const id = file.replace(".json", "");
      const book = await readFile(id);
      books.push(book);
    }

    return books;
  }

  async getPaginated({ page = 1, limit = 10, author, year, genre } = {}) {
    const files = await getAllFiles();
    const start = (page - 1) * limit;
    const end = start + limit;

    let matched = 0;
    const data = [];

    for (const file of files) {
      const id = file.replace(".json", "");
      const book = await readFile(id);

      if (author && !book.author?.toLowerCase().includes(author.toLowerCase())) continue;
      if (year && Number(book.year) !== Number(year)) continue;
      if (genre && !book.genre?.toLowerCase().includes(genre.toLowerCase())) continue;

      if (matched >= start && matched < end) {
        data.push(book);
      }
      matched++;
    }

    const totalPages = Math.ceil(matched / limit);
    return { data, total: matched, page, limit, totalPages };
  }

  async getById(id) {
    return await readFile(id);
  }

  async create(data) {
    const id = crypto.randomUUID();

    const newBook = {
      ...ItemModel,
      ...data,
      id
    };

    const filePath = path.join(itemsPath, `${id}.json`);
    await atomicWrite(filePath, newBook);

    return newBook;
  }

  async update(id, data) {
    const book = await readFile(id);

    if (!book) return null;

    const updatedBook = {
      ...book,
      ...data
    };

    const filePath = path.join(itemsPath, `${id}.json`);
    await atomicWrite(filePath, updatedBook);

    return updatedBook;
  }

  async delete(id) {
    await deleteFile(id);
  }

  createStream() {
    async function* generator() {
      const files = await getAllFiles();
      for (const file of files) {
        const id = file.replace('.json', '');
        yield await readFile(id);
      }
    }
    return Readable.from(generator());
  }
}

export default new BooksRepository();