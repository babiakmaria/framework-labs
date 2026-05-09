import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';

export class UsersRepository {
  constructor(db) {
    this.db = db;
  }

  async findByEmail(email) {
    const rows = await this.db.select().from(users).where(eq(users.email, email));
    return rows[0] ?? null;
  }

  async findById(id) {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    return rows[0] ?? null;
  }

  async create({ email, password }) {
    const result = await this.db.insert(users).values({ email, password });
    return this.findById(result[0].insertId);
  }
}
