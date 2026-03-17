export const bookBodySchema = {
  type: 'object',
  required: ['title', 'author', 'year'], 
  properties: {
    title: { 
      type: 'string', 
      minLength: 1,
    },
    author: { 
      type: 'string', 
      minLength: 2 
    },
    year: { 
      type: 'integer', 
      minimum: 1000, 
      maximum: new Date().getFullYear() 
    }
  },
  additionalProperties: false
};

export const bookParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1 }
  }
};

export const bookUpdateSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    author: { type: 'string', minLength: 2 },
    year: { type: 'integer', minimum: 1000 }
  },
  additionalProperties: false 
};

export const bookQuerySchema = { 
  type: 'object', 
  properties: {
    author: { type: 'string' },
    year: { type: 'integer' }
  },
  additionalProperties: false 
};