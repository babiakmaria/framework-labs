import backupsController from '../controllers/backups.controller.js';

export default async function (fastify) {
  fastify.get('/backups/:timestamp', {
    onRequest: async (request, reply) => {
      if (request.headers['x-api-key'] !== fastify.config.ADMIN_API_KEY) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
    },
    schema: {
      params: {
        type: 'object',
        required: ['timestamp'],
        properties: {
          timestamp: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, backupsController.getBackup);
}
