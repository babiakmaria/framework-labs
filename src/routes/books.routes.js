import { createBooksController } from '../controllers/books.controller.js';
import { createBooksService } from '../services/books.service.js';
import { createGenreFetcher } from '../utils/fetch.js';
import {
  createBookSchema,
  getBooksSchema,
  updateBookSchema,
  deleteBookSchema,
} from '../schemas/books.schemas.js';

export default async function (fastify) {
  const booksService = createBooksService(fastify.redis);
  const fetchGenre = createGenreFetcher(fastify.redis);
  const ctrl = createBooksController(booksService, fetchGenre);
  const auth = { onRequest: [fastify.authenticate], schema: { security: [{ bearerAuth: [] }] } };

  fastify.get(
    '/items/export',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            transform: { type: 'string', enum: ['true', 'false'] },
          },
        },
      },
    },
    ctrl.exportItems
  );

  fastify.get('/items/stream', ctrl.streamItems);

  fastify.post('/items/import', { onRequest: auth.onRequest, schema: auth.schema }, ctrl.importItems);

  fastify.post('/items/:id/image', { onRequest: auth.onRequest, schema: auth.schema }, ctrl.uploadImage);

  fastify.get(
    '/items/:id/details',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    ctrl.getDetails
  );

  fastify.get('/books', getBooksSchema, ctrl.getAll);

  fastify.get(
    '/books/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    ctrl.getById
  );

  fastify.post('/books', { ...createBookSchema, onRequest: auth.onRequest, schema: { ...createBookSchema.schema, security: [{ bearerAuth: [] }] } }, ctrl.create);

  fastify.put(
    '/books/:id',
    {
      ...updateBookSchema,
      onRequest: auth.onRequest,
      schema: {
        ...updateBookSchema.schema,
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    ctrl.update
  );

  fastify.patch(
    '/books/:id',
    {
      ...updateBookSchema,
      onRequest: auth.onRequest,
      schema: {
        ...updateBookSchema.schema,
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    ctrl.patch
  );

  fastify.delete(
    '/books/:id',
    {
      ...deleteBookSchema,
      onRequest: auth.onRequest,
      schema: {
        ...deleteBookSchema.schema,
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    ctrl.delete
  );
}
