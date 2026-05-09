import { createBooksController } from '../controllers/books.controller.js';
import { createBooksService } from '../services/books.service.js';
import { createGenreFetcher } from '../utils/fetch.js';
import { getBooksPaginatedSchema } from '../schemas/books.schemas.js';

export default async function (fastify) {
  const booksService = createBooksService(fastify.redis);
  const fetchGenre = createGenreFetcher(fastify.redis);
  const ctrl = createBooksController(booksService, fetchGenre);

  fastify.get('/books', getBooksPaginatedSchema, ctrl.getAllPaginated);
}
