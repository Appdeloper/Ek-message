"use strict";
/* ════════════════════════════════════════════════════════════════════════════
   Manaswi's Multiverse — engine. Every library is optional: without GSAP /
   three.js / Tone / confetti the page still shows every photo, line and letter.
   ════════════════════════════════════════════════════════════════════════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
let REDUCE = mqReduce.matches;
mqReduce.addEventListener?.("change", (e) => (REDUCE = e.matches));
const COARSE = matchMedia("(pointer: coarse)").matches;
const FINE = matchMedia("(pointer: fine)").matches;
const DPR = Math.min(2, window.devicePixelRatio || 1);
const HAS = {
  gsap: !!window.gsap,
  st: !!(window.gsap && window.ScrollTrigger),
  split: !!(window.gsap && window.SplitText),
  three: !!window.THREE,
  tone: !!window.Tone,
  confetti: typeof window.confetti === "function",
  lenis: !!window.Lenis,
};
if (HAS.st) gsap.registerPlugin(ScrollTrigger);
if (HAS.split) gsap.registerPlugin(SplitText);

/* Layer hooks: the web + storm layers (layers.js) plug in here; the base scenes never depend on them. */
const Bus = new EventTarget();
const emit = (name, detail) => Bus.dispatchEvent(new CustomEvent(name, { detail }));
const Hooks = { intro: null, swing: null };

const photo = (key) => PHOTOS[key] || PHOTOS.p1;
const NICK = CONFIG.nickname || CONFIG.name;
let FROZEN = false;

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) {
    return null;
  }
}

/* ── one shared ticker; loops skip work when their section is off-screen ── */
const Ticker = (() => {
  const fns = new Set();
  const run = (dt, t) => {
    if (document.hidden) return;
    fns.forEach((f) => f(FROZEN ? 0 : dt, t));
  };
  if (HAS.gsap) gsap.ticker.add((time, deltaMs) => run(Math.min(0.05, deltaMs / 1000), time * 1000));
  else {
    let last = performance.now();
    const frame = (t) => {
      run(Math.min(0.05, (t - last) / 1000), t);
      last = t;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  return { add: (f) => fns.add(f), remove: (f) => fns.delete(f) };
})();

const visible = {};
const visIO = new IntersectionObserver((es) => es.forEach((e) => (visible[e.target.id] = e.isIntersecting)), { rootMargin: "120px 0px" });
$$("main > section").forEach((s) => visIO.observe(s));

/* ── toast ── */
let toastT = 0;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  if (HAS.gsap && !REDUCE) gsap.fromTo(t, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "back.out(2)" });
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), ms);
}

/* ═══════════════ AUDIO — her song (assets/manaswi-theme.mp3) or a generated score ═══════════════
   Song: <audio> → MediaElementSource → Analyser → Gain → speakers, started inside the "Open the Portal" tap.
   No song / it fails → Tone.js score (D-dorian pad, drone, bells, 92 BPM war-drum, thunder) so it's never silent.
   Volume zones: normal 0.8 · letter 25% · finale 100%, 1.5 s crossfades. Mute is remembered. */
const Audio = (() => {
  let ready = false, muted = store("mv-muted") === "1", layer = 0, chordIdx = 0, mode = "off", toneOk = false, scoreOn = false;
  const n = {};
  const zones = { letter: false, finale: false };
  const LEVEL = { normal: 0.8, letter: 0.25, finale: 1 };
  const level = () => (zones.finale ? LEVEL.finale : zones.letter ? LEVEL.letter : LEVEL.normal);
  const toDb = (g) => -12 + 20 * Math.log10(g / LEVEL.normal); // the score follows the same loudness curve
  let song = null;
  const subs = new Set();
  const changed = () => subs.forEach((f) => f());
  const CHORDS = [
    ["D3", "F3", "A3", "C4", "E4"], // Dm9
    ["A#2", "D3", "F3", "A3"], // Bbmaj7
    ["F2", "A2", "C3", "E3"], // Fmaj7
    ["E2", "G2", "C3", "E3"], // C/E
  ];
  const PENTA = ["D5", "F5", "G5", "A5", "C6", "D6"];
  const safe = (fn) => {
    if (!toneOk || muted) return;
    try { fn(); } catch (e) { /* audio is decoration; never break the page */ }
  };

  function buildSfx() {
    n.master = new Tone.Volume(toDb(level())).toDestination();
    n.an = new Tone.Analyser("fft", 64);
    n.master.connect(n.an);
    n.reverb = new Tone.Reverb({ decay: 8, wet: 0.45 }).connect(n.master);
    n.bell = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3.01, modulationIndex: 12, envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1.5 }, modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0, release: 0.4 }, volume: -20 }).connect(n.reverb);
    n.noiseF = new Tone.Filter(400, "bandpass").connect(n.reverb);
    n.noise = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.06, decay: 0.55, sustain: 0 }, volume: -14 }).connect(n.noiseF);
    n.thwipF = new Tone.Filter(2600, "bandpass").connect(n.master);
    n.thwip = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.002, decay: 0.12, sustain: 0 }, volume: -20 }).connect(n.thwipF);
    n.metal = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.09, release: 0.02 }, harmonicity: 5.1, modulationIndex: 16, resonance: 2600, octaves: 1.2, volume: -26 }).connect(n.master);
    n.metal.frequency.value = 420;
    // Polyphonic so loops and one-shots can overlap without Tone's scheduling conflicts.
    n.boom = new Tone.PolySynth(Tone.MembraneSynth, { pitchDecay: 0.09, octaves: 6, envelope: { attack: 0.001, decay: 1.3, sustain: 0 }, volume: -4 }).connect(n.master);
    n.rumbleF = new Tone.Filter(320, "lowpass").connect(n.master);
    n.rumble = new Tone.NoiseSynth({ noise: { type: "brown" }, envelope: { attack: 0.04, decay: 2.6, sustain: 0 }, volume: -6 }).connect(n.rumbleF);
    n.fan = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fattriangle", count: 3, spread: 18 }, envelope: { attack: 0.02, decay: 0.4, sustain: 0.6, release: 2.2 }, volume: -12 }).connect(n.reverb);
  }

  function buildScore() {
    if (scoreOn || !toneOk) return;
    scoreOn = true;
    n.chorus = new Tone.Chorus(2.5, 3.5, 0.6).connect(n.reverb).start();
    n.filter = new Tone.Filter(900, "lowpass").connect(n.chorus);
    n.lfo = new Tone.LFO(0.05, 380, 1900).connect(n.filter.frequency).start();
    n.pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsawtooth", count: 3, spread: 28 }, envelope: { attack: 2, decay: 1, sustain: 0.7, release: 4 }, volume: -18 }).connect(n.filter);
    n.drone = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 4, sustain: 1, release: 4 }, volume: -16 }).connect(n.master);
    n.droneHi = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 5, sustain: 1, release: 4 }, volume: -30 }).connect(n.filter);
    n.drumF = new Tone.Filter(260, "lowpass").connect(n.master);
    n.drum = new Tone.PolySynth(Tone.MembraneSynth, { pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.002, decay: 0.5, sustain: 0 }, volume: -10 }).connect(n.drumF);
    Tone.Transport.bpm.value = 92;
    // Loop callbacks run inside Tone's scheduler, outside any of our try/catch: guard them here.
    new Tone.Loop((time) => {
      try { n.pad.triggerAttackRelease(CHORDS[chordIdx % 4], "2m", time, 0.45); } catch (e) {}
      chordIdx++;
    }, "2m").start(0);
    new Tone.Loop((time) => {
      if (layer < 1 || muted || Math.random() > 0.26) return;
      try { n.bell.triggerAttackRelease(PENTA[(Math.random() * PENTA.length) | 0], "16n", time, rand(0.3, 0.7)); } catch (e) {}
    }, "8n").start("1m");
    let beat = 0; // soft war-drum: low hits on 1 and 3, a ghost note before the bar
    new Tone.Loop((time) => {
      const b = beat++ % 4;
      try {
        if (b === 0 || b === 2) n.drum.triggerAttackRelease(b === 0 ? "D1" : "A0", "8n", time, b === 0 ? 0.55 : 0.35);
        else if (b === 3 && Math.random() < 0.5) n.drum.triggerAttackRelease("D1", "16n", time + Tone.Time("8n").toSeconds(), 0.18);
      } catch (e) {}
    }, "4n").start("2m");
    new Tone.Loop((time) => {
      if (Math.random() < 0.35) try { n.rumble.triggerAttackRelease(2.4, time, 0.35); } catch (e) {}
    }, "4m").start("4m");
    n.drone.triggerAttack("D1");
    n.droneHi.triggerAttack("D2");
    Tone.Transport.start("+0.1");
  }

  // Must run synchronously inside a tap: play() keeps the user-activation that autoplay rules require.
  function startSong() {
    if (!SONG_URL || song) return;
    try {
      const el = document.createElement("audio");
      el.src = SONG_URL;
      el.loop = true;
      el.preload = "auto";
      el.setAttribute("playsinline", "");
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(el);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      an.smoothingTimeConstant = 0.3;
      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : level();
      src.connect(an);
      an.connect(gain);
      gain.connect(ctx.destination);
      song = { el, ctx, an, gain, buf: new Uint8Array(an.frequencyBinCount) };
      ctx.resume?.();
      el.addEventListener("error", toScore, { once: true });
      el.play().then(() => { mode = "song"; changed(); }).catch(toScore);
    } catch (e) {
      song = null;
    }
  }
  function toScore() {
    if (song) {
      try { song.el.pause(); song.ctx.close?.(); } catch (e) {}
      song = null;
    }
    if (toneOk) { buildScore(); mode = "score"; } else mode = "off";
    changed();
  }

  function applyLevel(sec = 1.5) {
    const g = muted ? 0 : level();
    if (song) {
      const p = song.gain.gain, t = song.ctx.currentTime;
      p.cancelScheduledValues(t);
      p.setValueAtTime(p.value, t);
      p.linearRampToValueAtTime(g, t + sec);
    }
    if (toneOk) try { n.master.volume.rampTo(toDb(Math.max(0.001, level())), sec); } catch (e) {}
  }

  return {
    get ready() { return ready; },
    get muted() { return muted; },
    /** "song" | "score" | "off" */
    get mode() { return mode; },
    onChange(f) { subs.add(f); },
    /** Call synchronously inside the tap that unlocks sound. */
    async start() {
      if (ready) return true;
      ready = true;
      startSong();
      if (HAS.tone) {
        try {
          await Tone.start();
          buildSfx();
          toneOk = true;
          Tone.Destination.mute = muted;
        } catch (e) { toneOk = false; }
      }
      if (!song) toScore();
      changed();
      return true;
    },
    setMuted(m) {
      muted = m;
      store("mv-muted", m ? "1" : "0");
      if (toneOk) Tone.Destination.mute = m;
      if (song) {
        const p = song.gain.gain, t = song.ctx.currentTime;
        p.cancelScheduledValues(t);
        p.setValueAtTime(p.value, t);
        p.linearRampToValueAtTime(m ? 0 : level(), t + 0.4);
        if (!m && song.el.paused) song.el.play().catch(() => {});
      }
      changed();
    },
    /** Volume zones: "letter" ducks to 25%, "finale" lifts to 100%, with 1.5 s crossfades. */
    zone(name, on) {
      if (zones[name] === on) return;
      zones[name] = on;
      applyLevel(1.5);
    },
    duck(on) { this.zone("letter", on); },
    /** 0..1 low-frequency energy of whatever is playing (drives the beat-reactive visuals). */
    low() {
      if (muted || !ready) return 0;
      if (song && mode === "song") {
        song.an.getByteFrequencyData(song.buf);
        let s = 0;
        for (let i = 1; i <= 5; i++) s += song.buf[i];
        return s / (5 * 255);
      }
      if (scoreOn && n.an) {
        const v = n.an.getValue(); // dB per bin, roughly -100 (silent) … -20 (loud)
        let s = 0;
        for (let i = 0; i < 4; i++) s += v[i];
        return clamp((s / 4 + 85) / 50, 0, 1);
      }
      return 0;
    },
    setLayer(l) { layer = Math.max(layer, l); },
    setChord(i) {
      if (!scoreOn) return;
      safe(() => {
        chordIdx = i;
        n.pad.releaseAll();
        n.pad.triggerAttackRelease(CHORDS[i % 4], "1m", undefined, 0.4);
      });
    },
    whoosh(soft) {
      safe(() => {
        const t = Tone.now();
        n.noiseF.frequency.cancelScheduledValues(t);
        n.noiseF.frequency.setValueAtTime(soft ? 600 : 250, t);
        n.noiseF.frequency.exponentialRampToValueAtTime(soft ? 2400 : 5200, t + 0.45);
        n.noise.volume.value = soft ? -22 : -12;
        n.noise.triggerAttackRelease(soft ? 0.25 : 0.5, t);
      });
    },
    /** Web-shooter "thwip": a short band-passed noise flick. */
    thwip() {
      safe(() => {
        const t = Tone.now();
        n.thwipF.frequency.cancelScheduledValues(t);
        n.thwipF.frequency.setValueAtTime(4200, t);
        n.thwipF.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
        n.thwip.triggerAttackRelease(0.12, t);
      });
    },
    /** Spider-sense tingle: two quick high bells. */
    tingle() {
      safe(() => {
        const t = Tone.now();
        n.bell.triggerAttackRelease("C7", "32n", t, 0.35);
        n.bell.triggerAttackRelease("E7", "32n", t + 0.07, 0.3);
        n.bell.triggerAttackRelease("G7", "32n", t + 0.14, 0.22);
      });
    },
    /** Thunder: a crack (membrane) under a long brown-noise rumble. */
    thunder(power = 1) {
      safe(() => {
        const t = Tone.now();
        n.boom.triggerAttackRelease("A0", "1n", t, 0.6 * power);
        n.rumble.triggerAttackRelease(2.6, t + 0.05, 0.9 * power);
      });
    },
    click(i = 0) { safe(() => n.metal.triggerAttackRelease("32n", Tone.now(), 0.4 + i * 0.15)); },
    boom() { safe(() => n.boom.triggerAttackRelease("C1", "2n", Tone.now())); },
    chime() {
      safe(() => {
        const t = Tone.now();
        ["A5", "D6", "F6", "A6"].forEach((note, i) => n.bell.triggerAttackRelease(note, "16n", t + i * 0.09, 0.8));
      });
    },
    fanfare() {
      safe(() => {
        const t = Tone.now();
        n.fan.triggerAttackRelease(["D4", "F#4", "A4", "D5"], "4n", t);
        n.fan.triggerAttackRelease(["G4", "B4", "D5", "G5"], "4n", t + 0.45);
        n.fan.triggerAttackRelease(["D4", "F#4", "A4", "D5", "F#5"], "1m", t + 0.9);
        n.boom.triggerAttackRelease("D1", "2n", t + 0.9);
      });
    },
  };
})();

