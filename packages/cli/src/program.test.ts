import { describe, it, expect } from 'vitest';
import { createProgram } from './program.js';

describe('createProgram (test de santé)', () => {
  it('expose la commande scan', () => {
    const program = createProgram();
    const commands = program.commands.map((command) => command.name());
    expect(commands).toContain('scan');
  });
});
