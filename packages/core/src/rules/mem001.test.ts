import { describe, it, expect } from 'vitest';
import { MAX_LINES, mem001 } from './mem001.js';

/** Contenu d'exactement `count` lignes. */
function contentOf(count: number): string {
  return Array.from({ length: count }, (_, i) => `ligne ${i + 1}`).join('\n');
}

function check(content: string) {
  return mem001.check({ file: { path: 'CLAUDE.md', content } });
}

describe('MEM001 — fichier trop long', () => {
  it('ne signale rien à exactement 200 lignes', () => {
    expect(check(contentOf(MAX_LINES))).toEqual([]);
  });

  it('ne signale rien pour un fichier vide', () => {
    expect(check('')).toEqual([]);
  });

  it('signale un fichier de 201 lignes, localisé à la première ligne en trop', () => {
    expect(check(contentOf(MAX_LINES + 1))).toEqual([
      {
        ruleId: 'MEM001',
        severity: 'warn',
        message: 'Le fichier compte 201 lignes (maximum recommandé : 200).',
        line: 201,
      },
    ]);
  });

  it('émet un seul finding quel que soit le dépassement', () => {
    expect(check(contentOf(500))).toHaveLength(1);
  });

  it('ne compte pas de ligne fantôme après un newline final', () => {
    expect(check(`${contentOf(MAX_LINES)}\n`)).toEqual([]);
  });
});
