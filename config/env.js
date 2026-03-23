import fp from 'fastify-plugin';
import FastifyEnv from '@fastify/env';
import { configSchema } from '../schemas/config.schema.js';

export default fp(async (fastify) => {
  await fastify.register(FastifyEnv, {
    dotenv: true,
    schema: configSchema
  });
});