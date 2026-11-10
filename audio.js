// Generador de sonido: lluvia, chimenea, viento, olas, truenos, música suave generada y música propia.
'use strict';
function stormFlashes(S) { return prepare(S).flash; }

class SoundGen {
  // music: {L: Float32Array, R: Float32Array} ya a la frecuencia sr, o null
  constructor(sr, S, music, totalSec) {
    this.sr = sr; this.S = S; this.music = music; this.n = 0; this.total = Math.round((totalSec || 1e9) * sr);
    this.s1 = 0x9e3779b9; this.s2 = 0x85ebca6b; this.s3 = 0xc2b2ae35;
    const z = 0; Object.assign(this, { rl1: z, rl2: z, rr1: z, rr2: z, br: z, bw: z, ck: z, ckd: 0.99, ckp: 0.5, cprev: 0, wl: z, wr: z, wm: 0.5, wt: 0.5, wv: z, wvl: z, wph: 0, wper: 8, th: 0, thb: z, thf: 0, pl: z, pr: z });
    this.flashes = S.fx.storm.on ? stormFlashes(S) : [];
    this.tab = new Float32Array(4096); for (let i = 0; i < 4096; i++) this.tab[i] = Math.sin(i / 4096 * Math.PI * 2);
    // Acordes suaves (Hz): Cmaj9, Am9, Fmaj9, G6/9
    const ch = [[130.81, 196.0, 246.94, 293.66, 329.63], [110.0, 164.81, 196.0, 246.94, 261.63], [87.31, 130.81, 164.81, 196.0, 220.0], [98.0, 146.83, 196.0, 220.0, 293.66]];
    this.chords = ch; this.phL = new Float64Array(10); this.phR = new Float64Array(10);
    this.chordDur = 12;
    this.xf = Math.round(3 * sr);
  }
  rnd() { let s = this.s1; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; this.s1 = s; return s / 2147483648 - 1; }
  rnd2() { let s = this.s2; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; this.s2 = s; return s / 2147483648 - 1; }
  u() { let s = this.s3; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; this.s3 = s; return s / 4294967296; }

