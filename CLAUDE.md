## Projet

claudoscope est un linter déterministe (modèle ESLint) pour les fichiers de configuration Claude Code

## Architecture

- **Le moteur (`packages/core`, `@claudoscope/core`)** — applique les règles à des contenus en mémoire et produit des findings. Entièrement pur, donc déterministe et testable sans mise en scène.
- **La surface (`packages/cli`, `claudoscope`)** — tout le rapport au monde extérieur : découvrir et lire les fichiers, invoquer le moteur, présenter les résultats, traduire leur gravité en code de sortie.

Cette frontière est le contrat central du projet : la dépendance ne va que dans un sens (surface → moteur). Toute surface future (Action CI, plugin Claude Code, LSP) consommera le même moteur, sans que celui-ci n'ait jamais à connaître ses surfaces.

## Commandes

```bash
pnpm install        # installe et lie les packages du workspace
pnpm run build      # tsc → packages/*/dist (nécessaire avant d'exécuter la CLI)
pnpm run typecheck  # tsc --noEmit sur chaque package
pnpm run test       # build puis vitest run (le smoke test E2E exige dist/ à jour)
pnpm run lint       # eslint sur le monorepo
pnpm run claudoscope  # exécute la CLI buildée (node packages/cli/dist/index.js)
```

## Stack

- Monorepo pnpm
- Node ≥ 20, ESM partout
- TypeScript strict
- Vitest (tests, fixtures, snapshots)
- eslint + typescript-eslint
- Workspaces pnpm
