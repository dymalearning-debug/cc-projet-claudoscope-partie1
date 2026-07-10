import type { Rule } from '../types.js';
import { mem001 } from './mem001.js';
import { mem002 } from './mem002.js';
import { mem003 } from './mem003.js';

/**
 * Jeu de règles v1, dans un ordre fixe (déterminisme de l'agrégation).
 * Les surfaces le consomment tel quel : pas de configuration en v1.
 */
export const rules: readonly Rule[] = [mem001, mem002, mem003];
