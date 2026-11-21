// Audio: baca rekaman, potong hening, musik latar, efek suara, dan mixing. Tanpa dependensi selain ffmpeg.
const { execFileSync } = require('child_process');
const fs = require('fs');

const SR = 48000;

// Baca file audio apa pun (m4a/mp3/wav/ogg/webm) jadi Float32 mono 48 kHz, sudah dibersihkan dari dengung & noise.
function decode(file) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR),
    '-af', 'highpass=f=80,lowpass=f=12000,afftdn=nf=-25', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}

// Energi per jendela 20 ms (dB).
function energy(x, win = SR / 50) {
  const out = [];
  for (let i = 0; i < x.length; i += win) {
    let s = 0; const e = Math.min(x.length, i + win);
    for (let j = i; j < e; j++) s += x[j] * x[j];
    out.push(10 * Math.log10(s / (e - i) + 1e-12));
  }
  return out;
}

// Bagian bersuara: [{a,b}] dalam sampel, dipisah hening >= minGap detik.
function voicedRegions(x, minGap) {
  const en = energy(x), win = SR / 50;
  const thr = Math.max(-50, Math.max(...en) - 32);
  const regs = [];
  let cur = null, quiet = 0;
  en.forEach((v, i) => {
    if (v > thr) { if (!cur) cur = { a: i }; cur.b = i + 1; quiet = 0; }
    else if (cur && ++quiet * 0.02 >= minGap) { regs.push(cur); cur = null; }
  });
  if (cur) regs.push(cur);
  return regs.filter(r => (r.b - r.a) * 0.02 >= 0.2)
    .map(r => ({ a: Math.max(0, r.a * win - SR * 0.08), b: Math.min(x.length, r.b * win + SR * 0.12) }));
}

function trim(x) {
  const r = voicedRegions(x, 99);
  return r.length ? x.slice(r[0].a, r[r.length - 1].b) : x;
}

// Satu rekaman panjang → N potongan, berdasarkan jeda hening di antara kalimat.
function split(x, n) {
  for (const gap of [1.2, 1.0, 1.4, 0.8, 1.7, 0.6, 2.0]) {
    const r = voicedRegions(x, gap);
    if (r.length === n) return r.map(({ a, b }) => x.slice(a, b));
  }
  const found = voicedRegions(x, 1.0).length;
  throw new Error(`Rekaman berisi ${found} kalimat, tapi naskah punya ${n} baris. ` +
    'Pastikan setiap baris dibaca sekali dengan jeda ±2 detik di antaranya, atau rekam per baris (001.m4a, 002.m4a, ...).');
}

function normalize(x, targetDb = -18) {
  let s = 0; for (const v of x) s += v * v;
  const rms = Math.sqrt(s / x.length) || 1e-9, g = Math.pow(10, targetDb / 20) / rms;
  return x.map(v => Math.tanh(v * g)); // tanh = limiter lembut
}

// ---------- musik latar ceria (dibuat dari kode, bebas hak cipta) ----------
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

function note(buf, t, midi, dur, vol, kind) {
  const f = hz(midi), a = Math.floor(t * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n && a + i < buf.length; i++) {
    const tt = i / SR, env = Math.min(1, tt / 0.008) * Math.exp(-tt * (kind === 'pad' ? 1.2 : 5));
    const ph = 2 * Math.PI * f * tt;
    const w = kind === 'bass' ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : Math.sin(ph) + 0.25 * Math.sin(2 * ph) + 0.1 * Math.sin(3 * ph);
    buf[a + i] += w * env * vol;
  }
}

function music(dur, seed = 7, style = 'ceria') {
  if (style === 'tenang') return calm(dur, seed);
  const buf = new Float32Array(Math.ceil(dur * SR)), r = rng(seed);
  const bpm = 104, beat = 60 / bpm;
  const chords = [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]]; // C G Am F
  const scale = [72, 74, 76, 79, 81, 84];
  for (let bar = 0; bar * 4 * beat < dur; bar++) {
    const t0 = bar * 4 * beat, ch = chords[bar % 4];
    for (const m of ch) note(buf, t0, m, 4 * beat, 0.035, 'pad');
    for (const b of [0, 2]) note(buf, t0 + b * beat, ch[0] - 24, beat * 1.5, 0.16, 'bass');
    if (bar % 8 >= 2) for (let h = 0; h < 8; h++) {
      if (r() < 0.55) note(buf, t0 + h * beat / 2, h % 2 ? scale[Math.floor(r() * scale.length)] : ch[Math.floor(r() * 3)] + 12, beat, 0.07, 'pluck');
    }
  }
  return buf;
}

