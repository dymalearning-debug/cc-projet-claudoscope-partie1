import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { analyze } from '../engine.js';
import { rules } from './index.js';
import { MAX_LINES } from './mem001.js';

describe('jeu de règles v1', () => {
  it('expose les règles dans un ordre fixe', () => {
    expect(rules.map((rule) => rule.id)).toEqual([
      'MEM001',
      'MEM002',
      'MEM003',
    ]);
  });

  // Gate 1 : une règle exécutée via analyze() sur un contenu en mémoire
  // produit les findings attendus, dans l'ordre d'agrégation du moteur.
  it('produit les findings attendus via analyze() sur un contenu fautif', () => {
    const filler = Array.from({ length: MAX_LINES }, () => 'texte').join('\n');
    const content = `# Intro\n## Vide\n# Suite\n${filler}\n`;
    const findings = analyze(
      [{ path: 'CLAUDE.md', content }],
      rules,
    );
    expect(findings).toEqual([
      {
        ruleId: 'MEM001',
        severity: 'warn',
        message: `Le fichier compte 203 lignes (maximum recommandé : ${MAX_LINES}).`,
        line: MAX_LINES + 1,
      },
      // « Intro » n'est pas signalée : suivie d'une sous-section plus
      // profonde, c'est un conteneur légitime.
      {
        ruleId: 'MEM002',
        severity: 'warn',
        message: 'La section « Vide » est vide.',
        line: 2,
      },
      {
        ruleId: 'MEM003',
        severity: 'error',
        message:
          'Aucune section commandes, architecture ou vérification trouvée.',
      },
    ]);
  });

  // Dogfooding : le CLAUDE.md du dépôt claudoscope lui-même ne déclenche
  // aucune règle. Si ce test échoue, corriger le CLAUDE.md, pas la règle.
  it('ne signale rien sur le CLAUDE.md du dépôt', () => {
    const path = new URL('../../../../CLAUDE.md', import.meta.url);
    const content = readFileSync(path, 'utf8');
    expect(analyze([{ path: 'CLAUDE.md', content }], rules)).toEqual([]);
  });
});
