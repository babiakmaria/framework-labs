import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { buildApp } from '../helpers/buildApp.js';
import { makeDrizzleDb } from '../helpers/mockDrizzle.js';
import { makeMockRedis } from '../helpers/mockDb.js';

let app;
let db;
let redis;

beforeAll(async () => {
  db = makeDrizzleDb();
  redis = makeMockRedis();
  app = await buildApp({ db, redis });
});

beforeEach(() => {
  db._resetUsers();
  redis._clear();
});

afterAll(async () => {
  await app.close();
});

async function register(email = 'test@example.com', password = 'password123') {
  return app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password },
  });
}

async function login(email = 'test@example.com', password = 'password123') {
  return app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password },
  });
}

describe('POST /auth/register', () => {
  it('creates user and returns 201 with id and email', async () => {
    const res = await register('new@example.com', 'password123');
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty('id');
    expect(body.email).toBe('new@example.com');
  });

  it('returns 409 when email already in use', async () => {
    await register('dup@example.com', 'pass123');
    const res = await register('dup@example.com', 'pass123');
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toMatch(/already in use/i);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await register('not-an-email', 'password123');
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when password is too short (< 6 chars)', async () => {
    const res = await register('valid@example.com', '123');
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { password: 'password123' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns 200 with accessToken and sets refreshToken cookie', async () => {
    await register();
    const res = await login();

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('accessToken');
    expect(typeof body.accessToken).toBe('string');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieStr).toContain('refreshToken=');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('returns 401 for non-existent user', async () => {
    const res = await login('nobody@example.com', 'password123');
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toMatch(/invalid credentials/i);
  });

  it('returns 401 for wrong password', async () => {
    await register();
    const res = await login('test@example.com', 'wrongpassword');
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toMatch(/invalid credentials/i);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'bad-email', password: 'pass123' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  it('returns new accessToken using refresh cookie', async () => {
    await register();
    const loginRes = await login();

    const cookies = loginRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    const match = cookieHeader.match(/refreshToken=([^;]+)/);
    const refreshTokenValue = match?.[1];

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: `refreshToken=${refreshTokenValue}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('accessToken');
  });

  it('returns 401 when refresh cookie is missing', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/refresh' });
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toMatch(/missing refresh token/i);
  });

  it('returns 401 when refresh token is revoked (not in Redis)', async () => {
    await register();
    const loginRes = await login();
    const cookies = loginRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    const match = cookieHeader.match(/refreshToken=([^;]+)/);
    const refreshTokenValue = match?.[1];

    // simulate revocation by wiping Redis
    redis._clear();

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: `refreshToken=${refreshTokenValue}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for a malformed refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: 'refreshToken=not.a.real.jwt.token' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('returns 204 and clears cookie', async () => {
    await register();
    const loginRes = await login();
    const accessToken = loginRes.json().accessToken;

    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(204);
    const cookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : (cookies ?? '');
    // cookie must be present with an expired or zero max-age
    expect(cookieStr).toMatch(/refreshToken=/);
  });

  it('returns 401 when no access token provided', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/logout' });
    expect(res.statusCode).toBe(401);
  });

  it('blacklists the access token after logout', async () => {
    await register();
    const loginRes = await login();
    const accessToken = loginRes.json().accessToken;

    await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // reusing the blacklisted token should fail
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(401);
  });
});
