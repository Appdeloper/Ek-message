// Generates original placeholder "photos" (rune/portal art) until DZ adds real ones.
// Usage: node tools/make-placeholders.mjs <path-to-sharp-module>
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)(process.argv[2] || "sharp");

const palettes = [
  ["#2DF5C8", "#120E1F"], ["#FFB23F", "#1A0F08"], ["#FF6A1A", "#12060A"], ["#7A5CFF", "#0B0818"],
  ["#2DF5C8", "#0A1518"], ["#FFB23F", "#160C1F"], ["#C8102E", "#0A0610"], ["#1E90FF", "#06101F"],
  ["#FFB23F", "#1F140A"], ["#FF8FB1", "#160812"],
];
const names = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "letter", "baby"];
const out = {};
for (let i = 0; i < names.length; i++) {
  const [c, bg] = palettes[i];
  const rings = Array.from({ length: 5 }, (_, k) => `<circle cx="450" cy="560" r="${90 + k * 70}" fill="none" stroke="${c}" stroke-opacity="${0.55 - k * 0.09}" stroke-width="${3 - k * 0.4}" stroke-dasharray="${k % 2 ? "4 14" : "none"}"/>`).join("");
  const sq = [0, 45].map((r) => `<rect x="300" y="410" width="300" height="300" fill="none" stroke="${c}" stroke-opacity=".5" stroke-width="2" transform="rotate(${r + i * 7} 450 560)"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
    <defs><radialGradient id="g" cx=".5" cy=".46" r=".7"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".45" stop-color="${bg}"/><stop offset="1" stop-color="#000"/></radialGradient></defs>
    <rect width="900" height="1200" fill="url(#g)"/>${rings}${sq}
    <text x="450" y="585" text-anchor="middle" font-family="Georgia, serif" font-size="74" fill="${c}" letter-spacing="6">${names[i] === "letter" ? "LETTER" : names[i] === "baby" ? "BABY PIC" : "PHOTO " + String(i + 1).padStart(2, "0")}</text>
    <text x="450" y="1120" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#F5EFE6" fill-opacity=".7">placeholder · replace with her photo</text></svg>`;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 62, mozjpeg: true }).toBuffer();
  out[names[i]] = "data:image/jpeg;base64," + buf.toString("base64");
}
const lines = Object.entries(out).map(([k, v]) => `  ${k}: "${v}", // ${k} — PLACEHOLDER (replace via tools/add-photos.mjs)`);
writeFileSync("src/photos.js", `/*PHOTOS:START*/\nconst PHOTOS = {\n${lines.join("\n")}\n};\n/*PHOTOS:END*/\n`);
console.log("placeholders:", Object.keys(out).length, "bytes:", lines.join("").length);
