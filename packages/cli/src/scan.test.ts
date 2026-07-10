import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
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
