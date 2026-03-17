const booksController = require('#controllers/books.controller');
const validate = require('#utils/validate');

const {
  bookBodySchema,
  bookParamsSchema,
  bookQuerySchema,
  bookUpdateSchema,
} = require('#validators/books.schemas');

module.exports = async function (fastify) {
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