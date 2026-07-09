---
paths:
  - "packages/core/**"
---

- Le core ne fait aucune I/O : fonctions pures `contenus → findings`.
- Aucune requête réseau, aucune clé API, jamais.
- Déterminisme : même entrée → même sortie, garanti par snapshots ; l'ordre d'agrégation des findings (fichiers × règles) est fixe.
- Toute règle a un id stable (ex. `claude-md/length`), une sévérité, une doc d'une ligne, et des tests fixture sain + fautif avant merge.
