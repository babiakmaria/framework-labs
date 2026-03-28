import Fastify from 'fastify';
import registerRoutes from './routes/books.routes.js';
import envPlugin from '../config/env.js';
import ItemModel from "./models/item.model.js";
import { fileURLToPath } from "url";
import fs from "fs/promises"; 
import path from "path";       
import crypto from "crypto";
import multipart from '@fastify/multipart';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
await fastify.register(multipart);
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

async function createBackup() {
  const source = path.join(__dirname, "../data/items");
  const backupRoot = path.join(__dirname, "../data/backups");

  await fs.mkdir(source, { recursive: true });
  await fs.mkdir(backupRoot, { recursive: true });

  const timestamp = Date.now();
  const backupFolder = path.join(backupRoot, `${timestamp}`);
  
  await fs.mkdir(backupFolder, { recursive: true });

  const files = await fs.readdir(source);
  
  for (const file of files) {
    await fs.copyFile(
      path.join(source, file),
      path.join(backupFolder, file)
    );
  }

  const backups = await fs.readdir(backupRoot);
  if (backups.length > 5) {
    backups.sort(); 
    await fs.rm(path.join(backupRoot, backups[0]), { recursive: true });
  }
}

async function checkSchemaVersion() {
  const versionFile = path.join(__dirname, "../data/version.json");

  const currentHash = crypto
    .createHash("md5")
    .update(JSON.stringify(ItemModel))
    .digest("hex");

  let savedHash = null;

  try {
    const version = JSON.parse(await fs.readFile(versionFile, "utf-8"));
    savedHash = version.hash;
  } catch {}

  if (savedHash !== currentHash) {
    fastify.log.warn(
      'Data schema changed. Run "npm run migrate" to update existing files.'
    );
  }
}

try {
  await createBackup();
  await checkSchemaVersion();
  start();
} catch (error) {
  console.error("FATAL STARTUP ERROR:", error);
  process.exit(1);
}
