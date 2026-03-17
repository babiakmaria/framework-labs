import booksRepository from '#repositories/books.repository';

class BooksService {
  getAll(query) {
    let books = booksRepository.getAll();

    if (query.author) {
      books = books.filter((b) =>
        b.author.toLowerCase().includes(query.author.toLowerCase())
      );
    }

    if (query.year) {
      books = books.filter((b) => b.year === query.year);
    }

    return books;
  }

  getById(id) {
    return booksRepository.getById(id);
  }

  create(data) {
    return booksRepository.create(data);
  }

  update(id, data) {
    return booksRepository.update(id, data);
  }

  patch(id, updateData) {
    const book = this.getById(id);

    if (!book) {
      return null;
    }

    Object.assign(book, updateData);

    return book;
  }
  delete(id) {
    return booksRepository.delete(id);
  }
}

export default new BooksService();