import { afterEach, describe, it, expect, vi } from 'vitest';
import { fetchRemoteClaudeMd, parseGitHubUrl } from './remote.js';

describe('parseGitHubUrl', () => {
  it.each([
    'https://github.com/owner/repo',
    'https://github.com/owner/repo/',
    'https://github.com/owner/repo.git',
    'https://github.com/owner/repo.git/',
  ])('détecte %s', (url) => {
    expect(parseGitHubUrl(url)).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('accepte les points et tirets du repo et préserve la casse', () => {
    expect(parseGitHubUrl('https://github.com/My-Org/mon.repo-v2')).toEqual({
      owner: 'My-Org',
      repo: 'mon.repo-v2',
    });
  });

  it.each([
    '',
    'CLAUDE.md',
    './docs/CLAUDE.md',
    'http://github.com/owner/repo',
    'https://gitlab.com/owner/repo',
    'https://github.com/owner',
    'https://github.com/owner/repo/tree/main',
    'https://github.com/owner/..',
  ])('ne détecte pas %j (comportement local conservé)', (argument) => {
    expect(parseGitHubUrl(argument)).toBeUndefined();
  });
});

/** Réponse 200 de /contents/ pour un contenu markdown donné. */
const contentsOk = (markdown: string): Response =>
  new Response(
    JSON.stringify({
      type: 'file',
      content: Buffer.from(markdown, 'utf8').toString('base64'),
    }),
    { status: 200 },
  );

const status = (code: number): Response =>
  new Response(JSON.stringify({}), { status: code });

const stubFetch = (...responses: Response[]): ReturnType<typeof vi.fn> => {
  const mock = vi.fn();
  for (const response of responses) {
    mock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal('fetch', mock);
  return mock;
};

const CIBLE = { owner: 'owner', repo: 'repo' } as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchRemoteClaudeMd', () => {
  it('200 : décode le contenu base64 en un seul appel, avec les headers requis', async () => {
    const mock = stubFetch(contentsOk('## Projet\n\ncontenu\n'));
    const result = await fetchRemoteClaudeMd(CIBLE);
    expect(result).toEqual({ kind: 'ok', content: '## Projet\n\ncontenu\n' });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(
      'https://api.github.com/repos/owner/repo/contents/CLAUDE.md',
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'claudoscope',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
  });

  it('404 fichier puis 200 dépôt : not-found, deux appels dans l’ordre', async () => {
    const mock = stubFetch(status(404), status(200));
    const result = await fetchRemoteClaudeMd(CIBLE);
    expect(result).toEqual({ kind: 'not-found' });
    expect(mock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.github.com/repos/owner/repo/contents/CLAUDE.md',
      'https://api.github.com/repos/owner/repo',
    ]);
  });

  it('404 fichier puis 404 dépôt : dépôt inaccessible ou privé', async () => {
    stubFetch(status(404), status(404));
    await expect(fetchRemoteClaudeMd(CIBLE)).rejects.toThrow(
      'dépôt inaccessible ou privé : owner/repo',
    );
  });

  it.each([403, 429])('%i : message rate limit', async (code) => {
    stubFetch(status(code));
    await expect(fetchRemoteClaudeMd(CIBLE)).rejects.toThrow(
      `accès à l'API GitHub refusé (HTTP ${code})`,
    );
  });

  it('500 : erreur API générique', async () => {
    stubFetch(status(500));
    await expect(fetchRemoteClaudeMd(CIBLE)).rejects.toThrow(
      "erreur de l'API GitHub (HTTP 500)",
    );
  });

  it('rejet réseau : message « échec réseau »', async () => {
    const mock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', mock);
    await expect(fetchRemoteClaudeMd(CIBLE)).rejects.toThrow(
      "échec réseau lors de l'accès à api.github.com : fetch failed",
    );
  });

  it('200 mais JSON tableau (CLAUDE.md est un répertoire) : not-found', async () => {
    stubFetch(new Response(JSON.stringify([]), { status: 200 }));
    await expect(fetchRemoteClaudeMd(CIBLE)).resolves.toEqual({
      kind: 'not-found',
    });
  });
});
