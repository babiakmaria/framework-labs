export const healthSchema = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' }
        }
      }
    }
  }
};

export const healthDetailsSchema = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        'x-api-key': { type: 'string' }
      },
      required: ['x-api-key']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          pid: { type: 'integer' },
          nodeVersion: { type: 'string' },
          platform: { type: 'string' },
          uptime: { type: 'number' },
          memoryUsage: {
            type: 'object',
            properties: {
              rss: { type: 'integer' },
              heapTotal: { type: 'integer' },
              heapUsed: { type: 'integer' },
              external: { type: 'integer' },
              arrayBuffers: { type: 'integer' }
            }
          }
        }
      },
      401: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      }
    }
  }
};
