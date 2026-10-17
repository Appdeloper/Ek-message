# Manaswi's Multiverse

A 12-scene birthday "interactive film", shipped as one self-contained `index.html`.

**Live (once GitHub Pages is on):** https://appdeloper.github.io/ek-message/

## Where to paste things
1. **Text:** everything personal is in `src/config.js`. Each `[PLACEHOLDER]` comment marks a field: nickname, age, birth date/time, labels, memories, spell + hints, letter, quiz, wishes, secret word.
2. **Photos:** put them in a folder as `01.jpg … 08.jpg`, `letter.jpg`, `baby.jpg`, then run `node tools/add-photos.mjs <folder>`. They're compressed to ~1200px / ≤200 KB and embedded as base64.
3. **Hero, letter and childhood photos:** pick which key each uses with `heroPhoto`, `letterPhoto` and `babyPhoto` in `src/config.js`.
4. **Build:** run `node tools/build.mjs`, which writes the single deployable `index.html` (budget 16 MB, target < 8 MB).
5. **Publish:** commit `index.html` to the `gh-pages` branch. GitHub Pages serves it.

## Scenes
Loading sanctum → portal opening → Sorcerer Supreme hero (live age counter) → multiverse card gallery → three.js mirror dimension → archives timeline (with rewind) → spell lock → letter → "which variant" quiz → council of wishes → grand finale (photos form her age; blow or hold the candle). Five easter eggs: tap her name 7×, ↑↑↓↓ (keys or swipes), long-press the eye 2 s, type the secret word, shake the phone.

## Built-in safety nets
- Every library (three.js r128, GSAP 3.13 + ScrollTrigger + SplitText, Tone.js 14.8.49, canvas-confetti 1.9.3, Lenis 1.3.8) is optional. If the CDNs are blocked, all photos, text, the letter and the finale still work.
- `prefers-reduced-motion`: no parallax, tilt, shake, kaleidoscope or fireworks; a CSS ring replaces WebGL.
- Sound starts only from the "Open the Portal" tap. iPhone users get a "silent switch off?" hint.
- Original art and generated audio only. Footer: "A fan-made birthday tribute. Not affiliated with any studio."
