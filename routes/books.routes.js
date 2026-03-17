import booksController from '#controllers/books.controller';
import validate from '#utils/validate';
import {
  bookBodySchema,
  bookParamsSchema,
  bookQuerySchema,
  bookUpdateSchema,
} from '#validators/books.schemas'

export default async function (fastify) {
  fastify.get(
    '/books',
    {
      preHandler: [validate(bookQuerySchema, 'query')],
    },
    booksController.getAll
  );

  fastify.get(
    '/books/:id',
    {
      preHandler: [validate(bookParamsSchema, 'params')],
    },
    booksController.getById
  );

  fastify.post(
    '/books', 
    {
      preHandler: [
        validate(bookBodySchema, 'body')
      ], 
    }, booksController.create
  );

  fastify.put(
    '/books/:id',
    {
      preHandler: [
        validate(bookParamsSchema, 'params'),
        validate(bookBodySchema, 'body'),
      ],
    },
    booksController.update
  );

  fastify.patch(
    '/books/:id',
    {
      preHandler: [
        validate(bookParamsSchema, 'params'),
        validate(bookUpdateSchema, 'body'), 
      ],
    },
    booksController.patch 
  );

  fastify.delete(
    '/books/:id',
    {
      preHandler: [validate(bookParamsSchema, 'params')],
    },
    booksController.delete
  );
};