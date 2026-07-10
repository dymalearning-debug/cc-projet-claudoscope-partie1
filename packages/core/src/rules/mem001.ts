import type { Rule } from '../types.js';
import { parseMarkdown } from '../markdown.js';

/** Seuil de longueur en lignes, non configurable en v1 (exporté pour les tests). */
export const MAX_LINES = 200;

/** MEM001 : signale un fichier strictement plus long que le seuil recommandé. */
export const mem001: Rule = {
  id: 'MEM001',
  severity: 'warn',
  docs: 'CLAUDE.md dépasse la longueur maximale recommandée',
  check({ file }) {
    const count = parseMarkdown(file.content).lines.length;
    if (count <= MAX_LINES) {
      return [];
    }
    return [
      {
        ruleId: 'MEM001',
        severity: 'warn',
        message: `Le fichier compte ${count} lignes (maximum recommandé : ${MAX_LINES}).`,
        line: MAX_LINES + 1,
      },
    ];
  },
};
