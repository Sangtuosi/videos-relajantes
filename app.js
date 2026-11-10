'use strict';
initSprites();
const $ = id => document.getElementById(id);
const view = $('view'), vctx = view.getContext('2d', { alpha: false });
let IMG = demoScene();
let musicFiles = []; // ArrayBuffer de cada canción
let musicPrev = null; // {L,R} a 44100 para la vista previa

const FX = [['snow', '❄ Nieve'], ['rain', '🌧 Lluvia'], ['storm', '⚡ Relámpagos'], ['fog', '🌫 Niebla'], ['stars', '✨ Estrellas'], ['fireflies', '🟡 Luciérnagas'], ['embers', '🔥 Chispas']];
const SND = [['fire', '🔥 Chimenea'], ['rain', '🌧 Lluvia'], ['wind', '🌬 Viento'], ['waves', '🌊 Olas'], ['thunder', '⚡ Truenos'], ['pad', '🎹 Música suave'], ['music', '🎵 Tu música'], ['master', '🔊 Volumen total']];

function defaults() {
  const fx = {}; FX.forEach(([k]) => fx[k] = { on: false, amt: 0.5 }); fx.snow.speed = 0.5;
  return { loop: 60, kenburns: 0.4, tint: 'none', tintAmt: 0.3, vignette: 0.45, lightAmt: 1, fx, lights: [],
    sound: { fire: 0, rain: 0, wind: 0, waves: 0, thunder: 0.8, pad: 0, music: 0.8, master: 0.9 } };
}
let S = defaults();
try { const s = JSON.parse(localStorage.getItem('relax-escena') || 'null'); if (s && s.fx && s.sound) S = Object.assign(defaults(), s); } catch (e) {}
const save = () => { try { localStorage.setItem('relax-escena', JSON.stringify(S)); } catch (e) {} };

const PRESETS = {
  '🔥 Chimenea': s => { s.fx.embers.on = true; s.lights = [{ type: 'fuego', x: 960, y: 760, size: 220, shimmer: true }]; s.sound.fire = 0.85; s.sound.pad = 0.25; s.tint = 'calido'; s.tintAmt = 0.35; s.vignette = 0.55; },
  '❄ Nieve noche': s => { s.fx.snow.on = true; s.fx.snow.amt = 0.6; s.fx.stars.on = true; s.fx.stars.amt = 0.3; s.sound.wind = 0.45; s.sound.pad = 0.35; s.tint = 'frio'; s.tintAmt = 0.25; },
  '🌧 Lluvia': s => { s.fx.rain.on = true; s.fx.rain.amt = 0.55; s.fx.fog.on = true; s.fx.fog.amt = 0.25; s.sound.rain = 0.85; s.tint = 'frio'; s.tintAmt = 0.3; },
  '⛈ Tormenta': s => { s.fx.rain.on = true; s.fx.rain.amt = 0.85; s.fx.storm.on = true; s.fx.storm.amt = 0.4; s.sound.rain = 0.9; s.sound.wind = 0.3; s.sound.thunder = 0.9; s.tint = 'frio'; s.tintAmt = 0.4; s.vignette = 0.6; },
  '🕯 Velas': s => { s.lights = [{ type: 'vela', x: 760, y: 620, size: 90, shimmer: true }, { type: 'vela', x: 960, y: 580, size: 100, shimmer: true }, { type: 'vela', x: 1160, y: 630, size: 85, shimmer: true }]; s.sound.pad = 0.6; s.tint = 'calido'; s.tintAmt = 0.3; s.vignette = 0.7; },
  '🌲 Bosque noche': s => { s.fx.fireflies.on = true; s.fx.fireflies.amt = 0.5; s.fx.stars.on = true; s.fx.fog.on = true; s.fx.fog.amt = 0.2; s.sound.wind = 0.2; s.sound.pad = 0.4; },
  '🌊 Mar': s => { s.fx.fog.on = true; s.fx.fog.amt = 0.15; s.sound.waves = 0.85; s.sound.wind = 0.15; s.kenburns = 0.6; },
  '☕ Café lluvioso': s => { s.fx.rain.on = true; s.fx.rain.amt = 0.35; s.lights = [{ type: 'vela', x: 1300, y: 700, size: 80, shimmer: true }]; s.sound.rain = 0.6; s.sound.pad = 0.45; s.tint = 'calido'; s.tintAmt = 0.3; },
  '🧹 Limpiar': () => {}
};

