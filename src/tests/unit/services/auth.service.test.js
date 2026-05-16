import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthService } from '../../../services/auth.service.js';

// argon2 is mocked, no real hashing
vi.mock('argon2', () => ({
  default: {
    hash: vi.fn(async (pw) => `hashed:${pw}`),
    verify: vi.fn(async (hash, pw) => hash === `hashed:${pw}`),
  },
}));

function makeDb(overrides = {}) {
  const select = vi.fn();
  const from = vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) }));
  select.mockReturnValue({ from });

  return {
    select: () => ({ from: () => ({ where: (cond) => overrides.rows ?? [] }) }),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([{ insertId: 99 }]) })),
    ...overrides,
  };
}

function makeRedis() {
  const store = new Map();
  return {
    get: vi.fn(async (key) => store.get(key) ?? null),
    set: vi.fn(async (key, value, _ex, _ttl) => store.set(key, value)),
    del: vi.fn(async (key) => store.delete(key)),
    exists: vi.fn(async (key) => (store.has(key) ? 1 : 0)),
    _store: store,
  };
}

function makeFastify(redis) {
  return {
    jwt: {
      sign: vi.fn((payload, opts) => `token||${JSON.stringify(payload)}||${opts?.expiresIn}`),
      verify: vi.fn((token) => JSON.parse(token.split('||')[1])),
    },
    redis,
    config: { NODE_ENV: 'test' },
  };
}

describe('AuthService.register', () => {
  it('returns id and email for new user', async () => {
    const db = {
      select: () => ({ from: () => ({ where: async () => [] }) }),
      insert: () => ({ values: async () => [{ insertId: 1 }] }),
    };
    const redis = makeRedis();
    const fastify = makeFastify(redis);
    const auth = createAuthService(db, redis, fastify);

    const result = await auth.register('new@example.com', 'password123');

    expect(result).toEqual({ id: 1, email: 'new@example.com' });
  });

  it('returns conflict:true when email already exists', async () => {
    const db = {
      select: () => ({ from: () => ({ where: async () => [{ id: 1, email: 'x@x.com', password: 'h' }] }) }),
      insert: vi.fn(),
    };
    const redis = makeRedis();
    const fastify = makeFastify(redis);
    const auth = createAuthService(db, redis, fastify);

    const result = await auth.register('x@x.com', 'password');

    expect(result).toEqual({ conflict: true });
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  it('returns user data on valid credentials', async () => {
    const user = { id: 5, email: 'user@example.com', password: 'hashed:mypassword' };
    const db = {
      select: () => ({ from: () => ({ where: async () => [user] }) }),
    };
    const redis = makeRedis();
    const fastify = makeFastify(redis);
    const auth = createAuthService(db, redis, fastify);

    const result = await auth.login('user@example.com', 'mypassword');

    expect(result).toEqual({ id: 5, email: 'user@example.com' });
  });

  it('returns null when user not found', async () => {
    const db = {
      select: () => ({ from: () => ({ where: async () => [] }) }),
    };
    const redis = makeRedis();
    const fastify = makeFastify(redis);
    const auth = createAuthService(db, redis, fastify);

    const result = await auth.login('nobody@example.com', 'pass');

    expect(result).toBeNull();
  });

  it('returns null when password is wrong', async () => {
    const user = { id: 2, email: 'u@u.com', password: 'hashed:correct' };
    const db = {
      select: () => ({ from: () => ({ where: async () => [user] }) }),
    };
    const redis = makeRedis();
    const fastify = makeFastify(redis);
    const auth = createAuthService(db, redis, fastify);

    const result = await auth.login('u@u.com', 'wrongpassword');

    expect(result).toBeNull();
  });
});

describe('AuthService tokens', () => {
  let auth, redis;

  beforeEach(() => {
    redis = makeRedis();
    const fastify = makeFastify(redis);
    const db = { select: () => ({ from: () => ({ where: async () => [] }) }) };
    auth = createAuthService(db, redis, fastify);
  });

  it('signAccess returns a token string', () => {
    const token = auth.signAccess({ sub: 1, email: 'a@b.com' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('signRefresh includes type:refresh in payload', () => {
    const token = auth.signRefresh({ sub: 1, email: 'a@b.com' });
    const payload = JSON.parse(token.split('||')[1]);
    expect(payload.type).toBe('refresh');
  });

  it('saveRefresh stores token in redis', async () => {
    await auth.saveRefresh(1, 'my-refresh-token');
    expect(redis.set).toHaveBeenCalledWith('jwt:refresh:1', 'my-refresh-token', 'EX', expect.any(Number));
  });

  it('getRefresh retrieves stored token', async () => {
    redis._store.set('jwt:refresh:7', 'stored-token');
    const token = await auth.getRefresh(7);
    expect(token).toBe('stored-token');
  });

  it('deleteRefresh removes token from redis', async () => {
    redis._store.set('jwt:refresh:3', 'token-to-delete');
    await auth.deleteRefresh(3);
    expect(redis.del).toHaveBeenCalledWith('jwt:refresh:3');
  });
});

describe('AuthService.blacklist', () => {
  let auth, redis;

  beforeEach(() => {
    redis = makeRedis();
    const fastify = makeFastify(redis);
    const db = { select: () => ({ from: () => ({ where: async () => [] }) }) };
    auth = createAuthService(db, redis, fastify);
  });

  it('stores jti with positive TTL', async () => {
    const jti = 'test-jti';
    const exp = Math.floor(Date.now() / 1000) + 900; // 15 min TTL

    await auth.blacklist(jti, exp);

    expect(redis.set).toHaveBeenCalledWith(
      `jwt:bl:${jti}`,
      '1',
      'EX',
      expect.any(Number)
    );
    const ttl = redis.set.mock.calls[0][3];
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(900);
  });

  it('does not store jti when token is already expired', async () => {
    const jti = 'expired-jti';
    const exp = Math.floor(Date.now() / 1000) - 60; // already expired

    await auth.blacklist(jti, exp);

    expect(redis.set).not.toHaveBeenCalled();
  });
});
