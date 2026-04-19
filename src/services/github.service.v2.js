const BASE_URL = 'https://api.github.com';
const GRAPHQL_URL = 'https://api.github.com/graphql';
const MAX_CONTRIBUTORS = 100;
const GRAPHQL_BATCH_SIZE = 10;

function buildHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchGitHub(url, token) {
  const res = await fetch(url, { headers: buildHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub API error: ${res.status}`);
  }
  return res.json();
}

async function getContributors(owner, repo, token) {
  const contributors = [];
  let page = 1;

  while (contributors.length < MAX_CONTRIBUTORS) {
    const data = await fetchGitHub(
      `${BASE_URL}/repos/${owner}/${repo}/contributors?per_page=100&page=${page}&anon=false`,
      token
    );
    if (!data || !data.length) break;
    contributors.push(...data.map((c) => c.login));
    if (data.length < 100) break;
    page++;
  }

  return contributors.slice(0, MAX_CONTRIBUTORS);
}

async function batchGetUserReposGraphQL(usernames, token) {
  const aliases = usernames
    .map(
      (login, i) => `
      u${i}: user(login: ${JSON.stringify(login)}) {
        repositories(first: 100, ownerAffiliations: [OWNER, COLLABORATOR]) {
          nodes { nameWithOwner }
        }
      }`
    )
    .join('\n');

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: `{ ${aliases} }` })
  });

  const { data } = await res.json();

  const result = {};
  for (let i = 0; i < usernames.length; i++) {
    result[usernames[i]] =
      data?.[`u${i}`]?.repositories?.nodes?.map((r) => r.nameWithOwner) ?? [];
  }
  return result;
}

export async function findSharedRepos(owner, repo, token) {
  if (!token) throw new Error('GITHUB_TOKEN is required for v2 (GraphQL API)');

  const targetRepo = `${owner}/${repo}`.toLowerCase();
  const contributors = await getContributors(owner, repo, token);

  const repoCounts = new Map();

  const humanContributors = contributors.filter((login) => !login.includes('['));

  for (let i = 0; i < humanContributors.length; i += GRAPHQL_BATCH_SIZE) {
    const batch = humanContributors.slice(i, i + GRAPHQL_BATCH_SIZE);
    const userReposMap = await batchGetUserReposGraphQL(batch, token);

    for (const repos of Object.values(userReposMap)) {
      for (const r of repos) {
        if (r.toLowerCase() === targetRepo) continue;
        repoCounts.set(r, (repoCounts.get(r) || 0) + 1);
      }
    }
  }

  return {
    contributorsAnalyzed: humanContributors.length,
    results: [...repoCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([repository, sharedContributors]) => ({ repository, sharedContributors }))
  };
}