// ---------- Construir controles ----------
function slider(min, max, step, val, on) { const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val; r.oninput = () => on(+r.value); return r; }
function buildUI() {
  const pr = $('presets'); pr.innerHTML = '';
  Object.keys(PRESETS).forEach(name => { const b = document.createElement('button'); b.textContent = name; b.onclick = () => { const keep = { loop: S.loop }; S = defaults(); S.loop = keep.loop; PRESETS[name](S); save(); buildUI(); restartPreviewAudio(); }; pr.appendChild(b); });
  const fl = $('fxList'); fl.innerHTML = '';
  FX.forEach(([k, label]) => {
    const lab = document.createElement('label'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = S.fx[k].on;
    cb.onchange = () => { S.fx[k].on = cb.checked; save(); if (k === 'storm') restartPreviewAudio(); }; lab.append(cb, label);
    fl.append(lab, slider(0, 1, 0.05, S.fx[k].amt, v => { S.fx[k].amt = v; save(); }));
  });
  const sl = $('sndList'); sl.innerHTML = '';
  SND.forEach(([k, label]) => { const lab = document.createElement('label'); lab.textContent = label; sl.append(lab, slider(0, 1, 0.05, S.sound[k], v => { S.sound[k] = v; save(); restartPreviewAudio(true); })); });
  ['tintAmt', 'kenburns', 'vignette', 'lightAmt'].forEach(k => { $(k).value = S[k]; $(k).oninput = () => { S[k] = +$(k).value; save(); }; });
  $('tint').value = S.tint; $('tint').onchange = () => { S.tint = $('tint').value; save(); };
  $('loop').value = String(S.loop); $('loop').onchange = () => { S.loop = +$('loop').value; $('tagLoop').textContent = 'BUCLE ' + S.loop + ' S'; save(); restartPreviewAudio(); };
  $('tagLoop').textContent = 'BUCLE ' + S.loop + ' S';
  buildLights();
}
let selLight = -1;
function buildLights() {
  const box = $('lights'); box.innerHTML = '';
  S.lights.forEach((li, i) => {
    const d = document.createElement('div'); d.className = 'light' + (i === selLight ? ' sel' : '');
    const name = document.createElement('span'); name.textContent = (li.type === 'vela' ? '🕯 Vela ' : '🔥 Fuego ') + (i + 1);
    const sz = slider(li.type === 'vela' ? 30 : 80, li.type === 'vela' ? 220 : 500, 5, li.size, v => { li.size = v; save(); });
    const sh = document.createElement('label'); sh.className = 'small'; const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = li.shimmer; cb.onchange = () => { li.shimmer = cb.checked; save(); }; sh.append(cb, ' ondular');
    const del = document.createElement('button'); del.textContent = '✕'; del.style.padding = '4px 9px'; del.onclick = () => { S.lights.splice(i, 1); selLight = -1; save(); buildLights(); };
    d.append(name, sz, sh, del); box.appendChild(d);
  });
}
buildUI();

// ---------- Imagen ----------
function loadImageFile(f) {
  if (!f || !f.type.startsWith('image/')) return;
  const url = URL.createObjectURL(f); const im = new Image();
  im.onload = () => { IMG = im; $('hint').textContent = 'Imagen cargada: ' + im.width + ' por ' + im.height + '. ' + (im.width < 1600 ? 'Aviso: es pequeña, se verá algo borrosa en 1080.' : 'Buen tamaño.'); };
  im.src = url;
}
$('fImg').onchange = e => loadImageFile(e.target.files[0]);
const drop = $('drop');
drop.ondragover = e => { e.preventDefault(); drop.style.borderColor = 'var(--c1)'; };
drop.ondragleave = () => drop.style.borderColor = '';
drop.ondrop = e => { e.preventDefault(); drop.style.borderColor = ''; loadImageFile(e.dataTransfer.files[0]); };

// ---------- Colocar luces ----------
let placeMode = null, dragging = -1;
function setMode(m) { placeMode = placeMode === m ? null : m; $('addFire').classList.toggle('on', placeMode === 'fuego'); $('addCandle').classList.toggle('on', placeMode === 'vela'); $('tagMode').hidden = !placeMode; }
$('addFire').onclick = () => setMode('fuego'); $('addCandle').onclick = () => setMode('vela');
function toScene(e) { const r = view.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
view.onpointerdown = e => {
  const p = toScene(e);
  if (placeMode) { S.lights.push({ type: placeMode, x: p.x, y: p.y, size: placeMode === 'vela' ? 90 : 220, shimmer: true }); selLight = S.lights.length - 1; setMode(placeMode); save(); buildLights(); return; }
  let best = -1, bd = 90; S.lights.forEach((li, i) => { const d = Math.hypot(li.x - p.x, li.y - p.y); if (d < bd) { bd = d; best = i; } });
  if (best >= 0) { dragging = best; selLight = best; view.setPointerCapture(e.pointerId); buildLights(); }
};
view.onpointermove = e => { if (dragging < 0) return; const p = toScene(e); S.lights[dragging].x = p.x; S.lights[dragging].y = p.y; };
view.onpointerup = () => { if (dragging >= 0) { dragging = -1; save(); } };

// ---------- Vista previa ----------
const t0 = performance.now(); let exporting = false;
function loop() {
  if (!exporting) {
    const t = (performance.now() - t0) / 1000;
    vctx.setTransform(view.width / W, 0, 0, view.height / H, 0, 0);
    renderFrame(vctx, IMG, S, t);
    if (placeMode || S.lights.length) {
      S.lights.forEach((li, i) => { vctx.strokeStyle = i === selLight ? '#ff8a3d' : 'rgba(56,232,255,.8)'; vctx.lineWidth = 3; vctx.setLineDash([10, 8]); vctx.beginPath(); vctx.arc(li.x, li.y, 26, 0, TAU); vctx.stroke(); vctx.setLineDash([]); });
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- Música ----------
function buildMusic(buffers, sr) {
  if (!buffers.length) return null;
  const xf = Math.round(3 * sr); let total = 0;
  buffers.forEach((b, i) => total += b.length - (i ? xf : 0));
  const L = new Float32Array(total), R = new Float32Array(total); let pos = 0;
  buffers.forEach((b, i) => {
    const bl = b.getChannelData(0), br = b.numberOfChannels > 1 ? b.getChannelData(1) : bl;
    const start = i ? pos - xf : 0;
    for (let j = 0; j < b.length; j++) {
      const k = start + j; if (k >= total) break;
      if (i && j < xf) { const a = j / xf; L[k] = L[k] * (1 - a) + bl[j] * a; R[k] = R[k] * (1 - a) + br[j] * a; } else { L[k] = bl[j]; R[k] = br[j]; }
    }
    pos = start + b.length;
  });
  return { L, R };
}
async function decodeAll(sr) {
  const ctx = new OfflineAudioContext(2, 1, sr); const out = [];
  for (const ab of musicFiles) out.push(await ctx.decodeAudioData(ab.slice(0)));
  return out;
}
$('fMus').onchange = async e => {
  const files = [...e.target.files]; if (!files.length) return;
  $('musInfo').textContent = 'Cargando música...';
  try {
    for (const f of files) musicFiles.push(await f.arrayBuffer());
    const bufs = await decodeAll(44100); const secs = bufs.reduce((a, b) => a + b.duration, 0);
    musicPrev = buildMusic(bufs, 44100);
    $('musInfo').textContent = musicFiles.length + ' canciones, ' + Math.round(secs / 60) + ' minutos en total. Se repiten sin cortes.';
    restartPreviewAudio();
  } catch (err) { $('musInfo').textContent = 'No se pudo leer ese archivo de audio.'; }
};
$('clearMus').onclick = () => { musicFiles = []; musicPrev = null; $('musInfo').textContent = 'Sin música propia.'; restartPreviewAudio(); };

// ---------- Escuchar ----------
let actx = null, src = null, playing = false, rTimer = 0;
function restartPreviewAudio(debounce) {
  if (!playing) return; clearTimeout(rTimer); rTimer = setTimeout(startAudio, debounce ? 350 : 0);
}
function startAudio() {
  if (!actx) actx = new AudioContext({ sampleRate: 44100 });
  if (src) { try { src.stop(); } catch (e) {} }
  const sr = 44100, secs = Math.max(30, S.loop);
  const g = new SoundGen(sr, S, musicPrev, null); g.render(3 * sr); // salta la entrada
  const [l, r] = g.render(secs * sr);
  const buf = actx.createBuffer(2, l.length, sr); buf.copyToChannel(l, 0); buf.copyToChannel(r, 1);
  src = actx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(actx.destination); src.start();
}
$('btnPlay').onclick = async () => {
  playing = !playing; $('btnPlay').textContent = playing ? '■ Parar sonido' : '▶ Escuchar sonido'; $('btnPlay').classList.toggle('on', playing);
  if (playing) { startAudio(); if (actx.state === 'suspended') await actx.resume(); } else if (src) { src.stop(); src = null; }
};

// ---------- Miniatura ----------
function thumbnail() {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 720; const g = c.getContext('2d');
  g.setTransform(1280 / W, 0, 0, 720 / H, 0, 0); renderFrame(g, IMG, S, S.loop * 0.37);
  const title = $('thumbTitle').value.trim();
  if (title) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const grd = g.createLinearGradient(0, 420, 0, 720); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = grd; g.fillRect(0, 380, 1280, 340);
    let fs = 96; g.font = `700 ${fs}px Orbitron, sans-serif`; while (g.measureText(title).width > 1160 && fs > 40) { fs -= 4; g.font = `700 ${fs}px Orbitron, sans-serif`; }
    g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 24; g.fillStyle = '#fff'; g.fillText(title, 640, 650);
  }
  c.toBlob(b => download(b, 'miniatura.jpg'), 'image/jpeg', 0.92);
}
$('btnThumb').onclick = thumbnail; $('btnThumb2').onclick = thumbnail;
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000); }

// ---------- Exportar MP4 ----------
const tick = (() => { const ch = new MessageChannel(); const q = []; ch.port1.onmessage = () => q.shift()(); return () => new Promise(r => { q.push(r); ch.port2.postMessage(0); }); })();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hasWC = 'VideoEncoder' in window && 'AudioEncoder' in window;
$('support').textContent = hasWC ? (window.showSaveFilePicker ? 'Tu navegador puede guardar vídeos de varias horas directo en disco.' : 'En este navegador el vídeo se guarda en memoria: mejor hasta 30 minutos.') : 'Tu navegador no puede crear vídeo. Usa Chrome o Edge actualizado.';

async function pickVideoConfig(fps, bitrate) {
  const tries = [['avc', 'avc1.640028'], ['avc', 'avc1.4d0028'], ['avc', 'avc1.42e028'], ['vp9', 'vp09.00.40.08']];
  for (const [mux, codec] of tries) {
    const cfg = { codec, width: W, height: H, bitrate, framerate: fps, bitrateMode: 'variable', latencyMode: 'quality' };
    if (mux === 'avc') cfg.avc = { format: 'avc' };
    try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return { mux, cfg }; } catch (e) {}
  }
  return null;
}
async function pickAudioConfig() {
  const tries = [['aac', { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 192000 }], ['aac', { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }], ['opus', { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 }]];
  for (const [mux, cfg] of tries) { try { const r = await AudioEncoder.isConfigSupported(cfg); if (r.supported) return { mux, cfg }; } catch (e) {} }
  return null;
}
const fmtT = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} h ${m} min` : m ? `${m} min ${s % 60} s` : `${s} s`; };

let cancel = false;
$('btnCancel').onclick = () => { cancel = true; };
$('btnExport').onclick = async () => {
  if (!hasWC) { alert('Tu navegador no puede crear vídeo. Usa Chrome o Edge actualizado.'); return; }
  const totalSec = +$('dur').value * 60, fps = +$('fps').value, bitrate = +$('quality').value * 1e6, L = S.loop;
  const out = $('outMsg'); out.innerHTML = '';
  let fileHandle = null, writable = null;
  if (window.showSaveFilePicker) {
    try { fileHandle = await showSaveFilePicker({ suggestedName: 'video-relajante.mp4', types: [{ description: 'Vídeo MP4', accept: { 'video/mp4': ['.mp4'] } }] }); writable = await fileHandle.createWritable(); }
    catch (e) { if (e.name === 'AbortError') return; }
  } else if (totalSec > 3600) {
    if (!confirm('En este navegador un vídeo tan largo puede quedarse sin memoria. ¿Seguir igualmente?')) return;
  }
  const vc = await pickVideoConfig(fps, bitrate), ac = await pickAudioConfig();
  if (!vc || !ac) { alert('Tu navegador no tiene los códecs necesarios. Prueba con Chrome en un ordenador.'); return; }
  const sr = ac.cfg.sampleRate;
  exporting = true; cancel = false; $('btnExport').disabled = true; $('prog').hidden = false; $('tagRec').hidden = false;
  let wake = null; try { wake = await navigator.wakeLock.request('screen'); } catch (e) {}
  const setP = (p, txt) => { $('barFill').style.width = (p * 100).toFixed(1) + '%'; $('progTxt').textContent = txt; };
  const tStart = performance.now();
  try {
    setP(0, 'Preparando el sonido...'); await tick();
    const music = musicFiles.length ? buildMusic(await decodeAll(sr), sr) : null;
    const T = Math.round(totalSec * fps); // fotogramas totales
    const N = Math.min(T, Math.round(L * fps)); // fotogramas del bucle
    const frameUs = 1e6 / fps;
    const audioChunksExp = Math.ceil(totalSec * sr / (ac.mux === 'aac' ? 1024 : 960) * 1.05) + 200;
    // Destino del archivo
    let target, parts = [], patches = [], end = 0;
    if (writable) target = new Mp4Muxer.FileSystemWritableFileStreamTarget(writable);
    else target = new Mp4Muxer.StreamTarget({ chunked: true, onData: (data, pos) => {
      if (pos < end) { const k = Math.min(data.byteLength, end - pos); patches.push({ pos, data: data.slice(0, k) }); data = data.subarray(k); pos += k; }
      if (data.byteLength) { if (pos > end) { parts.push(new Blob([new Uint8Array(pos - end)])); end = pos; } parts.push(new Blob([data])); end += data.byteLength; }
    } });
    const muxer = new Mp4Muxer.Muxer({ target, video: { codec: vc.mux, width: W, height: H, frameRate: fps }, audio: { codec: ac.mux, numberOfChannels: 2, sampleRate: sr },
      fastStart: { expectedVideoChunks: T + 10, expectedAudioChunks: audioChunksExp }, firstTimestampBehavior: 'offset' });

    // Fase 1: codificar el bucle una sola vez
    const chunks = []; let vmeta = null, vErr = null;
    const venc = new VideoEncoder({ output: (c, m) => { const b = new Uint8Array(c.byteLength); c.copyTo(b); chunks.push({ b, type: c.type, ts: c.timestamp }); if (!vmeta && m && m.decoderConfig) vmeta = m; }, error: e => vErr = e });
    venc.configure(vc.cfg);
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d', { alpha: false });
    const gop = fps * 2; const t1 = performance.now();
    for (let i = 0; i < N; i++) {
      if (cancel || vErr) break;
      renderFrame(ctx, IMG, S, i / fps);
      const fr = new VideoFrame(canvas, { timestamp: Math.round(i * frameUs), duration: Math.round(frameUs) });
      venc.encode(fr, { keyFrame: i % gop === 0 }); fr.close();
      while (venc.encodeQueueSize > 4) await tick();
      if (i % 10 === 0) { const el = (performance.now() - t1) / 1000, sp = (i + 1) / el; setP(0.6 * i / N, `Paso 1 de 2: animando el bucle. ${i} de ${N} imágenes, ${sp.toFixed(0)} por segundo. Quedan unos ${fmtT((N - i) / sp + totalSec / 200)}.`); await tick(); }
      if (i % 120 === 0) await sleep(0);
    }
    await venc.flush(); venc.close();
    if (vErr) throw vErr; if (cancel) throw new Error('cancelado');

    // Fase 2: repetir el bucle y generar el sonido
    let aErr = null, aDone = 0;
    const aenc = new AudioEncoder({ output: (c, m) => { muxer.addAudioChunk(c, m); aDone = c.timestamp + (c.duration || 0); }, error: e => aErr = e });
    aenc.configure(ac.cfg);
    const gen = new SoundGen(sr, S, music, totalSec);
    let aT = 0; const blk = sr; const totalSamples = Math.round(totalSec * sr);
    const pushAudioUntil = async us => {
      while (aT < totalSamples && aT / sr * 1e6 < us) {
        const n = Math.min(blk, totalSamples - aT); const [l, r] = gen.render(n);
        const data = new Float32Array(n * 2); data.set(l, 0); data.set(r, n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(aT / sr * 1e6), data });
        aenc.encode(ad); ad.close(); aT += n;
        while (aenc.encodeQueueSize > 8) await tick();
      }
    };
    const t2 = performance.now(); let added = 0;
    for (let rep = 0; added < T; rep++) {
      const off = rep * N * frameUs;
      for (let j = 0; j < chunks.length && added < T; j++) {
        const c = chunks[j]; const ts = Math.round(off + c.ts);
        if (added % fps === 0) await pushAudioUntil(ts + 2e6);
        muxer.addVideoChunkRaw(c.b, c.type, ts, Math.round(frameUs), added === 0 ? vmeta : undefined);
        added++;
        if (added % (fps * 20) === 0) {
          if (cancel || aErr) break;
          const el = (performance.now() - t2) / 1000, sp = added / el;
          setP(0.6 + 0.4 * added / T, `Paso 2 de 2: montando el vídeo largo. ${fmtT(added / fps)} de ${fmtT(totalSec)}. Quedan unos ${fmtT((T - added) / sp)}.`);
          await tick();
        }
      }
      if (cancel || aErr) break;
    }
    if (aErr) throw aErr; if (cancel) throw new Error('cancelado');
    await pushAudioUntil(Infinity); await aenc.flush(); aenc.close();
    setP(1, 'Cerrando el archivo...'); await tick();
    muxer.finalize();
    const secs = (performance.now() - tStart) / 1000;
    if (writable) { await writable.close(); out.innerHTML = `<div class="msg">Vídeo guardado en tu ordenador. Tardó ${fmtT(secs)}. Ya puedes subirlo a YouTube.</div>`; }
    else {
      let blob = new Blob(parts, { type: 'video/mp4' });
      if (patches.length) {
        const maxEnd = Math.max(...patches.map(p => p.pos + p.data.byteLength));
        const head = new Uint8Array(await blob.slice(0, maxEnd).arrayBuffer());
        patches.forEach(p => head.set(p.data, p.pos));
        blob = new Blob([head, blob.slice(maxEnd)], { type: 'video/mp4' });
      }
      download(blob, 'video-relajante.mp4');
      out.innerHTML = `<div class="msg">Vídeo listo: ${(blob.size / 1048576).toFixed(0)} MB. Tardó ${fmtT(secs)}. Se ha descargado como video-relajante.mp4.</div>`;
    }
    setP(1, 'Terminado.');
  } catch (e) {
    console.error(e);
    out.innerHTML = `<div class="msg warn">${e.message === 'cancelado' ? 'Cancelado.' : 'Algo falló: ' + (e.message || e) + '. Prueba con calidad media o menos duración.'}</div>`;
    if (writable) { try { await writable.abort(); } catch (e2) {} }
  } finally {
    exporting = false; $('btnExport').disabled = false; $('tagRec').hidden = true; $('prog').hidden = true; if (wake) wake.release().catch(() => {});
  }
};

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
