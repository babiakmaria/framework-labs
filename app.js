import Fastify from 'fastify';
import registerRoutes from './routes/books.routes.js';
import envPlugin from './config/env.js';
const fastify = Fastify({ logger: true });
await fastify.register(envPlugin);

if (fastify.config.NODE_ENV === 'development') {
  fastify.log.level = 'info';
  fastify.log.transport = {
    target: 'pino-pretty'
  };
} else {
  fastify.log.level = 'error';
}

await fastify.register(import('@fastify/sensible'));
await fastify.register(import('@fastify/cors'), {
  origin: fastify.config.NODE_ENV === 'development'
    ? '*'
    : 'https://yourdomain.com',

  methods: ['GET', 'POST', 'PATCH', 'DELETE']
});

await fastify.register(import('@fastify/helmet'), {
  global: true
});

await fastify.register(registerRoutes);

fastify.addHook('onClose', async (instance, done) => {
  fastify.log.info('Fastify server is closing...');
  done();
});

fastify.get('/health', async () => {
  return { status: 'ok' };
});

fastify.get('/health/details', {
  onRequest: async (req, reply) => {
    if (req.headers['x-api-key'] !== fastify.config.ADMIN_API_KEY) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }
  }
}, async () => {
  return {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  };
});

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

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

start();