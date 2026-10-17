# Manaswi's Multiverse

A 12-scene birthday "interactive film", shipped as one self-contained `index.html`.

**Live (once GitHub Pages is on):** https://appdeloper.github.io/ek-message/

## Where to paste things
1. **Text:** everything personal is in `src/config.js`. Each `[PLACEHOLDER]` comment marks a field: nickname, age, birth date/time, labels, memories, spell + hints, letter, quiz, wishes, secret word.
2. **Photos:** put them in a folder as `01.jpg … 08.jpg`, `letter.jpg`, `baby.jpg`, then run `node tools/add-photos.mjs <folder>`. They're compressed to ~1200px / ≤200 KB and embedded as base64.
3. **Hero, letter and childhood photos:** pick which key each uses with `heroPhoto`, `letterPhoto` and `babyPhoto` in `src/config.js`.
4. **Her song:** drop the mp3 at **`assets/manaswi-theme.mp3`** (keep it ≤ 4 MB; the build warns above that), then rebuild. The song is loaded by URL rather than embedded, so publish `assets/manaswi-theme.mp3` next to `index.html`. With no file, or if it fails to load, a generated storm score plays instead, so the page is never silent. To test with another file: `SONG=path/to/file.mp3 node tools/build.mjs`.
5. **Comic captions:** in Comic Panel mode (the **POW!** button under the gallery), each card shows a sound-effect burst. Edit them in `CONFIG.comic.sfx` in `src/config.js`, one per card in gallery order (the list repeats if it's shorter). The speech bubbles reuse the gallery `label`s. Set `stormIntro: false` to skip the lightning intro.
6. **Build:** run `node tools/build.mjs`, which writes the single deployable `index.html` (budget 16 MB, target < 8 MB).
7. **Publish:** commit `index.html` to the `gh-pages` branch. GitHub Pages serves it.

## Scenes
Loading sanctum → portal opening → Sorcerer Supreme hero (live age counter) → multiverse card gallery → three.js mirror dimension → archives timeline (with rewind) → spell lock → letter → "which variant" quiz → council of wishes → grand finale (photos form her age; blow or hold the candle). Five easter eggs (the counter stays at 5): tap her name 7× ("Sister-sense tingling!" plus a web burst); ↑↑↓↓ (keys or swipes); long-press the eye for 2 s; type the secret word; summon the storm (shake the phone, or tap the hammer in the finale).

## Layers on top of the sorcerer base
- **Web-swinger** (red, blue and white; elastic springs): tap-to-web strands with splats, web-swing scene transitions, spider-sense tingles before each section, corner webs in the hero, an original footer skyline, gallery web strands and Comic Panel mode.
- **Thunder** (volt blue, gold and storm grey; fast and sharp): storm intro that ignites the portal, rare distant lightning, a spark rain over the timeline, beat-reactive rune glow, a Bifrost-style beam behind the letter, the storm-forged hammer, candle arcs and runic card borders.
- **Audio:** song → analyser → beat-reactive visuals; ducks to 25% for the letter and returns to 100% at the finale (1.5 s fades); the mute choice is remembered; a "Now playing" pill appears when sound starts.

## Built-in safety nets
- Every library (three.js r128, GSAP 3.13 + ScrollTrigger + SplitText, Tone.js 14.8.49, canvas-confetti 1.9.3, Lenis 1.3.8) is optional. If the CDNs are blocked, all photos, text, the letter and the finale still work.
- `prefers-reduced-motion`: no parallax, tilt, shake, kaleidoscope, fireworks, flashes, lightning, camera swings or tap webs; a CSS ring replaces WebGL.
- Flashes are capped at 3 per second (at least 340 ms apart).
- Sound starts only from the "Open the Portal" tap. iPhone users get a "silent switch off?" hint.
- Original art and generated audio only. Footer: "A fan-made birthday tribute. Not affiliated with any studio."
