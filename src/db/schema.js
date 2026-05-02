import { mysqlTable, int, varchar, datetime } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const books = mysqlTable('books', {
  id: int('id').autoincrement().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  year: int('year').notNull(),
  genre: varchar('genre', { length: 100 }),
  image: varchar('image', { length: 500 }),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`)
});