function setMuteUI() {
  const b = $("#mute-btn");
  const off = Audio.muted || !Audio.ready;
  b.setAttribute("aria-pressed", String(off));
  b.setAttribute("aria-label", off ? "Play sound" : "Mute sound");
  $(".wave", b).setAttribute("display", off ? "none" : "inline");
  $(".x", b).removeAttribute("hidden");
  $(".x", b).setAttribute("display", off ? "inline" : "none");
}
Audio.onChange(setMuteUI);
$("#mute-btn").addEventListener("click", () => {
  if (!Audio.ready) {
    Audio.setMuted(false);
    Audio.start();
    return;
  }
  Audio.setMuted(!Audio.muted);
});

/* ═══════════════ THEME ═══════════════ */
function setThemeUI() {
  const light = document.documentElement.getAttribute("data-theme") === "light";
  $("#theme-btn").setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
}
$("#theme-btn").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  store("mv-theme", next);
  setThemeUI();
});
setThemeUI();

/* ═══════════════ CONTENT FILL ═══════════════ */
$$("[data-nick]").forEach((e) => (e.textContent = NICK));
$$("[data-nick-upper]").forEach((e) => (e.textContent = NICK.toUpperCase()));
$$("[data-name]").forEach((e) => (e.textContent = CONFIG.name.toUpperCase()));
$$("img[data-photo]").forEach((img) => {
  const k = img.dataset.photo === "hero" ? CONFIG.heroPhoto : img.dataset.photo === "letter" ? CONFIG.letterPhoto : img.dataset.photo;
  img.src = photo(k);
});
$("#hero-sub").textContent = ["Master of the Mystic Arts", "Guardian of the Remote", CONFIG.birthYear ? `Est. ${CONFIG.birthYear}` : null].filter(Boolean).join(" • ");
$("#footer-from").textContent = `Conjured for ${NICK} by ${CONFIG.from}${CONFIG.birthdayLabel ? " · " + CONFIG.birthdayLabel : ""}.`;
$("#end-title").textContent = `HAPPY BIRTHDAY, SORCERER SUPREME ${NICK.toUpperCase()}`;
$("#end-from").textContent = `— from your brother, ${CONFIG.from}, across every universe.`;

