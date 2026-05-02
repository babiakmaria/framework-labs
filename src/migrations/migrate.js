import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../db/schema.sql');

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  multipleStatements: true
});

const schema = await fs.readFile(schemaPath, 'utf-8');
const hash = crypto.createHash('md5').update(schema).digest('hex');

await connection.query(schema);

await connection.query('INSERT INTO migrations (hash, applied_at) VALUES (?, ?)', [
  hash,
  new Date()
]);

console.log(`Migration complete. Schema hash: ${hash}`);
await connection.end();
