import { REDIS_KEYS } from '../constants/redis.keys.js';

const CACHE_TTL_S = 120;
const TIMEOUT_MS = 5_000;
const MAX_RETRIES = 3;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url) {
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchWithTimeout(url);
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  return null;
}

export function createGenreFetcher(redis) {
  return async function fetchExternalGenre(genreId) {
    const key = REDIS_KEYS.GENRE(genreId);
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    // eslint-disable-next-line no-process-env
    const baseUrl = `http://${process.env.HOST}:${process.env.GENRES_API_PORT ?? 3001}`;
    const data = await fetchWithRetry(`${baseUrl}/genres/${genreId}`);

    if (data) {
      await redis.setex(key, CACHE_TTL_S, JSON.stringify(data));
    }

    return data;
  };
}
