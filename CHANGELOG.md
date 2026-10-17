# Changelog

## 2026-10-17 · Web-swinger + Thunder upgrade (branch `thor-spidey-upgrade`)

Everything from before is kept: photos, her name, all copy and Hinglish text, the spell word and hints, timeline memories, wishes, the letter, the age counter, the 0/5 secrets counter, the theme toggle and the reduced-motion path.

### Audio
- Her song plays from `assets/manaswi-theme.mp3` via `<audio>` → MediaElementSource → AnalyserNode. It loops at volume 0.8 and starts only from the "Open the Portal" tap.
- Volume zones: 25% during the letter, 100% at the finale, with 1.5 s crossfades.
- The mute/play button is always visible, and the choice is remembered (`localStorage`, wrapped in try/catch).
- Fallback score (Tone.js) when the song is missing or fails: D-dorian pad, low drone, pentatonic bells, a 92 BPM war-drum and synthesized thunder.
- A "Now playing: Manaswi's Theme" pill.

### Web-swinger layer
- Each tap shoots a web strand from the nearest bottom corner, ending in a splat. Throttled, with at most 3 strands alive on phones.
- Web-swing scene transitions: a strand shoots out, then the camera swings with motion blur and springs back (`elastic.out(1, 0.4)`).
- Spider-sense: three tingle lines plus a tingle sound before each section heading reveals. The 7-taps egg now shoots a web burst from her name.
- Hero corner webs that sway with scroll and tilt; a procedurally drawn original skyline in the footer.
- Gallery: web strands between cards that pull taut on fast swipes and wobble back. **Comic Panel mode** (POW! button) adds halftone, bold outlines, speech-bubble labels and editable SFX captions (`CONFIG.comic.sfx`).

### Thunder layer
- Storm intro after "Open the Portal": clouds roll in and a fractal bolt strikes the centre with a flash, thunder and shake. The portal ignites from the strike point.
- Rare distant lightning; a spark rain over the timeline.
- Beat-reactive visuals driven by the music: rune glow, card-border pulse, a gentle camera pulse and particle bursts, all capped on mobile.
- A Bifrost-style rainbow beam with rising sparks behind the letter when the spell unlocks.
- An original storm-forged hammer with runes spins in at the finale and crackles. Tapping it summons the storm, which counts as a secret. The candle flame gets small electric arcs.
- Runic border glow on the cards, using a new original rune alphabet.

### Polish and safety
- Letterbox bars and stronger film grain during the intro and finale.
- Flash governor: at most 3 flashes per second, none at all under reduced motion. Reduced motion also turns off shake, lightning, swings and tap webs.
- All art is original SVG, canvas and CSS; all sound is generated or her own file. No logos, stills, names, quotes or copyrighted music.
- Libraries stay pinned (cdnjs / jsDelivr) and guarded. With every CDN blocked, the page still works.
