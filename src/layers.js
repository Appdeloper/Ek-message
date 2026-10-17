/* ════════════════════════════════════════════════════════════════════════════
   Layers: web-swinger (red/blue/white, elastic) + thunder (volt blue/gold, fast & sharp)
   on top of the sorcerer base (slow & mystical). Plugs into Bus / Hooks from app.js.
   Motion language — lightning: expo.out / power4 · web: elastic.out(1, 0.4) · portal: slow sine.
   ════════════════════════════════════════════════════════════════════════════ */
const VOLT = "#5AD1FF";
const make = (tag, cls, parent = document.body, html = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  parent.appendChild(e);
  return e;
};
const easeElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
let webInk = "rgba(255,255,255,.92)";
const readInk = () => (webInk = getComputedStyle(document.documentElement).getPropertyValue("--web-ink").trim() || webInk);
readInk();
new MutationObserver(readInk).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

/* ── flash governor: no more than 3 flashes in any second, ≥ 340 ms apart; none with reduced motion ── */
const Flash = (() => {
  const times = [];
  return {
    allow() {
      if (REDUCE) return false;
      const now = performance.now();
      while (times.length && now - times[0] > 1000) times.shift();
      if (times.length >= 3 || (times.length && now - times[times.length - 1] < 340)) return false;
      times.push(now);
      return true;
    },
  };
})();
function whiteFlash(strength = 0.85, dur = 0.35) {
  if (!HAS.gsap || !Flash.allow()) return false;
  gsap.fromTo("#flash", { opacity: strength }, { opacity: 0, duration: dur, ease: "power2.out", overwrite: true });
  return true;
}

/* ── lightning geometry: random midpoint displacement + glow ── */
function boltPoints(x0, y0, x1, y1, disp, detail = 4) {
  let pts = [[x0, y0], [x1, y1]];
  for (let d = disp; d > detail; d /= 2) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      next.push([(ax + bx) / 2 + (Math.random() - 0.5) * d, (ay + by) / 2 + (Math.random() - 0.5) * d * 0.35], [bx, by]);
    }
    pts = next;
  }
  return pts;
}
function withBranches(main, n = 2) {
  const out = [main];
  for (let k = 0; k < n; k++) {
    const i = 3 + ((Math.random() * (main.length - 6)) | 0);
    const [x, y] = main[i] || main[0];
    const len = rand(40, 120);
    const a = Math.PI / 2 + rand(-1.1, 1.1);
    out.push(boltPoints(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, len / 3, 3));
  }
  return out;
}
function drawBolt(ctx, paths, alpha, width = 2.2) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#E8F8FF";
  ctx.shadowColor = VOLT;
  paths.forEach((pts, pi) => {
    const lw = pi ? width * 0.55 : width;
    for (const [mul, blur, a] of [[4, 22, 0.28], [1.8, 10, 0.6], [1, 0, 1]]) {
      ctx.lineWidth = lw * mul;
      ctx.shadowBlur = COARSE ? blur / 2 : blur;
      ctx.globalAlpha = alpha * a;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  });
  ctx.restore();
}

