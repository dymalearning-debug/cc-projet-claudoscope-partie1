import { describe, it, expect } from 'vitest';
import { parseMarkdown } from './markdown.js';

describe('parseMarkdown', () => {
  it('découpe un document nominal en sections ordonnées, avec prologue', () => {
    const doc = [
      'intro',
      '',
      '# Un',
      'a',
      '## Deux',
      '',
      'b',
      '### Trois',
      'c',
    ].join('\n');
    const parsed = parseMarkdown(doc);
    expect(parsed.lines).toHaveLength(9);
    expect(parsed.prologue).toEqual(['intro', '']);
    expect(parsed.sections).toEqual([
      { level: 1, title: 'Un', headingLine: 3, lines: ['a'] },
      { level: 2, title: 'Deux', headingLine: 5, lines: ['', 'b'] },
      { level: 3, title: 'Trois', headingLine: 8, lines: ['c'] },
    ]);
  });

  it('produit la même structure en CRLF et en LF', () => {
    const lf = 'intro\n# Titre\ncontenu\n';
    const crlf = lf.replace(/\n/g, '\r\n');
    expect(parseMarkdown(crlf)).toEqual(parseMarkdown(lf));
  });

  it('retourne une structure vide pour un contenu vide', () => {
    expect(parseMarkdown('')).toEqual({
      lines: [],
      prologue: [],
      sections: [],
    });
  });

  it('met tout en prologue en l’absence d’en-tête', () => {
    const parsed = parseMarkdown('a\nb\n');
    expect(parsed.prologue).toEqual(['a', 'b']);
    expect(parsed.sections).toEqual([]);
  });

  it('ignore les en-têtes situés dans les blocs de code', () => {
    const doc = [
      '# Un',
      '```bash',
      '# commentaire',
      '```',
      '~~~',
      '## faux',
      '~~~',
      'fin',
    ].join('\n');
    const parsed = parseMarkdown(doc);
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0]?.lines).toEqual([
      '```bash',
      '# commentaire',
      '```',
      '~~~',
      '## faux',
      '~~~',
      'fin',
    ]);
  });

  it('traite tout ce qui suit un fence non fermé comme du code', () => {
    // Le ~~~ ne ferme pas un fence ouvert par ``` : rien ne redevient du texte.
    const doc = ['# Un', '```', '# pas un en-tête', '~~~', '## non plus'].join(
      '\n',
    );
    const parsed = parseMarkdown(doc);
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0]?.lines).toEqual([
      '```',
      '# pas un en-tête',
      '~~~',
      '## non plus',
    ]);
  });

  it('accepte un en-tête en dernière ligne (section sans contenu)', () => {
    const parsed = parseMarkdown('# Un\ncontenu\n## Fin');
    expect(parsed.sections[1]).toEqual({
      level: 2,
      title: 'Fin',
      headingLine: 3,
      lines: [],
    });
  });

  it('rapporte une section sans contenu par en-tête pour un document d’en-têtes seuls', () => {
    const parsed = parseMarkdown('# A\n## B\n# C\n');
    expect(parsed.sections.map((s) => s.lines)).toEqual([[], [], []]);
  });

  it('applique la syntaxe ATX : espace requis, `#` de fermeture, indentation ≤ 3', () => {
    const doc = [
      '#SansEspace',
      '##',
      '## Titre ##',
      '   ### Indenté',
      '    #### Trop indenté',
      '####### Sept dièses',
    ].join('\n');
    const parsed = parseMarkdown(doc);
    expect(parsed.prologue).toEqual(['#SansEspace']);
    expect(parsed.sections.map((s) => [s.level, s.title])).toEqual([
      [2, ''],
      [2, 'Titre'],
      [3, 'Indenté'],
    ]);
    expect(parsed.sections[2]?.lines).toEqual([
      '    #### Trop indenté',
      '####### Sept dièses',
    ]);
  });

  it('reconnaît un en-tête en première ligne malgré un BOM', () => {
    const bom = String.fromCharCode(0xfeff);
    const parsed = parseMarkdown(`${bom}# Titre\n`);
    expect(parsed.sections).toEqual([
      { level: 1, title: 'Titre', headingLine: 1, lines: [] },
    ]);
  });

  it('rapporte les en-têtes dupliqués comme des sections distinctes', () => {
    const parsed = parseMarkdown('# Même\na\n# Même\nb\n');
    expect(parsed.sections.map((s) => s.title)).toEqual(['Même', 'Même']);
    expect(parsed.sections.map((s) => s.headingLine)).toEqual([1, 3]);
  });
});
