import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runScan } from './scan.js';

/**
 * Dogfooding (gate 4) : le CLAUDE.md du dépôt claudoscope passe lui-même le
 * scan, sans aucun finding. Le test rend la gate permanente : une dérive
 * future du CLAUDE.md casse la suite. Chemin résolu depuis ce fichier pour
 * ne rien supposer du cwd ; pas de snapshot (chemin absolu non portable).
 */
const claudeMd = fileURLToPath(new URL('../../../CLAUDE.md', import.meta.url));

describe('dogfooding', () => {
  it('le CLAUDE.md du dépôt passe scan sans finding', async () => {
    const result = await runScan(claudeMd, { format: 'text', failOn: 'warn' });
    expect(result).toEqual({ output: '', exitCode: 0 });
  });
});