/* ── FX canvas (above everything): web strands, splats, strikes, beat bursts ── */
const FX = (() => {
  const c = make("canvas", "fx-canvas");
  c.setAttribute("aria-hidden", "true");
  const ctx = c.getContext("2d");
  let w = 0, h = 0, dirty = false;
  const items = new Set();
  function size() { w = innerWidth; h = innerHeight; c.width = w * DPR; c.height = h * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  size();
  addEventListener("resize", size);
  Ticker.add((dt) => {
    if (!items.size) { if (dirty) { ctx.clearRect(0, 0, w, h); dirty = false; } return; }
    ctx.clearRect(0, 0, w, h);
    dirty = true;
    for (const it of items) { it.t += dt; if (it.draw(ctx, it.t) === false) items.delete(it); }
  });
  return { add: (draw) => items.add({ draw, t: 0 }) };
})();
function strand(ctx, x0, y0, x1, y1, sag) {
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1);
}
function splat(ctx, x, y, r, alpha) {
  if (r <= 0.5) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = webInk;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283 + 0.2; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  for (const k of [0.42, 0.78]) {
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * 6.283 + 0.2, rr = r * k * (i % 2 ? 0.88 : 1);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/* ═══════════════ A · WEB-SWINGER LAYER ═══════════════ */

/* A2 · every tap shoots a web strand from the nearest bottom corner, ending in a splat (throttled) */
(() => {
  let last = 0, alive = 0;
  addEventListener("pointerdown", (e) => {
    if (REDUCE || FROZEN || e.button > 0) return;
    if (e.target.closest?.("input, textarea, .candle")) return;
    const now = performance.now();
    if (now - last < (COARSE ? 220 : 110) || alive >= (COARSE ? 3 : 6)) return;
    last = now;
    alive++;
    const tx = e.clientX, ty = e.clientY, ox = tx < innerWidth / 2 ? 0 : innerWidth, oy = innerHeight;
    Audio.thwip();
    FX.add((ctx, t) => {
      const shoot = Math.min(1, t / 0.13);
      const settle = easeElastic(Math.min(1, t / 0.6));
      const life = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.4);
      ctx.save();
      ctx.globalAlpha = 0.9 * life;
      ctx.strokeStyle = webInk;
      ctx.lineWidth = 1.5;
      if (!COARSE) { ctx.shadowColor = "rgba(90,209,255,.7)"; ctx.shadowBlur = 5; }
      ctx.beginPath();
      strand(ctx, ox, oy, lerp(ox, tx, shoot), lerp(oy, ty, shoot), (1 - settle) * 26);
      ctx.stroke();
      ctx.restore();
      if (shoot >= 1) splat(ctx, tx, ty, 13 * settle, life);
      if (life <= 0) { alive--; return false; }
    });
  }, { passive: true });
})();

/* A1 · web-swing scene transition: a line shoots to an anchor, the camera swings through */
Hooks.swing = (target, after) => {
  const main = $("#main"), w = innerWidth, h = innerHeight;
  const ax = w * rand(0.6, 0.82), ay = 30, sx = 0, sy = h * 0.62;
  const origin = () => `${w / 2}px ${window.scrollY + h / 2}px`;
  Audio.thwip();
  FX.add((ctx, t) => {
    const k = Math.min(1, t / 0.16), life = t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.35);
    ctx.save();
    ctx.globalAlpha = life;
    ctx.strokeStyle = webInk;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(lerp(sx, ax, k), lerp(sy, ay, k));
    ctx.stroke();
    ctx.restore();
    if (k >= 1) splat(ctx, ax, ay, 11, life);
    if (life <= 0) return false;
  });
  gsap.timeline()
    .set(main, { transformOrigin: origin() })
    .to(main, { x: -w * 0.1, rotation: -3, filter: "blur(3px)", duration: 0.3, ease: "power4.in", delay: 0.12 })
    .add(() => {
      scrollToEl(target, true);
      target.focus?.({ preventScroll: true });
      after?.();
      Audio.whoosh(true);
      gsap.set(main, { x: w * 0.12, rotation: 3, transformOrigin: origin() });
    })
    .to(main, { x: 0, rotation: 0, filter: "blur(0px)", duration: 0.9, ease: "elastic.out(1, 0.4)" })
    .set(main, { clearProps: "transform,filter" });
};

/* A4 · spider-sense: three tingle lines above the heading just before a section reveals */
(() => {
  let last = 0;
  const LINES = `<svg viewBox="0 0 96 34"><path d="M48 32 l-4 -7 l6 -5 l-4 -7 l3 -6"/><path d="M26 32 l-6 -6 l4 -6 l-7 -5 l1 -6" transform="rotate(-14 26 32)"/><path d="M70 32 l6 -6 l-4 -6 l7 -5 l-1 -6" transform="rotate(14 70 32)"/></svg>`;
  function tingle(target, force) {
    if (REDUCE || !HAS.gsap || !target) return;
    const now = performance.now();
    if (!force && now - last < 1400) return;
    last = now;
    const r = target.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const s = make("div", "sense", document.body, LINES);
    s.style.left = r.left + r.width / 2 + "px";
    s.style.top = Math.max(40, r.top - 6) + "px";
    Audio.tingle();
    gsap.fromTo($$("path", s), { scaleY: 0, opacity: 0, transformOrigin: "50% 100%" }, { scaleY: 1, opacity: 1, duration: 0.45, stagger: 0.05, ease: "elastic.out(1, 0.4)" });
    gsap.to(s, { opacity: 0, y: -10, duration: 0.4, delay: 0.75, onComplete: () => s.remove() });
  }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    tingle($(".t-h2, .hero-name", e.target) || e.target);
    io.unobserve(e.target);
  }), { threshold: 0.6 });
  // armed only after the intro, so the opening isn't cluttered
  Bus.addEventListener("enter", () => setTimeout(() => {
    $$(".scene-head").forEach((h) => io.observe(h));
    io.observe($("#hero-name"));
  }, 2500), { once: true });
  Bus.addEventListener("sense", (e) => tingle(e.detail.el, true));
})();

