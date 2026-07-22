import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { runScan } from './scan.js';

/** Fichier sain : sections attendues présentes, aucune vide, taille modeste. */
const SAIN = '## Projet\n\ncontenu\n\n## Commandes\n\npnpm test\n';
/** Fichier fautif : aucune section attendue (MEM003) et une section vide (MEM002). */
const FAUTIF = '# Notes\n\n## Vide\n';
/** Fichier ne levant que des warn : section attendue présente, une section vide. */
const WARN_SEUL = '## Commandes\n\npnpm test\n\n## Vide\n';

let dir: string;
const chemin = (nom: string): string => join(dir, nom);

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'claudoscope-scan-'));
  await writeFile(chemin('sain.md'), SAIN, 'utf8');
  await writeFile(chemin('fautif.md'), FAUTIF, 'utf8');
  await writeFile(chemin('warn.md'), WARN_SEUL, 'utf8');
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('runScan', () => {
  it('fichier sain : exit 0 et aucune sortie en text', async () => {
    const result = await runScan(chemin('sain.md'), {
      format: 'text',
      failOn: 'error',
    });
    expect(result).toEqual({ output: '', exitCode: 0 });
  });

  it('fichier fautif : exit 1 et findings rendus en text', async () => {
    const fichier = chemin('fautif.md');
    const result = await runScan(fichier, { format: 'text', failOn: 'error' });
    expect(result.exitCode).toBe(1);
    expect(result.output).toBe(
      `${fichier}:3 warn MEM002 La section « Vide » est vide.\n` +
        `${fichier} error MEM003 Aucune section commandes, architecture ou vérification trouvée.\n`,
    );
  });

  it('fichier fautif : --format json produit du JSON parsable', async () => {
    const result = await runScan(chemin('fautif.md'), {
      format: 'json',
      failOn: 'error',
    });
    const parsed = JSON.parse(result.output) as { findings: unknown[] };
    expect(parsed.findings).toHaveLength(2);
    expect(result.exitCode).toBe(1);
  });

  it('fichier introuvable : message indicatif et exit 0', async () => {
    const fichier = chemin('absent.md');
    const result = await runScan(fichier, { format: 'text', failOn: 'error' });
    expect(result).toEqual({
      output: `aucun fichier traité : ${fichier} introuvable\n`,
      exitCode: 0,
    });
  });

  it('des warn seuls ne font échouer qu’avec --fail-on warn', async () => {
    const fichier = chemin('warn.md');
    const surError = await runScan(fichier, {
      format: 'text',
      failOn: 'error',
    });
    expect(surError.exitCode).toBe(0);
    const surWarn = await runScan(fichier, { format: 'text', failOn: 'warn' });
    expect(surWarn.exitCode).toBe(1);
  });

  it('toute autre erreur de lecture remonte (exit 2 via le catch global)', async () => {
    // Lire un répertoire échoue avec autre chose qu'ENOENT.
    await expect(
      runScan(dir, { format: 'text', failOn: 'error' }),
    ).rejects.toThrow();
  });
});

describe('runScan distant', () => {
  const URL_REPO = 'https://github.com/owner/repo';
  const LABEL = 'owner/repo/CLAUDE.md';

  /** Réponse 200 de /contents/ pour un contenu markdown donné. */
  const contentsOk = (markdown: string): Response =>
    new Response(
      JSON.stringify({
        type: 'file',
        content: Buffer.from(markdown, 'utf8').toString('base64'),
      }),
      { status: 200 },
    );

  const stubFetch = (...responses: Response[]): ReturnType<typeof vi.fn> => {
    const mock = vi.fn();
    for (const response of responses) {
      mock.mockResolvedValueOnce(response);
    }
    vi.stubGlobal('fetch', mock);
    return mock;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('contenu fautif : findings préfixés owner/repo/CLAUDE.md et exit 1', async () => {
    stubFetch(contentsOk(FAUTIF));
    const result = await runScan(URL_REPO, { format: 'text', failOn: 'error' });
    expect(result.exitCode).toBe(1);
    expect(result.output).toBe(
      `${LABEL}:3 warn MEM002 La section « Vide » est vide.\n` +
        `${LABEL} error MEM003 Aucune section commandes, architecture ou vérification trouvée.\n`,
    );
  });

  it('contenu fautif : --format json porte le label distant en path', async () => {
    stubFetch(contentsOk(FAUTIF));
    const result = await runScan(URL_REPO, { format: 'json', failOn: 'error' });
    const parsed = JSON.parse(result.output) as {
      findings: { path: string }[];
    };
    expect(parsed.findings.length).toBeGreaterThan(0);
    expect(parsed.findings.every((f) => f.path === LABEL)).toBe(true);
    expect(result.exitCode).toBe(1);
  });

  it('des warn seuls ne font échouer qu’avec --fail-on warn', async () => {
    stubFetch(contentsOk(WARN_SEUL));
    const surError = await runScan(URL_REPO, {
      format: 'text',
      failOn: 'error',
    });
    expect(surError.exitCode).toBe(0);
    stubFetch(contentsOk(WARN_SEUL));
    const surWarn = await runScan(URL_REPO, { format: 'text', failOn: 'warn' });
    expect(surWarn.exitCode).toBe(1);
  });

  it('CLAUDE.md absent : message aligné sur le local et exit 0', async () => {
    stubFetch(
      new Response(JSON.stringify({}), { status: 404 }),
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const result = await runScan(URL_REPO, { format: 'text', failOn: 'error' });
    expect(result).toEqual({
      output: `aucun fichier traité : ${LABEL} introuvable\n`,
      exitCode: 0,
    });
  });

  it('dépôt inaccessible : remonte (exit 2 via le catch global)', async () => {
    stubFetch(
      new Response(JSON.stringify({}), { status: 404 }),
      new Response(JSON.stringify({}), { status: 404 }),
    );
    await expect(
      runScan(URL_REPO, { format: 'text', failOn: 'error' }),
    ).rejects.toThrow(/inaccessible ou privé/);
  });

  it('un argument non-URL ne déclenche aucun appel réseau', async () => {
    const mock = stubFetch();
    await runScan(chemin('sain.md'), { format: 'text', failOn: 'error' });
    expect(mock).not.toHaveBeenCalled();
  });
});
