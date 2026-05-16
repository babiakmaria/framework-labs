import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../helpers/buildApp.js';
import { makeMockDb, makeMockRedis } from '../helpers/mockDb.js';

let app;

beforeAll(async () => {
  app = await buildApp({ db: makeMockDb(), redis: makeMockRedis() });
});

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});

describe('GET /health/details', () => {
  it('returns 401 when x-api-key is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/details' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when x-api-key is wrong', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health/details',
      headers: { 'x-api-key': 'wrong-key' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns system info with correct api key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health/details',
      headers: { 'x-api-key': 'test-admin-key' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('pid');
    expect(body).toHaveProperty('nodeVersion');
    expect(body).toHaveProperty('platform');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('memoryUsage');
  });
});
