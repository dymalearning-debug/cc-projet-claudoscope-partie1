import type { Finding, Rule } from '../types.js';
import { parseMarkdown } from '../markdown.js';

/** MEM002 : signale chaque section sans contenu propre ni sous-section directe. */
export const mem002: Rule = {
  id: 'MEM002',
  severity: 'warn',
  docs: 'Une section de CLAUDE.md est vide',
  check({ file }) {
    const { sections } = parseMarkdown(file.content);
    const findings: Finding[] = [];
    for (const [index, section] of sections.entries()) {
      // Une section immédiatement suivie d'une sous-section plus profonde est
      // un conteneur légitime, pas une section vide.
      const next = sections[index + 1];
      if (next !== undefined && next.level > section.level) {
        continue;
      }
      if (section.lines.every((line) => line.trim() === '')) {
        findings.push({
          ruleId: 'MEM002',
          severity: 'warn',
          message: `La section « ${section.title} » est vide.`,
          line: section.headingLine,
        });
      }
    }
    return findings;
  },
};
