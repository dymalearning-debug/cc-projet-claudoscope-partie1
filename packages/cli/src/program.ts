import { Command } from 'commander';

/**
 * Construit le programme CLI claudoscope (squelette).
 *
 * La commande `scan` est présente et déclare déjà ses options prévues
 * (`--format`, `--fail-on`), mais n'exécute encore aucune analyse :
 * ni découverte de fichiers, ni appel de règle. Elle sert de point
 * d'ancrage à la première tranche verticale.
 *
 * Exporté (plutôt qu'exécuté au chargement) pour rester testable.
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('claudoscope')
    .description(
      'Linter déterministe pour les fichiers de configuration Claude Code',
    )
    .version('0.0.0');

  program
    .command('scan')
    .description('Analyse un dépôt (squelette — aucune règle active)')
    .argument('[chemin]', 'répertoire à analyser', '.')
    .option('--format <format>', 'format de sortie (text|json)', 'text')
    .option('--fail-on <severity>', 'seuil d’échec (error|warn)', 'error')
    .action((chemin: string) => {
      console.log(
        `claudoscope: squelette — aucune analyse implémentée (chemin: ${chemin})`,
      );
    });

  return program;
}
