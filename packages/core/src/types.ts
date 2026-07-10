/**
 * Contrat de données du moteur claudoscope.
 *
 * Ce module ne contient que des types : aucune règle, aucune logique.
 * Toute surface (CLI, future Action CI, LSP) consomme ces types via `index.ts`.
 */

/** Niveau de gravité d'un finding, du plus au moins bloquant. */
export type Severity = 'error' | 'warn' | 'info';

/** Un fichier fourni au moteur, sous forme de contenu en mémoire (aucune I/O). */
export interface SourceFile {
  /** Chemin d'origine, utilisé uniquement pour l'affichage des findings. */
  readonly path: string;
  /** Contenu textuel intégral du fichier. */
  readonly content: string;
}

/** Un problème détecté par une règle sur un fichier. */
export interface Finding {
  /** Identifiant stable de la règle émettrice. */
  readonly ruleId: string;
  readonly severity: Severity;
  readonly message: string;
  /** Ligne concernée (1-indexée) lorsque la règle peut la localiser. */
  readonly line?: number;
}

/** Contexte passé à une règle pour analyser un fichier donné. */
export interface RuleContext {
  readonly file: SourceFile;
}

/**
 * Une règle de lint : identifiée de façon stable, dotée d'une sévérité et
 * d'une documentation d'une ligne, et pure (`check` ne fait aucune I/O).
 */
export interface Rule {
  /** Identifiant stable (ex. `MEM001`). */
  readonly id: string;
  readonly severity: Severity;
  /** Documentation d'une ligne décrivant ce que la règle vérifie. */
  readonly docs: string;
  check(ctx: RuleContext): Finding[];
}
