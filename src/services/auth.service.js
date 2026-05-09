import argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';

const ACCESS_TTL_SEC = 15 * 60;        // 15 minutes
const REFRESH_TTL_SEC = 7 * 24 * 3600; // 7 days

export function createAuthService(db, redis, fastify) {
  async function findByEmail(email) {
    const rows = await db.select().from(users).where(eq(users.email, email));
    return rows[0] ?? null;
  }

  async function register(email, password) {
    const existing = await findByEmail(email);
    if (existing) return { conflict: true };

    const hashed = await argon2.hash(password);
    const result = await db.insert(users).values({ email, password: hashed });
    return { id: result[0].insertId, email };
  }

  async function login(email, password) {
    const user = await findByEmail(email);
    if (!user) return null;
    const valid = await argon2.verify(user.password, password);
    if (!valid) return null;
    return { id: user.id, email: user.email };
  }

  function signAccess(payload) {
    return fastify.jwt.sign({ ...payload, jti: randomUUID() }, { expiresIn: ACCESS_TTL_SEC });
  }

  function signRefresh(payload) {
    return fastify.jwt.sign({ ...payload, type: 'refresh' }, { expiresIn: REFRESH_TTL_SEC });
  }

  async function saveRefresh(userId, token) {
    await redis.set(`jwt:refresh:${userId}`, token, 'EX', REFRESH_TTL_SEC);
  }

  async function getRefresh(userId) {
    return redis.get(`jwt:refresh:${userId}`);
  }

  async function deleteRefresh(userId) {
    await redis.del(`jwt:refresh:${userId}`);
  }

  async function blacklist(jti, exp) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis.set(`jwt:bl:${jti}`, '1', 'EX', ttl);
  }

  return { register, login, signAccess, signRefresh, saveRefresh, getRefresh, deleteRefresh, blacklist };
}
