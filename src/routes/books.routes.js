import booksController from '../controllers/books.controller.js';
import {
  createBookSchema,
  getBooksSchema,
  updateBookSchema,
  deleteBookSchema
} from '../schemas/books.schemas.js';

export default async function (fastify) {
  fastify.get('/items/export', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          transform: { type: 'string', enum: ['true', 'false'] }
        }
      }
    }
  }, booksController.exportItems);

  fastify.get('/items/stream', booksController.streamItems);

  fastify.post('/items/import', booksController.importItems);

fastify.post('/items/:id/image', booksController.uploadImage);

  fastify.get('/items/:id/details', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, booksController.getDetails);

  fastify.get('/books', getBooksSchema, booksController.getAll);

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