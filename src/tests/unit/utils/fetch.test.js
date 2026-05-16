import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGenreFetcher } from '../../../utils/fetch.js';

function makeRedis(store = new Map()) {
  return {
    get: vi.fn(async (key) => store.get(key) ?? null),
    setex: vi.fn(async (key, _ttl, value) => store.set(key, value)),
  };
}

describe('createGenreFetcher', () => {
  beforeEach(() => {
    process.env.HOST = 'localhost';
    process.env.GENRES_API_PORT = '3001';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns cached value without fetching', async () => {
    const store = new Map([['genre:1', JSON.stringify({ id: 1, name: 'Fiction' })]]);
    const redis = makeRedis(store);
    const fetchGenre = createGenreFetcher(redis);

    const spy = vi.spyOn(global, 'fetch');
    const result = await fetchGenre(1);

    expect(result).toEqual({ id: 1, name: 'Fiction' });
    expect(spy).not.toHaveBeenCalled();
    expect(redis.get).toHaveBeenCalledWith('genre:1');
  });

  it('fetches from API on cache miss and stores result', async () => {
    const redis = makeRedis();
    const fetchGenre = createGenreFetcher(redis);
    const genre = { id: 2, name: 'Horror' };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => genre,
    });

    const result = await fetchGenre(2);

    expect(result).toEqual(genre);
    expect(redis.setex).toHaveBeenCalledWith('genre:2', 120, JSON.stringify(genre));
  });

  it('returns null when all retries fail', async () => {
    const redis = makeRedis();
    const fetchGenre = createGenreFetcher(redis);

    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const promise = fetchGenre(3);
    // skip retry delays
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
    expect(redis.setex).not.toHaveBeenCalled();
  });

  it('returns null when API responds with non-ok status and retries exhausted', async () => {
    const redis = makeRedis();
    const fetchGenre = createGenreFetcher(redis);

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    });

    const promise = fetchGenre(4);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });

  it('succeeds on second attempt after first failure', async () => {
    const redis = makeRedis();
    const fetchGenre = createGenreFetcher(redis);
    const genre = { id: 5, name: 'Sci-Fi' };

    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({ ok: true, json: async () => genre });

    const promise = fetchGenre(5);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(genre);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not cache null result when fetch fails', async () => {
    const redis = makeRedis();
    const fetchGenre = createGenreFetcher(redis);

    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('fail'));

    const promise = fetchGenre(6);
    await vi.runAllTimersAsync();
    await promise;

    expect(redis.setex).not.toHaveBeenCalled();
  });
});
