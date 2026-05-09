import { createAuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../schemas/auth.schemas.js';

const COOKIE = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 3600 * 1000; // 7 days in ms

export default async function authRoutes(fastify) {
  const auth = createAuthService(fastify.db, fastify.redis, fastify);

  fastify.post('/auth/register', registerSchema, async (request, reply) => {
    const { email, password } = request.body;
    const result = await auth.register(email, password);
    if (result.conflict) {
      return reply.status(409).send({ message: 'Email already in use' });
    }
    return reply.status(201).send(result);
  });

  fastify.post('/auth/login', loginSchema, async (request, reply) => {
    const { email, password } = request.body;
    const user = await auth.login(email, password);
    if (!user) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = auth.signAccess(payload);
    const refreshToken = auth.signRefresh(payload);

    await auth.saveRefresh(user.id, refreshToken);

    reply.setCookie(COOKIE, refreshToken, {
      httpOnly: true,
      secure: fastify.config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: '/',
    });

    return { accessToken };
  });

  fastify.post('/auth/refresh', refreshSchema, async (request, reply) => {
    const token = request.cookies?.[COOKIE];
    if (!token) {
      return reply.status(401).send({ message: 'Missing refresh token' });
    }

    let decoded;
    try {
      decoded = fastify.jwt.verify(token);
    } catch {
      return reply.status(401).send({ message: 'Invalid refresh token' });
    }

    const stored = await auth.getRefresh(decoded.sub);
    if (!stored || stored !== token) {
      return reply.status(401).send({ message: 'Refresh token revoked' });
    }

    const accessToken = auth.signAccess({ sub: decoded.sub, email: decoded.email });
    return { accessToken };
  });

  fastify.post(
    '/auth/logout',
    { ...logoutSchema, onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { jti, exp, sub } = request.user;
      await Promise.all([auth.blacklist(jti, exp), auth.deleteRefresh(sub)]);
      reply.clearCookie(COOKIE, { path: '/' });
      return reply.status(204).send();
    }
  );
}
