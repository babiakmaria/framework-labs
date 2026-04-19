import fs from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'cache', 'reference.json');
const CACHE_TTL_MS = 120_000;
const TIMEOUT_MS = 5_000;
const MAX_RETRIES = 3;

async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeCache(cache) {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

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
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  return null;
}

export async function fetchExternalGenre(genreId) {
  const cache = await readCache();
  const key = String(genreId);
  const entry = cache[key];

  if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) {
    return entry.data;
  }

  const data = await fetchWithRetry(`http://localhost:3001/genres/${genreId}`);

  if (data) {
    cache[key] = { cachedAt: Date.now(), data };
    await writeCache(cache);
  }

  return data;
}
