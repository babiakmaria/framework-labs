const bookSchema = {
  type: 'object',
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

const bookIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1 }
  }
};

const bookUpdateSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    author: { type: 'string', minLength: 2 },
    year: { type: 'integer', minimum: 1000 }
  },
  additionalProperties: false 
};

module.exports = { 
  bookBodySchema: bookSchema,       
  bookParamsSchema: bookIdParamSchema, 
  bookQuerySchema: { type: 'object', properties: {} },
  bookUpdateSchema
};