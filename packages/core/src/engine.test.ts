import { describe, it, expect } from 'vitest';
import { analyze } from './engine.js';

describe('analyze (test de santé)', () => {
  it('retourne aucun finding en l’absence de règle', () => {
    const findings = analyze(
      [{ path: 'CLAUDE.md', content: '# Titre\n' }],
      [],
    );
    expect(findings).toEqual([]);
  });

  it('est déterministe : même entrée → même sortie', () => {
    const files = [{ path: 'CLAUDE.md', content: '# Titre\n' }];
    expect(analyze(files, [])).toEqual(analyze(files, []));
  });
});
