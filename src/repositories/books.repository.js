import path from "path";
import { v4 as uuidv4 } from "uuid";

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

  async getById(id) {
    return await readFile(id);
  }

  async create(data) {
    const id = uuidv4();

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
}

export default new BooksRepository();