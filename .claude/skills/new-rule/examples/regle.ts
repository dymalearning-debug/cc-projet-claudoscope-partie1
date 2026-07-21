// EXEMPLE PÉDAGOGIQUE — ne pas importer.
// Copie annotée de packages/core/src/rules/mem002.ts ; la source de vérité
// est packages/core/src/rules/. Les annotations « ⚠ » marquent les
// conventions à reproduire dans toute nouvelle règle.

// ⚠ Imports internes toujours avec l'extension `.js` (ESM strict), même
//   depuis un fichier `.ts`. Ici, `../types.js` et `../markdown.js` sont
//   relatifs à packages/core/src/rules/.
import type { Finding, Rule } from '../types.js';
import { parseMarkdown } from '../markdown.js';

// ⚠ JSDoc d'une ligne au-dessus de l'objet, au format `/** MEM00N : … */`.
//   Elle résume le comportement, pas l'implémentation.
/** MEM002 : signale chaque section sans contenu propre ni sous-section directe. */
export const mem002: Rule = {
  // ⚠ id stable, en MAJUSCULES, format MEM00N. Le nom de l'export (`mem002`)
  //   et le nom du fichier (`mem002.ts`) sont le même id en minuscules.
  id: 'MEM002',
  // ⚠ Sévérité de la règle : 'error' ou 'warn' ('info' existe dans le type
  //   mais aucune règle ne l'utilise). Un 'error' fait échouer le scan par
  //   défaut ; un 'warn' seulement avec --fail-on warn.
  severity: 'warn',
  // ⚠ `docs` : une seule ligne, en français, sans point technique.
  docs: 'Une section de CLAUDE.md est vide',
  // ⚠ `check` est PURE : elle ne lit que `ctx.file` (path + content déjà en
  //   mémoire) et retourne des findings. Aucune I/O, aucun état, aucun
  //   aléatoire — c'est ce qui garantit le déterminisme du moteur.
  check({ file }) {
    // ⚠ Réutiliser `parseMarkdown` dès que la règle raisonne sur la
    //   structure : il gère déjà les fences ``` / ~~~, le BOM et la
    //   normalisation CRLF→LF. Ne pas re-parser à la main.
    const { sections } = parseMarkdown(file.content);
    const findings: Finding[] = [];
    for (const [index, section] of sections.entries()) {
      // Une section immédiatement suivie d'une sous-section plus profonde est
      // un conteneur légitime, pas une section vide.
      // ⚠ Ce genre de cas limite doit être tranché en phase de spec, puis
      //   couvert par un test dédié (voir regle.test.ts).
      const next = sections[index + 1];
      if (next !== undefined && next.level > section.level) {
        continue;
      }
      if (section.lines.every((line) => line.trim() === '')) {
        findings.push({
          // ⚠ `ruleId` du finding = `id` de la règle, à l'identique.
          ruleId: 'MEM002',
          // ⚠ La sévérité est DUPLIQUÉE littéralement dans chaque finding
          //   (convention du dépôt) : même valeur que `severity` ci-dessus.
          severity: 'warn',
          // ⚠ Message en français ; les titres de section sont cités entre
          //   guillemets français « … ».
          message: `La section « ${section.title} » est vide.`,
          // ⚠ `line` est 1-indexé et OPTIONNEL : on le renseigne quand le
          //   finding est localisable (ici l'en-tête de la section) ; on
          //   l'omet pour un finding global au fichier (ex. MEM003).
          line: section.headingLine,
        });
      }
    }
    // ⚠ L'ordre des findings retournés est stable (ordre du document) :
    //   il est verrouillé par les snapshots CLI.
    return findings;
  },
};
