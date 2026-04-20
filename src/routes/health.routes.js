import { healthSchema, healthDetailsSchema } from '../schemas/health.schemas.js';

export default async function (fastify) {
  fastify.get('/health', healthSchema, async () => {
    return { status: 'ok' };
  });

  fastify.get('/health/details', {
    ...healthDetailsSchema,
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
}