/* ═══════════════ GOLD DUST · CURSOR · TAP SPARKS ═══════════════ */
(() => {
  const c = $("#dust"), ctx = c.getContext("2d");
  let w = 0, h = 0, parts = [];
  const N = REDUCE ? 24 : COARSE ? 60 : 150;
  function size() {
    w = innerWidth; h = innerHeight;
    c.width = w * DPR; c.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  addEventListener("resize", size);
  for (let i = 0; i < N; i++) parts.push({ x: Math.random() * w, y: Math.random() * h, r: rand(0.4, 1.8), vy: rand(-12, -4), vx: rand(-4, 4), ph: Math.random() * 6.28 });
  Ticker.add((dt, t) => {
    ctx.clearRect(0, 0, w, h);
    const light = document.documentElement.getAttribute("data-theme") === "light";
    ctx.globalCompositeOperation = light ? "source-over" : "lighter";
    for (const p of parts) {
      if (!REDUCE) {
        p.y += p.vy * dt;
        p.x += (p.vx + Math.sin(t / 1600 + p.ph) * 6) * dt;
      }
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
      const a = 0.35 + 0.35 * Math.sin(t / 700 + p.ph);
      ctx.fillStyle = light ? `rgba(138,83,0,${a * 0.5})` : `rgba(255,190,90,${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fill();
    }
  });

  // rune-ring cursor (fine pointers)
  if (FINE) {
    document.body.classList.add("has-cursor");
    const cur = $("#cursor");
    let tx = -100, ty = -100, x = -100, y = -100;
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const INTERACTIVE = "button, a, input, textarea, summary, label, .ucard, .candle, [role=button]";
    document.addEventListener("pointerover", (e) => cur.classList.toggle("big", !!e.target.closest?.(INTERACTIVE)));
    Ticker.add(() => {
      x = lerp(x, tx, 0.25); y = lerp(y, ty, 0.25);
      cur.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }
})();

/* ═══════════════ RUNE SVG GENERATOR (original glyphs) ═══════════════ */
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function glyph(rnd, size) {
  // an invented glyph: 3–4 strokes on a 3×4 grid
  const pts = () => [((rnd() * 3) | 0) * size / 2 - size / 2, ((rnd() * 4) | 0) * size / 3 - size / 2];
  let d = "";
  const strokes = 3 + ((rnd() * 2) | 0);
  for (let i = 0; i < strokes; i++) {
    const [a, b] = pts(), [c, e] = pts();
    d += `M${a.toFixed(1)} ${b.toFixed(1)}L${c.toFixed(1)} ${e.toFixed(1)}`;
  }
  return d;
}
function glyphRing(r, count, size, seed, color) {
  const rnd = seeded(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * 360;
    out += `<path d="${glyph(rnd, size)}" transform="rotate(${a}) translate(0 ${-r})" stroke="${color}" />`;
  }
  return out;
}
function buildRunes() {
  const G = "var(--gold)", A = "var(--arcane)", R = "var(--web-red)", B = "var(--web-blue)";
  const ticks = Array.from({ length: 72 }, (_, i) => `<line x1="0" y1="-470" x2="0" y2="${i % 6 ? -462 : -450}" transform="rotate(${i * 5})" stroke="${G}" />`).join("");
  const web = Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="0" x2="0" y2="-330" transform="rotate(${i * 30})" stroke="${R}" stroke-opacity=".35"/>`).join("") +
    [110, 180, 250, 320].map((r) => `<polygon points="${Array.from({ length: 12 }, (_, i) => { const a = (i * 30 - 90) * Math.PI / 180; const rr = r * (i % 2 ? 0.94 : 1); return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`; }).join(" ")}" fill="none" stroke="${B}" stroke-opacity=".45"/>`).join("");
  const svg = (cls, inner) => `<svg class="${cls}" viewBox="-500 -500 1000 1000" fill="none" stroke-width="1.2" aria-hidden="true">${inner}</svg>`;
  $("#runes").innerHTML = `<div class="runes-inner" style="position:absolute;inset:0">${
    svg("rot-a", `<circle r="480" stroke="${G}" stroke-opacity=".7"/><circle r="440" stroke="${G}" stroke-opacity=".5"/>${ticks}${glyphRing(458, 36, 14, 7, G)}`) +
    svg("rot-b", `${web}<rect x="-300" y="-300" width="600" height="600" stroke="${G}" stroke-opacity=".55"/><rect x="-300" y="-300" width="600" height="600" transform="rotate(45)" stroke="${G}" stroke-opacity=".55"/><circle r="340" stroke="${A}" stroke-opacity=".4" stroke-dasharray="2 10"/>`) +
    svg("rot-c", `<circle r="200" stroke="${A}" stroke-opacity=".7"/><circle r="168" stroke="${G}" stroke-opacity=".5"/>${glyphRing(184, 20, 12, 42, A)}<polygon points="0,-150 130,75 -130,75" stroke="${G}" stroke-opacity=".5"/><polygon points="0,150 130,-75 -130,-75" stroke="${G}" stroke-opacity=".35"/>`)
  }</div>`;
}
buildRunes();

/* ═══════════════ SPLIT TEXT helper (keeps gold gradient per char) ═══════════════ */
function splitChars(el) {
  if (!HAS.split) return [];
  const chars = [];
  const golds = $$(".gold-text", el);
  if (el.classList.contains("gold-text")) golds.push(el);
  golds.forEach((g) => g.classList.remove("gold-text"));
  const s = new SplitText(el, { type: "words,chars", charsClass: "ch" });
  s.chars.forEach((c) => {
    c.style.display = "inline-block";
    if (golds.some((g) => g.contains(c))) c.classList.add("gold-text");
    chars.push(c);
  });
  return chars;
}

/* ═══════════════ 1 · LOADING SANCTUM ═══════════════ */
const Loader = (() => {
  const el = $("#loader"), cv = $("#loader-canvas"), ctx = cv.getContext("2d");
  let w, h, prog = 0, shown = 0, rot = 0, parts = [], alive = true, expand = 0;
  function size() { w = innerWidth; h = innerHeight; cv.width = w * DPR; cv.height = h * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  size();
  addEventListener("resize", size);
  document.documentElement.style.overflow = "hidden";

  const tick = (dt) => {
    if (!alive) return;
    shown = lerp(shown, prog, 0.08);
    $("#loader-pct").textContent = Math.round(shown * 100) + "%";
    rot += dt * (1.2 + expand * 6);
    const R = Math.min(w, h, 520) * 0.2 * (1 + expand * 5);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(7,6,11,0.28)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    const pr = $("#loader-pct").getBoundingClientRect();
    const cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
    const arc = Math.max(0.05, shown) * Math.PI * 2;
    // the ring draws itself as progress grows; sparks are emitted tangentially
    const emit = REDUCE ? 1 : COARSE ? 5 : 9;
    for (let i = 0; i < emit; i++) {
      const a = rot + Math.random() * arc;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      const sp = rand(40, 140);
      parts.push({ x, y, vx: -Math.sin(a) * sp, vy: Math.cos(a) * sp, life: 1, hue: Math.random() < 0.6 ? 34 : 18 });
    }
    ctx.lineWidth = 1.6;
    parts = parts.filter((p) => (p.life -= dt * 1.4) > 0);
    for (const p of parts) {
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      ctx.strokeStyle = `hsla(${p.hue},100%,${55 + p.life * 20}%,${p.life})`;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny; p.vx *= 0.985; p.vy *= 0.985;
    }
    ctx.strokeStyle = "rgba(255,178,63,0.9)";
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, rot, rot + arc); ctx.stroke();
  };
  Ticker.add(tick);

  // real progress: decode every photo once
  const keys = Object.keys(PHOTOS);
  let done = 0;
  const started = performance.now();
  const decodes = keys.map((k) => {
    const im = new Image();
    im.decoding = "async";
    im.src = PHOTOS[k];
    return (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { done++; prog = done / keys.length; });
  });
  Promise.all([Promise.all(decodes), document.fonts ? document.fonts.ready.catch(() => {}) : null]).then(async () => {
    prog = 1;
    const wait = Math.max(0, (REDUCE ? 300 : 1500) - (performance.now() - started));
    await sleep(wait);
    $("#enter-row").hidden = false;
    if (Audio.muted) $("#enter-hint").textContent = "tap to enter · sound is off (you muted it last time) — 🔊 anytime";
    $("#loader-cal").textContent = `The multiverse is ready, ${NICK}.`;
    $("#enter-sound").focus({ preventScroll: true });
  });

  async function requestSensors() {
    // iOS needs these from a tap; only on touch devices (desktop Chrome defines them without sensors)
    if (!COARSE) return;
    try { if (window.DeviceOrientationEvent?.requestPermission) Sensors.orient = (await DeviceOrientationEvent.requestPermission()) === "granted"; else Sensors.orient = true; } catch (e) {}
    try { if (window.DeviceMotionEvent?.requestPermission) Sensors.motion = (await DeviceMotionEvent.requestPermission()) === "granted"; else Sensors.motion = true; } catch (e) {}
    Sensors.listen();
  }

  function exit(skipIntro) {
    document.documentElement.style.overflow = "";
    const finish = () => {
      alive = false;
      Ticker.remove(tick);
      el.hidden = true;
      el.style.display = "none";
      ScrollFX.refresh();
      emit("enter", { skipIntro });
      if (skipIntro) jumpTo($("#hero"), false);
      else if (Hooks.intro) Hooks.intro(() => Portal.open());
      else Portal.open();
    };
    if (HAS.gsap && !REDUCE) {
      gsap.to({ v: 0 }, { v: 1, duration: 0.7, ease: "power2.in", onUpdate() { expand = this.targets()[0].v; } });
      gsap.to(el, { opacity: 0, duration: 0.45, delay: 0.4, onComplete: finish });
      // set up the portal's start state before the loader fades so nothing flashes
      if (!skipIntro) Portal.prime();
    } else finish();
  }

  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  $("#enter-sound").addEventListener("click", () => {
    Audio.start(); // song.play() + Tone.start() inside the gesture (a remembered mute stays muted)
    requestSensors();
    if (isIOS) { const hint = $("#silent-hint"); hint.hidden = false; setTimeout(() => (hint.hidden = true), 6000); }
    exit(false);
  });
  $("#enter-quiet").addEventListener("click", () => {
    Audio.setMuted(true);
    requestSensors();
    setMuteUI();
    exit(false);
  });
  $("#enter-skip").addEventListener("click", () => {
    Audio.setMuted(false);
    Audio.start();
    requestSensors();
    exit(true);
  });
  return {};
})();

/* ── sensors: tilt + shake ── */
const Sensors = {
  orient: false, motion: false, tx: 0, ty: 0, _on: false,
  listen() {
    if (this._on) return;
    this._on = true;
    addEventListener("deviceorientation", (e) => {
      if (e.gamma == null) return;
      this.tx = clamp(e.gamma / 30, -1, 1);
      this.ty = clamp((e.beta - 45) / 30, -1, 1);
    });
    let last = 0;
    addEventListener("devicemotion", (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
      if (Math.abs(mag - last) > 22) Eggs.shake();
      last = mag;
    });
  },
};
let pointerTilt = { x: 0, y: 0 };
if (FINE) addEventListener("pointermove", (e) => { pointerTilt.x = e.clientX / innerWidth * 2 - 1; pointerTilt.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
const tilt = () => (COARSE ? { x: Sensors.tx, y: Sensors.ty } : pointerTilt);

/* ═══════════════ 2 · PORTAL OPENING ═══════════════ */
const Portal = (() => {
  let chars = null, tl = null;
  function prime() {
    if (!HAS.gsap || REDUCE) return;
    chars = chars || splitChars($("#portal-title"));
    gsap.set("#portal-photo", { clipPath: "circle(0% at 50% 50%)" });
    gsap.set("#portal-stage", { scale: 0.25, opacity: 0 });
    gsap.set(chars, { y: 80, opacity: 0, rotateX: -80 });
    gsap.set("#portal .scroll-cue", { opacity: 0 });
  }
  function open() {
    Audio.setLayer(0);
    emit("portal:open");
    if (!HAS.gsap || REDUCE) {
      if (HAS.gsap) gsap.from("#portal .scene-inner", { opacity: 0, duration: 0.6 });
      return;
    }
    prime();
    tl?.kill();
    tl = gsap.timeline();
    tl.add(() => Audio.whoosh())
      .to("#portal-stage", { scale: 1, opacity: 1, duration: 1.1, ease: "expo.out" })
      .to("#portal-photo", { clipPath: "circle(50% at 50% 50%)", duration: 1.2, ease: "expo.out" }, "-=0.6")
      .add(() => {
        Audio.boom();
        if (HAS.confetti) confetti({ particleCount: COARSE ? 50 : 90, spread: 360, startVelocity: 28, gravity: 0.6, ticks: 140, origin: { x: 0.5, y: 0.38 }, colors: ["#FFB23F", "#FF6A1A", "#FFE3A8"], scalar: 0.8, disableForReducedMotion: true });
      }, "-=0.9")
      .fromTo("#portal", { x: 0, y: 0 }, { keyframes: [{ x: 6, y: -4 }, { x: -5, y: 5 }, { x: 4, y: 2 }, { x: -3, y: -3 }, { x: 0, y: 0 }], duration: 0.42, ease: "none" }, "<")
      .to(chars, { y: 0, opacity: 1, rotateX: 0, stagger: 0.04, duration: 1.1, ease: "expo.out" }, "-=0.6")
      .to("#portal .scroll-cue", { opacity: 1, duration: 0.6 }, "-=0.4");
  }
  return { prime, open };
})();

/* ═══════════════ 3 · HERO ═══════════════ */
(() => {
  // tilt parallax on the rune circles (max 12px)
  const inner = $(".runes-inner");
  Ticker.add(() => {
    if (!visible.hero || REDUCE) return;
    const t = tilt();
    inner.style.transform = `translate3d(${(t.x * 12).toFixed(1)}px, ${(t.y * 12).toFixed(1)}px, 0)`;
  });
  // live age counter
  const b = CONFIG.birthISO ? new Date(CONFIG.birthISO) : null;
  if (b && !isNaN(b)) {
    const box = $("#age-counter");
    box.hidden = false;
    const cells = Object.fromEntries($$("b[data-u]", box).map((e) => [e.dataset.u, e]));
    const upd = () => {
      const now = new Date();
      let y = now.getFullYear() - b.getFullYear();
      const anniv = new Date(b); anniv.setFullYear(b.getFullYear() + y);
      if (anniv > now) { y--; anniv.setFullYear(b.getFullYear() + y); }
      let ms = now - anniv;
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const h = Math.floor(ms / 36e5); ms -= h * 36e5;
      const m = Math.floor(ms / 6e4); ms -= m * 6e4;
      cells.y.textContent = y; cells.d.textContent = d; cells.h.textContent = h; cells.m.textContent = m; cells.s.textContent = Math.floor(ms / 1000);
    };
    upd();
    setInterval(() => visible.hero && upd(), 1000);
  }
})();

/* ═══════════════ 4 · MULTIVERSE GALLERY ═══════════════ */
const Gallery = (() => {
  const vp = $("#cards-viewport"), track = $("#cards-track");
  const items = CONFIG.gallery;
  const code = (i) => { let c = 100 + ((i * 271 + 58) % 900); if (c === 616) c = 617; return `UNIVERSE #${c}-M`; };
  track.innerHTML = items.map((it, i) => `
    <article class="ucard${i === 0 ? " active" : ""}" data-i="${i}">
      <img src="${photo(it.photo)}" alt="${it.label.replace(/"/g, "&quot;")}" decoding="async" draggable="false" />
      <div class="sheen" aria-hidden="true"></div>
      <div class="meta"><div class="code">${code(i)}</div><div class="label">${it.label}</div></div>
      <button class="ucard-open" type="button" aria-label="Open ${code(i)}: ${it.label.replace(/"/g, "&quot;")}"></button>
    </article>`).join("");
  const cards = $$(".ucard", track);
  let idx = 0, x = 0, dragging = false, startX = 0, startY = 0, baseX = 0, lastX = 0, lastT = 0, vel = 0, moved = false, decided = false;
  const step = () => cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 24);
  const targetX = (i) => -i * step();
  function apply(nx, animate) {
    x = nx;
    if (animate && HAS.gsap && !REDUCE) gsap.to(track, { x: nx, duration: 0.7, ease: "expo.out", overwrite: true });
    else if (HAS.gsap) gsap.set(track, { x: nx });
    else track.style.transform = `translateX(${nx}px)`;
  }
  function go(i, sound = true) {
    i = clamp(i, 0, cards.length - 1);
    const changed = i !== idx;
    idx = i;
    cards.forEach((c, k) => {
      c.classList.toggle("active", k === i);
      c.style.transform = "";
      $(".ucard-open", c).tabIndex = k === i ? 0 : -1;
    });
    apply(targetX(i), true);
    $("#cards-count").textContent = `${i + 1} / ${cards.length}`;
    if (changed && sound) {
      Audio.whoosh(true);
      if (!REDUCE) { cards[i].classList.remove("glitch"); void cards[i].offsetWidth; cards[i].classList.add("glitch"); setTimeout(() => cards[i].classList.remove("glitch"), 320); }
    }
  }
  vp.addEventListener("pointerdown", (e) => {
    dragging = true; moved = false; decided = false;
    startX = lastX = e.clientX; startY = e.clientY; baseX = x; lastT = performance.now(); vel = 0;
    if (HAS.gsap) gsap.killTweensOf(track);
  });
  vp.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!decided) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      decided = true;
      if (Math.abs(dy) > Math.abs(dx)) { dragging = false; return; } // vertical: let the page scroll
      moved = true;
      vp.setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    vel = (e.clientX - lastX) / Math.max(1, now - lastT);
    lastX = e.clientX; lastT = now;
    let nx = baseX + dx;
    const min = targetX(cards.length - 1);
    if (nx > 0) nx *= 0.35; else if (nx < min) nx = min + (nx - min) * 0.35;
    apply(nx, false);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (!moved) return;
    const projected = x + vel * 220; // inertia
    let i = Math.round(-projected / step());
    i = clamp(i, idx - 2, idx + 2);
    go(i);
  };
  vp.addEventListener("pointerup", end);
  vp.addEventListener("pointercancel", end);
  vp.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  $("#card-prev").addEventListener("click", () => go(idx - 1));
  $("#card-next").addEventListener("click", () => go(idx + 1));
  vp.tabIndex = 0;
  vp.setAttribute("aria-label", "Universe cards. Use left and right arrow keys.");
  vp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { go(idx + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { go(idx - 1); e.preventDefault(); }
  });
  cards.forEach((c, i) => $(".ucard-open", c).addEventListener("click", () => (i === idx ? Lightbox.open(i) : go(i))));
  addEventListener("resize", () => apply(targetX(idx), false));
  go(0, false);

  // 3D tilt + holographic sheen on the active card (±12°)
  Ticker.add(() => {
    if (!visible.gallery || REDUCE || dragging) return;
    const c = cards[idx];
    let tx, ty;
    if (COARSE) { tx = Sensors.tx; ty = Sensors.ty; }
    else {
      const r = c.getBoundingClientRect();
      const px = (window._mx ?? r.left + r.width / 2), py = (window._my ?? r.top + r.height / 2);
      tx = clamp((px - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
      ty = clamp((py - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
    }
    c.style.transform = `rotateY(${(tx * 12).toFixed(2)}deg) rotateX(${(-ty * 12).toFixed(2)}deg)`;
    c.style.setProperty("--sx", `${50 + tx * 40}%`);
    c.style.setProperty("--sy", `${50 + ty * 40}%`);
  });
  addEventListener("pointermove", (e) => { window._mx = e.clientX; window._my = e.clientY; }, { passive: true });
  return { items };
})();

const Lightbox = (() => {
  const lb = $("#lightbox");
  let back = null;
  function open(i) {
    const it = Gallery.items[i];
    back = document.activeElement;
    $("#lb-img").src = photo(it.photo);
    $("#lb-img").alt = it.label;
    $("#lb-cap").textContent = it.label;
    lb.hidden = false;
    Audio.whoosh();
    if (HAS.gsap && !REDUCE) gsap.fromTo("#lightbox figure", { scale: 0.4, opacity: 0, rotate: -20 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.8, ease: "expo.out" });
    $("#lb-close").focus();
  }
  function close() {
    lb.hidden = true;
    back?.focus?.();
  }
  $("#lb-close").addEventListener("click", close);
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!lb.hidden) close();
    if (!$("#egg-photo").hidden) $("#egg-photo").hidden = true;
  });
  return { open };
})();

/* ═══════════════ 5 · MIRROR DIMENSION (three.js r128) ═══════════════ */
const Mirror = (() => {
  const stage = $("#mirror-stage"), keys = CONFIG.mirror.slice(0, 8);
  let three = null, drag = 0, dragV = 0, scrollP = 0, startX = null, auto = 0;

  // CSS 3D fallback ring (also the reduced-motion / no-WebGL path)
  const ring = $("#mf-ring");
  const n = keys.length, radius = () => Math.round(ring.offsetWidth / 2 / Math.tan(Math.PI / n) + 24);
  ring.innerHTML = keys.map((k, i) => `<img src="${photo(k)}" alt="Mirror universe ${i + 1}" decoding="async" draggable="false" />`).join("");
  function layoutFallback() {
    const R = radius();
    $$("img", ring).forEach((im, i) => (im.style.transform = `rotateY(${(i * 360) / n}deg) translateZ(${R}px)`));
  }
  layoutFallback();
  addEventListener("resize", layoutFallback);

  stage.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  stage.addEventListener("pointermove", (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = e.clientX;
    drag += dx * 0.006;
    dragV = dx * 0.006;
  });
  const up = () => (startX = null);
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("pointerleave", up);
  addEventListener("scroll", () => {
    const r = stage.getBoundingClientRect();
    scrollP = clamp(1 - (r.top + r.height) / (innerHeight + r.height), 0, 1);
  }, { passive: true });

  function webglOK() {
    try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch (e) { return false; }
  }

  function init() {
    if (three || !HAS.three || REDUCE || !webglOK()) return;
    try {
      const T = THREE;
      const renderer = new T.WebGLRenderer({ antialias: !COARSE, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(DPR, COARSE ? 1.5 : 2));
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.autoClear = false;
      stage.appendChild(renderer.domElement);
      const scene = new T.Scene(), camera = new T.PerspectiveCamera(48, 1, 0.1, 100);
      // kaleidoscope background: 6-fold mirrored polar coords over animated noise
      const bgScene = new T.Scene(), bgCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const bgMat = new T.ShaderMaterial({
        uniforms: { t: { value: 0 }, res: { value: new T.Vector2(1, 1) } },
        vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
        fragmentShader: `precision mediump float; varying vec2 vUv; uniform float t; uniform vec2 res;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
            return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
          void main(){
            vec2 p=(vUv-.5)*vec2(res.x/res.y,1.)*2.;
            float r=length(p), a=atan(p.y,p.x), seg=6.2831853/6.;
            a=mod(a+t*.05,seg); a=abs(a-seg*.5);
            vec2 q=vec2(cos(a),sin(a))*r;
            float v=fbm(q*2.6+vec2(t*.06,-t*.05));
            vec3 gold=vec3(1.,.70,.25), teal=vec3(.18,.96,.78), base=vec3(.03,.02,.07);
            vec3 col=mix(base, mix(teal,gold,smoothstep(.3,.75,v)), smoothstep(.3,.85,v)*.9);
            col+=gold*.06/(r+.2); col*=1.-smoothstep(.9,1.6,r)*.6;
            gl_FragColor=vec4(col,1.);
          }`,
        depthWrite: false,
      });
      bgScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), bgMat));
      const group = new T.Group();
      scene.add(group);
      const R = 3.1, loader = new T.TextureLoader(), textures = [], geos = [], mats = [];
      keys.forEach((k, i) => {
        const tex = loader.load(photo(k));
        tex.encoding = T.sRGBEncoding;
        textures.push(tex);
        const geo = new T.PlaneGeometry(1.5, 2), mat = new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide, transparent: true });
        geos.push(geo); mats.push(mat);
        const m = new T.Mesh(geo, mat);
        const a = (i / keys.length) * Math.PI * 2;
        m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
        m.rotation.y = a;
        group.add(m);
        // thin gold frame
        const fg = new T.EdgesGeometry(new T.PlaneGeometry(1.56, 2.06)), fm = new T.LineBasicMaterial({ color: 0xffb23f, transparent: true, opacity: 0.7 });
        geos.push(fg); mats.push(fm);
        const f = new T.LineSegments(fg, fm);
        f.position.copy(m.position); f.rotation.y = a;
        group.add(f);
      });
      camera.position.set(0, 0.6, R + 3.6);
      camera.lookAt(0, 0, 0);
      const resize = () => {
        const w = stage.clientWidth, h = stage.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.z = R + (w < h ? 5.2 : 3.6);
        camera.updateProjectionMatrix();
        bgMat.uniforms.res.value.set(w, h);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(stage);
      resize();
      let time = 0;
      const tick = (dt) => {
        if (!visible.mirror) return;
        time += dt;
        auto += dt * 0.12;
        drag += dragV; dragV *= 0.92;
        group.rotation.y = auto + drag + scrollP * Math.PI * 2;
        group.position.y = Math.sin(time * 0.8) * 0.08;
        bgMat.uniforms.t.value = time;
        renderer.clear();
        renderer.render(bgScene, bgCam);
        renderer.clearDepth();
        renderer.render(scene, camera);
      };
      Ticker.add(tick);
      renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); dispose(); });
      $("#mirror-fallback").hidden = true;
      three = { renderer, ro, tick, textures, geos, mats, bgMat };
    } catch (e) {
      dispose();
    }
  }
  function dispose() {
    if (!three) return;
    Ticker.remove(three.tick);
    three.ro.disconnect();
    three.textures.forEach((t) => t.dispose());
    three.geos.forEach((g) => g.dispose());
    three.mats.forEach((m) => m.dispose());
    three.bgMat.dispose();
    three.renderer.dispose();
    three.renderer.domElement.remove();
    three = null;
    $("#mirror-fallback").hidden = false;
  }
  // fallback ring animation
  Ticker.add((dt) => {
    if (three || !visible.mirror) return;
    if (!REDUCE) auto += dt * 0.12;
    drag += dragV; dragV *= 0.92;
    ring.style.transform = `rotateY(${((auto + drag + scrollP * Math.PI * 2) * 180) / Math.PI}deg)`;
  });
  // lazy-init near the viewport, dispose when far away
  new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? init() : null)), { rootMargin: "600px 0px" }).observe(stage);
  new IntersectionObserver((es) => es.forEach((e) => (!e.isIntersecting ? dispose() : null)), { rootMargin: "2000px 0px" }).observe(stage);
  return { get webgl() { return !!three; } };
})();