// Musik latar tenang (lo-fi) untuk konten dewasa: akor 7 lembut, bass pelan, melodi jarang.
function calm(dur, seed) {
  const buf = new Float32Array(Math.ceil(dur * SR)), r = rng(seed);
  const beat = 60 / 78;
  const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]; // Am7 Fmaj7 Cmaj7 G7
  const scale = [69, 72, 74, 76, 79];
  for (let bar = 0; bar * 4 * beat < dur; bar++) {
    const t0 = bar * 4 * beat, ch = chords[bar % 4];
    for (const m of ch) note(buf, t0, m, 4 * beat, 0.03, 'pad');
    note(buf, t0, ch[0] - 12, beat * 3, 0.12, 'bass');
    note(buf, t0 + 2.5 * beat, ch[0] - 12, beat, 0.07, 'bass');
    for (let h = 0; h < 4; h++) if (r() < 0.3) note(buf, t0 + h * beat + (r() < 0.5 ? beat / 2 : 0), scale[Math.floor(r() * scale.length)], beat * 1.5, 0.04, 'pluck');
    for (let h = 0; h < 8; h++) { // hi-hat lembut
      const a = Math.floor((t0 + h * beat / 2) * SR);
      for (let i = 0; i < SR * 0.04 && a + i < buf.length; i++) buf[a + i] += (r() * 2 - 1) * Math.exp(-i / SR * 120) * (h % 2 ? 0.012 : 0.02);
    }
  }
  return buf;
}

// ---------- efek suara ----------
function sfx(buf, t, kind) {
  const a = Math.floor(t * SR);
  const add = (n, fn) => { for (let i = 0; i < n && a + i < buf.length; i++) if (a + i >= 0) buf[a + i] += fn(i / SR); };
  if (kind === 'pop') add(SR * 0.15, s => Math.sin(2 * Math.PI * (300 * s + 2200 * s * s)) * Math.exp(-s * 30) * 0.35);
  if (kind === 'ding') for (const f of [1318.5, 1975.5]) add(SR * 0.9, s => Math.sin(2 * Math.PI * f * s) * Math.exp(-s * 5) * 0.16);
  if (kind === 'whoosh') { let lp = 0; add(SR * 0.45, s => { lp += ((Math.random() * 2 - 1) - lp) * (0.02 + 0.25 * Math.sin(Math.PI * s / 0.45)); return lp * Math.sin(Math.PI * s / 0.45) * 0.25; }); }
  if (kind === 'tick') add(SR * 0.05, s => Math.sin(2 * Math.PI * 1100 * s) * Math.exp(-s * 80) * 0.3);
}

// Gabungkan suara + musik (musik otomatis mengecil saat ada suara).
function mixdown(total, clips, effects, seed, style) {
  const voice = new Float32Array(Math.ceil(total * SR));
  for (const c of clips) voice.set(c.pcm.subarray(0, Math.max(0, voice.length - Math.floor(c.start * SR))), Math.floor(c.start * SR));
  const mus = music(total, seed, style);
  for (const e of effects) sfx(mus, e.t, e.kind);
  const out = new Float32Array(voice.length);
  let env = 0;
  for (let i = 0; i < out.length; i++) {
    const v = Math.abs(voice[i]);
    env = v > env ? env + (v - env) * 0.01 : env * 0.99997;
    const duck = 1 - 0.6 * Math.min(1, env * 8);
    out[i] = voice[i] + mus[i] * 0.55 * duck;
  }
  const fadeOut = SR * 1.5; // musik memudar di akhir
  for (let i = 0; i < fadeOut && i < out.length; i++) out[out.length - 1 - i] *= i / fadeOut;
  return { pcm: out, voice };
}

// Bukaan paruh maskot per frame, mengikuti keras-pelannya suara.
function mouthTrack(voice, fps, totalFrames) {
  const per = SR / fps, m = new Array(totalFrames).fill(0);
  for (let f = 0; f < totalFrames; f++) {
    let s = 0; const a = Math.floor(f * per), b = Math.min(voice.length, Math.floor((f + 1) * per));
    for (let i = a; i < b; i++) s += voice[i] * voice[i];
    m[f] = Math.min(1, Math.sqrt(s / Math.max(1, b - a)) * 7);
  }
  return m;
}

function writeWav(file, x) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}

module.exports = { SR, decode, trim, split, normalize, mixdown, mouthTrack, writeWav };
