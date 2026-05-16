import Fastify from 'fastify';
import fp from 'fastify-plugin';
import FastifyJwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import path from 'path';

import registerAuthRoutes from '../../routes/auth.routes.js';
import registerBooksRoutes from '../../routes/books.routes.js';
import registerBooksRoutesV2 from '../../routes/books.routes.v2.js';
import registerHealthRoutes from '../../routes/health.routes.js';
import registerBackupsRoutes from '../../routes/backups.routes.js';
import { initRepository } from '../../repositories/books.repository.js';

const JWT_SECRET = 'test-secret-that-is-long-enough-32ch';

export async function buildApp({ db, redis, config = {} } = {}) {
  const app = Fastify({ logger: false });

  const mergedConfig = {
    NODE_ENV: 'test',
    JWT_SECRET,
    JWT_REFRESH_SECRET: 'test-refresh-secret-key-32chars!!',
    PORT: 3000,
    HOST: '0.0.0.0',
    ADMIN_API_KEY: 'test-admin-key',
    GENRES_API_PORT: 3001,
    ...config,
  };

  app.decorate('config', mergedConfig);
  app.decorate('db', db);
  app.decorate('redis', redis);

  await app.register(
    fp(async (fastify) => {
      await fastify.register(FastifyJwt, {
        secret: JWT_SECRET,
        trusted: async (_req, decoded) => {
          if (decoded.type === 'refresh') return false;
          if (!decoded.jti) return false;
          const count = await redis.exists(`jwt:bl:${decoded.jti}`);
          return count === 0;
        },
      });

      fastify.decorate('authenticate', async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          reply.send(err);
        }
      });
    })
  );

  await app.register(cookie);
  await app.register(sensible);
  await app.register(multipart);
  await app.register(import('@fastify/static'), {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  initRepository(db);

  await app.register(registerAuthRoutes);
  await app.register(registerHealthRoutes);
  await app.register(registerBooksRoutes, { prefix: '/api/v1' });
  await app.register(registerBooksRoutesV2, { prefix: '/api/v2' });
  await app.register(registerBackupsRoutes, { prefix: '/api/v1' });

  app.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({ message: 'Validation error', details: error.validation });
    }
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ message: error.message });
    }
    reply.status(500).send({ message: 'Internal Server Error' });
  });

  await app.ready();
  return app;
}
