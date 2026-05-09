const bearerSecurity = [{ bearerAuth: [] }];

export const registerSchema = {
  schema: {
    tags: ['Auth'],
    summary: 'Register a new user',
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
      },
      additionalProperties: false,
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
        },
      },
    },
  },
};

export const loginSchema = {
  schema: {
    tags: ['Auth'],
    summary: 'Login',
    description:
      'Returns access token (TTL 15 min) in body. Sets refresh token (TTL 7 days) as httpOnly cookie.',
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
        },
      },
    },
  },
};

export const refreshSchema = {
  schema: {
    tags: ['Auth'],
    summary: 'Refresh access token',
    description: 'Uses the httpOnly refresh token cookie to issue a new access token.',
    response: {
      200: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
        },
      },
    },
  },
};

export const logoutSchema = {
  schema: {
    tags: ['Auth'],
    summary: 'Logout',
    description:
      'Blacklists the current access token in Redis and removes the refresh token. Requires Authorization: Bearer <token>.',
    security: bearerSecurity,
    headers: {
      type: 'object',
      properties: {
        authorization: {
          type: 'string',
          description: 'Bearer <token>',
        },
      },
    },
    response: {
      204: { type: 'null', description: 'Successfully logged out' },
    },
  },
};
