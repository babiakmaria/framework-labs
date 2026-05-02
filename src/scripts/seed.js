import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { count } from 'drizzle-orm';
import { books } from '../db/schema.js';
import dotenv from 'dotenv';

dotenv.config();

const force = process.argv.includes('--force');

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB
});

const db = drizzle(pool);

const seedData = [
  { title: 'Harry Potter', author: 'J.K. Rowling', year: 1997, genre: 'Fantasy' },
  { title: 'Demon Copperhead', author: 'B. Kingsolver', year: 2022, genre: 'Fiction' },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: 1925, genre: 'Classic' }
];

if (force) {
  await db.delete(books);
  console.log('Existing data cleared.');
}

const [{ total }] = await db.select({ total: count() }).from(books);

if (Number(total) > 0) {
  console.log('Database already has data. Use "npm run seed:force" to reset.');
  await pool.end();
  process.exit(0);
}

for (const item of seedData) {
  await db.insert(books).values(item);
}

console.log(`Seeded ${seedData.length} books.`);
await pool.end();
