export const configSchema = {
  type: 'object',
  required: ['PORT', 'HOST'],
  properties: {
    PORT: { type: 'integer', minimum: 1024, maximum: 65535, default: 3000 },
    HOST: { type: 'string', default: '127.0.0.1' },
    NODE_ENV: { enum: ['development', 'production', 'test'], default: 'development' },
    GENRES_API_PORT: { type: 'integer', default: 3001 },
    ADMIN_API_KEY: { type: 'string' },
    GITHUB_TOKEN: { type: 'string' }
  }
};