  render(N) {
    const outL = new Float32Array(N), outR = new Float32Array(N);
    const v = this.S.sound, sr = this.sr, L = this.S.loop;
    const vRain = v.rain, vFire = v.fire, vWind = v.wind, vWaves = v.waves, vPad = v.pad, vMus = this.music ? v.music : 0, vTh = this.flashes.length ? v.thunder : 0;
    const tab = this.tab, chords = this.chords, cd = this.chordDur;
    const block = 256;
    for (let b0 = 0; b0 < N; b0 += block) {
      const bn = Math.min(block, N - b0);
      const tSec = this.n / sr;
      // Control lento (por bloque)
      this.wt += (this.u() - 0.5) * 0.02; this.wt = Math.min(1, Math.max(0, this.wt)); this.wm += (this.wt - this.wm) * 0.01;
      const aw = 0.0015 + 0.012 * this.wm, gw = (0.25 + 0.75 * this.wm) * 7;
      // Pad: amplitudes por acorde
      let ci = Math.floor(tSec / cd), pos = tSec - ci * cd; const cA = chords[ci % 4], cB = chords[(ci + 1) % 4];
      const xfp = pos > cd - 4 ? (pos - (cd - 4)) / 4 : 0; const aA = Math.cos(xfp * Math.PI / 2), aB = Math.sin(xfp * Math.PI / 2);
      const trem = 0.85 + 0.15 * Math.sin(tSec * 0.7);
      // Truenos
      if (vTh) { const tl = tSec % L; for (const f of this.flashes) { const d = tl - (f + 1.1); if (d >= 0 && d < block / sr) { this.th = 1; this.thf = 0.6 + this.u() * 0.4; } } }
      // Olas
      for (let i = 0; i < bn; i++) {
        const n = this.n; let l = 0, r = 0;
        const wl = this.rnd(), wr = this.rnd2();
        if (vRain) {
          this.rl1 += 0.45 * (wl - this.rl1); this.rl2 += 0.02 * (this.rl1 - this.rl2);
          this.rr1 += 0.45 * (wr - this.rr1); this.rr2 += 0.02 * (this.rr1 - this.rr2);
          l += (this.rl1 - this.rl2) * 0.55 * vRain; r += (this.rr1 - this.rr2) * 0.55 * vRain;
        }
        if (vFire) {
          this.br += wl * 0.02; this.br *= 0.997; const rum = this.br * 1.6;
          if (this.u() < 9 / sr) { this.ck = 0.25 + this.u() * 0.9; this.ckd = 0.993 + this.u() * 0.005; this.ckp = this.u(); }
          const crack = (wr - this.cprev) * this.ck; this.cprev = wr; this.ck *= this.ckd;
          l += (rum + crack * (1.2 - this.ckp)) * vFire; r += (rum + crack * (0.2 + this.ckp)) * vFire;
        }
        if (vWind) {
          this.wl += aw * (wl - this.wl); this.wr += aw * (wr - this.wr);
          l += this.wl * gw * vWind; r += this.wr * gw * vWind;
        }
        if (vWaves) {
          this.wph += 1 / (this.wper * sr); if (this.wph >= 1) { this.wph -= 1; this.wper = 6 + this.u() * 5; }
          const env = Math.pow(Math.sin(Math.PI * this.wph), 2) * (this.wph < 0.6 ? 1 : 1);
          const a = 0.01 + 0.25 * env; this.wv += a * (wl - this.wv); this.wvl += a * (wr - this.wvl);
          l += this.wv * (0.4 + 1.6 * env) * vWaves; r += this.wvl * (0.4 + 1.6 * env) * vWaves;
        }
        if (vTh && this.th > 0.0005) {
          this.thb += wl * 0.03; this.thb *= 0.996; const e = this.th * (0.7 + 0.3 * Math.sin(n * 0.0007 * this.thf));
          l += this.thb * 2 * e * vTh; r += this.thb * 2 * e * vTh; this.th *= 0.99998;
        }
        if (vPad) {
          let sl = 0, sr2 = 0; const ph = this.phL, pr = this.phR;
          for (let k = 0; k < 5; k++) {
            if (aA > 0.001) { ph[k] += cA[k] / sr; if (ph[k] > 1) ph[k] -= 1; pr[k] += (cA[k] + 0.35) / sr; if (pr[k] > 1) pr[k] -= 1; sl += tab[(ph[k] * 4096) | 0] * aA; sr2 += tab[(pr[k] * 4096) | 0] * aA; }
            if (aB > 0.001) { const j = k + 5; ph[j] += cB[k] / sr; if (ph[j] > 1) ph[j] -= 1; pr[j] += (cB[k] + 0.35) / sr; if (pr[j] > 1) pr[j] -= 1; sl += tab[(ph[j] * 4096) | 0] * aB; sr2 += tab[(pr[j] * 4096) | 0] * aB; }
          }
          this.pl += 0.08 * (sl - this.pl); this.pr += 0.08 * (sr2 - this.pr);
          l += this.pl * 0.09 * trem * vPad; r += this.pr * 0.09 * trem * vPad;
        }
        if (vMus) {
          const M = this.music, len = M.L.length, xf = Math.min(this.xf, len >> 2), per = len - xf;
          // Bucle sin corte: el final se funde con el principio
          const p = n % per; let ml = M.L[p], mr = M.R[p];
          if (n >= per && p < xf) { const a = p / xf, q2 = p + per; ml = ml * a + M.L[q2] * (1 - a); mr = mr * a + M.R[q2] * (1 - a); }
          l += ml * vMus; r += mr * vMus;
        }
        // Fundido de entrada y salida
        let g = 1; if (n < 3 * sr) g = n / (3 * sr); const rem = this.total - n; if (rem < 5 * sr) g *= Math.max(0, rem / (5 * sr));
        l *= g * this.S.sound.master; r *= g * this.S.sound.master;
        // Limitador suave
        outL[b0 + i] = l > 1.5 ? 1 : l < -1.5 ? -1 : l - l * l * l / 6.75;
        outR[b0 + i] = r > 1.5 ? 1 : r < -1.5 ? -1 : r - r * r * r / 6.75;
        this.n++;
      }
    }
    return [outL, outR];
  }
}
