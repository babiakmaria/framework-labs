import booksController from '#controllers/books.controller';
import {
  createBookSchema,
  getBooksSchema,
  updateBookSchema,
  deleteBookSchema
} from '../schemas/books.schemas.js';

export default async function (fastify) {
  fastify.get('/books', getBooksSchema, booksController.getAll);

  fastify.get('/books/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer', minimum: 1 }
        }
      }
    }
  }, booksController.getById);

  fastify.post('/books', createBookSchema, booksController.create);
  fastify.put('/books/:id', updateBookSchema, booksController.update);
  fastify.patch('/books/:id', updateBookSchema, booksController.patch);
  fastify.delete('/books/:id', deleteBookSchema, booksController.delete);
}