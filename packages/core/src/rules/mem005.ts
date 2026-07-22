import type { Finding, Rule } from '../types.js';
import { parseMarkdown } from '../markdown.js';

/** MEM005 : signale chaque titre qui descend de plus d'un niveau depuis le titre précédent. */
export const mem005: Rule = {
  id: 'MEM005',
  severity: 'warn',
  docs: "Un titre ne descend pas de plus d'un niveau depuis le titre précédent",
  check({ file }) {
    const { sections } = parseMarkdown(file.content);
    const findings: Finding[] = [];
    // Le premier titre du document est toujours valide, quel que soit son
    // niveau ; ensuite la comparaison porte sur le titre précédent immédiat,
    // y compris après une remontée.
    for (const [index, section] of sections.entries()) {
      const previous = sections[index - 1];
      if (previous === undefined || section.level <= previous.level + 1) {
        continue;
      }
      const gap = section.level - previous.level;
      findings.push({
        ruleId: 'MEM005',
        severity: 'warn',
        message: `Le titre « ${section.title} » (niveau ${section.level}) saute ${gap} niveaux depuis « ${previous.title} » (niveau ${previous.level}) ; descendre d'un niveau à la fois.`,
        line: section.headingLine,
      });
    }
    return findings;
  },
};
