export const createBookSchema = {
  schema: {
    body: {
      type: 'object',
      required: ['title', 'author', 'year'],
      properties: {
        title: {
          type: 'string',
          minLength: 1
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
    },

    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          author: { type: 'string' },
          year: { type: 'integer' }
        }
      }
    }
  }
};

export const getBooksSchema = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        author: { type: 'string' },
        year: { type: 'integer' }
      },
      additionalProperties: false
    },

    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            author: { type: 'string' },
            year: { type: 'integer' }
          }
        }
      }
    }
  }
};

export const updateBookSchema = {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', minimum: 1 }
      }
    },

    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1 },
        author: { type: 'string', minLength: 2 },
        year: { type: 'integer', minimum: 1000 }
      },
      additionalProperties: false
    },

    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          author: { type: 'string' },
          year: { type: 'integer' }
        }
      }
    }
  }
};

export const deleteBookSchema = {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', minimum: 1 }
      }
    },

    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      }
    }
  }
};