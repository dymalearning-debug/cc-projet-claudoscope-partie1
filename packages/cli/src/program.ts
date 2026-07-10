import { Command } from 'commander';
import { runScan } from './scan.js';

/**
 * Construit le programme CLI claudoscope.
 *
 * Exporté (plutôt qu'exécuté au chargement) pour rester testable. Les options
 * sont validées à la main : une valeur invalide est une erreur d'exécution
 * (exit 2 via le catch global de `index.ts`), le code 1 restant réservé aux
 * findings — le `.choices()` de commander sortirait en 1.
 */

function toFormat(value: string): 'text' | 'json' {
  if (value === 'text' || value === 'json') {
    return value;
  }
  throw new Error(`format invalide : ${value} (attendu : text|json)`);
}

function toFailOn(value: string): 'error' | 'warn' {
  if (value === 'error' || value === 'warn') {
    return value;
  }
  throw new Error(`seuil invalide : ${value} (attendu : error|warn)`);
}

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
    .description('Analyse un fichier CLAUDE.md et rapporte les findings')
    .argument('[fichier]', 'chemin du fichier à analyser', 'CLAUDE.md')
    .option('--format <format>', 'format de sortie (text|json)', 'text')
    .option('--fail-on <severity>', 'seuil d’échec (error|warn)', 'error')
    .action(
      async (fichier: string, options: { format: string; failOn: string }) => {
        const result = await runScan(fichier, {
          format: toFormat(options.format),
          failOn: toFailOn(options.failOn),
        });
        if (result.output !== '') {
          process.stdout.write(result.output);
        }
        // exitCode plutôt que process.exit() : laisse stdout se vider.
        process.exitCode = result.exitCode;
      },
    );

  return program;
}
