export function createAuthController(authService) {
  async function register(request, reply) {
    try {
      const user = await authService.register(request.body);
      return reply.status(201).send(user);
    } catch (err) {
      if (err.statusCode === 409) {
        return reply.status(409).send({ message: err.message });
      }
      throw err;
    }
  }

  async function login(request, reply) {
    try {
      const user = await authService.login(request.body);
      request.session.set('userId', user.id);
      return reply.status(200).send(user);
    } catch (err) {
      if (err.statusCode === 401) {
        return reply.status(401).send({ message: err.message });
      }
      throw err;
    }
  }

  async function logout(request, reply) {
    await request.session.destroy();
    return reply.status(204).send();
  }

  return { register, login, logout };
}
