# officeparser: words glued together when a PDF's space glyph maps to U+0009

Reported upstream: https://github.com/harshankur/officeParser/issues/158

Since officeparser 8.4.0, a PDF whose space glyph's `/ToUnicode` entry is U+0009 (tab) comes out with every word glued to the next ("Helloworldagain"), whenever pdf.js gives each word its own text item (here, because each space is in its own marked-content span, as tagged-PDF writers such as InDesign emit them). pdf.js still reads the spaces ("Hello" " " "world" " " "again"), and officeparser 8.3.0 and earlier output "Hello world again". The same PDF with the space mapped to U+0020 is read correctly.

## Reproduction

Requires Node 20 or later.

```sh
npm install
npm run repro
```

`make-pdf.mjs` writes a one-page PDF by hand (no fonts embedded, Helvetica). The two runs differ only in the font's `/ToUnicode` entry for code 32. Both PDFs are written to `out/` for inspection.

Output:

```text
## space glyph -> U+0020 (out/space-0020.pdf)
content stream:       BT /F1 12 Tf 20 50 Td (Hello) Tj /Span BMC ( ) Tj EMC 30.672 0 Td (world) Tj /Span BMC ( ) Tj EMC 32.004 0 Td (again) Tj ET
pdf.js text items:    "Hello" " " "world" " " "again"
officeparser text:    "Hello world again"

## space glyph -> U+0009 (out/space-0009.pdf)
content stream:       BT /F1 12 Tf 20 50 Td (Hello) Tj /Span BMC ( ) Tj EMC 30.672 0 Td (world) Tj /Span BMC ( ) Tj EMC 32.004 0 Td (again) Tj ET
pdf.js text items:    "Hello" " " "world" " " "again"
officeparser text:    "Helloworldagain"
expected:             "Hello world again"
```

The script exits with code 1 while the bug is present.

## Expected

`"Hello world again"` for both PDFs, as officeparser 8.1.1 to 8.3.0 return.

## Actual

`"Helloworldagain"` for the PDF whose space glyph maps to U+0009, on 8.4.0 to 8.7.1 (latest).

In `collectGlyphs` (`src/parsers/pdf/textGlyphs.ts`), a glyph is flagged `SPACE` only when its text is blank and not a control character:

```ts
const CONTROL = /[\u0000-\u001f\u007f]/;
// …
const blank = !!unicode && !unicode.trim() && !CONTROL.test(unicode);
```

U+0009 is in `CONTROL`, so the tab-mapped space glyph is treated as a non-space glyph with empty text. In `measureItems`:

1. The word before it ("Hello") is widened over the space glyph's advance, because the space glyph sits at the item's end, within its reach, and is not skipped as a `SPACE`.
2. `blankOver` drops pdf.js's blank item, because `spaceBefore("world")` finds the space glyph as the previous glyph (it isn't a `SPACE`), whose end touches "world", so it sees no gap.

The line builder then sees "Hello" touching "world" with no blank between, and joins them.

Excluding only the tab from `CONTROL` (`/[\u0000-\u0008\u000a-\u001f\u007f]/`) fixes this repro, and fixes a real 3.7 MB exam booklet too (lowercase runs of 18+ letters drop from 404 to 4, with the same 23 tables). U+000B stays a control character there, as the comment beside the `blank` test needs.

No `parseOffice` option avoids it: the glyphs come from the operator list, which every PDF parse reads (`maxOperators` can't go below 0, and the budget adds 4 per byte of the file).

## Environment

- officeparser 8.7.1 (also 8.4.0, 8.4.1, 8.5.0, 8.6.0; not 8.1.1, 8.2.0, 8.3.0)
- pdfjs-dist 6.2.108 (the version officeparser 8.7.1 depends on)
- Node 24.22.0, npm 11.19.1, macOS 27.2
