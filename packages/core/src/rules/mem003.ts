import type { Rule } from '../types.js';
import { parseMarkdown } from '../markdown.js';

/**
 * Familles de sections attendues, cherchées en sous-chaîne du titre normalisé :
 * `command` couvre « Commandes » et « Commands », `verification` couvre
 * « Vérification » une fois les accents retirés.
 */
const EXPECTED_KEYWORDS = ['command', 'architecture', 'verification', 'verify'];

/** Minuscules, sans diacritiques : la comparaison ignore casse et accents. */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** MEM003 : exige au moins une section commandes, architecture ou vérification. */
export const mem003: Rule = {
  id: 'MEM003',
  severity: 'error',
  docs: "CLAUDE.md n'a aucune section commandes, architecture ou vérification",
  check({ file }) {
    const { sections } = parseMarkdown(file.content);
    const hasExpectedSection = sections.some((section) => {
      const title = normalizeTitle(section.title);
      return EXPECTED_KEYWORDS.some((keyword) => title.includes(keyword));
    });
    if (hasExpectedSection) {
      return [];
    }
    return [
      {
        ruleId: 'MEM003',
        severity: 'error',
        message:
          'Aucune section commandes, architecture ou vérification trouvée.',
      },
    ];
  },
};
