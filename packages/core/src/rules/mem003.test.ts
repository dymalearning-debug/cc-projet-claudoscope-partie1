import { describe, it, expect } from 'vitest';
import { mem003 } from './mem003.js';

function check(content: string) {
  return mem003.check({ file: { path: 'CLAUDE.md', content } });
}

describe('MEM003 — structure minimale absente', () => {
  it.each([
    '# Commandes',
    '## COMMANDES',
    '## Commands',
    '# Architecture',
    '### Vérification',
    '# Verification',
    '## How to verify',
  ])('accepte un fichier contenant la section « %s »', (heading) => {
    expect(check(`# Intro\ntexte\n${heading}\ntexte\n`)).toEqual([]);
  });

  it('signale un fichier sans aucune section attendue, sans ligne', () => {
    expect(check('# Intro\ntexte\n## Notes\ntexte\n')).toEqual([
      {
        ruleId: 'MEM003',
        severity: 'error',
        message: 'Aucune section commandes, architecture ou vérification trouvée.',
      },
    ]);
  });

  it('signale un fichier vide ou sans en-tête', () => {
    expect(check('')).toHaveLength(1);
    expect(check('du texte sans structure\n')).toHaveLength(1);
  });

  it('compare sur le titre, pas sur le corps des sections', () => {
    expect(check('# Notes\nles commandes sont ailleurs\n')).toHaveLength(1);
  });

  it('est satisfaite par une section attendue même vide (la vacuité relève de MEM002)', () => {
    expect(check('# Commandes\n')).toEqual([]);
  });
});
