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
        },
          genre: {
          type: 'string',
          minLength: 3
        },
        image: {
        type: ['string', 'null']
        }
      },
      additionalProperties: false
    },

    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          author: { type: 'string' },
          year: { type: 'integer' },
          genre: { type: 'string' },
          image: { type: ['string', 'null'] }
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
        year: { type: 'integer' },
        genre: { type: 'string' }
      },
      additionalProperties: false
    },

    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            author: { type: 'string' },
            year: { type: 'integer' },
            genre: { type: 'string' },
            image: { type: ['string', 'null'] }
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
        id: { type: 'string' }
      }
    },

    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1 },
        author: { type: 'string', minLength: 2 },
        year: { type: 'integer', minimum: 1000 },
        genre: { type: 'string', minLength: 3 },
        image: { type: ['string', 'null'] }
      },
      additionalProperties: false
    },

    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          author: { type: 'string' },
          year: { type: 'integer' },
          genre: { type: 'string' },
          image: { type: ['string', 'null'] }
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
        id: { type: 'string' }
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