/* A5 · hero corner webs that sway with scroll/tilt, and an original skyline in the footer */
(() => {
  const hero = $("#hero");
  const web = () => {
    let d = "";
    const N = 8, R = 100;
    const ang = (i) => (i / (N - 1)) * (Math.PI / 2);
    for (let i = 0; i < N; i++) d += `M0 0L${(Math.cos(ang(i)) * R * 1.4).toFixed(1)} ${(Math.sin(ang(i)) * R * 1.4).toFixed(1)}`;
    for (let k = 1; k <= 6; k++) {
      const r = k * 19;
      for (let i = 0; i < N - 1; i++) {
        const a0 = ang(i), a1 = ang(i + 1), am = (a0 + a1) / 2;
        const x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
        const cx = Math.cos(am) * r * 0.86, cy = Math.sin(am) * r * 0.86; // sag toward the corner
        d += `M${x0.toFixed(1)} ${y0.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      }
    }
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width=".6"/></svg>`;
  };
  const tl = make("div", "corner-web tl", hero, web());
  const tr = make("div", "corner-web tr", hero, web());
  $("svg", tr).style.transform = "scaleX(-1)";
  Ticker.add((dt, t) => {
    if (!visible.hero || REDUCE) return;
    const tt = tilt(), r = hero.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height), -1, 1);
    const sway = Math.sin(t / 1900) * 1.6 + tt.x * 3 + p * 5;
    tl.style.transform = `rotate(${sway.toFixed(2)}deg)`;
    tr.style.transform = `rotate(${(-sway).toFixed(2)}deg)`;
  });

  // skyline: procedurally generated (seeded) buildings, lit windows, and one web strung between rooftops
  const rnd = seeded(2010);
  let x = 0, b = "", wins = "";
  const tops = [];
  while (x < 1200) {
    const bw = 28 + rnd() * 62, bh = 40 + rnd() * 110, y = 160 - bh;
    b += `M${x.toFixed(0)} 160V${y.toFixed(0)}H${(x + bw).toFixed(0)}V160Z`;
    if (rnd() < 0.3) b += `M${(x + bw / 2 - 1).toFixed(0)} ${y.toFixed(0)}V${(y - 14 - rnd() * 18).toFixed(0)}h2V${y.toFixed(0)}Z`;
    if (rnd() < 0.15) b += `M${(x + 6).toFixed(0)} ${y}h14v-10h-14Z`;
    for (let wy = y + 8; wy < 152; wy += 11) for (let wx = x + 5; wx < x + bw - 6; wx += 9) if (rnd() < 0.18) wins += `M${wx.toFixed(0)} ${wy.toFixed(0)}h4v5h-4Z`;
    tops.push([x + bw / 2, y]);
    x += bw + 2 + rnd() * 6;
  }
  const [a, c] = [tops.reduce((m, t) => (t[1] < m[1] ? t : m)), tops[Math.min(tops.length - 1, 8)]];
  const svg = `<svg class="skyline" viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="${b}" fill="currentColor"/><path class="win" d="${wins}"/><path class="silk" d="M${a[0].toFixed(0)} ${a[1]}Q${((a[0] + c[0]) / 2).toFixed(0)} ${(Math.max(a[1], c[1]) + 30).toFixed(0)} ${c[0].toFixed(0)} ${c[1]}" fill="none" stroke-width="1.2"/></svg>`;
  $("footer").insertAdjacentHTML("afterbegin", svg);
})();

