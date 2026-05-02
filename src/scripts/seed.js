import 'dotenv/config';
import mongoose from 'mongoose';
import { Book } from '../../db/models/book.model.js';

// eslint-disable-next-line no-process-env
const { MONGO_URL, MONGO_DB_NAME } = process.env;

const SEED_DATA = [
  { title: 'Harry Potter', author: 'J.K. Rowling', year: 1997, genre: 'Fantasy' },
  { title: 'Demon Copperhead', author: 'B. Kingsolver', year: 2022, genre: 'Fiction' }
];

const force = process.argv.includes('--force');

async function seed() {
  await mongoose.connect(MONGO_URL, { dbName: MONGO_DB_NAME });

  if (force) {
    await Book.deleteMany({});
    console.log('Collection cleared.');
  } else {
    const count = await Book.countDocuments();
    if (count > 0) {
      console.log(`DB is not empty (${count} books). Skipping seed. Use --force to reseed.`);
      await mongoose.disconnect();
      return;
    }
  }

  await Book.insertMany(SEED_DATA);
  console.log(`Seeded ${SEED_DATA.length} books.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
