import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import { NdjsonTransform } from '../../../transforms/ndjson.transform.js';

function collectStream(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk.toString()));
    readable.on('end', () => resolve(chunks));
    readable.on('error', reject);
  });
}

describe('NdjsonTransform', () => {
  it('serializes an object to a JSON line with trailing newline', async () => {
    const transform = new NdjsonTransform();
    const record = { id: 1, title: 'Test Book' };

    const source = Readable.from([record]);
    source.pipe(transform);
    const [line] = await collectStream(transform);

    expect(line).toBe(JSON.stringify(record) + '\n');
  });

  it('each record produces exactly one newline-terminated line', async () => {
    const transform = new NdjsonTransform();
    const records = [
      { id: 1, title: 'A' },
      { id: 2, title: 'B' },
      { id: 3, title: 'C' },
    ];

    const source = Readable.from(records);
    source.pipe(transform);
    const chunks = await collectStream(transform);

    expect(chunks).toHaveLength(3);
    chunks.forEach((chunk, i) => {
      expect(chunk).toBe(JSON.stringify(records[i]) + '\n');
    });
  });

  it('handles objects with null fields', async () => {
    const transform = new NdjsonTransform();
    const record = { id: 1, title: 'Book', image: null, genre: null };

    const source = Readable.from([record]);
    source.pipe(transform);
    const [line] = await collectStream(transform);

    const parsed = JSON.parse(line.trim());
    expect(parsed.image).toBeNull();
    expect(parsed.genre).toBeNull();
  });

  it('handles nested objects', async () => {
    const transform = new NdjsonTransform();
    const record = { id: 1, meta: { page: 1, total: 100 } };

    const source = Readable.from([record]);
    source.pipe(transform);
    const [line] = await collectStream(transform);

    const parsed = JSON.parse(line.trim());
    expect(parsed.meta.page).toBe(1);
    expect(parsed.meta.total).toBe(100);
  });
});
