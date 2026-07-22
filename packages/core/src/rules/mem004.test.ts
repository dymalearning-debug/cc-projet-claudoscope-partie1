import { describe, it, expect } from 'vitest';
import { mem004 } from './mem004.js';

function check(content: string) {
  return mem004.check({ file: { path: 'CLAUDE.md', content } });
}

describe('MEM004 — titres en doublon', () => {
  it('ne signale rien quand tous les titres sont uniques', () => {
    expect(check('# Projet\ntexte\n## Commandes\ntexte\n## Stack\ntexte\n')).toEqual([]);
  });

  it('signale un doublon simple, localisé à la seconde occurrence', () => {
    expect(check('## Config\ntexte\n## Notes\ntexte\n## Config\ntexte\n')).toEqual([
      {
        ruleId: 'MEM004',
        severity: 'warn',
        message: 'Titre en doublon « Config » (première occurrence ligne 1).',
        line: 5,
      },
    ]);
  });

  it('compare sans tenir compte de la casse ni des accents', () => {
    const findings = check('## Modèle\ntexte\n## modele\ntexte\n## MODELE\ntexte\n');
    expect(findings).toEqual([
      {
        ruleId: 'MEM004',
        severity: 'warn',
        message: 'Titre en doublon « modele » (première occurrence ligne 1).',
        line: 3,
      },
      {
        ruleId: 'MEM004',
        severity: 'warn',
        message: 'Titre en doublon « MODELE » (première occurrence ligne 1).',
        line: 5,
      },
    ]);
  });

  it('considère comme doublons deux titres identiques de niveaux différents', () => {
    expect(check('# Config\ntexte\n## Config\ntexte\n')).toEqual([
      {
        ruleId: 'MEM004',
        severity: 'warn',
        message: 'Titre en doublon « Config » (première occurrence ligne 1).',
        line: 3,
      },
    ]);
  });

  it('émet un finding par occurrence répétée : trois occurrences → deux findings', () => {
    const findings = check('## Notes\ntexte\n## Notes\ntexte\n## Notes\ntexte\n');
    expect(findings.map((f) => f.line)).toEqual([3, 5]);
    expect(
      findings.every(
        (f) =>
          f.message === 'Titre en doublon « Notes » (première occurrence ligne 1).',
      ),
    ).toBe(true);
  });

  it('ignore les en-têtes sans texte, même répétés', () => {
    expect(check('##\ntexte\n##\ntexte\n')).toEqual([]);
  });

  it('ne compte pas un en-tête situé dans une fence de code', () => {
    expect(check('## Config\ntexte\n```\n## Config\n```\n')).toEqual([]);
  });

  it('ne signale rien sur un fichier vide ou sans en-tête', () => {
    expect(check('')).toEqual([]);
    expect(check('du texte sans en-tête\n')).toEqual([]);
  });
});
