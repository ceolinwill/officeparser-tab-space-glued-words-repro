import { mkdirSync, writeFileSync } from "node:fs";
import { parseOffice } from "officeparser";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { makePdf } from "./make-pdf.mjs";

mkdirSync("out", { recursive: true });
let failed = false;

for (const [label, spaceUnicode] of [["space glyph -> U+0020", "0020"], ["space glyph -> U+0009", "0009"]]) {
  const { pdf, content } = makePdf(spaceUnicode);
  writeFileSync(`out/space-${spaceUnicode}.pdf`, pdf);

  const task = pdfjs.getDocument({ data: new Uint8Array(pdf), verbosity: 0 });
  const items = (await (await (await task.promise).getPage(1)).getTextContent()).items;
  await task.destroy();

  const ast = await parseOffice(pdf, { fileType: "pdf" });
  const text = (await ast.to("text")).value;

  console.log(`\n## ${label} (out/space-${spaceUnicode}.pdf)`);
  console.log(`content stream:       ${content}`);
  console.log(`pdf.js text items:    ${items.map((i) => JSON.stringify(i.str)).join(" ")}`);
  console.log(`officeparser text:    ${JSON.stringify(text)}`);
  if (text.trim() !== "Hello world again") {
    console.log(`expected:             "Hello world again"`);
    failed = true;
  }
}

process.exitCode = failed ? 1 : 0;
