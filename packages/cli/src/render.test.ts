import { describe, it, expect } from 'vitest';
import type { Finding } from '@claudoscope/core';
import { renderJson, renderText } from './render.js';

const localise: Finding = {
  ruleId: 'MEM002',
  severity: 'warn',
  message: 'La section « Vide » est vide.',
  line: 3,
};

const sansLigne: Finding = {
  ruleId: 'MEM003',
  severity: 'error',
  message: 'Aucune section commandes, architecture ou vérification trouvée.',
};

describe('renderText', () => {
  it('ne produit aucune sortie sans finding', () => {
    expect(renderText('CLAUDE.md', [])).toBe('');
  });

  it('rend un finding localisé sur une ligne fichier:ligne', () => {
    expect(renderText('CLAUDE.md', [localise])).toBe(
      'CLAUDE.md:3 warn MEM002 La section « Vide » est vide.\n',
    );
  });

  it('omet la ligne quand le finding n’est pas localisé', () => {
    expect(renderText('CLAUDE.md', [sansLigne])).toBe(
      'CLAUDE.md error MEM003 Aucune section commandes, architecture ou vérification trouvée.\n',
    );
  });

  it('préserve l’ordre des findings, un par ligne', () => {
    const output = renderText('CLAUDE.md', [localise, sansLigne]);
    expect(output.split('\n')).toEqual([
      'CLAUDE.md:3 warn MEM002 La section « Vide » est vide.',
      'CLAUDE.md error MEM003 Aucune section commandes, architecture ou vérification trouvée.',
      '',
    ]);
  });
});

describe('renderJson', () => {
  it('émet un objet vide mais valide sans finding', () => {
    expect(renderJson('CLAUDE.md', [])).toBe('{\n  "findings": []\n}\n');
  });

  it('rend chaque finding avec ses clés dans un ordre fixe', () => {
    const parsed: unknown = JSON.parse(renderJson('CLAUDE.md', [localise]));
    expect(parsed).toEqual({
      findings: [
        {
          path: 'CLAUDE.md',
          ruleId: 'MEM002',
          severity: 'warn',
          message: 'La section « Vide » est vide.',
          line: 3,
        },
      ],
    });
    const [finding] = (parsed as { findings: object[] }).findings;
    expect(Object.keys(finding ?? {})).toEqual([
      'path',
      'ruleId',
      'severity',
      'message',
      'line',
    ]);
  });

  it('omet la clé line quand le finding n’est pas localisé', () => {
    const parsed = JSON.parse(renderJson('CLAUDE.md', [sansLigne])) as {
      findings: Record<string, unknown>[];
    };
    expect(parsed.findings[0]).not.toHaveProperty('line');
  });

  it('se termine par un newline', () => {
    expect(renderJson('CLAUDE.md', []).endsWith('\n')).toBe(true);
  });
});