/* ═══════════════ 6 · ARCHIVES OF THE EYE OF TIME ═══════════════ */
const Archives = (() => {
  const box = $("#archives");
  CONFIG.memories.forEach((m, i) => {
    const node = document.createElement("article");
    node.className = "node";
    node.innerHTML = `<div class="yr">${m.year}</div><h3>${m.title}</h3><div class="pic"><img src="${photo(m.photo)}" alt="${m.title}" decoding="async" /></div><p data-text="${m.story.replace(/"/g, "&quot;")}">${m.story}</p>`;
    box.appendChild(node);
  });
  const nodes = $$(".node", box);
  const typers = new Map();
  function type(p, text, back = false) {
    clearInterval(typers.get(p));
    if (REDUCE) { p.textContent = back ? "" : text; return Promise.resolve(); }
    return new Promise((res) => {
      let n = back ? p.textContent.length : 0;
      const id = setInterval(() => {
        n += back ? -3 : 1;
        p.textContent = text.slice(0, Math.max(0, n));
        if (back ? n <= 0 : n >= text.length) { clearInterval(id); res(); }
      }, back ? 12 : 24);
      typers.set(p, id);
    });
  }
  function bloom(node, i) {
    if (node.classList.contains("on")) return;
    node.classList.add("on");
    Audio.setChord(i + 1);
    Audio.setLayer(1);
    const p = $("p", node);
    type(p, p.dataset.text);
    if (HAS.gsap && !REDUCE) {
      gsap.fromTo(node, { scale: 0.86, opacity: 0.2 }, { scale: 1, opacity: 1, duration: 1, ease: "expo.out" });
      // rune burst from the node's dot
      const r = node.getBoundingClientRect();
      for (let k = 0; k < 10; k++) {
        const s = document.createElement("span");
        s.className = "spark";
        s.style.left = r.left - 27 + "px";
        s.style.top = r.top + 18 + "px";
        document.body.appendChild(s);
        const a = (k / 10) * 6.283;
        gsap.to(s, { x: Math.cos(a) * 46, y: Math.sin(a) * 46, opacity: 0, scale: 0.2, duration: 0.7, ease: "expo.out", onComplete: () => s.remove() });
      }
    }
  }
  // keep the captions full until JS decides to type them (CDN-failure path shows everything)
  nodes.forEach((n) => ($("p", n).textContent = ""));
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && bloom(e.target, nodes.indexOf(e.target))), { rootMargin: "0px 0px -30% 0px" });
  nodes.forEach((n) => io.observe(n));

  let rewinding = false;
  $("#rewind").addEventListener("click", async () => {
    if (rewinding) return;
    rewinding = true;
    document.body.classList.add("rewinding");
    Audio.whoosh();
    for (let i = nodes.length - 1; i >= 0; i--) {
      Audio.setChord(i);
      await type($("p", nodes[i]), $("p", nodes[i]).dataset.text, true);
      nodes[i].classList.remove("on");
      if (HAS.gsap && !REDUCE) await gsap.to(nodes[i], { opacity: 0.25, scale: 0.94, duration: 0.35 });
    }
    scrollToEl($("#archives-sec"));
    await sleep(REDUCE ? 50 : 900);
    document.body.classList.remove("rewinding");
    toast("Time rewound. The archives replay.");
    for (let i = 0; i < nodes.length; i++) {
      if (HAS.gsap && !REDUCE) gsap.to(nodes[i], { opacity: 1, scale: 1, duration: 0.5 });
      bloom(nodes[i], i);
      await sleep(REDUCE ? 0 : 500);
    }
    rewinding = false;
  });
  return { nodes };
})();

