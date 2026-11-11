// Builds a one-page PDF: "Hello world again" in Helvetica, one show per word and one per space,
// each space inside its own marked-content span (as InDesign and other tagged-PDF writers do).
// The font's ToUnicode maps the space code (32) to `spaceUnicode`; every other code maps to itself.
const W = { H: 722, e: 556, l: 222, o: 556, w: 722, r: 333, d: 556, a: 556, g: 556, i: 222, n: 556, " ": 278 };
const SIZE = 12;
const advance = (s) => [...s].reduce((n, c) => n + W[c], 0) / 1000 * SIZE;

export function makePdf(spaceUnicode) {
  const words = ["Hello", "world", "again"];
  let content = `BT /F1 ${SIZE} Tf 20 50 Td`;
  words.forEach((word, i) => {
    if (i) content += ` ${advance(words[i - 1] + " ").toFixed(3)} 0 Td`;
    content += ` (${word}) Tj`;
    if (i < words.length - 1) content += " /Span BMC ( ) Tj EMC";
  });
  content += " ET";

  const toUnicode = [
    "/CIDInit /ProcSet findresource begin 12 dict begin begincmap",
    "/CMapName /Custom def /CMapType 2 def",
    "1 begincodespacerange <00> <FF> endcodespacerange",
    "1 beginbfrange <21> <7E> <0021> endbfrange",
    `1 beginbfchar <20> <${spaceUnicode}> endbfchar`,
    "endcmap CMapName currentdict /CMap defineresource pop end end",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding /ToUnicode 6 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Length ${toUnicode.length} >>\nstream\n${toUnicode}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const at = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { pdf: Buffer.from(pdf, "latin1"), content };
}
