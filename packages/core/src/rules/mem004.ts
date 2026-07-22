import type { Finding, Rule } from '../types.js';
import { parseMarkdown } from '../markdown.js';

/** Clé de comparaison : insensible à la casse et aux accents. */
function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/** MEM004 : signale chaque titre en doublon, tous niveaux confondus. */
export const mem004: Rule = {
  id: 'MEM004',
  severity: 'warn',
  docs: 'Signale les titres en doublon, tous niveaux confondus, sans tenir compte de la casse ni des accents.',
  check({ file }) {
    const { sections } = parseMarkdown(file.content);
    const findings: Finding[] = [];
    const firstOccurrences = new Map<string, number>();
    for (const section of sections) {
      // Un en-tête sans texte (`##` seul) n'est pas un titre : ignoré.
      if (section.title === '') {
        continue;
      }
      const key = normalizeTitle(section.title);
      const firstLine = firstOccurrences.get(key);
      if (firstLine === undefined) {
        firstOccurrences.set(key, section.headingLine);
        continue;
      }
      findings.push({
        ruleId: 'MEM004',
        severity: 'warn',
        message: `Titre en doublon « ${section.title} » (première occurrence ligne ${firstLine}).`,
        line: section.headingLine,
      });
    }
    return findings;
  },
};
