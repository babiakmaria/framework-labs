import booksRepository from '../repositories/books.repository.js';

class BooksService {
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

  async getById(id) {
    return booksRepository.getById(id);
  }

  async create(data) {
    const bookWithImage = {
      ...data,
      image: data.image ?? null
    };

    return booksRepository.create(bookWithImage);
  }

  async update(id, data) {
    return booksRepository.update(id, data);
  }

  async patch(id, updateData) {
    const book = await this.getById(id);
    if (!book) return null;
    return booksRepository.update(id, { ...book, ...updateData });
  }

  async delete(id) {
    const book = await this.getById(id);

    if (!book) {
      return false;
    }

    await booksRepository.delete(id);

    return true;
  }
}

export default new BooksService();
