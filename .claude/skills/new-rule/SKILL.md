---
name: new-rule
description: Ajoute une nouvelle règle de lint MEM00N à claudoscope en déroulant la procédure complète (règle, test, enregistrement, fixtures, snapshot, dogfooding, vérification). Utiliser dès que l'utilisateur demande d'ajouter, créer ou implémenter une règle de lint (« ajoute une règle », « nouvelle règle MEM004 », « crée une règle qui détecte… »). Utiliser aussi quand l'utilisateur demande de traiter, planifier ou implémenter une issue GitHub qui décrit une règle MEM00N (« récupère l'issue N », « fais un plan pour l'issue N »).
---

# new-rule — ajouter une règle de lint à claudoscope

Cette procédure produit les quatre artefacts d'une règle : le fichier de règle, son test unitaire, l'adaptation des fixtures et l'enregistrement dans le moteur. Elle se termine par la vérification complète et un rapport de dogfooding.

Les fichiers [examples/regle.ts](examples/regle.ts) et [examples/regle.test.ts](examples/regle.test.ts) sont la référence de style : copies annotées de MEM002. Lis-les avant d'écrire du code.

## Invariants non négociables (`.claude/rules/claudoscope-core.md`)

- Le core ne fait **aucune I/O** : `check(ctx)` est une fonction pure `contenu → findings`. Pas de lecture de fichier, pas de réseau, pas d'horloge, pas d'aléatoire.
- **Déterminisme** : même entrée → même sortie. L'ordre d'agrégation (fichiers × règles) est fixe ; l'ordre du tableau `rules` est donc significatif.
- Toute règle a un **id stable** (format `MEM00N`, majuscules), une **sévérité**, une **doc d'une ligne**, et des tests fixture sain + fautif avant merge.

## Phase 0 — spec : ne jamais trancher silencieusement

Avant d'écrire la moindre ligne de code, vérifie que la demande répond à chacun de ces points. Pour **tout point absent ou ambigu, pose la question à l'utilisateur** (outil AskUserQuestion) au lieu de choisir toi-même :

1. **Sévérité** : `error` ou `warn` ? (`info` existe dans le type `Severity` mais n'est utilisé par aucune règle ; ne le propose que si l'utilisateur l'évoque.) Rappel des conséquences : un `error` fait échouer le scan par défaut, un `warn` seulement avec `--fail-on warn`.
2. **Seuils numériques** : s'il y en a (longueur max, nombre min…), quelle valeur ? Les seuils sont des constantes exportées du fichier de règle (modèle : `MAX_LINES` dans `mem001.ts`), jamais de la configuration.
3. **Cas limites** : que doit faire la règle sur un fichier vide, un prologue sans section, du contenu dans des fences de code, des titres accentués, etc. ? Liste les cas ambigus de la spec et fais-les trancher.
4. **Comportement sur les fixtures** : comment la règle doit-elle se manifester dans `packages/cli/fixtures/fautif/CLAUDE.md` (obligatoire), dans `avertissements/` (obligatoire si `warn`), et pourquoi `sain/` ne doit pas la déclencher ?
5. **Localisation** : les findings portent-ils un numéro de `line` (1-indexé, ex. MEM001/MEM002) ou non (finding « global » au fichier, ex. MEM003) ?

Ne poursuis qu'une fois la spec complète et validée.

## Procédure

Remplace `mem00N`/`MEM00N` par le prochain numéro libre (regarde le tableau `rules` dans `packages/core/src/rules/index.ts`).

### 1. Créer la règle — `packages/core/src/rules/mem00N.ts`

Objet `Rule` pur, sur le modèle de [examples/regle.ts](examples/regle.ts) :

- `id: 'MEM00N'` en majuscules ; le `ruleId` de chaque `Finding` reprend exactement cette valeur.
- `severity` de la règle **et** `severity` de chaque finding : dupliquées littéralement (convention du dépôt).
- `docs` : une seule ligne, en français.
- JSDoc `/** MEM00N : … */` au-dessus de l'objet.
- `check(ctx)` sans I/O ; réutilise `parseMarkdown` de `packages/core/src/markdown.ts` si la règle raisonne sur la structure (sections, prologue, fences déjà gérés).
- Messages en français ; titres de section cités entre guillemets « … ».
- Imports internes avec extension **`.js`** (ESM strict), ex. `import type { Finding, Rule } from '../types.js'`.

### 2. Créer le test unitaire — `packages/core/src/rules/mem00N.test.ts`

Sur le modèle de [examples/regle.test.ts](examples/regle.test.ts) :

- Helper local `check(content)` qui appelle `mem00N.check({ file: { path: 'CLAUDE.md', content } })`.
- Fixtures inline (chaînes dans le test), pas de fichiers.
- Cas couverts : sain (0 finding), fautifs, et chaque cas limite tranché en phase 0.
- Assertions **explicites** : `toEqual` sur le tableau complet de findings (ou `toHaveLength` / `.map(f => f.line)`). Pas de snapshot au niveau unitaire.

### 3. Enregistrer la règle — `packages/core/src/rules/index.ts`

Ajouter `import { mem00N } from './mem00N.js';` et placer `mem00N` **en fin** du tableau `rules`. L'ordre du tableau est l'ordre d'agrégation : ne jamais réordonner les règles existantes.

### 4. Mettre à jour les tests d'agrégation

- `packages/core/src/rules/rules.test.ts` : ajouter `'MEM00N'` à la liste d'ids attendue, et adapter si besoin le test d'ordre d'agrégation.
- `packages/cli/src/e2e.test.ts` : la vérification `findings.map((f) => f.ruleId)` sur la fixture fautive doit inclure le nouvel id (ce point ne figure pas dans la procédure historique mais le test échoue sans lui).

### 5. Adapter les fixtures CLI — `packages/cli/fixtures/`

- `fautif/CLAUDE.md` : doit déclencher la nouvelle règle (en plus des règles existantes).
- `avertissements/CLAUDE.md` : doit aussi la déclencher **si** la sévérité est `warn` ; ne doit émettre aucun `error`.
- `sain/CLAUDE.md` : doit rester à **0 finding**. Si la nouvelle règle s'y déclenche, adapte la fixture, pas la règle (sauf si cela révèle un faux positif — alors retourne en phase 0).

### 6. Régénérer le snapshot CLI

```bash
pnpm exec vitest run -u
```

Puis **relis le diff** de `packages/cli/src/__snapshots__/fixtures.test.ts.snap` ligne par ligne : chaque changement doit correspondre exactement au comportement décidé en phase 0 (format text : `chemin:ligne severity MEM00N message` ; format json : objet finding avec `path`, `ruleId`, `severity`, `message`, `line?`). Un changement inattendu = bug, pas un snapshot à accepter.

### 7. Dogfooding

Le `CLAUDE.md` racine du dépôt ne doit pas déclencher la nouvelle règle. C'est vérifié par trois tests : `rules.test.ts` (core), `dogfooding.test.ts` (CLI, `failOn: 'warn'`) et `e2e.test.ts`. S'il la déclenche : **corrige le `CLAUDE.md` racine, pas la règle**.

### 8. Vérification finale et rapport

```bash
pnpm run build && pnpm run typecheck && pnpm run test && pnpm run lint
```

Termine par un **rapport de dogfooding** à l'utilisateur :

- résultat du scan du `CLAUDE.md` racine (attendu : 0 finding), et les corrections apportées au `CLAUDE.md` le cas échéant ;
- confirmation que les quatre commandes sont vertes ;
- récapitulatif des artefacts créés/modifiés (règle, test, index, tests d'agrégation, fixtures, snapshot).
