import { createBooksController } from '../controllers/books.controller.js';
import { createBooksService } from '../services/books.service.js';
import { createGenreFetcher } from '../utils/fetch.js';
import {
  createBookSchema,
  getBooksSchema,
  updateBookSchema,
  deleteBookSchema,
} from '../schemas/books.schemas.js';

async function requireAuth(request, reply) {
  if (!request.session.get('userId')) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
}

export default async function (fastify) {
  const booksService = createBooksService(fastify.redis);
  const fetchGenre = createGenreFetcher(fastify.redis);
  const ctrl = createBooksController(booksService, fetchGenre);

  // Public routes (no auth required)
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

  // Protected routes — onRequest hook applied at the router level
  fastify.register(async function protectedRoutes(fastify) {
    fastify.addHook('onRequest', requireAuth);

    fastify.post('/items/import', ctrl.importItems);

    fastify.post('/items/:id/image', ctrl.uploadImage);

    fastify.post('/books', createBookSchema, ctrl.create);

    fastify.put(
      '/books/:id',
      {
        ...updateBookSchema,
        schema: {
          ...updateBookSchema.schema,
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
        schema: {
          ...updateBookSchema.schema,
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
        schema: {
          ...deleteBookSchema.schema,
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
  });
}
