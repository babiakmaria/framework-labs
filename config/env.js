import fp from 'fastify-plugin';
import FastifyEnv from '@fastify/env'; 

export default fp(async (fastify) => {
  await fastify.register(FastifyEnv, {
    dotenv: true,
    schema: {
      type: 'object',
      required: ['PORT', 'NODE_ENV', 'ADMIN_API_KEY'],
      properties: {
        PORT: { type: 'number' },
        NODE_ENV: { type: 'string' },
        ADMIN_API_KEY: { type: 'string' }
      }
    }
  });
});