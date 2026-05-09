import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import RedisStore from 'fastify-session-redis-store';

export default fp(async function sessionPlugin(fastify) {
  await fastify.register(fastifyCookie);

  await fastify.register(fastifySession, {
    secret: fastify.config.SESSION_SECRET,
    cookieName: 'sessionId',
    cookie: {
      secure: fastify.config.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
    store: new RedisStore({
      client: fastify.redis,
      ttl: 24 * 60 * 60,
    }),
    saveUninitialized: false,
  });
});
