import booksController from '../controllers/books.controller.js';
import {
  createBookSchema,
  getBooksPaginatedSchema,
  updateBookSchema,
  deleteBookSchema
} from '../schemas/books.schemas.js';

export default async function (fastify) {
  fastify.get('/items/export', booksController.exportItems);

  fastify.post('/items/import', booksController.importItems);

  fastify.post('/items/:id/image', booksController.uploadImage);

  fastify.get('/items', getBooksPaginatedSchema, booksController.getAllPaginated);

  fastify.get('/books', getBooksPaginatedSchema, booksController.getAllPaginated);

  fastify.get('/books/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, booksController.getById);

  fastify.post('/books', createBookSchema, booksController.create);

  fastify.put('/books/:id', {
    ...updateBookSchema,
    schema: {
      ...updateBookSchema.schema,
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, booksController.update);

  fastify.patch('/books/:id', {
    ...updateBookSchema,
    schema: {
      ...updateBookSchema.schema,
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, booksController.patch);

  fastify.delete('/books/:id', {
    ...deleteBookSchema,
    schema: {
      ...deleteBookSchema.schema,
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, booksController.delete);
}
