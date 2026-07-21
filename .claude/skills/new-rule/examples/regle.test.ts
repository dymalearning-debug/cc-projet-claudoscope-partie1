// EXEMPLE PÉDAGOGIQUE — ne pas importer.
// Copie annotée de packages/core/src/rules/mem002.test.ts ; la source de
// vérité est packages/core/src/rules/. Les annotations « ⚠ » marquent les
// conventions à reproduire dans le test de toute nouvelle règle.

import { describe, it, expect } from 'vitest';
import { mem002 } from './mem002.js';

// ⚠ Helper local systématique : il fabrique le RuleContext minimal et
//   appelle la règle directement. Le core étant pur, aucun fichier réel
//   n'est nécessaire — les fixtures sont des chaînes inline.
function check(content: string) {
  return mem002.check({ file: { path: 'CLAUDE.md', content } });
}

// ⚠ Titre du describe : `MEM00N — résumé de la règle`.
describe('MEM002 — section vide', () => {
  // ⚠ Toujours commencer par le cas SAIN : l'absence de finding est un
  //   comportement à part entière, pas un cas par défaut.
  it('ne signale rien quand toutes les sections ont du contenu', () => {
    expect(check('# Un\ntexte\n## Deux\nautre texte\n')).toEqual([]);
  });

  // ⚠ Assertion EXPLICITE avec `toEqual` sur le tableau COMPLET de
  //   findings : on verrouille ruleId, severity, message et line d'un coup.
  //   Pas de snapshot au niveau unitaire — les snapshots vivent côté CLI.
  it('signale une section vide, localisée à son en-tête', () => {
    expect(check('# Un\ntexte\n## Vide\n\n# Trois\ntexte\n')).toEqual([
      {
        ruleId: 'MEM002',
        severity: 'warn',
        message: 'La section « Vide » est vide.',
        line: 3,
      },
    ]);
  });

  // ⚠ Variante compacte quand seul un aspect compte : projeter les findings
  //   (`.map(f => f.line)` ou `.map(f => f.message)`) plutôt que de répéter
  //   des objets complets.
  it('émet un finding par section vide', () => {
    const findings = check('# A\n# B\ntexte\n# C');
    expect(findings.map((f) => f.line)).toEqual([1, 4]);
  });

  it('considère comme vide une section ne contenant que des lignes blanches', () => {
    expect(check('# Un\n \n\t\n')).toHaveLength(1);
  });

  // ⚠ Chaque cas limite tranché en phase de spec a son test dédié, dont le
  //   titre énonce la décision — le test sert aussi de documentation.
  it('ne signale pas une section conteneur suivie d’une sous-section plus profonde', () => {
    expect(check('## A\n### B\ntexte\n')).toEqual([]);
  });

  it('signale une section vide suivie d’un en-tête de même niveau ou moins profond', () => {
    const findings = check('## A\n## B\ntexte\n### C\n# D\ntexte\n');
    expect(findings.map((f) => f.message)).toEqual([
      'La section « A » est vide.',
      'La section « C » est vide.',
    ]);
  });

  // ⚠ Penser aux bords du document : dernière section, prologue, fichier
  //   vide. Ce sont les cas qui divergent le plus souvent d'un parseur
  //   naïf.
  it('évalue la dernière section du fichier comme les autres', () => {
    expect(check('# Un\ntexte\n## Fin')).toEqual([
      {
        ruleId: 'MEM002',
        severity: 'warn',
        message: 'La section « Fin » est vide.',
        line: 3,
      },
    ]);
  });

  it('ne signale jamais le prologue ni un fichier sans en-tête', () => {
    expect(check('du texte sans en-tête\n')).toEqual([]);
    expect(check('')).toEqual([]);
  });
});
