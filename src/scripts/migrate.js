// runs pending drizzle migrations against the configured MySQL database.
// uses drizzle-orm/migrator (prod dependency) — drizzle-kit is not required.
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, '../../drizzle');

const connection = await mysql.createConnection({
  host:     process.env.MYSQL_HOST,
  port:     Number(process.env.MYSQL_PORT) || 3306,
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  multipleStatements: true,
});

const db = drizzle(connection);

console.log('running migrations from', migrationsFolder);
await migrate(db, { migrationsFolder });
console.log('migrations complete');

await connection.end();
