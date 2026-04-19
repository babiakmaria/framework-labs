import githubController from '../controllers/github.controller.js';

const sharedReposSchema = {
  schema: {
    querystring: {
      type: 'object',
      required: ['repo'],
      properties: {
        repo: { type: 'string', minLength: 3 }
      },
      additionalProperties: false
    }
  }
};

export default async function (fastify) {
  fastify.get('/github/shared-repos', sharedReposSchema, githubController.sharedReposV1);
}
