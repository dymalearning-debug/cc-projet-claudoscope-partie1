/**
 * Parsing Markdown minimal : lignes et sections délimitées par les en-têtes
 * ATX (`#` à `######`), hors blocs de code (``` ou ~~~).
 *
 * Module interne au core, sans dépendance ni I/O : les règles raisonnent sur
 * lignes et en-têtes, le texte brut suffit. Le parseur rapporte la structure
 * sans la juger : décider qu'une section est « vide » ou « requise » revient
 * aux règles.
 */

/** Une section délimitée par un en-tête ATX, hors blocs de code. */
export interface Section {
  /** Niveau de l'en-tête, de 1 (`#`) à 6 (`######`). */
  readonly level: number;
  /** Titre trimé, sans les `#` de fermeture, casse et accents conservés. */
  readonly title: string;
  /** Ligne de l'en-tête (1-indexée, cohérente avec `Finding.line`). */
  readonly headingLine: number;
  /** Lignes de contenu jusqu'au prochain en-tête (exclu) ou la fin du fichier. */
  readonly lines: readonly string[];
}

/** Vue structurée d'un contenu Markdown. */
export interface ParsedMarkdown {
  /** Toutes les lignes du contenu, fins de ligne normalisées (CRLF ≡ LF). */
  readonly lines: readonly string[];
  /** Lignes précédant le premier en-tête. */
  readonly prologue: readonly string[];
  /** Sections dans l'ordre du document. */
  readonly sections: readonly Section[];
}

/** En-tête ATX : ≤ 3 espaces d'indentation, 1 à 6 `#`, puis espace ou fin de ligne. */
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/;
/** Ouverture de fence : ≤ 3 espaces d'indentation, ``` ou ~~~ (≥ 3), info string libre. */
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
/** Fermeture de fence : même forme, seule sur sa ligne. */
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

interface MutableSection {
  level: number;
  title: string;
  headingLine: number;
  lines: string[];
}

/** Retire les `#` de fermeture (`## Titre ##`) et trime le titre. */
function cleanTitle(raw: string): string {
  return raw.replace(/[ \t]+#+[ \t]*$/, '').trim();
}

export function parseMarkdown(content: string): ParsedMarkdown {
  // Retire un éventuel BOM (U+FEFF) pour qu'un `#` en première ligne reste un en-tête.
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  // Un unique newline final ne crée pas de ligne fantôme ; contenu vide → zéro ligne.
  const lines =
    text === '' ? [] : text.replace(/\r?\n$/, '').split(/\r?\n/);

  const prologue: string[] = [];
  const sections: MutableSection[] = [];
  let current: MutableSection | null = null;
  // Fence ouvrant : sa fermeture exige le même caractère et une longueur ≥.
  let fence: { readonly char: string; readonly length: number } | null = null;

  for (const [index, line] of lines.entries()) {
    if (fence !== null) {
      const close = FENCE_CLOSE.exec(line);
      const marker = close?.[1] ?? '';
      if (marker.startsWith(fence.char) && marker.length >= fence.length) {
        fence = null;
      }
      (current?.lines ?? prologue).push(line);
      continue;
    }

    const open = FENCE_OPEN.exec(line);
    if (open !== null) {
      const marker = open[1] ?? '';
      fence = { char: marker.charAt(0), length: marker.length };
      (current?.lines ?? prologue).push(line);
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading !== null) {
      if (current !== null) {
        sections.push(current);
      }
      current = {
        level: (heading[1] ?? '').length,
        title: cleanTitle(heading[2] ?? ''),
        headingLine: index + 1,
        lines: [],
      };
      continue;
    }

    (current?.lines ?? prologue).push(line);
  }
  if (current !== null) {
    sections.push(current);
  }

  return { lines, prologue, sections };
}
