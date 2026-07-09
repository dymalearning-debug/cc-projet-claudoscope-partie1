import type { Finding, Rule, SourceFile } from './types.js';

/**
 * Moteur d'analyse pur : applique chaque règle à chaque fichier fourni et
 * agrège les findings, dans l'ordre (fichiers × règles) pour le déterminisme.
 *
 * Aucune I/O : reçoit des contenus en mémoire, retourne des `Finding[]`.
 * Avec une liste de règles vide, retourne toujours `[]` — c'est le cas du
 * socle actuel, où aucune règle n'est encore implémentée.
 */
export function analyze(
  files: readonly SourceFile[],
  rules: readonly Rule[],
): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    for (const rule of rules) {
      findings.push(...rule.check({ file }));
    }
  }
  return findings;
}
