# claudoscope

Linter déterministe pour les fichiers de configuration Claude Code (`CLAUDE.md`, à terme `.claude/`).
Voir [design-doc.md](./design-doc.md) pour le contexte, les objectifs et l'architecture.

Ce dépôt est un monorepo pnpm :

- `packages/core` (`@claudoscope/core`) — moteur pur, zéro I/O : contenus en mémoire → `Finding[]`. Publié comme dépendance des surfaces.
- `packages/cli` (`claudoscope`) — la surface CLI, publiée comme exécutable installable.

> État actuel : **socle technique uniquement**. Aucune règle d'audit n'est encore implémentée.

## Développement

```bash
pnpm install      # installe et lie les packages du workspace
pnpm run lint     # eslint sur le monorepo
pnpm run typecheck# tsc --noEmit sur chaque package
pnpm run test     # vitest
pnpm run build    # tsc → packages/*/dist
```
