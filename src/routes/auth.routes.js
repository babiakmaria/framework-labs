import { createAuthService } from '../services/auth.service.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { registerSchema, loginSchema, logoutSchema } from '../schemas/auth.schemas.js';

export default async function authRoutes(fastify) {
  const authService = createAuthService(fastify.db);
  const ctrl = createAuthController(authService);

  fastify.post('/register', registerSchema, ctrl.register);
  fastify.post('/login', loginSchema, ctrl.login);
  fastify.post('/logout', logoutSchema, ctrl.logout);
}
