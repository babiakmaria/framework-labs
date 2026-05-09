export const REDIS_KEYS = {
  GENRE: (id) => `genre:${id}`,
  ITEMS_PAGE: (page, limit) => `items:page:${page}:limit:${limit}`,
};

export const ITEMS_CACHE_PATTERN = 'items:page:*';
