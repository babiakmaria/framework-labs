import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { Readable } from 'stream';
import { buildApp } from '../helpers/buildApp.js';
import { makeMockDb, makeMockRedis } from '../helpers/mockDb.js';

// service is mocked, no real filesystem access
vi.mock('../../services/backups.service.js', () => {
  const mock = {
    getBackupStream: vi.fn(),
  };
  return { default: mock };
});

import backupsService from '../../services/backups.service.js';

const VALID_API_KEY = 'test-admin-key';
const VALID_TIMESTAMP = '1716800000';

let app;

beforeAll(async () => {
  app = await buildApp({ db: makeMockDb(), redis: makeMockRedis() });
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/v1/backups/:timestamp - auth guard', () => {
  it('returns 401 when x-api-key header is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${VALID_TIMESTAMP}`,
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when x-api-key is incorrect', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${VALID_TIMESTAMP}`,
      headers: { 'x-api-key': 'wrong-key' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().message).toMatch(/unauthorized/i);
  });

  it('does not call the service when auth fails', async () => {
    backupsService.getBackupStream.mockClear();

    await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${VALID_TIMESTAMP}`,
    });

    expect(backupsService.getBackupStream).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/backups/:timestamp - input validation', () => {
  it('returns 400 when timestamp contains non-digit characters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/not-a-timestamp',
      headers: { 'x-api-key': VALID_API_KEY },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when timestamp is empty string path segment', async () => {
    // Fastify may return 404 for an unmatched route — either way it is not a 200
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/ ',
      headers: { 'x-api-key': VALID_API_KEY },
    });

    expect([400, 404]).toContain(res.statusCode);
  });
});

describe('GET /api/v1/backups/:timestamp - backup not found', () => {
  it('returns 404 when backup file does not exist', async () => {
    backupsService.getBackupStream.mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${VALID_TIMESTAMP}`,
      headers: { 'x-api-key': VALID_API_KEY },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toMatch(/not found/i);
  });

  it('passes the timestamp string to the service unchanged', async () => {
    backupsService.getBackupStream.mockResolvedValue(null);

    await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${VALID_TIMESTAMP}`,
      headers: { 'x-api-key': VALID_API_KEY },
    });

    expect(backupsService.getBackupStream).toHaveBeenCalledWith(VALID_TIMESTAMP);
  });
});

describe('GET /api/v1/backups/:timestamp - successful download', () => {
  it('returns 200 with application/json content-type', async () => {
    const payload = JSON.stringify([{ id: 1, title: 'Dune' }]);
    backupsService.getBackupStream.mockResolvedValue(Readable.from([payload]));

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${VALID_TIMESTAMP}`,
      headers: { 'x-api-key': VALID_API_KEY },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
  });

  it('sets Content-Disposition attachment header with correct filename', async () => {
    const payload = '[]';
    backupsService.getBackupStream.mockResolvedValue(Readable.from([payload]));

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${VALID_TIMESTAMP}`,
      headers: { 'x-api-key': VALID_API_KEY },
    });

    expect(res.statusCode).toBe(200);
    const disposition = res.headers['content-disposition'];
    expect(disposition).toBeDefined();
    expect(disposition).toContain('attachment');
    expect(disposition).toContain(`${VALID_TIMESTAMP}.json`);
  });

  it('streams the backup body to the client', async () => {
    const records = [
      { id: 1, title: 'Dune', author: 'Frank Herbert' },
      { id: 2, title: 'Foundation', author: 'Isaac Asimov' },
    ];
    const payload = JSON.stringify(records);
    backupsService.getBackupStream.mockResolvedValue(Readable.from([payload]));

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/backups/${VALID_TIMESTAMP}`,
      headers: { 'x-api-key': VALID_API_KEY },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(2);
    expect(body[0].title).toBe('Dune');
  });
});
