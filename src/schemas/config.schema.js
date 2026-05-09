export const configSchema = {
  type: 'object',
  required: ['PORT', 'HOST', 'MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DB', 'SESSION_SECRET'],
  properties: {
    PORT: { type: 'integer', minimum: 1024, maximum: 65535, default: 3000 },
    HOST: { type: 'string', default: '127.0.0.1' },
    NODE_ENV: {
      enum: ['development', 'production', 'test'],
      default: 'development',
    },
    GENRES_API_PORT: { type: 'integer', default: 3001 },
    ADMIN_API_KEY: { type: 'string' },
    GITHUB_TOKEN: { type: 'string' },
    MYSQL_HOST: { type: 'string', default: '127.0.0.1' },
    MYSQL_PORT: { type: 'integer', default: 3306 },
    MYSQL_USER: { type: 'string' },
    MYSQL_PASSWORD: { type: 'string', default: '' },
    MYSQL_DB: { type: 'string' },
    REDIS_HOST: { type: 'string', default: '127.0.0.1' },
    REDIS_PORT: { type: 'integer', default: 6379 },
    SESSION_SECRET: { type: 'string', minLength: 32 },
  },
};
