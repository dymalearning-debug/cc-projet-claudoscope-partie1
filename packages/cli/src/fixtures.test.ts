import { describe, expect, it } from 'vitest';
import { runScan } from './scan.js';

/**
 * Matrice fixtures × format × --fail-on, verrouillée par snapshots (gate 3).
 *
 * Les chemins sont relatifs POSIX et passés tels quels à `runScan`, qui les
 * écho dans la sortie : les snapshots restent identiques sur toute machine.
 * Hypothèse assumée : les tests s'exécutent depuis la racine du repo (là où
 * vit `vitest.config.ts`).
 */
const SAIN = 'packages/cli/fixtures/sain/CLAUDE.md';
const FAUTIF = 'packages/cli/fixtures/fautif/CLAUDE.md';
const AVERTISSEMENTS = 'packages/cli/fixtures/avertissements/CLAUDE.md';

describe('fixture sain', () => {
  it('text : aucune sortie, exit 0', async () => {
    const result = await runScan(SAIN, { format: 'text', failOn: 'error' });
    expect(result).toEqual({ output: '', exitCode: 0 });
  });

  it('json : findings vides, exit 0', async () => {
    const result = await runScan(SAIN, { format: 'json', failOn: 'error' });
    expect(result.exitCode).toBe(0);
    expect(result.output).toMatchSnapshot();
  });

  it('--fail-on warn : exit 0 également', async () => {
    const result = await runScan(SAIN, { format: 'text', failOn: 'warn' });
    expect(result.exitCode).toBe(0);
  });
});

describe('fixture fautif', () => {
  it('text : les cinq findings, exit 1', async () => {
    const result = await runScan(FAUTIF, { format: 'text', failOn: 'error' });
    expect(result.exitCode).toBe(1);
    expect(result.output).toMatchSnapshot();
  });

  it('json : les cinq findings, exit 1', async () => {
    const result = await runScan(FAUTIF, { format: 'json', failOn: 'error' });
    expect(result.exitCode).toBe(1);
    expect(result.output).toMatchSnapshot();
  });

  it('--fail-on warn : exit 1 également (l’error suffit déjà)', async () => {
    const result = await runScan(FAUTIF, { format: 'text', failOn: 'warn' });
    expect(result.exitCode).toBe(1);
  });
});

describe('fixture avertissements (warns seuls)', () => {
  it('text : les warns s’affichent mais exit 0 par défaut', async () => {
    const result = await runScan(AVERTISSEMENTS, {
      format: 'text',
      failOn: 'error',
    });
    expect(result.exitCode).toBe(0);
    expect(result.output).toMatchSnapshot();
  });

  it('--fail-on warn : exit 1 — le seuil agit', async () => {
    const result = await runScan(AVERTISSEMENTS, {
      format: 'text',
      failOn: 'warn',
    });
    expect(result.exitCode).toBe(1);
  });

  it('json : les warns rapportés, exit 0', async () => {
    const result = await runScan(AVERTISSEMENTS, {
      format: 'json',
      failOn: 'error',
    });
    expect(result.exitCode).toBe(0);
    expect(result.output).toMatchSnapshot();
  });
});
