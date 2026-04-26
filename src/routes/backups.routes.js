import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import { createGunzip } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsPath = path.join(__dirname, '../../data/backups');

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
  }, async (request, reply) => {
    const filePath = path.join(backupsPath, `${request.params.timestamp}.gz`);

    try {
      await access(filePath);
    } catch {
      return reply.code(404).send({ message: 'Backup not found' });
    }

    reply.header('Content-Disposition', `attachment; filename="${request.params.timestamp}.json"`);
    reply.type('application/json');

    const gunzip = createGunzip();
    createReadStream(filePath).on('error', (err) => gunzip.destroy(err)).pipe(gunzip);
    return reply.send(gunzip);
  });
}
