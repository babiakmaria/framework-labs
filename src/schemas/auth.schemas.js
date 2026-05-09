export const registerSchema = {
  schema: {
    tags: ['Auth'],
    summary: 'Register a new user',
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
      },
      additionalProperties: false,
    },
    response: {
      201: {
        description: 'User registered successfully',
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
        },
      },
      409: {
        description: 'Email already in use',
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  },
};

export const loginSchema = {
  schema: {
    tags: ['Auth'],
    summary: 'Login and create a session',
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        description: 'Login successful',
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
        },
      },
      401: {
        description: 'Invalid credentials',
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  },
};

export const logoutSchema = {
  schema: {
    tags: ['Auth'],
    summary: 'Logout and destroy current session',
    response: {
      204: {
        description: 'Session destroyed',
        type: 'null',
      },
    },
  },
};
