const BASE_URL = 'https://api.github.com';
const MAX_CONTRIBUTORS = 100;
const BATCH_SIZE = 5;

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

async function getUserRepos(username, token) {
  const repos = [];
  let page = 1;

  while (true) {
    const data = await fetchGitHub(
      `${BASE_URL}/users/${username}/repos?per_page=100&page=${page}`,
      token
    );
    if (!data || !data.length) break;
    repos.push(...data.map((r) => r.full_name));
    if (data.length < 100) break;
    page++;
  }

  return repos;
}

export async function findSharedRepos(owner, repo, token) {
  const targetRepo = `${owner}/${repo}`.toLowerCase();
  const contributors = await getContributors(owner, repo, token);

  const repoCounts = new Map();

  for (let i = 0; i < contributors.length; i += BATCH_SIZE) {
    const batch = contributors.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((u) => getUserRepos(u, token)));

    for (const userRepos of results) {
      for (const r of userRepos) {
        if (r.toLowerCase() === targetRepo) continue;
        repoCounts.set(r, (repoCounts.get(r) || 0) + 1);
      }
    }
  }

  return {
    contributorsAnalyzed: contributors.length,
    results: [...repoCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([repository, sharedContributors]) => ({ repository, sharedContributors }))
  };
}
