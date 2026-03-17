const fastify = require('fastify')({ logger: true });

fastify.register(require('#routes/books.routes'));

fastify.get('/', async (request, reply) => {
  return { message: 'API is running' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();