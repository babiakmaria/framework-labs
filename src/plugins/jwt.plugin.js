import fp from 'fastify-plugin';
import FastifyJwt from '@fastify/jwt';

export default fp(async (fastify) => {
  await fastify.register(FastifyJwt, {
    secret: fastify.config.JWT_SECRET,
    trusted: async (_request, decodedToken) => {
      // Reject refresh tokens used as access tokens
      if (decodedToken.type === 'refresh') return false;
      if (!decodedToken.jti) return false;
      const count = await fastify.redis.exists(`jwt:bl:${decodedToken.jti}`);
      return count === 0;
    },
  });

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});
