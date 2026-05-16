import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import { BookAgeTransform } from '../../../transforms/books.transform.js';

function collectStream(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(chunks));
    readable.on('error', reject);
  });
}
describe('BookAgeTransform', () => {
  it('adds correct age for a recent book', async () => {
    const transform = new BookAgeTransform();
    const currentYear = new Date().getFullYear();
    const book = { id: 1, title: 'Test', author: 'Author', year: currentYear - 5, genre: 'Fiction' };

    const source = Readable.from([book]);
    source.pipe(transform);
    const results = await collectStream(transform);

    expect(results[0].age).toBe(5);
  });
  it('adds age=0 for current-year book', async () => {
    const transform = new BookAgeTransform();
    const currentYear = new Date().getFullYear();
    const book = { id: 2, title: 'New', author: 'Author', year: currentYear };

    const source = Readable.from([book]);
    source.pipe(transform);
    const [result] = await collectStream(transform);

    expect(result.age).toBe(0);
  });

  it('handles year as string (coerces to number)', async () => {
    const transform = new BookAgeTransform();
    const currentYear = new Date().getFullYear();
    const book = { id: 4, title: 'Book', author: 'A', year: String(currentYear - 10) };

    const source = Readable.from([book]);
    source.pipe(transform);
    const [result] = await collectStream(transform);

    expect(result.age).toBe(10);
  });

  it('processes multiple books in order', async () => {
    const transform = new BookAgeTransform();
    const currentYear = new Date().getFullYear();
    const books = [
      { id: 1, year: currentYear - 1 },
      { id: 2, year: currentYear - 2 },
      { id: 3, year: currentYear - 3 },
    ];

    const source = Readable.from(books);
    source.pipe(transform);
    const results = await collectStream(transform);

    expect(results).toHaveLength(3);
    expect(results[0].age).toBe(1);
    expect(results[1].age).toBe(2);
    expect(results[2].age).toBe(3);
  });
});
