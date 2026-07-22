import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Smoke test du binaire buildé : couvre la glue commander (écriture stdout,
 * `process.exitCode`) que les tests sur `runScan` ne voient pas. Un cas par
 * exit code. Exige `dist/` à jour : le script racine `test` builde avant de
 * lancer vitest.
 */
const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const fixture = (nom: string): string =>
  fileURLToPath(new URL(`../fixtures/${nom}/CLAUDE.md`, import.meta.url));

interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
}

/** Forke la CLI ; un exit code non nul n'est pas un échec du fork. */
function runCli(args: readonly string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [cli, ...args], (error, stdout, stderr) => {
      if (error === null) {
        resolve({ stdout, stderr, code: 0 });
        return;
      }
      if (typeof error.code !== 'number') {
        // Échec du fork lui-même (dist absent…), pas de la CLI.
        reject(error);
        return;
      }
      resolve({ stdout, stderr, code: error.code });
    });
  });
}

// Un fork Node peut être lent, surtout sous Windows.
const TIMEOUT = 15_000;

describe('binaire claudoscope (E2E)', () => {
  it(
    'fixture saine : exit 0, stdout vide',
    async () => {
      const result = await runCli(['scan', fixture('sain')]);
      expect(result).toEqual({ stdout: '', stderr: '', code: 0 });
    },
    TIMEOUT,
  );

  it(
    'fixture fautive en JSON : exit 1 et les quatre règles',
    async () => {
      const result = await runCli([
        'scan',
        fixture('fautif'),
        '--format',
        'json',
      ]);
      expect(result.code).toBe(1);
      const parsed = JSON.parse(result.stdout) as {
        findings: { ruleId: string }[];
      };
      expect(parsed.findings.map((finding) => finding.ruleId)).toEqual([
        'MEM001',
        'MEM002',
        'MEM003',
        'MEM004',
      ]);
    },
    TIMEOUT,
  );

  it(
    'format invalide : exit 2 et message sur stderr',
    async () => {
      const result = await runCli([
        'scan',
        fixture('sain'),
        '--format',
        'yaml',
      ]);
      expect(result.code).toBe(2);
      expect(result.stderr).toContain('format invalide');
    },
    TIMEOUT,
  );
});