/* ═══════════════ 7 · SECRET SPELL LOCK ═══════════════ */
const Lock = (() => {
  const offsets = [140, -95, 210];
  const radii = [176, 128, 80];
  const rnd = seeded(99);
  $("#mandala").innerHTML = `<svg viewBox="0 0 400 400" fill="none" stroke-width="1.4">
    <circle cx="200" cy="200" r="196" stroke="var(--line)"/>
    ${radii.map((r, i) => `<g class="ring" data-r="${i}" stroke="var(--gold)">
        <circle cx="200" cy="200" r="${r}" stroke-opacity=".8"/><circle cx="200" cy="200" r="${r - 14}" stroke-opacity=".35" stroke-dasharray="3 7"/>
        ${Array.from({ length: 12 + i * -2 }, (_, k) => { const a = (k / (12 - i * 2)) * 360; return `<path d="${glyph(rnd, 9)}" transform="translate(200 200) rotate(${a}) translate(0 ${-(r - 7)})" stroke="var(--arcane)" stroke-opacity=".8"/>`; }).join("")}
        <path class="key" d="M200 ${200 - r - 12} l-9 -14 h18 z" fill="var(--ember)" stroke="var(--ember)"/>
      </g>`).join("")}
    <rect x="182" y="182" width="36" height="36" transform="rotate(45 200 200)" stroke="var(--gold)"/>
    <circle cx="200" cy="200" r="7" fill="var(--gold)" stroke="none"/>
    <circle class="shock" cx="200" cy="200" r="10" stroke="var(--gold)" stroke-width="3" opacity="0"/>
  </svg>`;
  const rings = $$("#mandala .ring");
  const idle = [];
  rings.forEach((g, i) => {
    if (HAS.gsap) {
      gsap.set(g, { rotation: offsets[i], svgOrigin: "200 200" });
      if (!REDUCE) idle.push(gsap.to(g, { rotation: `+=${i % 2 ? -360 : 360}`, duration: 40 + i * 14, ease: "none", repeat: -1, svgOrigin: "200 200" }));
    } else g.setAttribute("transform", `rotate(${offsets[i]} 200 200)`);
  });

  const WRONG = [
    "Wrong spell. Even the library guardian is laughing.",
    "That incantation summoned Mummy instead. Run.",
    "The multiverse rejected that. Politely. Barely.",
    "Close? No. Not even in this universe.",
    "Spell failed. The fridge light flickered though.",
  ];
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const answers = [CONFIG.spell, ...(CONFIG.spellAlts || [])].map(norm);
  let fails = 0, unlocked = false;
  const msg = $("#spell-msg");

  $("#spell-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = norm($("#spell-input").value);
    if (!val || unlocked) return;
    if (val === norm(CONFIG.secretWord)) { Eggs.secretWord(); $("#spell-input").value = ""; return; }
    if (answers.includes(val) || answers.includes(val.replace(/ /g, ""))) return unlock();
    fails++;
    msg.className = "spell-msg bad";
    let text = WRONG[(fails - 1) % WRONG.length];
    if (fails >= 4) text += " " + CONFIG.hint2;
    else if (fails >= 2) text += " " + CONFIG.hint1;
    msg.textContent = text;
    Audio.click(0);
    const m = $("#mandala");
    m.classList.add("wrong");
    setTimeout(() => m.classList.remove("wrong"), 650);
    if (HAS.gsap && !REDUCE) gsap.fromTo(m, { x: 0 }, { keyframes: [{ x: -14 }, { x: 12 }, { x: -9 }, { x: 6 }, { x: 0 }], duration: 0.45, ease: "none" });
    if (fails >= 6) $("#spell-backup").hidden = false;
  });
  $("#spell-backup").addEventListener("click", () => unlock(true));

  async function unlock(backup) {
    if (unlocked) return;
    unlocked = true;
    msg.className = "spell-msg good";
    msg.textContent = backup ? "The backup scroll works too. The letter is open." : "The incantation is true. The seal breaks.";
    $("#spell-input").disabled = true;
    idle.forEach((t) => t.kill());
    for (let i = 0; i < rings.length; i++) {
      if (HAS.gsap && !REDUCE) {
        const cur = gsap.getProperty(rings[i], "rotation");
        await gsap.to(rings[i], { rotation: Math.round(cur / 360) * 360 + (i % 2 ? -360 : 360), duration: 0.7, ease: "power3.inOut", svgOrigin: "200 200" });
      } else if (HAS.gsap) gsap.set(rings[i], { rotation: 0, svgOrigin: "200 200" });
      else rings[i].setAttribute("transform", "");
      Audio.click(i + 1);
    }
    Audio.chime();
    Audio.boom();
    if (HAS.gsap && !REDUCE) {
      gsap.fromTo("#mandala .shock", { attr: { r: 10 }, opacity: 1 }, { attr: { r: 260 }, opacity: 0, duration: 1.1, ease: "expo.out" });
      gsap.fromTo("#flash", { opacity: 0.85 }, { opacity: 0, duration: 0.9, ease: "power2.out" });
    }
    if (HAS.confetti) {
      confetti({ particleCount: COARSE ? 90 : 160, spread: 100, startVelocity: 45, origin: { y: 0.55 }, colors: ["#FFB23F", "#FF6A1A", "#FFE3A8", "#2DF5C8"], disableForReducedMotion: true });
    }
    Letter.unseal();
    emit("unlock");
    await sleep(REDUCE ? 100 : 900);
    scrollToEl($("#letter"));
  }
  return { get unlocked() { return unlocked; } };
})();

