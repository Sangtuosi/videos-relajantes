// Motor visual: dibuja un fotograma en el instante t (segundos).
// Todo es periódico con periodo S.loop, así el bucle no tiene corte.
'use strict';
const W = 1920, H = 1080, TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const frac = x => x - Math.floor(x);
const imod = (a, m) => ((a % m) + m) % m;

// ---------- Sprites precalculados ----------
function sprite(size, stops) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
const SPR = {};
function initSprites() {
  SPR.dot = sprite(64, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
  SPR.fire = sprite(256, [[0, 'rgba(255,190,110,0.9)'], [0.25, 'rgba(255,130,40,0.45)'], [0.6, 'rgba(200,60,10,0.12)'], [1, 'rgba(120,20,0,0)']]);
  SPR.candle = sprite(256, [[0, 'rgba(255,230,170,0.95)'], [0.2, 'rgba(255,180,90,0.5)'], [0.55, 'rgba(255,120,40,0.12)'], [1, 'rgba(255,100,20,0)']]);
  SPR.ember = sprite(32, [[0, 'rgba(255,240,180,1)'], [0.3, 'rgba(255,150,40,0.9)'], [1, 'rgba(255,60,0,0)']]);
  SPR.fly = sprite(64, [[0, 'rgba(250,255,190,1)'], [0.2, 'rgba(210,255,120,0.7)'], [1, 'rgba(150,255,80,0)']]);
  SPR.fog = sprite(512, [[0, 'rgba(225,232,240,0.55)'], [0.5, 'rgba(220,228,238,0.25)'], [1, 'rgba(220,228,238,0)']]);
  const v = document.createElement('canvas'); v.width = W; v.height = H;
  const g = v.getContext('2d');
  const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.85)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); SPR.vig = v;
}

// ---------- Escena de ejemplo (sin imagen) ----------
function demoScene() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  let gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#060b1f'); gr.addColorStop(0.55, '#1b2a55'); gr.addColorStop(1, '#2c3e6b');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createRadialGradient(1450, 230, 10, 1450, 230, 260);
  gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.18, 'rgba(255,248,225,1)'); gr.addColorStop(0.2, 'rgba(200,210,255,0.35)'); gr.addColorStop(1, 'rgba(120,140,220,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(1450, 230, 260, 0, TAU); g.fill();
  const r = rng(7);
  const ridge = (base, amp, col, seed) => {
    const rr = rng(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    let y = base; for (let x = 0; x <= W; x += 40) { y += (rr() - 0.5) * amp; y = Math.max(base - 180, Math.min(base + 80, y)); g.lineTo(x, y); }
    g.lineTo(W, H); g.fill();
  };
  ridge(620, 90, '#25345e', 3); ridge(720, 70, '#1a2547', 11);
  g.fillStyle = '#dfe7f5'; g.fillRect(0, 900, W, 180);
  gr = g.createLinearGradient(0, 860, 0, H); gr.addColorStop(0, '#b9c7e3'); gr.addColorStop(1, '#eef3fb');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 900); for (let x = 0; x <= W; x += 60) g.lineTo(x, 880 + Math.sin(x / 210) * 18); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  const tree = (x, y, h) => { g.fillStyle = '#0b1328'; g.beginPath(); for (let i = 0; i < 4; i++) { const yy = y - h * i * 0.24, w = h * (0.32 - i * 0.06); g.moveTo(x - w, yy); g.lineTo(x, yy - h * 0.38); g.lineTo(x + w, yy); } g.fill(); g.fillRect(x - h * 0.03, y, h * 0.06, h * 0.08); };
  for (let i = 0; i < 26; i++) { const x = r() * W, h = 120 + r() * 220; if (x > 760 && x < 1160) continue; tree(x, 880 + r() * 40, h); }
  g.fillStyle = '#120d14'; g.fillRect(800, 700, 330, 210);
  g.beginPath(); g.moveTo(770, 710); g.lineTo(965, 560); g.lineTo(1160, 710); g.fill();
  g.fillStyle = '#e9eef8'; g.beginPath(); g.moveTo(765, 712); g.lineTo(965, 552); g.lineTo(1165, 712); g.lineTo(1150, 716); g.lineTo(965, 575); g.lineTo(780, 716); g.fill();
  g.fillStyle = '#ffb860'; g.fillRect(860, 770, 90, 70); g.fillRect(1000, 770, 90, 70);
  g.fillStyle = '#120d14'; g.fillRect(902, 770, 6, 70); g.fillRect(860, 802, 90, 6); g.fillRect(1042, 770, 6, 70); g.fillRect(1000, 802, 90, 6);
  return c;
}

