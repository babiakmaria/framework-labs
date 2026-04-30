import booksController from '../controllers/books.controller.js';
import { getBooksPaginatedSchema } from '../schemas/books.schemas.js';

export default async function (fastify) {
  fastify.get('/books', getBooksPaginatedSchema, booksController.getAllPaginated);
}
