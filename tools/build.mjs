// Assembles the single deployable file: index.html = page.html + CDN scripts + config + photos + app.
import { readFileSync, writeFileSync, statSync } from "node:fs";

const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/SplitText.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js",
  "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js",
  "https://cdn.jsdelivr.net/npm/lenis@1.3.8/dist/lenis.min.js",
];
const page = readFileSync("src/page.html", "utf8");
const js = [readFileSync("src/config.js", "utf8"), readFileSync("src/photos.js", "utf8"), readFileSync("src/app.js", "utf8")].join("\n");
if (/<\/script/i.test(js)) throw new Error("inline JS must not contain </script");
// Own scope: a CDN library defines a global "$", and nothing of ours should leak into window either.
const scripts = CDN.map((u) => `<script src="${u}"></script>`).join("\n") + `\n<script>\n(() => {\n"use strict";\n${js}\n})();\n</script>`;
if (!page.includes("<!--SCRIPTS-->")) throw new Error("marker missing");
// function replacer: a string replacement would expand "$$" / "$&" inside the inlined JS
writeFileSync("index.html", page.replace("<!--SCRIPTS-->", () => scripts));
const kb = statSync("index.html").size / 1024;
console.log(`index.html written: ${kb.toFixed(0)} KB (budget 16 MB, target < 8 MB)`);
