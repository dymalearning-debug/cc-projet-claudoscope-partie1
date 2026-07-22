import { describe, it, expect } from 'vitest';
import { mem005 } from './mem005.js';

function check(content: string) {
  return mem005.check({ file: { path: 'CLAUDE.md', content } });
}

describe('MEM005 — sauts de niveau de titre descendants', () => {
  it('ne signale rien quand la hiérarchie descend d’un niveau à la fois', () => {
    expect(
      check('# Projet\ntexte\n## Commandes\ntexte\n## Stack\ntexte\n### Node\ntexte\n'),
    ).toEqual([]);
  });

  it('signale un saut de deux niveaux, localisé au titre fautif', () => {
    expect(check('# Projet\ntexte\n### Détail\ntexte\n')).toEqual([
      {
        ruleId: 'MEM005',
        severity: 'warn',
        message:
          "Le titre « Détail » (niveau 3) saute 2 niveaux depuis « Projet » (niveau 1) ; descendre d'un niveau à la fois.",
        line: 3,
      },
    ]);
  });

  it('signale un saut de trois niveaux', () => {
    expect(check('## Config\ntexte\n##### Détail\ntexte\n')).toEqual([
      {
        ruleId: 'MEM005',
        severity: 'warn',
        message:
          "Le titre « Détail » (niveau 5) saute 3 niveaux depuis « Config » (niveau 2) ; descendre d'un niveau à la fois.",
        line: 3,
      },
    ]);
  });

  it('accepte un premier titre profond, quel que soit son niveau', () => {
    expect(check('### Notes\ntexte\n')).toEqual([]);
  });

  it('accepte une remontée de plusieurs niveaux d’un coup', () => {
    expect(check('# Projet\ntexte\n## Sous\ntexte\n### Détail\ntexte\n# Suite\ntexte\n')).toEqual(
      [],
    );
  });

  it('compare au titre précédent immédiat après une remontée', () => {
    // # → ## → # → ### : seul le dernier saut est invalide.
    const findings = check('# A\ntexte\n## B\ntexte\n# C\ntexte\n### D\ntexte\n');
    expect(findings).toEqual([
      {
        ruleId: 'MEM005',
        severity: 'warn',
        message:
          "Le titre « D » (niveau 3) saute 2 niveaux depuis « C » (niveau 1) ; descendre d'un niveau à la fois.",
        line: 7,
      },
    ]);
  });

  it('émet un finding par titre fautif', () => {
    const findings = check('# A\ntexte\n### B\ntexte\n# C\ntexte\n#### D\ntexte\n');
    expect(findings.map((f) => f.line)).toEqual([3, 7]);
  });

  it('inclut les en-têtes sans texte dans la chaîne de comparaison', () => {
    // Un `###` vide fautif est signalé (titre cité vide)…
    expect(check('# A\ntexte\n###\ntexte\n')).toEqual([
      {
        ruleId: 'MEM005',
        severity: 'warn',
        message:
          "Le titre «  » (niveau 3) saute 2 niveaux depuis « A » (niveau 1) ; descendre d'un niveau à la fois.",
        line: 3,
      },
    ]);
    // …et un `##` vide sert de référence : ## → ### est valide.
    expect(check('##\ntexte\n### B\ntexte\n')).toEqual([]);
  });

  it('ne compte pas un en-tête situé dans une fence de code', () => {
    expect(check('# A\ntexte\n```\n### B\n```\n')).toEqual([]);
    expect(check('# A\ntexte\n~~~\n### B\n~~~\n')).toEqual([]);
  });

  it('ne signale rien sur un fichier vide ou sans en-tête', () => {
    expect(check('')).toEqual([]);
    expect(check('du texte sans en-tête\n')).toEqual([]);
  });
});