// ---------- Utilidades de oscilación periódica ----------
// Frecuencia en Hz redondeada para que quepan ciclos enteros en el bucle.
const cyc = (hz, L) => Math.max(1, Math.round(hz * L));
function flick(t, L, seed, fast) {
  const r = rng(seed * 977 + 13); const base = fast ? [1.1, 2.3, 4.1, 6.7, 9.9] : [0.45, 1.1, 2.2, 3.9, 6.1];
  const amp = [0.36, 0.26, 0.18, 0.12, 0.08]; let v = 0;
  for (let i = 0; i < 5; i++) v += amp[i] * Math.sin(TAU * cyc(base[i] * (0.8 + r() * 0.4), L) * t / L + r() * TAU);
  return v; // aprox -1..1
}

// ---------- Partículas precalculadas por escena ----------
let cache = { key: '' };
function prepare(S) {
  const key = JSON.stringify([S.loop, S.fx, S.lights.length]);
  if (cache.key === key) return cache;
  const L = S.loop; const c = { key };
  let r = rng(101);
  const ns = Math.round(120 + 780 * S.fx.snow.amt);
  c.snow = []; for (let i = 0; i < ns; i++) { const z = 0.25 + 0.75 * Math.pow(r(), 1.6); c.snow.push({ x: r() * W, y: r() * H, z, k: Math.max(1, Math.round(z * (40 + 110 * S.fx.snow.speed) * L / (H + 40))), a: 8 + r() * 30 * z, m: cyc(0.08 + r() * 0.25, L), p: r() * TAU, s: 3 + 9 * z * z }); }
  r = rng(202);
  const nr = Math.round(120 + 600 * S.fx.rain.amt);
  c.rain = []; for (let i = 0; i < nr; i++) { const z = 0.3 + 0.7 * r(); c.rain.push({ x: r() * (W + 300), y: r() * H, z, k: Math.max(1, Math.round((900 + 900 * z) * L / (H + 120))), len: 18 + 45 * z }); }
  r = rng(303);
  c.flies = []; const nf = Math.round(12 + 70 * S.fx.fireflies.amt);
  for (let i = 0; i < nf; i++) c.flies.push({ x: 80 + r() * (W - 160), y: H * 0.35 + r() * H * 0.6, ax: 30 + r() * 90, ay: 20 + r() * 60, mx: cyc(0.03 + r() * 0.06, L), my: cyc(0.04 + r() * 0.07, L), mb: cyc(0.15 + r() * 0.25, L), p: r() * TAU, q: r() * TAU, b: r() * TAU, s: 22 + r() * 26 });
  r = rng(404);
  c.stars = []; const nst = Math.round(80 + 260 * S.fx.stars.amt);
  for (let i = 0; i < nst; i++) c.stars.push({ x: r() * W, y: Math.pow(r(), 1.4) * H * 0.55, s: 2 + Math.pow(r(), 3) * 7, m: cyc(0.1 + r() * 0.5, L), p: r() * TAU, a: 0.35 + r() * 0.65 });
  r = rng(505);
  c.fog = []; for (let i = 0; i < 8; i++) c.fog.push({ x: r() * W, y: H * 0.45 + r() * H * 0.5, rx: 700 + r() * 600, ry: 220 + r() * 160, A: 120 + r() * 220, m: 1, p: r() * TAU });
  r = rng(606);
  c.embers = []; for (let i = 0; i < 60; i++) c.embers.push({ dx: (r() - 0.5), k: Math.max(1, Math.round(L / (1.8 + r() * 2.2))), o: r(), m: cyc(0.3 + r() * 0.5, L), p: r() * TAU, s: 8 + r() * 10, h: 0.8 + r() * 0.8 });
  r = rng(707);
  const nfl = 1 + Math.round(S.fx.storm.amt * 3); c.flash = [];
  for (let i = 0; i < nfl; i++) c.flash.push((i + 0.15 + r() * 0.6) * L / nfl);
  cache = c; return c;
}
function flashLevel(t, flashes) {
  let v = 0; for (const f of flashes) { const d = t - f; if (d >= 0 && d < 0.9) v = Math.max(v, d < 0.08 ? 1 : d < 0.18 ? 0.25 : d < 0.28 ? 0.8 : Math.max(0, 0.6 * (1 - (d - 0.28) / 0.6))); } return v;
}

