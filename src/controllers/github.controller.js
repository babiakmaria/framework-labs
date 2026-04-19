import { findSharedRepos as findSharedReposV1 } from '../services/github.service.js';
import { findSharedRepos as findSharedReposV2 } from '../services/github.service.v2.js';

async function handleSharedRepos(request, reply, serviceFn) {
  const repo = decodeURIComponent(request.query.repo);
  const slashIndex = repo.indexOf('/');
  const owner = repo.slice(0, slashIndex);
  const repoName = repo.slice(slashIndex + 1);

  if (!owner || !repoName) {
    return reply.badRequest('Invalid repo format. Use owner/repo');
  }

  const token = request.server.config.GITHUB_TOKEN;
  const data = await serviceFn(owner, repoName, token);

  return reply.send({ repo, ...data });
}

class GithubController {
  async sharedReposV1(request, reply) {
    return handleSharedRepos(request, reply, findSharedReposV1);
  }

  async sharedReposV2(request, reply) {
    return handleSharedRepos(request, reply, findSharedReposV2);
  }
}

export default new GithubController();
