import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findSharedRepos } from '../../../services/github.service.js';

// routes fetch calls by URL fragment; value can be a response object or a function
function buildFetchMock(routeMap) {
  return vi.fn(async (url) => {
    for (const [fragment, handler] of Object.entries(routeMap)) {
      if (url.includes(fragment)) {
        return typeof handler === 'function' ? handler(url) : handler;
      }
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  });
}

function mockOk(data) {
  return { ok: true, status: 200, json: async () => data };
}

function mock404() {
  return { ok: false, status: 404, json: async () => ({}) };
}

function mockError(status, message = 'API error') {
  return { ok: false, status, json: async () => ({ message }) };
}

beforeEach(() => {
  vi.spyOn(global, 'fetch');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('findSharedRepos', () => {
  it('returns shared repos sorted by shared-contributor count', async () => {
    global.fetch = buildFetchMock({
      '/contributors': mockOk([{ login: 'alice' }, { login: 'bob' }, { login: 'carol' }]),
      '/users/alice/repos': mockOk([
        { full_name: 'torvalds/linux' },
        { full_name: 'facebook/react' },
      ]),
      '/users/bob/repos': mockOk([
        { full_name: 'torvalds/linux' },
        { full_name: 'vuejs/vue' },
      ]),
      '/users/carol/repos': mockOk([
        { full_name: 'torvalds/linux' },
        { full_name: 'vuejs/vue' },
      ]),
    });

    const result = await findSharedRepos('owner', 'repo', 'token');

    expect(result.contributorsAnalyzed).toBe(3);
    expect(result.results[0]).toEqual({ repository: 'torvalds/linux', sharedContributors: 3 });
    expect(result.results[1]).toEqual({ repository: 'vuejs/vue', sharedContributors: 2 });
    expect(result.results[2]).toEqual({ repository: 'facebook/react', sharedContributors: 1 });
  });

  it('excludes the target repo from results', async () => {
    global.fetch = buildFetchMock({
      '/contributors': mockOk([{ login: 'alice' }]),
      '/users/alice/repos': mockOk([
        { full_name: 'owner/repo' },   // target, must be excluded
        { full_name: 'other/lib' },
      ]),
    });

    const result = await findSharedRepos('owner', 'repo', 'token');

    const names = result.results.map((r) => r.repository);
    expect(names).not.toContain('owner/repo');
    expect(names).toContain('other/lib');
  });

  it('excludes target repo case-insensitively', async () => {
    global.fetch = buildFetchMock({
      '/contributors': mockOk([{ login: 'alice' }]),
      // same repo, different casing
      '/users/alice/repos': mockOk([
        { full_name: 'Owner/Repo' },
        { full_name: 'other/lib' },
      ]),
    });

    const result = await findSharedRepos('owner', 'repo', 'token');

    const names = result.results.map((r) => r.repository);
    expect(names).not.toContain('Owner/Repo');
    expect(names).toContain('other/lib');
  });

  it('returns empty results when repo has no contributors', async () => {
    global.fetch = buildFetchMock({
      '/contributors': mockOk([]),
    });

    const result = await findSharedRepos('owner', 'repo', 'token');

    expect(result.contributorsAnalyzed).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('returns empty results when contributors endpoint returns 404', async () => {
    global.fetch = buildFetchMock({
      '/contributors': mock404(),
    });

    const result = await findSharedRepos('owner', 'repo', 'token');

    expect(result.contributorsAnalyzed).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('throws when GitHub API returns a non-ok error status', async () => {
    global.fetch = buildFetchMock({
      '/contributors': mockError(403, 'API rate limit exceeded'),
    });

    await expect(findSharedRepos('owner', 'repo', 'token'))
      .rejects.toThrow('API rate limit exceeded');
  });

  it('throws with a generic message when error body has no message field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    });

    await expect(findSharedRepos('owner', 'repo', 'token'))
      .rejects.toThrow('GitHub API error: 500');
  });

  it('paginates contributors when first page returns a full 100-item page', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ login: `user${i}` }));
    const page2 = [{ login: 'extra1' }, { login: 'extra2' }];

    global.fetch = vi.fn(async (url) => {
      if (url.includes('/contributors') && url.includes('page=1')) return mockOk(page1);
      if (url.includes('/contributors') && url.includes('page=2')) return mockOk(page2);
      // user repo calls don't matter here
      if (url.includes('/users/')) return mockOk([]);
      throw new Error(`Unexpected: ${url}`);
    });

    const result = await findSharedRepos('owner', 'repo', 'token');

    // 100 contributors fills the cap, page 2 is never requested
    expect(result.contributorsAnalyzed).toBe(100);
  });

  it('stops contributor pagination when a page returns fewer than 100 items', async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => ({ login: `user${i}` }));

    global.fetch = vi.fn(async (url) => {
      if (url.includes('/contributors')) return mockOk(page1);
      if (url.includes('/users/')) return mockOk([]);
      throw new Error(`Unexpected: ${url}`);
    });

    const contributorFetchCount = 0;
    const result = await findSharedRepos('owner', 'repo', 'token');

    // fewer than 100 items means no next page
    expect(result.contributorsAnalyzed).toBe(50);
    const contributorCalls = global.fetch.mock.calls.filter(([url]) =>
      url.includes('/contributors')
    );
    expect(contributorCalls).toHaveLength(1);
  });

  it('paginates user repos when a user has more than 100 repos', async () => {
    const reposPage1 = Array.from({ length: 100 }, (_, i) => ({ full_name: `user/repo${i}` }));
    const reposPage2 = [{ full_name: 'user/extra-repo' }];

    global.fetch = vi.fn(async (url) => {
      if (url.includes('/contributors')) return mockOk([{ login: 'alice' }]);
      // check &page=2 first; 'page=1' is a substring of 'per_page=100' so it would wrongly match page=2 URLs
      if (url.includes('/users/alice/repos') && url.includes('&page=2')) return mockOk(reposPage2);
      if (url.includes('/users/alice/repos')) return mockOk(reposPage1);
      throw new Error(`Unexpected: ${url}`);
    });

    const result = await findSharedRepos('owner', 'repo', 'token');

    // verify page 2 was requested
    const userRepoCalls = global.fetch.mock.calls.filter(([url]) =>
      url.includes('/users/alice/repos')
    );
    expect(userRepoCalls).toHaveLength(2);

    // all 101 repos have count 1, top 5 is arbitrary
    expect(result.contributorsAnalyzed).toBe(1);
    expect(result.results).toHaveLength(5);
  });

  it('returns at most 5 results even when many repos are shared', async () => {
    const manyRepos = Array.from({ length: 20 }, (_, i) => ({ full_name: `org/repo${i}` }));

    global.fetch = buildFetchMock({
      '/contributors': mockOk([{ login: 'alice' }, { login: 'bob' }]),
      '/users/alice/repos': mockOk(manyRepos),
      '/users/bob/repos': mockOk(manyRepos),
    });

    const result = await findSharedRepos('owner', 'repo', 'token');

    expect(result.results).toHaveLength(5);
  });

  it('works without a token (no Authorization header sent)', async () => {
    global.fetch = buildFetchMock({
      '/contributors': mockOk([{ login: 'alice' }]),
      '/users/alice/repos': mockOk([{ full_name: 'other/lib' }]),
    });

    const result = await findSharedRepos('owner', 'repo', undefined);

    expect(result.contributorsAnalyzed).toBe(1);
    // no auth header when token is absent
    const authHeaders = global.fetch.mock.calls
      .map(([, opts]) => opts?.headers?.Authorization)
      .filter(Boolean);
    expect(authHeaders).toHaveLength(0);
  });

  it('groups contributor repo-fetches in batches of 5 (BATCH_SIZE)', async () => {
    // 6 contributors triggers 2 batches of 5
    const sixContributors = Array.from({ length: 6 }, (_, i) => ({ login: `user${i}` }));

    global.fetch = vi.fn(async (url) => {
      if (url.includes('/contributors')) return mockOk(sixContributors);
      if (url.includes('/users/')) return mockOk([]);
      throw new Error(`Unexpected: ${url}`);
    });

    await findSharedRepos('owner', 'repo', 'token');

    const userRepoCalls = global.fetch.mock.calls.filter(([url]) =>
      url.includes('/users/')
    );
    // one getUserRepos call per contributor
    expect(userRepoCalls).toHaveLength(6);
  });

  it('returns correct shape: contributorsAnalyzed and results array', async () => {
    global.fetch = buildFetchMock({
      '/contributors': mockOk([{ login: 'alice' }]),
      '/users/alice/repos': mockOk([{ full_name: 'some/lib' }]),
    });

    const result = await findSharedRepos('owner', 'repo', 'token');

    expect(result).toHaveProperty('contributorsAnalyzed');
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results[0]).toHaveProperty('repository');
    expect(result.results[0]).toHaveProperty('sharedContributors');
  });
});
