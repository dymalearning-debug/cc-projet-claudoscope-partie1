import type { Finding } from '@claudoscope/core';

/**
 * Rendus du rapport de scan. Fonctions pures, sans I/O.
 *
 * Les fins de ligne sont des `\n` en dur (pas `os.EOL`) : la sortie est
 * identique sur toute plateforme, condition des snapshots de la phase 4.
 */

/**
 * Rendu texte : une ligne par finding, `fichier:ligne sévérité règle message`
 * (sans `:ligne` quand le finding n'est pas localisé). Aucun finding →
 * aucune sortie, l'exit code suffit.
 */
export function renderText(
  fichier: string,
  findings: readonly Finding[],
): string {
  if (findings.length === 0) {
    return '';
  }
  const lines = findings.map((finding) => {
    const location =
      finding.line === undefined ? fichier : `${fichier}:${finding.line}`;
    return `${location} ${finding.severity} ${finding.ruleId} ${finding.message}`;
  });
  return `${lines.join('\n')}\n`;
}

/**
 * Rendu JSON : toujours émis, même sans finding (un consommateur machine
 * attend du JSON). Clés en ordre fixe pour le déterminisme ; `line` omise
 * quand le finding n'est pas localisé.
 */
export function renderJson(
  fichier: string,
  findings: readonly Finding[],
): string {
  const payload = {
    findings: findings.map((finding) => ({
      path: fichier,
      ruleId: finding.ruleId,
      severity: finding.severity,
      message: finding.message,
      ...(finding.line === undefined ? {} : { line: finding.line }),
    })),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
