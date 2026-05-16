import { describe, it, expect } from 'vitest';
import { getFullImageUrl } from '../../../utils/getFullUrl.js';

function makeRequest(protocol, host) {
  return { protocol, headers: { host } };
}

describe('getFullImageUrl', () => {
  it('returns null when imagePath is null', () => {
    const req = makeRequest('http', 'localhost:3000');
    expect(getFullImageUrl(req, null)).toBeNull();
  });

  it('returns null when imagePath is undefined', () => {
    const req = makeRequest('http', 'localhost:3000');
    expect(getFullImageUrl(req, undefined)).toBeNull();
  });

  it('returns null when imagePath is empty string', () => {
    const req = makeRequest('http', 'localhost:3000');
    expect(getFullImageUrl(req, '')).toBeNull();
  });

  it('builds http URL correctly', () => {
    const req = makeRequest('http', 'localhost:3000');
    const result = getFullImageUrl(req, '/uploads/1/cover.jpg');
    expect(result).toBe('http://localhost:3000/uploads/1/cover.jpg');
  });

  it('builds https URL correctly', () => {
    const req = makeRequest('https', 'example.com');
    const result = getFullImageUrl(req, '/uploads/2/cover.png');
    expect(result).toBe('https://example.com/uploads/2/cover.png');
  });

  it('preserves the path as-is', () => {
    const req = makeRequest('http', 'api.example.com:8080');
    const path = '/uploads/42/cover.jpeg';
    const result = getFullImageUrl(req, path);
    expect(result).toContain(path);
  });
});
