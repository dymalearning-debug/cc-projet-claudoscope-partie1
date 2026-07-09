# claudoscope — Design Doc

## 1. Contexte

Le comportement d'un agent Claude Code dans un dépôt est encadré par des fichiers de configuration : `CLAUDE.md`, `.claude/rules/`, `.claude/settings.json`, `.mcp.json`. Ces fichiers dérivent facilement : trop longs, permissions trop larges, configurations fragiles ou dangereuses — et aucun outil ne les vérifie aujourd'hui. **claudoscope** est un linter déterministe pour ces fichiers, sur le modèle d'ESLint : des règles codées, un rapport, un exit code. Décisions issues de l'interview du 2026-07-08 : moteur déterministe pur, surface CLI d'abord, usage interne avec publication open source visée, stack TypeScript/Node, v1 restreinte à CLAUDE.md.

## 2. Objectifs / Non-objectifs

**Objectifs**

- Linter déterministe et reproductible : même entrée → même sortie, sans réseau ni clé API.
- CLI utilisable localement et comme gate CI dès la v1 (exit code par sévérité).
- v1 limitée aux règles CLAUDE.md, mais pipeline générique (`découverte → analyse → règles → rapport`) dès le premier commit.
- Publication open source visée (licence MIT), usage interne d'abord.

**Non-objectifs (v1)**
- Pas de jugement LLM, ni socle hybride.
- Pas d'auto-fix : l'outil est en lecture seule.
- Pas de fichier de configuration utilisateur : toutes les règles actives avec leur sévérité par défaut.
- Pas d'analyse de `.claude/settings.json`, `.mcp.json`, `.claude/rules/` — tranches suivantes, le design les anticipe sans les implémenter.
- Pas de GitHub Action ni de plugin Claude Code comme surface.

## 3. Design

**Surface produit.** Une commande : `claudoscope scan [chemin]` (défaut : répertoire courant). Le CLAUDE.md principal est cherché dans `./CLAUDE.md` puis `.claude/CLAUDE.md`. Sortie terminal lisible (fichier, ligne, règle, sévérité, message) et `--format json`. `--fail-on error|warn` (défaut `error`). Exit codes : `0` propre, `1` findings au-delà du seuil, `2` erreur d'exécution. Aucune écriture dans le dépôt analysé.

**Stack.** TypeScript strict, Node ≥ 20, ESM. `commander` (CLI), `vitest` (tests, fixtures de mini-dépôts, snapshots), `eslint` (lint du code du monorepo lui-même, en dépendance de développement), build par `tsc` seul, workspaces `pnpm`. Le Markdown est analysé en texte brut (lignes, en-têtes `#`) sans dépendance de parsing : suffisant pour les règles v1.

**Architecture en frontières.** Monorepo pnpm workspaces, deux packages :

- `@claudoscope/core` — **pur, zéro I/O** (ni `fs`, ni réseau, ni `process`). Reçoit des contenus en mémoire (`{path, content}`), exécute les règles, retourne des `Finding[]` typés. Modèle de règle : `{id stable, severity, docs 1 ligne, check(ctx) → Finding[]}`.
- `claudoscope` (CLI) — découverte des fichiers, lecture `fs`, invocation du core, rendu texte/JSON, exit codes.

La frontière est le contrat : toute surface future (Action CI, plugin Claude Code, LSP) consomme `@claudoscope/core` ; le core ne dépend jamais d'une surface. Les deux packages vivent dans le workspace et sont tous deux destinés à une publication : `@claudoscope/core` comme dépendance des surfaces (la CLI aujourd'hui, les autres surfaces ensuite), `claudoscope` comme exécutable installable.

**Première tranche verticale.** `claudoscope scan` sur un dépôt contenant un CLAUDE.md, avec le jeu de règles v1 : `MEM001` — fichier trop long, `MEM002` — section vide, `MEM003` — structure minimale absente (au moins une section commandes, architecture ou vérification). Le comportement précis de chaque règle sera spécifié au moment de son implémentation. Les seuils sont des constantes du code, ajustables par itération. Deux fixtures (dépôt sain / dépôt fautif), snapshots texte et JSON, exit codes vérifiés.

## 4. Alternatives écartées

- **Moteur LLM ou hybride** — puissance sémantique contre perte du déterminisme, coût par exécution, clé API obligatoire, snapshots impossibles.
- **Go/Rust (binaire unique)** — démarrage instantané contre inutilité pour une cible qui a déjà Node, et vitesse de développement moindre.
- **oclif** — richesse framework contre surdimensionnement pour une commande unique.
- **remark/mdast et l'écosystème remark-lint** — AST robuste et règles existantes contre une dépendance inutile : les règles v1 raisonnent sur lignes et en-têtes, le texte brut suffit ; et un plugin remark-lint enfermerait dans le Markdown alors que la cible finale est multi-format (JSON + MD).
- **tsup** — bundling clé en main contre une dépendance de plus alors que `tsc` suffit pour un package Node pur.
- **Action GitHub ou plugin Claude Code en première surface** — distribution séduisante contre couplage à un écosystème avant d'avoir prouvé la valeur des règles.
- **Mono-package avec frontière interne** — outillage plus léger contre frontière non opposable ; les surfaces futures justifient deux packages, au prix assumé des workspaces.

## 5. Invariants d'architecture

- `@claudoscope/core` ne fait aucune I/O : fonctions pures `contenus → findings`.
- L'outil ne modifie jamais les fichiers analysés.
- Aucune requête réseau, aucune clé API, jamais.
- Déterminisme : même entrée → même sortie, garanti par snapshots.
- Toute règle a un id stable, une sévérité, une doc d'une ligne, et des tests fixture sain + fautif avant merge.
- Les surfaces dépendent du core ; le core ne dépend d'aucune surface.

## 6. Gates de validation

1. **Core minimal** — un test vitest vert : une règle exécutée sur un contenu en mémoire produit le finding attendu.
2. **CLI branchée** — `claudoscope scan fixtures/fautif` affiche le finding et sort en `1` ; `fixtures/sain` sort en `0`.
3. **Jeu de règles v1** — snapshots texte et JSON stables sur les deux fixtures, `--fail-on` vérifié.
4. **Dogfooding** — l'outil tourne sans crash sur son propre dépôt, et le CLAUDE.md du projet passe `scan`.
5. **Publication (hors v1)** — `npx claudoscope` fonctionne depuis un dépôt tiers vierge.
