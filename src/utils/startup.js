import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { Readable } from 'stream';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsPath = path.join(__dirname, '../../data/backups');
const schemaPath = path.join(__dirname, '../db/schema.sql');
const MAX_BACKUPS = 5;

export async function createBackup(db) {
  await fs.mkdir(backupsPath, { recursive: true });

  const [books] = await db.query('SELECT * FROM books');
  const backupFile = path.join(backupsPath, `${Date.now()}.gz`);

  await pipeline(
    Readable.from([JSON.stringify(books)]),
    createGzip(),
    createWriteStream(backupFile)
  );

  const backups = (await fs.readdir(backupsPath))
    .filter((f) => f.endsWith('.gz'))
    .sort();

  for (const backup of backups.slice(0, backups.length - MAX_BACKUPS)) {
    await fs.unlink(path.join(backupsPath, backup));
  }
}

export async function checkSchemaVersion(fastify) {
  const schema = await fs.readFile(schemaPath, 'utf-8');
  const currentHash = crypto.createHash('md5').update(schema).digest('hex');

  try {
    const [rows] = await fastify.db.query(
      'SELECT hash FROM migrations ORDER BY applied_at DESC LIMIT 1'
    );
    const savedHash = rows[0]?.hash;

    if (savedHash !== currentHash) {
      fastify.log.warn('DB schema has changed. Run "npm run migrate" to apply updates.');
    }
  } catch {
    fastify.log.warn('Could not verify schema version from migrations table.');
  }
}
