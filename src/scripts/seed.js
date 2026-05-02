import mysql from 'mysql2/promise';
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

const seedData = [
  { title: 'Harry Potter', author: 'J.K. Rowling', year: 1997, genre: 'Fantasy' },
  { title: 'Demon Copperhead', author: 'B. Kingsolver', year: 2022, genre: 'Fiction' },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: 1925, genre: 'Classic' }
];

if (force) {
  await pool.query('DELETE FROM books');
  console.log('Existing data cleared.');
}

const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM books');

if (Number(count) > 0) {
  console.log('Database already has data. Use "npm run seed:force" to reset.');
  await pool.end();
  process.exit(0);
}

for (const item of seedData) {
  await pool.query(
    'INSERT INTO books (title, author, year, genre) VALUES (?, ?, ?, ?)',
    [item.title, item.author, item.year, item.genre]
  );
}

console.log(`Seeded ${seedData.length} books.`);
await pool.end();
