import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { Readable } from 'stream';
import path from 'path';
import { fileURLToPath } from 'url';
import { books } from '../db/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupsPath = path.join(__dirname, '../../data/backups');
const MAX_BACKUPS = 5;

export async function createBackup(db) {
  await fs.mkdir(backupsPath, { recursive: true });

  const allBooks = await db.select().from(books);
  const backupFile = path.join(backupsPath, `${Date.now()}.gz`);

  await pipeline(
    Readable.from([JSON.stringify(allBooks)]),
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
