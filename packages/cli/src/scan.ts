import { readFile } from 'node:fs/promises';
import { analyze, rules } from '@claudoscope/core';
import type { Severity } from '@claudoscope/core';
import { fetchRemoteClaudeMd, parseGitHubUrl } from './remote.js';
import { renderJson, renderText } from './render.js';

/** Options de `scan`, déjà validées par la couche commander. */
export interface ScanOptions {
  readonly format: 'text' | 'json';
  readonly failOn: 'error' | 'warn';
}

/** Résultat d'un scan : le rapport à écrire et l'exit code à positionner. */
export interface ScanResult {
  readonly output: string;
  readonly exitCode: 0 | 1;
}

/** Sévérités qui font échouer le scan, selon le seuil `--fail-on`. */
const FAILING_SEVERITIES: Record<ScanOptions['failOn'], readonly Severity[]> =
  {
    error: ['error'],
    warn: ['error', 'warn'],
  };

/** Un fichier introuvable n'est pas une erreur : aucun fichier traité, exit 0. */
function isFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error && 'code' in error && error.code === 'ENOENT'
  );
}

/** Invoque le moteur avec le jeu de règles v1 et produit le rapport. */
function analyzeContent(
  label: string,
  content: string,
  options: ScanOptions,
): ScanResult {
  const findings = analyze([{ path: label, content }], rules);
  const failing = FAILING_SEVERITIES[options.failOn];
  return {
    output:
      options.format === 'json'
        ? renderJson(label, findings)
        : renderText(label, findings),
    exitCode: findings.some((finding) => failing.includes(finding.severity))
      ? 1
      : 0,
  };
}

/**
 * Obtient le contenu à analyser — fichier local, ou CLAUDE.md distant si
 * l'argument est une URL GitHub — puis produit le rapport. N'écrit ni sur
 * stdout ni dans `process` : la glue commander s'en charge, ce qui garde
 * toute la logique testable sans forker de process. Les autres erreurs
 * d'I/O (`EISDIR`, `EACCES`…) et les erreurs distantes (dépôt inaccessible,
 * réseau, rate limit) remontent au catch global de `index.ts` (exit 2).
 */
export async function runScan(
  fichier: string,
  options: ScanOptions,
): Promise<ScanResult> {
  const target = parseGitHubUrl(fichier);
  if (target !== undefined) {
    const label = `${target.owner}/${target.repo}/CLAUDE.md`;
    const remote = await fetchRemoteClaudeMd(target);
    if (remote.kind === 'not-found') {
      return {
        output: `aucun fichier traité : ${label} introuvable\n`,
        exitCode: 0,
      };
    }
    return analyzeContent(label, remote.content, options);
  }

  let content: string;
  try {
    content = await readFile(fichier, 'utf8');
  } catch (error) {
    if (isFileNotFound(error)) {
      return {
        output: `aucun fichier traité : ${fichier} introuvable\n`,
        exitCode: 0,
      };
    }
    throw error;
  }

  return analyzeContent(fichier, content, options);
}
