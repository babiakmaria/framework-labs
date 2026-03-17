export const configSchema = {
  type: 'object',
  required: ['PORT', 'HOST'],
  properties: {
    PORT: { type: 'integer', minimum: 1024, maximum: 65535, default: 3000 },
    HOST: { type: 'string', format: 'hostname', default: '127.0.0.1' },
    NODE_ENV: { enum: ['development', 'production', 'test'], default: 'development' }
  }
};