// ---------- Dibujo ----------
function imgRect(img, S, t) {
  const iw = img.width, ih = img.height, sc = Math.max(W / iw, H / ih);
  const kb = S.kenburns, L = S.loop;
  const z = 1 + kb * 0.06 * (0.5 - 0.5 * Math.cos(TAU * t / L)) + (kb > 0 ? 0.02 : 0);
  const dw = iw * sc * z, dh = ih * sc * z;
  const px = kb * 18 * Math.sin(TAU * t / L), py = kb * 8 * Math.sin(TAU * 2 * t / L);
  return { dx: (W - dw) / 2 + px, dy: (H - dh) / 2 + py, dw, dh, iw, ih };
}

function renderFrame(ctx, img, S, t) {
  const L = S.loop; t = imod(t, L);
  const C = prepare(S); const fx = S.fx;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const R = imgRect(img, S, t);
  ctx.drawImage(img, R.dx, R.dy, R.dw, R.dh);

  // Ondulación de llamas sobre cada fuego/vela
  S.lights.forEach((li, idx) => {
    if (!li.shimmer) return;
    const sz = li.size, x0 = li.x - sz * 0.6, y0 = li.y - sz * 1.3, w = sz * 1.2, h = sz * 1.45, st = 4;
    const sx = R.iw / R.dw, sy = R.ih / R.dh, fast = li.type === 'vela';
    for (let y = y0; y < y0 + h; y += st) {
      const rel = (y - y0) / h; const amp = (fast ? 2.5 : 6) * (sz / 200) * Math.sin(Math.PI * rel) * (1.15 - rel);
      const off = amp * (Math.sin(TAU * cyc(fast ? 2.6 : 1.7, L) * t / L + y * 0.045 + idx) + 0.5 * Math.sin(TAU * cyc(fast ? 4.1 : 2.9, L) * t / L - y * 0.08));
      ctx.drawImage(img, (x0 - R.dx) * sx, (y - R.dy) * sy, w * sx, st * sy, x0 + off, y, w, st);
    }
  });

  // Tono de color
  if (S.tint !== 'none' && S.tintAmt > 0) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = S.tint === 'calido' ? `rgba(255,150,60,${0.5 * S.tintAmt})` : `rgba(70,130,255,${0.5 * S.tintAmt})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Luz ambiente de los fuegos
  if (S.lights.length) {
    let fsum = 0, n = 0;
    S.lights.forEach((li, i) => { fsum += flick(t, L, i + 1, li.type === 'vela') * (li.type === 'vela' ? 0.5 : 1); n++; });
    const f = fsum / n;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 0.10 * S.lightAmt * (0.4 - f))})`; ctx.fillRect(0, 0, W, H);
  }

  // Niebla
  if (fx.fog.on) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.25 + 0.55 * fx.fog.amt;
    for (const b of C.fog) { const x = b.x + b.A * Math.sin(TAU * t / L + b.p); ctx.drawImage(SPR.fog, x - b.rx, b.y - b.ry, b.rx * 2, b.ry * 2); }
    ctx.globalAlpha = 1;
  }

  ctx.globalCompositeOperation = 'lighter';
  // Estrellas
  if (fx.stars.on) for (const s of C.stars) {
    const a = s.a * (0.55 + 0.45 * Math.sin(TAU * s.m * t / L + s.p)); ctx.globalAlpha = a * (0.5 + 0.5 * fx.stars.amt);
    ctx.drawImage(SPR.dot, s.x - s.s, s.y - s.s, s.s * 2, s.s * 2);
  }
  // Luces de fuego y velas
  S.lights.forEach((li, i) => {
    const vela = li.type === 'vela'; const f = flick(t, L, i + 1, vela);
    const k = 1 + (vela ? 0.07 : 0.14) * f; const rad = li.size * (vela ? 1.6 : 2.2) * k;
    ctx.globalAlpha = Math.max(0, Math.min(1, S.lightAmt * (0.72 + 0.28 * f)));
    ctx.drawImage(vela ? SPR.candle : SPR.fire, li.x - rad, li.y - rad * 0.9, rad * 2, rad * 2);
    if (!vela) { const R2 = li.size * 6; ctx.globalAlpha = 0.18 * S.lightAmt * (0.75 + 0.25 * f); ctx.drawImage(SPR.fire, li.x - R2, li.y - R2 * 0.8, R2 * 2, R2 * 2); }
  });
  // Chispas
  if (fx.embers.on) S.lights.forEach(li => {
    if (li.type === 'vela') return; const n = Math.round(8 + 50 * fx.embers.amt);
    for (let j = 0; j < n && j < C.embers.length; j++) {
      const e = C.embers[j]; const p = frac(e.k * t / L + e.o);
      const x = li.x + e.dx * li.size * 0.7 + Math.sin(TAU * e.m * t / L + e.p) * 25 * p; const y = li.y - p * li.size * 2.4 * e.h;
      ctx.globalAlpha = Math.max(0, (1 - p) * (p < 0.08 ? p / 0.08 : 1)); const s = e.s * (1 - 0.5 * p) * li.size / 200;
      ctx.drawImage(SPR.ember, x - s, y - s, s * 2, s * 2);
    }
  });
  // Luciérnagas
  if (fx.fireflies.on) for (const f of C.flies) {
    const x = f.x + f.ax * Math.sin(TAU * f.mx * t / L + f.p), y = f.y + f.ay * Math.sin(TAU * f.my * t / L + f.q);
    const b = Math.pow(Math.max(0, Math.sin(TAU * f.mb * t / L + f.b)), 2); ctx.globalAlpha = b; ctx.drawImage(SPR.fly, x - f.s, y - f.s, f.s * 2, f.s * 2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // Lluvia
  if (fx.rain.on) {
    const slant = 0.18;
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath(); ctx.lineWidth = 1 + layer * 0.9; ctx.strokeStyle = `rgba(210,225,255,${0.12 + 0.1 * layer})`;
      for (let i = layer; i < C.rain.length; i += 3) {
        const d = C.rain[i]; const y = imod(d.y + d.k * (H + 120) * t / L, H + 120) - 60; const x = d.x - 150 + (y + 60) * slant * -1 + 120;
        ctx.moveTo(x, y); ctx.lineTo(x + d.len * slant * -1 * 0.4, y + d.len);
      }
      ctx.stroke();
    }
  }
  // Nieve
  if (fx.snow.on) {
    for (const s of C.snow) {
      const y = imod(s.y + s.k * (H + 40) * t / L, H + 40) - 20; const x = imod(s.x + s.a * Math.sin(TAU * s.m * t / L + s.p), W + 20) - 10;
      ctx.globalAlpha = 0.45 + 0.55 * s.z; ctx.drawImage(SPR.dot, x - s.s / 2, y - s.s / 2, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }
  // Relámpagos
  if (fx.storm.on) { const fl = flashLevel(t, C.flash); if (fl > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(200,215,255,${0.45 * fl})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; } }
  // Viñeta
  if (S.vignette > 0) { ctx.globalAlpha = S.vignette; ctx.drawImage(SPR.vig, 0, 0); ctx.globalAlpha = 1; }
}
