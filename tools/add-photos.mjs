// Replaces the PHOTOS block with real photos, compressed for a single-file site.
//   node tools/add-photos.mjs <folder-with-photos>
// Name the files: 01.jpg … 08.jpg (→ p1…p8), letter.jpg, baby.jpg. Any image type sharp reads works.
// Each photo: long edge 1200px, JPEG q70, re-encoded smaller if it's over 200 KB. Then run: node tools/build.mjs
import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const dir = process.argv[2];
if (!dir) { console.error("usage: node tools/add-photos.mjs <folder>"); process.exit(1); }
const require = createRequire(import.meta.url);
let sharp;
try { sharp = require("sharp"); } catch { console.error("needs sharp: run `npm i sharp` once in this folder"); process.exit(1); }

const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|heic|avif)$/i.test(f)).sort();
const out = {};
for (const f of files) {
  const base = path.parse(f).name.toLowerCase();
  const key = base === "letter" || base === "baby" ? base : /^\d+$/.test(base) ? "p" + Number(base) : null;
  if (!key) { console.warn(`skip ${f} (name it 01.jpg…, letter.jpg or baby.jpg)`); continue; }
  let q = 70, buf;
  do {
    buf = await sharp(path.join(dir, f)).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    q -= 8;
  } while (buf.length > 200 * 1024 && q > 30);
  out[key] = "data:image/jpeg;base64," + buf.toString("base64");
  console.log(`✓ ${f.padEnd(14)} → ${key.padEnd(7)} ${(buf.length / 1024).toFixed(0)} KB`);
}
const lines = Object.entries(out).map(([k, v]) => `  ${k}: "${v}", // ${k}`);
writeFileSync("src/photos.js", `/*PHOTOS:START*/\nconst PHOTOS = {\n${lines.join("\n")}\n};\n/*PHOTOS:END*/\n`);
console.log(`\n${lines.length} photos written to src/photos.js — now run: node tools/build.mjs`);
