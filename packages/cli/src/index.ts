#!/usr/bin/env node
import { createProgram } from './program.js';

async function main(): Promise<void> {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  // Exit code 2 : erreur d'exécution (distinct des findings, réservés au futur).
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
});
