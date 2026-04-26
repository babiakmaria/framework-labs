import Fastify from 'fastify';
import path from 'path';
import registerRoutes from './routes/books.routes.js';
import registerRoutesV2 from './routes/books.routes.v2.js';
import registerGithubRoutes from './routes/github.routes.js';
import registerGithubRoutesV2 from './routes/github.routes.v2.js';
import registerHealthRoutes from './routes/health.routes.js';
import registerBooksWsRoutes from './routes/books.ws.routes.js';
import registerBackupsRoutes from './routes/backups.routes.js';
import envPlugin from './config/env.js';
import multipart from '@fastify/multipart';
import { createBackup, checkSchemaVersion } from './utils/startup.js';

const fastify = Fastify({
  // eslint-disable-next-line no-process-env
  logger: process.env.NODE_ENV === 'development'
    ? {
        level: 'info',
        transport: {
          target: 'pino-pretty'
        }
      }
    : {
        level: 'error'
      }
});

await fastify.register(envPlugin);
await fastify.register(import('@fastify/websocket'));
await fastify.register(multipart);
await fastify.register(import('@fastify/sensible'));
await fastify.register(import('@fastify/cors'), {
  origin: fastify.config.NODE_ENV === 'development'
    ? '*'
    : 'https://yourdomain.com',

  methods: ['GET', 'POST', 'PATCH', 'DELETE']
});

await fastify.register(import('@fastify/helmet'), {
  global: true,
  contentSecurityPolicy: false
});

await fastify.register(import('@fastify/swagger'), {
  openapi: {
    info: {
      title: 'Books API',
      version: '2.0.0'
    },
    servers: [
      { url: 'http://localhost:3000' }
    ]
  }
});

await fastify.register(import('@fastify/swagger-ui'), {
  routePrefix: '/docs'
});

await fastify.register(import('@fastify/rate-limit'), {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Try again in 1 minute.'
  })
});

await fastify.register(import('@fastify/static'), {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/'
});

await fastify.register(registerBooksWsRoutes);
await fastify.register(registerRoutes, { prefix: '/api/v1' });
await fastify.register(registerBackupsRoutes, { prefix: '/api/v1' });
await fastify.register(registerRoutesV2, { prefix: '/api/v2' });
await fastify.register(registerGithubRoutes, { prefix: '/api/v1' });
await fastify.register(registerGithubRoutesV2, { prefix: '/api/v2' });
await fastify.register(registerHealthRoutes);

fastify.addHook('onClose', async (instance, done) => {
  fastify.log.info('Fastify server is closing...');
  done();
});

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.statusCode === 429) {
    return reply.status(429).send({
      statusCode: 429,
      error: 'Too Many Requests',
      message: error.message
    });
  }

  if (error.validation) {
    return reply.status(400).send({
      message: 'Validation error',
      details: error.validation
    });
  }

  reply.status(500).send({
    message: 'Internal Server Error'
  });
});

const gracefulShutdown = async () => {
  fastify.log.info('Shutting down server...');

  try {
    await fastify.close();
    fastify.log.info('Server closed successfully');
    await fastify.log.flush();

    process.exit(0);
  } catch (err) {
    fastify.log.error(err);
    await fastify.log.flush();
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('uncaughtException', (err) => {
  fastify.log.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  fastify.log.error('Unhandled Rejection:', err);
  process.exit(1);
});

const start = async () => {
  try {
    await fastify.listen({ port: fastify.config.PORT });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

try {
  await createBackup();
  await checkSchemaVersion(fastify.log);
  start();
} catch (error) {
  console.error("FATAL STARTUP ERROR:", error);
  process.exit(1);
}