/* A3 · gallery: elastic web strands between cards + Comic Panel mode */
(() => {
  const vp = $("#cards-viewport"), cards = $$(".ucard", vp);
  const cv = document.createElement("canvas");
  cv.className = "strands";
  cv.setAttribute("aria-hidden", "true");
  vp.prepend(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, lastX = null, sag = 12, sagV = 0;
  const size = () => { W = vp.clientWidth; H = vp.clientHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
  size();
  new ResizeObserver(size).observe(vp);
  Ticker.add((dt) => {
    if (!visible.gallery) return;
    const vr = vp.getBoundingClientRect(), rects = cards.map((c) => c.getBoundingClientRect());
    const x0 = rects[0].left;
    const v = lastX == null || dt === 0 ? 0 : (x0 - lastX) / dt;
    lastX = x0;
    const target = clamp(12 - Math.abs(v) * 0.012, 1, 12); // a fast swipe pulls the strands taut
    if (REDUCE || dt === 0) sag = target;
    else { sagV += ((target - sag) * 140 - sagV * 9) * dt; sag += sagV * dt; } // spring → elastic wobble on release
    ctx.clearRect(0, 0, W, H);
    const comic = vp.classList.contains("comic");
    ctx.strokeStyle = comic ? "rgba(17,17,17,.9)" : webInk;
    ctx.globalAlpha = comic ? 1 : 0.55;
    ctx.lineWidth = comic ? 2 : 1;
    ctx.beginPath();
    for (let i = 0; i < rects.length - 1; i++) {
      const a = rects[i], b = rects[i + 1];
      if (b.left - vr.left < -60 || a.right - vr.left > W + 60) continue;
      for (const f of [0.22, 0.5, 0.78]) {
        const xa = a.right - vr.left - 2, xb = b.left - vr.left + 2;
        const ya = a.top - vr.top + a.height * f, yb = b.top - vr.top + b.height * f;
        strand(ctx, xa, ya, xb, yb, sag * (f === 0.5 ? 1.3 : 1));
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Comic Panel mode: halftone, bold outlines, speech-bubble labels, sound-effect bursts (CONFIG.comic.sfx)
  const SFX = (CONFIG.comic && CONFIG.comic.sfx && CONFIG.comic.sfx.length ? CONFIG.comic.sfx : ["ZAP!"]);
  cards.forEach((c, i) => make("span", "sfx", c, SFX[i % SFX.length]).setAttribute("aria-hidden", "true"));
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-btn comic-btn";
  btn.textContent = "POW!";
  btn.setAttribute("aria-label", "Comic panel mode");
  $(".cards-controls").appendChild(btn);
  const pop = () => {
    const s = $(".ucard.active .sfx", vp);
    if (s && HAS.gsap && !REDUCE && vp.classList.contains("comic")) gsap.fromTo(s, { scale: 0.2, rotation: -30 }, { scale: 1, rotation: -8, duration: 0.7, ease: "elastic.out(1, 0.4)" });
  };
  const set = (on) => {
    vp.classList.toggle("comic", on);
    btn.setAttribute("aria-pressed", String(on));
    store("mv-comic", on ? "1" : "0");
    if (on) pop();
  };
  set(store("mv-comic") === "1");
  btn.addEventListener("click", () => { set(!vp.classList.contains("comic")); Audio.thwip(); });
  new MutationObserver(pop).observe($("#cards-count"), { childList: true, characterData: true, subtree: true });
})();

/* ═══════════════ B · THUNDER LAYER ═══════════════ */

/* B4 · sky: rare distant lightning behind everything + a rain of sparks during the timeline */
const Sky = (() => {
  const c = make("canvas", "sky-canvas"), fl = make("div", "sky-flash");
  c.setAttribute("aria-hidden", "true");
  fl.setAttribute("aria-hidden", "true");
  document.body.insertBefore(c, $("main"));
  document.body.insertBefore(fl, $("main"));
  const ctx = c.getContext("2d");
  let w = 0, h = 0, bolts = [], rain = [], dirty = false, lastBolt = 0;
  const size = () => { w = innerWidth; h = innerHeight; c.width = w * DPR; c.height = h * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
  size();
  addEventListener("resize", size);
  function distant(power = 0.6) {
    if (REDUCE || document.hidden || !HAS.gsap) return;
    const now = performance.now();
    if (now - lastBolt < 4000 || !Flash.allow()) return;
    lastBolt = now;
    const x = rand(0.12, 0.88) * w;
    bolts.push({ paths: withBranches(boltPoints(x, -10, x + rand(-90, 90), rand(0.22, 0.42) * h, 70, 5), 2), life: 1 });
    gsap.fromTo(fl, { opacity: 0.55 * power }, { opacity: 0, duration: 0.6, ease: "power3.out", overwrite: true });
    setTimeout(() => Audio.thunder(0.3 * power), rand(500, 1300)); // sound arrives after the light
  }
  (function schedule() {
    setTimeout(() => { if (!FROZEN && Audio.ready) distant(rand(0.4, 0.8)); schedule(); }, rand(12000, 30000));
  })();
  Ticker.add((dt) => {
    const raining = visible["archives-sec"] && !REDUCE;
    if (raining && rain.length < (COARSE ? 26 : 60)) rain.push({ x: Math.random() * w, y: -20, vy: rand(260, 520), len: rand(8, 18), gold: Math.random() < 0.4 });
    if (!bolts.length && !rain.length) { if (dirty) { ctx.clearRect(0, 0, w, h); dirty = false; } return; }
    ctx.clearRect(0, 0, w, h);
    dirty = true;
    bolts = bolts.filter((b) => (b.life -= dt * 2.2) > 0);
    bolts.forEach((b) => drawBolt(ctx, b.paths, b.life * 0.7, 1.6));
    ctx.lineWidth = 1.2;
    rain = rain.filter((r) => (r.y += r.vy * dt) < h + 20 && (raining || r.y < h));
    for (const r of rain) {
      ctx.strokeStyle = r.gold ? "rgba(255,190,90,.55)" : "rgba(90,209,255,.55)";
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 2, r.y - r.len); ctx.stroke();
    }
  });
  return { distant };
})();

/* Beat engine: low-frequency energy → rune glow, rune-frame pulse, camera pulse, bursts, lightning */
(() => {
  const glow = make("div", "runes-glow", $("#runes"));
  let smooth = 0, avg = 0, prev = 0, last = 0;
  const visibleInner = () => {
    const mid = innerHeight / 2;
    for (const s of $$("main > section")) {
      if (!visible[s.id]) continue;
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) return $(".scene-inner", s);
    }
    return null;
  };
  function burst(s) {
    const x = rand(0.25, 0.75) * innerWidth, y = rand(0.3, 0.6) * innerHeight;
    const parts = Array.from({ length: COARSE ? 10 : 22 }, () => { const a = Math.random() * 6.283, v = rand(60, 220) * (0.5 + s); return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, gold: Math.random() < 0.6 }; });
    FX.add((ctx, t) => {
      const life = 1 - t / 0.7;
      if (life <= 0) return false;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        ctx.fillStyle = p.gold ? `rgba(255,178,63,${life})` : `rgba(90,209,255,${life})`;
        ctx.fillRect(x + p.vx * t, y + p.vy * t + 60 * t * t, 2.2, 2.2);
      }
      ctx.restore();
    });
  }
  function onBeat(s) {
    if (REDUCE || FROZEN) return;
    document.body.classList.add("beat");
    setTimeout(() => document.body.classList.remove("beat"), 150);
    const inner = visibleInner();
    if (inner && HAS.gsap && s > 0.2) gsap.fromTo(inner, { scale: 1 }, { scale: 1 + (COARSE ? 0.004 : 0.008) * s, duration: 0.09, yoyo: true, repeat: 1, ease: "power2.out", overwrite: "auto" });
    if (s > 0.5) burst(Math.min(1, s));
    if (s > 0.85) Sky.distant(0.5);
  }
  Ticker.add(() => {
    const e = Audio.low();
    smooth = lerp(smooth, e, 0.25);
    avg = lerp(avg, e, 0.03);
    if (visible.hero) glow.style.opacity = (0.15 + smooth * (COARSE ? 0.45 : 0.75)).toFixed(3);
    const now = performance.now(), rise = e - prev;
    prev = e;
    if (rise > 0.05 && e > avg && e > 0.2 && now - last > 280) { last = now; onBeat(clamp(rise * 6, 0, 1)); }
  });
})();

/* letterbox bars (+ stronger grain) during the intro and the finale */
const Cinema = (() => {
  make("div", "letterbox top").setAttribute("aria-hidden", "true");
  make("div", "letterbox bottom").setAttribute("aria-hidden", "true");
  const keys = new Set();
  const sync = () => document.body.classList.toggle("cinema", keys.size > 0);
  return { on(k) { keys.add(k); sync(); }, off(k) { keys.delete(k); sync(); } };
})();
new IntersectionObserver((es) => es.forEach((e) => {
  Audio.zone("finale", e.isIntersecting);
  e.isIntersecting ? Cinema.on("finale") : Cinema.off("finale");
}), { threshold: 0.35 }).observe($("#finale"));

/* B1 · storm intro: clouds roll in, a fractal bolt strikes the centre, the portal ignites from the strike */
Hooks.intro = (done) => {
  if (REDUCE || !HAS.gsap || CONFIG.stormIntro === false) return done();
  const c = make("canvas", "storm-canvas"), ctx = c.getContext("2d");
  c.setAttribute("aria-hidden", "true");
  const w = innerWidth, h = innerHeight;
  c.width = w * DPR; c.height = h * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  Cinema.on("intro");
  const clouds = Array.from({ length: COARSE ? 12 : 20 }, (_, i) => ({ x: rand(-0.2, 1.2) * w, y: rand(-0.05, 0.5) * h, r: rand(0.18, 0.4) * Math.max(w, h), vx: rand(12, 40) * (i % 2 ? 1 : -1), shade: rand(0.25, 0.55) }));
  const st = $("#portal-stage").getBoundingClientRect();
  const sx = st.left + st.width / 2, sy = st.top + st.height / 2;
  let t = 0, bolt = null, boltLife = 0, ring = -1, struck = false, cloudA = 0, fade = 1;
  const tick = (dt) => {
    t += dt;
    cloudA = Math.min(1, t / 0.9);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = fade;
    ctx.fillStyle = `rgba(4,6,12,${0.55 * cloudA})`;
    ctx.fillRect(0, 0, w, h);
    for (const cl of clouds) {
      cl.x += cl.vx * dt;
      const g = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
      g.addColorStop(0, `rgba(58,66,80,${cl.shade * cloudA})`);
      g.addColorStop(0.6, `rgba(30,36,48,${cl.shade * 0.6 * cloudA})`);
      g.addColorStop(1, "rgba(10,12,18,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cl.x, cl.y, cl.r, 0, 6.283); ctx.fill();
    }
    if (!struck && t > 1.05) {
      struck = true;
      bolt = withBranches(boltPoints(rand(0.3, 0.7) * w, -20, sx, sy, Math.min(w, h) * 0.35, 4), COARSE ? 2 : 3);
      boltLife = 1;
      ring = 0;
      whiteFlash(0.9, 0.4);
      Audio.thunder(1);
      gsap.fromTo("#main", { x: 0, y: 0 }, { keyframes: [{ x: 9, y: -6 }, { x: -8, y: 7 }, { x: 6, y: 3 }, { x: -4, y: -4 }, { x: 0, y: 0 }], duration: 0.5, ease: "none", clearProps: "transform" });
      done(); // the portal opens from the strike point
    }
    if (bolt && boltLife > 0) { boltLife -= dt * 1.8; drawBolt(ctx, bolt, Math.max(0, boltLife), 3); }
    if (ring >= 0 && ring < 1) {
      ring += dt * 1.6;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(90,209,255,${1 - ring})`;
      ctx.lineWidth = 3 + 6 * (1 - ring);
      ctx.shadowColor = VOLT; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(sx, sy, 20 + ring * Math.min(w, h) * 0.45, 0, 6.283); ctx.stroke();
      ctx.restore();
    }
    if (t > 2.2) fade = Math.max(0, 1 - (t - 2.2) / 0.9);
    if (t > 3.2) {
      Ticker.remove(tick);
      c.remove();
      setTimeout(() => Cinema.off("intro"), 900);
    }
  };
  Ticker.add(tick);
};

/* B2 · Bifrost-style aurora beam behind the letter when the spell unlocks */
Bus.addEventListener("unlock", () => {
  const wrap = $(".letter-wrap");
  if ($(".bifrost", wrap)) return;
  const beam = make("div", "bifrost", wrap);
  beam.setAttribute("aria-hidden", "true");
  if (REDUCE || !HAS.gsap) { beam.style.opacity = "0.35"; beam.style.transform = "translateX(-50%) scaleY(1)"; return; }
  gsap.fromTo(beam, { scaleY: 0, opacity: 0, xPercent: -50, x: 0 }, { scaleY: 1, opacity: 0.95, duration: 1.2, ease: "expo.out", delay: 0.9, onStart: () => Audio.whoosh() });
  gsap.to(beam, { opacity: 0.45, duration: 2.4, delay: 2.4, ease: "sine.inOut" });
  const pc = make("canvas", "bifrost-sparks", wrap);
  pc.setAttribute("aria-hidden", "true");
  const ctx = pc.getContext("2d");
  let W = 0, H = 0, parts = [], t = 0;
  const size = () => { W = pc.clientWidth; H = pc.clientHeight; pc.width = W * DPR; pc.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
  size();
  const HUES = [350, 35, 55, 140, 195, 265];
  Ticker.add((dt) => {
    if (!visible.letter) return;
    t += dt;
    const rate = t < 4 ? (COARSE ? 3 : 6) : 0.3;
    for (let i = 0; i < rate; i++) if (Math.random() < rate - i) parts.push({ x: W / 2 + rand(-W * 0.22, W * 0.22), y: H, vy: rand(-260, -120), hue: HUES[(Math.random() * HUES.length) | 0], life: 1 });
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    parts = parts.filter((p) => (p.life -= dt * 0.35) > 0);
    for (const p of parts) {
      p.y += p.vy * dt;
      ctx.fillStyle = `hsla(${p.hue},100%,70%,${p.life})`;
      ctx.fillRect(p.x + Math.sin(p.y / 30) * 6, p.y, 2, 2);
    }
  });
});

/* B5 · a new rune alphabet (original glyphs: a stave with branching twigs) → runic border glow */
function runeGlyph(r) {
  let d = "M0 -8V8";
  const twigs = 1 + ((r() * 3) | 0);
  for (let k = 0; k < twigs; k++) {
    const y = -8 + ((r() * 4) | 0) * 5, dir = r() < 0.5 ? -1 : 1, up = r() < 0.5 ? -1 : 1;
    d += `M0 ${y}l${dir * 6} ${up * 6}`;
  }
  if (r() < 0.35) d += `M-5 ${-8 + ((r() * 3) | 0) * 7}h10`;
  return d;
}
const RUNES = Array.from({ length: 24 }, (_, i) => runeGlyph(seeded(500 + i)));
(() => {
  const n = 14;
  const glyphs = Array.from({ length: n }, (_, i) => `<path transform="translate(${10 + i * 20} 12)" d="${RUNES[(i * 7) % RUNES.length]}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n * 20}" height="24" fill="none" stroke="${VOLT}" stroke-width="1.4" stroke-linecap="round" opacity=".75">${glyphs}</svg>`;
  document.documentElement.style.setProperty("--rune-strip", `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  const frame = () => $$(".ucard, .quiz-card, .wish").forEach((e) => e.classList.add("rune-frame"));
  frame();
  new MutationObserver(frame).observe($("#wishes"), { childList: true });
})();

/* B3 · the storm-forged hammer (original design, Norse-style runes) spins in at the finale and crackles */
(() => {
  const runeBand = [0, 5, 11, 17, 3].map((g, i) => `<path transform="translate(${62 + i * 19} 60) scale(1.1)" d="${RUNES[g]}"/>`).join("");
  const SVG = `<svg viewBox="0 0 200 240" aria-hidden="true">
    <defs>
      <linearGradient id="hm-head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#AEB8C6"/><stop offset=".45" stop-color="#6B7686"/><stop offset="1" stop-color="#2F3742"/></linearGradient>
      <linearGradient id="hm-grip" x1="0" x2="1"><stop offset="0" stop-color="#4A2D18"/><stop offset=".5" stop-color="#7A4C2A"/><stop offset="1" stop-color="#3E2614"/></linearGradient>
    </defs>
    <path d="M22 34 L44 18 H156 L178 34 V86 L156 102 H44 L22 86 Z" fill="url(#hm-head)" stroke="#FFB23F" stroke-width="2.5"/>
    <path d="M44 18 V102 M156 18 V102" stroke="#FFB23F" stroke-opacity=".55" stroke-width="2"/>
    <rect x="50" y="46" width="100" height="28" rx="4" fill="#1B2129" stroke="#5AD1FF" stroke-opacity=".5"/>
    <g fill="none" stroke="#5AD1FF" stroke-width="2" stroke-linecap="round">${runeBand}</g>
    <rect x="90" y="102" width="20" height="112" rx="5" fill="url(#hm-grip)"/>
    <path d="M90 112 l20 10 M90 128 l20 10 M90 144 l20 10 M90 160 l20 10 M90 176 l20 10 M90 192 l20 10" stroke="#2A1A0E" stroke-width="3"/>
    <rect x="86" y="208" width="28" height="10" rx="3" fill="#FFB23F"/>
    <circle cx="100" cy="228" r="9" fill="none" stroke="#FFB23F" stroke-width="3"/>
  </svg>`;
  const wrap = $("#candle-wrap");
  const hammer = document.createElement("button");
  hammer.type = "button";
  hammer.className = "hammer";
  hammer.setAttribute("aria-label", "The storm-forged hammer (tap it)");
  hammer.innerHTML = SVG;
  wrap.prepend(hammer);
  const arcC = make("canvas", "", hammer);
  arcC.setAttribute("aria-hidden", "true");
  const actx = arcC.getContext("2d");
  arcC.width = 152 * DPR; arcC.height = 172 * DPR;
  actx.setTransform(DPR, 0, 0, DPR, 0, 0);
  let arcs = [], nextArc = 0;

  // candle: small electric arcs around the flame
  const candle = $("#candle");
  const cc = make("canvas", "arcs", candle);
  cc.setAttribute("aria-hidden", "true");
  const cctx = cc.getContext("2d");
  cc.width = 90 * DPR; cc.height = 100 * DPR;
  cctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  let cArcs = [], cNext = 0;

  function show() {
    if (hammer.classList.contains("shown")) return;
    hammer.classList.add("shown");
    if (!HAS.gsap || REDUCE) return;
    gsap.fromTo(hammer, { x: -innerWidth * 0.6, y: -180, rotation: -740, scale: 0.3 }, { x: 0, y: 0, rotation: -18, scale: 1, duration: 1.15, ease: "power4.inOut", onComplete: () => { Audio.thunder(0.6); whiteFlash(0.5, 0.3); } });
  }
  Bus.addEventListener("finale:number", show);
  Bus.addEventListener("replay", () => { hammer.classList.remove("shown"); if (HAS.gsap) gsap.set(hammer, { clearProps: "transform" }); });

  hammer.addEventListener("click", () => {
    show();
    const r = hammer.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height * 0.3;
    const paths = withBranches(boltPoints(x + rand(-60, 60), -10, x, y, 160, 4), 2);
    FX.add((ctx, t) => { const a = 1 - t / 0.5; if (a <= 0) return false; drawBolt(ctx, paths, a, 2.6); });
    whiteFlash(0.7, 0.35);
    Audio.thunder(0.9);
    if (HAS.gsap && !REDUCE) gsap.fromTo(hammer, { rotation: -18 }, { keyframes: [{ rotation: -30 }, { rotation: -6 }, { rotation: -18 }], duration: 0.5, ease: "power4.out" });
    Eggs.find("storm", "Storm summoned! The hammer answers to her.");
  });

  const zap = (cx, cy, rMin, rMax) => {
    const a = Math.random() * 6.283, r = rand(rMin, rMax);
    return { paths: [boltPoints(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.6, 3)], life: 1 };
  };
  Ticker.add((dt) => {
    if (!visible.finale || REDUCE) return;
    const now = performance.now();
    if (hammer.classList.contains("shown")) {
      if (now > nextArc) { nextArc = now + rand(90, 220); arcs.push(zap(76, 66, 40, 70)); }
      actx.clearRect(0, 0, 152, 172);
      arcs = arcs.filter((a) => (a.life -= dt * 5) > 0);
      arcs.forEach((a) => drawBolt(actx, a.paths, a.life, 1.2));
    }
    const lit = !candle.classList.contains("out");
    if (lit && now > cNext) { cNext = now + rand(140, 320); cArcs.push(zap(45, 62, 18, 34)); }
    cctx.clearRect(0, 0, 90, 100);
    cArcs = cArcs.filter((a) => (a.life -= dt * 6) > 0 && lit);
    cArcs.forEach((a) => drawBolt(cctx, a.paths, a.life * 0.8, 0.8));
  });
})();

/* "Now playing" pill: appears when sound starts or is turned back on, then tucks itself away */
(() => {
  const pill = make("div", "now-playing gone");
  pill.setAttribute("role", "status");
  pill.innerHTML = `<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="np-t"></span>`;
  let hideT = 0, was = false;
  Audio.onChange(() => {
    const on = Audio.ready && !Audio.muted && Audio.mode !== "off";
    $(".np-t", pill).textContent = Audio.mode === "song" ? "Now playing: Manaswi's Theme" : "Now playing: Manaswi's Theme · storm score";
    if (on && !was) {
      pill.classList.remove("gone");
      clearTimeout(hideT);
      hideT = setTimeout(() => pill.classList.add("gone"), 7000);
    }
    if (!on) pill.classList.add("gone");
    was = on;
  });
})();
