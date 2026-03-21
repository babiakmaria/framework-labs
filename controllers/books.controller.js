import booksService from '#services/books.service';
import { ERROR_MESSAGES } from '../constants/messages.js';

class BooksController {
  getAll(request, reply) {
    const books = booksService.getAll(request.query);
    reply.send(books);
  }

  getById(request, reply) {
    const book = booksService.getById(request.params.id);

    if (!book) {
      return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    }

    reply.send(book);
  }

  create(request, reply) {
    const book = booksService.create(request.body);
    reply.status(201).send(book);
  }

  update(request, reply) {
    const book = booksService.update(request.params.id, request.body);

    if (!book) {
      return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    }

    reply.send(book);
  }

  patch(request, reply) {
    const book = booksService.patch(request.params.id, request.body);

    if (!book) {
      return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
    }

    reply.send(book);
  }

  delete(request, reply) {
    const book = booksService.delete(request.params.id);

  if (!book) {
    return reply.notFound(ERROR_MESSAGES.BOOK_NOT_FOUND);
  }

    reply.send({ message: 'Deleted successfully' });
  }
}

export default new BooksController();