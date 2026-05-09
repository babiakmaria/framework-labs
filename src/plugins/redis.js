import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';

export default fp(async (fastify) => {
  await fastify.register(fastifyRedis, {
    host: fastify.config.REDIS_HOST,
    port: fastify.config.REDIS_PORT,
  });
});
