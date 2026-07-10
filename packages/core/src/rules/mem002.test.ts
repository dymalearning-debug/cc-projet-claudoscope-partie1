import { describe, it, expect } from 'vitest';
import { mem002 } from './mem002.js';

function check(content: string) {
  return mem002.check({ file: { path: 'CLAUDE.md', content } });
}

describe('MEM002 — section vide', () => {
  it('ne signale rien quand toutes les sections ont du contenu', () => {
    expect(check('# Un\ntexte\n## Deux\nautre texte\n')).toEqual([]);
  });

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

  it('émet un finding par section vide', () => {
    const findings = check('# A\n# B\ntexte\n# C');
    expect(findings.map((f) => f.line)).toEqual([1, 4]);
  });

  it('considère comme vide une section ne contenant que des lignes blanches', () => {
    expect(check('# Un\n \n\t\n')).toHaveLength(1);
  });

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
