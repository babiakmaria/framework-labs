export const REDIS_KEYS = {
  GENRE: (id) => `genre:${id}`,
  ITEMS_PAGE: (page, limit) => `items:page:${page}:limit:${limit}`,
  JWT_BLACKLIST: (jti) => `jwt:bl:${jti}`,
  JWT_REFRESH: (userId) => `jwt:refresh:${userId}`,
};

export const ITEMS_CACHE_PATTERN = 'items:page:*';