/* ═══════════════ 8 · THE LETTER ═══════════════ */
const Letter = (() => {
  const sec = $("#letter"), box = $("#letter-text"), all = $("#letter-all");
  sec.classList.add("sealed");
  $("#letter-sign").textContent = CONFIG.signoff;
  let typing = false, finished = false, skip = false;
  function renderAll() {
    box.innerHTML = CONFIG.letter.map((p) => `<p>${p.replace(/</g, "&lt;")}</p>`).join("");
    finished = true;
    all.hidden = true;
    sec.classList.add("signed");
  }
  async function typeAll() {
    if (typing || finished) return;
    if (REDUCE) return renderAll();
    typing = true;
    all.hidden = false;
    box.innerHTML = "";
    const caret = document.createElement("span");
    caret.className = "caret";
    for (const para of CONFIG.letter) {
      const p = document.createElement("p");
      box.appendChild(p);
      p.appendChild(caret);
      for (let i = 0; i < para.length; i++) {
        if (skip) return renderAll();
        caret.before(para[i]);
        const ch = para[i];
        await sleep(/[.!?…]/.test(ch) ? 320 : /[,—;:]/.test(ch) ? 160 : 35);
      }
      await sleep(260);
    }
    caret.remove();
    typing = false;
    finished = true;
    all.hidden = true;
    sec.classList.add("signed");
  }
  all.addEventListener("click", () => { skip = true; if (!typing) renderAll(); });
  function unseal() {
    sec.classList.remove("sealed");
    if (HAS.gsap && !REDUCE) gsap.fromTo(".parchment .lphoto", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 1.4, ease: "expo.out", delay: 0.4 });
    if (visible.letter) typeAll();
  }
  // music ducks while the letter is on screen
  new IntersectionObserver((es) => es.forEach((e) => {
    const on = e.isIntersecting && !sec.classList.contains("sealed");
    Audio.zone("letter", on);
    if (on) typeAll();
  }), { threshold: 0.25 }).observe(sec);
  renderAll(); // real text sits blurred under the seal, and is typed afresh once it breaks
  finished = false;
  sec.classList.remove("signed");
  return { unseal };
})();

/* ═══════════════ 9 · QUIZ ═══════════════ */
(() => {
  const VARIANTS = {
    snacks: { name: "Sorcerer Supreme of Snacks", photo: "p3", line: "No fridge in any universe is safe.", stats: [["Snacks", 250], ["Sass", 99], ["Sharing", 2]] },
    owl: { name: "Friendly Neighbourhood Night-Owl", photo: "p2", line: "Awake at 3 AM, guarding the multiverse (and the Wi-Fi).", stats: [["Sleep", 120], ["Sass", 88], ["Mornings", 1]] },
    drama: { name: "Multiverse Drama Queen", photo: "p4", line: "Every universe has a main character. It's her. In all of them.", stats: [["Drama", 101], ["Sass", 99], ["Chill", 4]] },
    shop: { name: "Master of Mystic Shopping", photo: "p1", line: "Can open portals. Mostly to checkout pages.", stats: [["Cart", 300], ["Sass", 95], ["Budget", 0]] },
  };
  const card = $("#quiz-card");
  let step = 0, score = {};
  function render() {
    if (step >= CONFIG.quiz.length) return result();
    const q = CONFIG.quiz[step];
    card.innerHTML = `<div class="quiz-step">Question ${step + 1} / ${CONFIG.quiz.length}</div><h3 class="quiz-q">${q.q}</h3><div class="quiz-opts">${q.a.map(([t, k]) => `<button type="button" data-k="${k}">${t}</button>`).join("")}</div>`;
    $$("button", card).forEach((b) => b.addEventListener("click", () => {
      score[b.dataset.k] = (score[b.dataset.k] || 0) + 1;
      score._last = b.dataset.k;
      Audio.click(1);
      step++;
      if (HAS.gsap && !REDUCE) gsap.to(card, { opacity: 0, y: -12, duration: 0.2, onComplete() { render(); gsap.fromTo(card, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35 }); } });
      else render();
    }));
  }
  function result() {
    const keys = Object.keys(VARIANTS);
    const best = keys.reduce((a, k) => ((score[k] || 0) > (score[a] || 0) || ((score[k] || 0) === (score[a] || 0) && k === score._last) ? k : a), keys[0]);
    const v = VARIANTS[best];
    const text = `${NICK} is the ${v.name}. ${v.line} ${v.stats.map(([s, n]) => `${s} ${n}/100`).join(" · ")}`;
    card.innerHTML = `<div class="result">
      <div class="rphoto"><img src="${photo(v.photo)}" alt="${v.name}" decoding="async" /></div>
      <div><div class="quiz-step">Variant identified</div><h3>${v.name}</h3><p style="margin:8px 0 0;color:var(--muted)">${v.line}</p>
        <div class="stats">${v.stats.map(([s, n]) => `<div class="stat"><span>${s}</span><span class="bar"><i style="--w:${Math.min(100, n)}%"></i></span><em>${n}/100</em></div>`).join("")}</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px"><button class="btn solid" type="button" id="copy-res">Copy result</button><button class="btn ghost" type="button" id="retake">Retake</button></div>
      </div></div>`;
    Audio.chime();
    if (HAS.gsap && !REDUCE) gsap.from(".stat .bar i", { width: 0, duration: 1.2, ease: "expo.out", stagger: 0.12 });
    $("#copy-res").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(text); toast("Copied! Paste it in the family group 😄"); }
      catch (e) { toast("Copy blocked — long-press the text to copy"); const p = document.createElement("p"); p.textContent = text; p.style.userSelect = "all"; card.appendChild(p); }
    });
    $("#retake").addEventListener("click", () => { step = 0; score = {}; render(); });
  }
  render();
})();

/* ═══════════════ 10 · COUNCIL OF WISHES ═══════════════ */
(() => {
  const list = $("#wishes");
  let saved = [];
  try { saved = JSON.parse(store("mv-wishes") || "[]"); if (!Array.isArray(saved)) saved = []; } catch (e) { saved = []; }
  const memory = [...saved];
  const scrollIcon = `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M7 6h14v16H7z"/><path d="M5 6a2 2 0 0 1 4 0M19 22a2 2 0 0 0 4 0V8"/><path d="M10 11h8M10 15h8M10 19h5" stroke-opacity=".6"/></svg>`;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function add(w, open) {
    const d = document.createElement("details");
    d.className = "wish";
    d.innerHTML = `<summary>${scrollIcon}<span>${esc(w.name)}</span></summary><p>${esc(w.text)}</p>`;
    if (open) d.open = true;
    d.addEventListener("toggle", () => {
      if (d.open) { Audio.click(2); if (HAS.gsap && !REDUCE) gsap.from($("p", d), { opacity: 0, y: -8, duration: 0.5, ease: "expo.out" }); }
    });
    list.appendChild(d);
    return d;
  }
  [...CONFIG.wishes, ...memory].forEach((w) => add(w));
  $("#add-wish").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#wish-name").value.trim(), text = $("#wish-text").value.trim();
    if (!name || !text) return;
    const w = { name, text };
    memory.push(w);
    store("mv-wishes", JSON.stringify(memory));
    const d = add(w, true);
    if (HAS.gsap && !REDUCE) gsap.from(d, { opacity: 0, y: 30, duration: 0.7, ease: "expo.out" });
    e.target.reset();
    Audio.chime();
    toast("Wish sealed into the council ✦");
  });
})();

