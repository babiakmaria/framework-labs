import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findSharedRepos } from '../../../services/github.service.v2.js';

function mockRestOk(data) {
  return { ok: true, status: 200, json: async () => data };
}

function mock404() {
  return { ok: false, status: 404, json: async () => ({}) };
}

// builds a GraphQL response in the shape batchGetUserReposGraphQL expects
function mockGraphQL(userReposMap) {
  const data = {};
  Object.entries(userReposMap).forEach(([login, repos], i) => {
    data[`u${i}`] = {
      repositories: {
        nodes: repos.map((nameWithOwner) => ({ nameWithOwner })),
      },
    };
  });
  return { ok: true, status: 200, json: async () => ({ data }) };
}

// routes by method and URL; contributorsData can be an array or a raw Response
function buildFetch({ contributorsData, graphQLHandler }) {
  return vi.fn(async (url, opts) => {
    if (opts?.method === 'POST' && url.includes('graphql')) {
      return graphQLHandler(JSON.parse(opts.body));
    }
    if (url.includes('/contributors')) {
      return Array.isArray(contributorsData) ? mockRestOk(contributorsData) : contributorsData;
    }
    throw new Error(`Unexpected fetch call: ${url}`);
  });
}

beforeEach(() => {
  vi.spyOn(global, 'fetch');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('findSharedRepos v2', () => {
  it('throws immediately when token is not provided', async () => {
    await expect(findSharedRepos('owner', 'repo', undefined))
      .rejects.toThrow('GITHUB_TOKEN is required for v2');

    // fetch must never be called — we fail before any network access
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws when token is an empty string', async () => {
    await expect(findSharedRepos('owner', 'repo', ''))
      .rejects.toThrow('GITHUB_TOKEN is required for v2');
  });

  it('returns shared repos using GraphQL batch queries', async () => {
    global.fetch = buildFetch({
      contributorsData: [{ login: 'alice' }, { login: 'bob' }],
      graphQLHandler: () =>
        mockGraphQL({
          alice: ['torvalds/linux', 'facebook/react'],
          bob:   ['torvalds/linux', 'vuejs/vue'],
        }),
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    expect(result.contributorsAnalyzed).toBe(2);
    // torvalds/linux shared by 2 → should appear first
    expect(result.results[0]).toEqual({
      repository: 'torvalds/linux',
      sharedContributors: 2,
    });
  });

  it('filters out bot contributors (login contains "[")', async () => {
    global.fetch = buildFetch({
      contributorsData: [
        { login: 'alice' },
        { login: 'dependabot[bot]' },   // ← bot
        { login: 'renovate[bot]' },     // ← bot
      ],
      graphQLHandler: () =>
        mockGraphQL({
          alice: ['some/lib'],
        }),
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    // Only alice is counted — bots are excluded
    expect(result.contributorsAnalyzed).toBe(1);
  });

  it('contributorsAnalyzed reflects only human contributors, not bots', async () => {
    global.fetch = buildFetch({
      contributorsData: [
        { login: 'human1' },
        { login: 'human2' },
        { login: 'bot[bot]' },
      ],
      graphQLHandler: () =>
        mockGraphQL({ human1: [], human2: [] }),
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    expect(result.contributorsAnalyzed).toBe(2); // bot not counted
  });

  it('excludes the target repo from results', async () => {
    global.fetch = buildFetch({
      contributorsData: [{ login: 'alice' }],
      graphQLHandler: () =>
        mockGraphQL({
          alice: ['owner/repo', 'other/lib'],  // owner/repo = target
        }),
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    const names = result.results.map((r) => r.repository);
    expect(names).not.toContain('owner/repo');
    expect(names).toContain('other/lib');
  });

  it('excludes target repo case-insensitively', async () => {
    global.fetch = buildFetch({
      contributorsData: [{ login: 'alice' }],
      graphQLHandler: () =>
        mockGraphQL({
          alice: ['Owner/Repo', 'other/lib'],  // different casing
        }),
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    const names = result.results.map((r) => r.repository);
    expect(names).not.toContain('Owner/Repo');
  });

  it('handles null/missing GraphQL data for a user (falls back to empty array)', async () => {
    global.fetch = buildFetch({
      contributorsData: [{ login: 'alice' }, { login: 'ghost' }],
      graphQLHandler: () => {
        // ghost user returns null from GraphQL
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              u0: { repositories: { nodes: [{ nameWithOwner: 'some/lib' }] } },
              u1: null,  // ← missing user data
            },
          }),
        };
      },
    });

    // Should not throw — ghost falls back to []
    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    expect(result.contributorsAnalyzed).toBe(2);
    expect(result.results[0].repository).toBe('some/lib');
  });

  it('returns empty results when repo has no contributors', async () => {
    global.fetch = buildFetch({
      contributorsData: [],
      graphQLHandler: () => { throw new Error('should not be called'); },
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    expect(result.contributorsAnalyzed).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('returns empty results when contributors endpoint returns 404', async () => {
    global.fetch = buildFetch({
      contributorsData: mock404(),
      graphQLHandler: () => { throw new Error('should not be called'); },
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    expect(result.contributorsAnalyzed).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('returns empty results when all contributors are bots', async () => {
    global.fetch = buildFetch({
      contributorsData: [{ login: 'bot[bot]' }, { login: 'renovate[bot]' }],
      graphQLHandler: () => { throw new Error('should not be called'); },
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    expect(result.contributorsAnalyzed).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('returns at most 5 results even when many repos are shared', async () => {
    const manyRepos = Array.from({ length: 20 }, (_, i) => `org/repo${i}`);

    global.fetch = buildFetch({
      contributorsData: [{ login: 'alice' }, { login: 'bob' }],
      graphQLHandler: () =>
        mockGraphQL({ alice: manyRepos, bob: manyRepos }),
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    expect(result.results).toHaveLength(5);
  });

  it('results are sorted descending by sharedContributors count', async () => {
    global.fetch = buildFetch({
      contributorsData: [{ login: 'alice' }, { login: 'bob' }, { login: 'carol' }],
      graphQLHandler: () =>
        mockGraphQL({
          alice: ['popular/lib', 'rare/lib'],
          bob:   ['popular/lib'],
          carol: ['popular/lib'],
        }),
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    // popular/lib: 3, rare/lib: 1 → popular first
    expect(result.results[0].repository).toBe('popular/lib');
    expect(result.results[0].sharedContributors).toBe(3);
    expect(result.results[1].sharedContributors).toBeLessThanOrEqual(
      result.results[0].sharedContributors
    );
  });

  it('sends GraphQL request with Authorization: Bearer header', async () => {
    const token = 'ghp_mytoken';
    let capturedHeaders = null;

    global.fetch = vi.fn(async (url, opts) => {
      if (opts?.method === 'POST' && url.includes('graphql')) {
        capturedHeaders = opts.headers;
        return mockGraphQL({ alice: [] });
      }
      if (url.includes('/contributors')) return mockRestOk([{ login: 'alice' }]);
      throw new Error(`Unexpected: ${url}`);
    });

    await findSharedRepos('owner', 'repo', token);

    expect(capturedHeaders?.Authorization).toBe(`Bearer ${token}`);
  });

  it('batches human contributors in groups of 10 (GRAPHQL_BATCH_SIZE)', async () => {
    // 11 humans → 2 GraphQL requests: batch of 10, then batch of 1
    const contributors = Array.from({ length: 11 }, (_, i) => ({ login: `user${i}` }));
    let graphqlCallCount = 0;

    global.fetch = vi.fn(async (url, opts) => {
      if (opts?.method === 'POST' && url.includes('graphql')) {
        graphqlCallCount++;
        const userCount = Object.keys(JSON.parse(opts.body).query.match(/u\d+:/g) ?? {}).length;
        return mockGraphQL(Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`user${i}`, []])
        ));
      }
      if (url.includes('/contributors')) return mockRestOk(contributors);
      throw new Error(`Unexpected: ${url}`);
    });

    await findSharedRepos('owner', 'repo', 'ghp_token');

    expect(graphqlCallCount).toBe(2);
  });

  it('returns correct response shape', async () => {
    global.fetch = buildFetch({
      contributorsData: [{ login: 'alice' }],
      graphQLHandler: () => mockGraphQL({ alice: ['some/lib'] }),
    });

    const result = await findSharedRepos('owner', 'repo', 'ghp_token');

    expect(result).toHaveProperty('contributorsAnalyzed');
    expect(result).toHaveProperty('results');
    expect(Array.isArray(result.results)).toBe(true);
    result.results.forEach((r) => {
      expect(r).toHaveProperty('repository');
      expect(r).toHaveProperty('sharedContributors');
      expect(typeof r.repository).toBe('string');
      expect(typeof r.sharedContributors).toBe('number');
    });
  });
});
