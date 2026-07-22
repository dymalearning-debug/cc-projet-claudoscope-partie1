/**
 * Mode distant de `scan` : récupération du CLAUDE.md d'un dépôt GitHub public
 * via l'API (api.github.com), avec le `fetch` natif de Node ≥ 20. Tout le
 * code réseau de la CLI vit ici — le moteur (`@claudoscope/core`) reste pur.
 */

/** Dépôt GitHub ciblé par une URL passée à `scan`. */
export interface RemoteTarget {
  readonly owner: string;
  readonly repo: string;
}

/** Issue de la récupération distante quand elle n'est pas une erreur. */
export type RemoteFetchResult =
  | { readonly kind: 'ok'; readonly content: string }
  | { readonly kind: 'not-found' }; // dépôt accessible mais CLAUDE.md absent

/**
 * URL de dépôt GitHub : `https://github.com/owner/repo`, avec tolérance pour
 * un `/` final et un suffixe `.git`. Owner selon les règles GitHub (alphanum
 * et tirets), repo alphanum plus `.`, `_` et `-`.
 */
const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/;

/**
 * Détecte une URL de dépôt GitHub. Retourne `undefined` pour tout argument
 * qui n'en est pas une (chemin local, autre hôte, chemin supplémentaire…) :
 * l'appelant garde alors le comportement local.
 */
export function parseGitHubUrl(argument: string): RemoteTarget | undefined {
  const match = GITHUB_URL_PATTERN.exec(argument);
  const owner = match?.[1];
  const repo = match?.[2];
  if (owner === undefined || repo === undefined) {
    return undefined;
  }
  if (repo === '.' || repo === '..') {
    return undefined;
  }
  return { owner, repo };
}

/** Headers requis par l'API GitHub (`User-Agent` obligatoire, sinon 403). */
const API_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'claudoscope',
  'X-GitHub-Api-Version': '2022-11-28',
} as const;

/** Corps attendu de `GET /repos/{owner}/{repo}/contents/CLAUDE.md` en 200. */
interface ContentsResponse {
  readonly type?: unknown;
  readonly content?: unknown;
}

async function apiGet(path: string): Promise<Response> {
  try {
    return await fetch(`https://api.github.com${path}`, {
      headers: API_HEADERS,
    });
  } catch (error) {
    // Le message brut d'undici (« fetch failed ») est peu parlant : ré-emballer.
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `échec réseau lors de l'accès à api.github.com : ${message}`,
      { cause: error },
    );
  }
}

/** Erreurs HTTP communes aux deux endpoints (hors 200/404, traités à part). */
function toApiError(status: number): Error {
  if (status === 403 || status === 429) {
    return new Error(
      `accès à l'API GitHub refusé (HTTP ${status}) : limite de requêtes anonymes probablement atteinte, réessayez plus tard`,
    );
  }
  return new Error(`erreur de l'API GitHub (HTTP ${status})`);
}

/**
 * Récupère le CLAUDE.md à la racine du dépôt, sur sa branche par défaut.
 * Un appel au cas nominal ; un second seulement sur 404, pour distinguer
 * « dépôt inaccessible ou privé » (exit 2 via le catch global) de « fichier
 * absent » (`not-found`, traité comme le « fichier introuvable » local).
 */
export async function fetchRemoteClaudeMd(
  target: RemoteTarget,
): Promise<RemoteFetchResult> {
  const { owner, repo } = target;
  const contents = await apiGet(`/repos/${owner}/${repo}/contents/CLAUDE.md`);

  if (contents.status === 200) {
    const body = (await contents.json()) as ContentsResponse;
    // Un tableau (CLAUDE.md est un répertoire) ou un type inattendu : pas un
    // fichier exploitable, même issue que s'il était absent.
    if (body.type !== 'file' || typeof body.content !== 'string') {
      return { kind: 'not-found' };
    }
    return {
      kind: 'ok',
      content: Buffer.from(body.content, 'base64').toString('utf8'),
    };
  }

  if (contents.status !== 404) {
    throw toApiError(contents.status);
  }

  // 404 ambigu : l'endpoint /contents/ répond 404 aussi bien pour un dépôt
  // privé/inexistant que pour un fichier absent. Le dépôt tranche.
  const repository = await apiGet(`/repos/${owner}/${repo}`);
  if (repository.status === 404) {
    throw new Error(`dépôt inaccessible ou privé : ${owner}/${repo}`);
  }
  if (repository.status !== 200) {
    throw toApiError(repository.status);
  }
  return { kind: 'not-found' };
}