/* ═══════════════ 11 · EASTER EGGS ═══════════════ */
const Eggs = (() => {
  const found = new Set();
  function find(id, msg) {
    if (!found.has(id)) {
      found.add(id);
      $("#secrets-n").textContent = found.size;
      Audio.chime();
      if (HAS.gsap && !REDUCE) gsap.fromTo("#secrets", { scale: 1.3 }, { scale: 1, duration: 0.6, ease: "back.out(3)" });
    }
    toast(msg);
  }
  // (a) tap her name 7×
  let taps = 0, tapT = 0;
  ["#hero-name", "#portal-title"].forEach((s) => $(s).addEventListener("click", (e) => {
    clearTimeout(tapT);
    tapT = setTimeout(() => (taps = 0), 2500);
    if (++taps < 7) return;
    taps = 0;
    const r = e.currentTarget.getBoundingClientRect();
    shootWeb(r.left + r.width / 2, r.top + r.height / 2);
    emit("sense", { el: e.currentTarget });
    find("web", "Sister-sense tingling!");
  }));
  function shootWeb(cx = innerWidth / 2, cy = innerHeight / 2) {
    const w = innerWidth, h = innerHeight;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "web-svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    let d = `M0 ${h} L${cx} ${cy}`;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; d += ` M${cx} ${cy} L${cx + Math.cos(a) * w} ${cy + Math.sin(a) * w}`; }
    for (let r = 40; r < Math.max(w, h); r += 70) {
      d += " M";
      for (let i = 0; i <= 10; i++) { const a = (i / 10) * 6.283, rr = r * (i % 2 ? 0.92 : 1); d += `${i ? " L" : ""}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; }
    }
    svg.innerHTML = `<path d="${d}" fill="none" stroke="#F5EFE6" stroke-width="1.6" stroke-opacity=".85" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`;
    document.body.appendChild(svg);
    const p = svg.firstChild;
    Audio.whoosh();
    if (HAS.gsap && !REDUCE) gsap.timeline({ onComplete: () => svg.remove() }).to(p, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }).to(svg, { opacity: 0, duration: 0.8, delay: 1.2 });
    else { p.setAttribute("stroke-dashoffset", "0"); setTimeout(() => svg.remove(), 1600); }
  }
  // (b) ↑ ↑ ↓ ↓ (keys or quick swipes) → mirror mode
  let seq = [], seqT = 0;
  const pushDir = (d) => {
    clearTimeout(seqT);
    seqT = setTimeout(() => (seq = []), 3000);
    seq.push(d);
    seq = seq.slice(-4);
    if (seq.join("") === "UUDD") { seq = []; mirrorMode(); }
  };
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea")) return;
    if (e.key === "ArrowUp") pushDir("U");
    else if (e.key === "ArrowDown") pushDir("D");
    typed(e);
  });
  let ts = null;
  addEventListener("touchstart", (e) => (ts = { y: e.touches[0].clientY, t: performance.now() }), { passive: true });
  addEventListener("touchend", (e) => {
    if (!ts) return;
    const dy = e.changedTouches[0].clientY - ts.y, dt = performance.now() - ts.t;
    if (Math.abs(dy) > 60 && dt < 350) pushDir(dy < 0 ? "U" : "D");
    ts = null;
  }, { passive: true });
  function mirrorMode() {
    find("mirror", "Mirror mode! Reality flipped for 5 seconds.");
    Audio.whoosh();
    if (REDUCE) return;
    document.body.classList.add("mirror-mode");
    setTimeout(() => document.body.classList.remove("mirror-mode"), 5000);
  }
  // (c) long-press the eye 2s → time freezes
  let lp = 0;
  const eye = $("#eye");
  eye.addEventListener("pointerdown", () => { lp = setTimeout(freeze, 2000); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => eye.addEventListener(ev, () => clearTimeout(lp)));
  eye.addEventListener("contextmenu", (e) => e.preventDefault());
  function freeze() {
    find("freeze", "Time frozen. Even the dust stopped.");
    FROZEN = true;
    document.body.classList.add("frozen");
    if (HAS.gsap) gsap.globalTimeline.pause();
    setTimeout(() => {
      FROZEN = false;
      document.body.classList.remove("frozen");
      if (HAS.gsap) gsap.globalTimeline.resume();
    }, 3000);
  }
  // (d) type the secret word anywhere → hidden childhood photo
  let buf = "";
  function typed(e) {
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-30);
    if (buf.endsWith(CONFIG.secretWord.toLowerCase())) { buf = ""; secretWord(); }
  }
  function secretWord() {
    $("#egg-img").src = photo(CONFIG.babyPhoto);
    $("#egg-photo").hidden = false;
    $("#egg-close").focus();
    find("word", "Origin story found!");
  }
  $("#egg-close").addEventListener("click", () => ($("#egg-photo").hidden = true));
  $("#egg-photo").addEventListener("click", (e) => { if (e.target.id === "egg-photo") e.target.hidden = true; });
  // (e) shake the phone → snack rain
  let shakeT = 0;
  const snackShapes = HAS.confetti && confetti.shapeFromText ? ["🍟", "🍕", "🍫", "🍿", "🍩"].map((t) => confetti.shapeFromText({ text: t, scalar: 2 })) : null;
  function shake() {
    const now = Date.now();
    if (now - shakeT < 2500) return;
    shakeT = now;
    find("storm", "Snack rain! The Sorcerer Supreme of Snacks approves.");
    if (HAS.confetti && snackShapes) confetti({ particleCount: 40, spread: 160, startVelocity: 20, gravity: 0.7, ticks: 260, origin: { x: 0.5, y: 0 }, shapes: snackShapes, scalar: 2, flat: true, disableForReducedMotion: true });
  }
  return { shake, secretWord, find };
})();

/* ═══════════════ 12 · GRAND FINALE ═══════════════ */
const Finale = (() => {
  const sec = $("#finale");
  // starfield
  const sc = $("#stars"), sctx = sc.getContext("2d");
  let stars = [];
  function sizeStars() {
    sc.width = sec.clientWidth * DPR; sc.height = sec.clientHeight * DPR;
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = Array.from({ length: COARSE ? 120 : 260 }, () => ({ x: Math.random() * sec.clientWidth, y: Math.random() * sec.clientHeight, r: rand(0.3, 1.4), p: Math.random() * 6.28 }));
  }
  sizeStars();
  addEventListener("resize", sizeStars);
  Ticker.add((dt, t) => {
    if (!visible.finale) return;
    sctx.clearRect(0, 0, sc.width, sc.height);
    const light = document.documentElement.getAttribute("data-theme") === "light";
    for (const s of stars) {
      const a = 0.3 + 0.6 * Math.abs(Math.sin(t / 900 + s.p));
      sctx.fillStyle = light ? `rgba(60,40,90,${a * 0.6})` : `rgba(245,239,230,${a})`;
      sctx.fillRect(s.x, s.y, s.r, s.r);
    }
  });

  // photos → rotating portal mandala → the number
  const cv = $("#finale-canvas"), ctx = cv.getContext("2d");
  const keys = Object.keys(PHOTOS).filter((k) => k !== CONFIG.babyPhoto);
  const N = COARSE ? 54 : 96;
  const thumbs = [];
  keys.forEach((k, i) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas"), s = 64;
      c.width = c.height = s;
      const x = c.getContext("2d");
      x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 2, 0, 6.283); x.clip();
      const r = Math.max(s / im.width, s / im.height);
      x.drawImage(im, (s - im.width * r) / 2, (s - im.height * r) / 2, im.width * r, im.height * r);
      x.strokeStyle = "#FFB23F"; x.lineWidth = 3; x.stroke();
      thumbs[i] = c;
    };
    im.src = photo(k);
  });
  let W = 0, H = 0, tiles = [], phase = "idle", phaseT = 0, spin = 0;
  function sizeCv() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    targets = numberPoints();
  }
  let targets = [];
  function numberPoints() {
    const label = CONFIG.age != null ? String(CONFIG.age) : "∞";
    const oc = document.createElement("canvas"), ow = 300, oh = 200;
    oc.width = ow; oc.height = oh;
    const o = oc.getContext("2d");
    o.fillStyle = "#000";
    o.font = `900 ${label.length > 2 ? 110 : 170}px Cinzel, Georgia, serif`;
    o.textAlign = "center"; o.textBaseline = "middle";
    o.fillText(label, ow / 2, oh / 2 + 8);
    const data = o.getImageData(0, 0, ow, oh).data, pts = [];
    for (let y = 0; y < oh; y += 4) for (let x = 0; x < ow; x += 4) if (data[(y * ow + x) * 4 + 3] > 128) pts.push([x, y]);
    let x0 = ow, x1 = 0, y0 = oh, y1 = 0;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const gw = Math.max(1, x1 - x0), gh = Math.max(1, y1 - y0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const scale = Math.min((W * 0.86) / gw, (H * 0.82) / gh);
    const out = [];
    for (let i = 0; i < N; i++) {
      const p = pts[Math.floor((i / N) * pts.length)] || [mx, my];
      out.push([W / 2 + (p[0] - mx) * scale, H / 2 + (p[1] - my) * scale]);
    }
    return out;
  }
  function reset() {
    tiles = Array.from({ length: N }, (_, i) => {
      const a = Math.random() * 6.283, d = Math.max(W, H);
      return { k: i % keys.length, x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d, ring: i % 3, slot: Math.floor(i / 3), s: 0 };
    });
    phase = "idle";
    phaseT = 0;
  }
  sizeCv();
  reset();
  new ResizeObserver(() => { sizeCv(); }).observe(cv);
  function start() {
    if (phase !== "idle") return;
    targets = numberPoints(); // fonts are loaded by now
    phase = REDUCE ? "number" : "gather";
    phaseT = 0;
    if (REDUCE) tiles.forEach((t, i) => { t.x = targets[i][0]; t.y = targets[i][1]; t.s = 1; });
    Audio.whoosh();
  }
  new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && start()), { threshold: 0.35 }).observe(cv);
  Ticker.add((dt) => {
    if (!visible.finale) return;
    phaseT += dt;
    spin += dt * (phase === "number" ? 0.2 : 0.8);
    if (phase === "gather" && phaseT > 2.8) { phase = "number"; phaseT = 0; Audio.boom(); emit("finale:number"); }
    ctx.clearRect(0, 0, W, H);
    const R0 = Math.min(W, H) * 0.42;
    const perRing = Math.ceil(N / 3);
    tiles.forEach((t, i) => {
      let tx, ty;
      if (phase === "number") { [tx, ty] = targets[i]; tx += Math.sin(spin * 3 + i) * 1.5; }
      else {
        const rr = R0 * (1 - t.ring * 0.28), a = (t.slot / perRing) * 6.283 + spin * (t.ring % 2 ? -1 : 1);
        tx = W / 2 + Math.cos(a) * rr; ty = H / 2 + Math.sin(a) * rr;
      }
      if (phase !== "idle") {
        const k = phase === "number" ? 0.07 : 0.06;
        t.x = lerp(t.x, tx, k); t.y = lerp(t.y, ty, k); t.s = lerp(t.s, 1, 0.08);
      }
      const im = thumbs[t.k];
      const size = (phase === "number" ? Math.max(14, Math.min(W, H) / 16) : Math.max(18, Math.min(W, H) / 11)) * t.s;
      if (im && t.s > 0.02) ctx.drawImage(im, t.x - size / 2, t.y - size / 2, size, size);
    });
    if (phase === "gather") {
      ctx.strokeStyle = "rgba(255,178,63,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, R0 * 1.08, 0, 6.283); ctx.stroke();
    }
  });

  // candle: hold the flame, or blow into the mic
  const candle = $("#candle");
  let holdT = 0, holdStart = 0, out = false;
  const HOLD_MS = 1600;
  function holdFrame() {
    if (!holdStart) return;
    const p = clamp((performance.now() - holdStart) / HOLD_MS, 0, 1);
    candle.style.setProperty("--hold", String(176 * (1 - p)));
    if (p >= 1) { holdStart = 0; blowOut(); return; }
    holdT = requestAnimationFrame(holdFrame);
  }
  candle.addEventListener("pointerdown", (e) => { if (out) return; e.preventDefault(); holdStart = performance.now(); holdFrame(); });
  const cancelHold = () => { holdStart = 0; cancelAnimationFrame(holdT); if (!out) candle.style.setProperty("--hold", "176"); };
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => candle.addEventListener(ev, cancelHold));
  candle.addEventListener("click", (e) => { if (e.detail === 0) blowOut(); }); // keyboard
  candle.addEventListener("contextmenu", (e) => e.preventDefault());

  let mic = null;
  $("#mic-btn").addEventListener("click", async () => {
    if (out || mic) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) return toast("Mic not available here — hold the flame instead");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const an = ac.createAnalyser();
      an.fftSize = 1024;
      ac.createMediaStreamSource(stream).connect(an);
      mic = { stream, ac };
      const buf = new Float32Array(an.fftSize), meter = $("#blow-meter");
      meter.hidden = false;
      $("#candle-copy").textContent = "Ek second… listening. Then blow!";
      let base = 0, n = 0, above = 0;
      const t0 = performance.now();
      let last = t0;
      const loop = () => {
        if (!mic) return;
        const now = performance.now(), dt = now - last; last = now;
        an.getFloatTimeDomainData(buf);
        let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        const rms = Math.sqrt(s / buf.length);
        if (now - t0 < 700) { base += rms; n++; }
        else {
          const th = Math.max((base / Math.max(1, n)) * 3, 0.025);
          $("i", meter).style.width = Math.min(100, (rms / (th * 2)) * 100) + "%";
          if (now - t0 < 760) $("#candle-copy").textContent = "Now blow! 🌬️";
          above = rms > th ? above + dt : Math.max(0, above - dt * 0.5);
          if (above > 420) { stopMic(); return blowOut(); }
          if (now - t0 > 9000) { stopMic(); return toast("The mic is shy — hold the flame instead"); }
        }
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      stopMic();
      toast("No mic permission — hold the flame instead");
    }
  });
  function stopMic() {
    if (!mic) return;
    mic.stream.getTracks().forEach((t) => t.stop());
    mic.ac.close?.();
    mic = null;
    $("#blow-meter").hidden = true;
  }

  function blowOut() {
    if (out) return;
    out = true;
    stopMic();
    candle.classList.add("out");
    candle.setAttribute("aria-label", "Candle blown out");
    $("#mic-btn").hidden = true;
    $("#candle-copy").textContent = "Wish sent across every universe ✦";
    for (let i = 0; i < 6 && !REDUCE; i++) {
      const s = document.createElement("span");
      s.className = "smoke";
      candle.appendChild(s);
      s.animate([{ transform: "translate(0,0) scale(.6)", opacity: 0.7 }, { transform: `translate(${rand(-20, 20)}px,${-80 - i * 18}px) scale(${3 + i * 0.4})`, opacity: 0 }], { duration: 1600, delay: i * 110, easing: "ease-out" }).onfinish = () => s.remove();
    }
    Audio.fanfare();
    Audio.setLayer(2);
    emit("candle:out");
    fireworks();
    if (HAS.confetti) {
      const end = Date.now() + 1500;
      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors: ["#FFB23F", "#FF6A1A", "#2DF5C8"], disableForReducedMotion: true });
        confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors: ["#FFB23F", "#FF6A1A", "#2DF5C8"], disableForReducedMotion: true });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
    const card = $("#end-card");
    setTimeout(() => {
      card.hidden = false;
      if (HAS.gsap && !REDUCE) gsap.from(card, { opacity: 0, y: 30, scale: 0.95, duration: 1.2, ease: "expo.out" });
      card.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "center" });
    }, REDUCE ? 100 : 1400);
  }

  function fireworks() {
    if (REDUCE) return;
    const c = $("#fireworks"), x = c.getContext("2d");
    c.hidden = false;
    const w = (c.width = innerWidth * DPR), h = (c.height = innerHeight * DPR);
    let parts = [], bursts = 0;
    const MAX = COARSE ? 6 : 10;
    const burst = () => {
      const bx = rand(0.15, 0.85) * w, by = rand(0.15, 0.5) * h, hue = [34, 18, 165][bursts % 3];
      for (let i = 0; i < (COARSE ? 50 : 80); i++) {
        const a = Math.random() * 6.283, s = rand(1, 5) * DPR;
        parts.push({ x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, hue });
      }
      Audio.boom();
      if (++bursts < MAX) setTimeout(burst, rand(260, 520));
    };
    burst();
    const tick = () => {
      x.globalCompositeOperation = "destination-out";
      x.fillStyle = "rgba(0,0,0,0.22)";
      x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = "lighter";
      parts = parts.filter((p) => (p.life -= 0.012) > 0);
      for (const p of parts) {
        p.vy += 0.04 * DPR; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy;
        x.fillStyle = `hsla(${p.hue},100%,${60 + p.life * 20}%,${p.life})`;
        x.fillRect(p.x, p.y, 2.2 * DPR, 2.2 * DPR);
      }
      if (parts.length || bursts < MAX) requestAnimationFrame(tick);
      else { x.clearRect(0, 0, w, h); c.hidden = true; }
    };
    tick();
  }

  function replay() {
    out = false;
    candle.classList.remove("out");
    candle.style.setProperty("--hold", "176");
    candle.setAttribute("aria-label", "Hold to blow out the candle");
    $("#candle-copy").textContent = "Make a wish, then blow (or hold the flame)";
    $("#end-card").hidden = true;
    $("#mic-btn").hidden = false;
    reset();
  }
  $("#replay").addEventListener("click", () => {
    replay();
    emit("replay");
    jumpTo($("#portal"), "portal", () => Portal.open());
  });
  return {};
})();

/* ═══════════════ NAVIGATION · PORTAL-WIPE · SCROLL FX ═══════════════ */
let lenis = null;
if (HAS.lenis && FINE && !REDUCE) {
  try {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (HAS.st) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  } catch (e) { lenis = null; }
}
function scrollToEl(el, instant) {
  if (lenis) lenis.scrollTo(el, { immediate: !!instant, duration: 1.4 });
  else el.scrollIntoView({ behavior: instant || REDUCE ? "auto" : "smooth" });
}
/** Scene jump. Default: the web-swing (layers.js). wipe === "portal": a portal circle opens, we jump, it closes. */
function jumpTo(el, wipe = true, after) {
  if (wipe === true && Hooks.swing && !REDUCE && HAS.gsap) return Hooks.swing(el, after);
  if (!wipe || REDUCE || !HAS.gsap) {
    scrollToEl(el, true);
    el.focus?.({ preventScroll: true });
    after?.();
    return;
  }
  Audio.whoosh();
  gsap.timeline()
    .fromTo("#wipe", { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", duration: 0.38, ease: "power2.in" })
    .add(() => { scrollToEl(el, true); after?.(); })
    .to("#wipe", { clipPath: "circle(0% at 50% 50%)", duration: 0.55, ease: "expo.out" });
}
const SECTIONS = $$("main > section");
function nextSection(from) {
  const y = from ? from.offsetTop + 10 : window.scrollY + 10;
  return SECTIONS.find((s) => s.offsetTop > y) || SECTIONS[0];
}
$$("[data-next]").forEach((b) => b.addEventListener("click", () => jumpTo(nextSection(b.closest("section")))));
$("#progress").addEventListener("click", () => jumpTo(nextSection()));
SECTIONS.forEach((s) => (s.tabIndex = -1));
const bar = $("#progress-bar");
function updProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.strokeDashoffset = String(150.8 * (1 - clamp(window.scrollY / Math.max(1, max), 0, 1)));
}
addEventListener("scroll", updProgress, { passive: true });
updProgress();

const ScrollFX = (() => {
  if (!HAS.st) return { refresh() {} };
  let ready = false;
  // Split headings only once the display fonts are in, or line breaks are measured with the fallback face.
  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, sleep(3000)]) : Promise.resolve();
  fontsReady.then(() => { init(); ready = true; ScrollTrigger.refresh(); });
  function init() {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    // conjure each scene's heading
    $$(".scene-head").forEach((h) => {
      const title = $(".t-h2", h);
      const chars = splitChars(title);
      gsap.from(chars.length ? chars : title, { scrollTrigger: { trigger: h, start: "top 82%" }, y: 50, opacity: 0, rotateX: -70, stagger: 0.04, duration: 1.1, ease: "expo.out" });
      gsap.from($$(".t-eyebrow, .t-quote", h), { scrollTrigger: { trigger: h, start: "top 82%" }, opacity: 0, y: 16, duration: 0.8, ease: "expo.out", delay: 0.15 });
    });
    // each scene opens like a portal
    $$("main > section:not(#portal) > .scene-inner").forEach((inner) => {
      gsap.fromTo(inner, { clipPath: "circle(12% at 50% 50%)" }, { clipPath: "circle(150% at 50% 50%)", ease: "power2.inOut", scrollTrigger: { trigger: inner.parentElement, start: "top 95%", end: "top 30%", scrub: 0.6 } });
    });
    // hero
    const heroChars = splitChars($("#hero-name"));
    gsap.from(heroChars, { scrollTrigger: { trigger: "#hero", start: "top 60%" }, y: 90, opacity: 0, rotateX: -90, stagger: 0.05, duration: 1.3, ease: "expo.out", onStart: () => Audio.setLayer(1) });
    gsap.to(".runes", { yPercent: 18, ease: "none", scrollTrigger: { trigger: "#hero", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.to(heroChars, { backgroundPosition: "100% 50%", duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut" });
    // archives: the gold thread draws, the eye turns with scroll
    gsap.fromTo("#thread", { "--p": 0 }, { "--p": 1, ease: "none", scrollTrigger: { trigger: "#archives", start: "top 70%", end: "bottom 60%", scrub: true } });
    gsap.to("#eye-rot", { rotation: 540, svgOrigin: "50 50", ease: "none", scrollTrigger: { trigger: "#archives-sec", start: "top bottom", end: "bottom top", scrub: true } });
    // council scrolls float in
    ScrollTrigger.batch(".wish", { start: "top 90%", onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, rotate: () => rand(-4, 4), stagger: 0.1, duration: 0.9, ease: "expo.out" }) });
  });
  mm.add("(prefers-reduced-motion: reduce)", () => {
    $$(".scene-head").forEach((h) => gsap.from(h, { scrollTrigger: { trigger: h, start: "top 85%" }, opacity: 0, duration: 0.4 }));
  });
  }
  return { refresh: () => ready && ScrollTrigger.refresh() };
})();

setMuteUI();

// Test hook (only with ?mvdebug in the URL): lets automated checks read engine state.
if (/[?&]mvdebug\b/.test(location.search)) window.__mv = { audio: () => ({ mode: Audio.mode, muted: Audio.muted, ready: Audio.ready, low: Audio.low() }) };
