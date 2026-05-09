import argon2 from 'argon2';
import { UsersRepository } from '../repositories/users.repository.js';

export function createAuthService(db) {
  const repo = new UsersRepository(db);

  async function register({ email, password }) {
    const existing = await repo.findByEmail(email);
    if (existing) {
      const err = new Error('Email already in use');
      err.statusCode = 409;
      throw err;
    }
    const hashed = await argon2.hash(password);
    const user = await repo.create({ email, password: hashed });
    const { password: _pw, ...safeUser } = user;
    return safeUser;
  }

  async function login({ email, password }) {
    const user = await repo.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }
    const { password: _pw, ...safeUser } = user;
    return safeUser;
  }

  return { register, login };
}
