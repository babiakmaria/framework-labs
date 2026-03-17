const { BOOKS } = require('#data/books.data');

class BooksRepository {
  getAll() {
    return BOOKS;
  }

  getById(id) {
    return BOOKS.find((book) => book.id === id);
  }

  create(data) {
    const newBook = {
      id: BOOKS.length ? BOOKS[BOOKS.length - 1].id + 1 : 1,
      ...data,
    };

    BOOKS.push(newBook);
    return newBook;
  }

  update(id, data) {
    const index = BOOKS.findIndex((b) => b.id === id);
    if (index === -1) return null;

    BOOKS[index] = { ...BOOKS[index], ...data };
    return BOOKS[index];
  }

  delete(id) {
    const index = BOOKS.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const deleted = BOOKS[index];
    BOOKS.splice(index, 1);
    return deleted;
  }
}

module.exports = new BooksRepository();