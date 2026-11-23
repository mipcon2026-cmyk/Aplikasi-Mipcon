#!/usr/bin/env node
// Membuat logo (800x800) dan banner channel (2560x1440) ke output/branding/.
// Pakai: node src/branding.js "Hitung Dulu" "@hitungduluid"
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [name = 'Hitung Dulu', handle = '@hitungduluid'] = process.argv.slice(2);
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'output', 'branding');
fs.mkdirSync(OUT, { recursive: true });
const font = f => fs.readFileSync(path.join(ROOT, 'assets/fonts', f)).toString('base64');

const page = `<canvas id=c></canvas><script>
async function render(w, h, kind, name, handle, fonts) {
  for (const [wt, b64] of fonts) { const ff = new FontFace('Inter', Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer, { weight: wt }); await ff.load(); document.fonts.add(ff); }
  const c = document.getElementById('c'), x = c.getContext('2d'); c.width = w; c.height = h;
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b1220'); g.addColorStop(1, '#13203b');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const glow = x.createRadialGradient(w * .7, h * .3, 0, w * .7, h * .3, Math.max(w, h) * .6);
  glow.addColorStop(0, '#22c55e33'); glow.addColorStop(1, '#22c55e00'); x.fillStyle = glow; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(255,255,255,0.07)'; x.lineWidth = 2; const step = kind === 'logo' ? 80 : 120;
  for (let i = 0; i < w; i += step) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
  for (let i = 0; i < h; i += step) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  const t = (s, X, Y, size, col, wt = 900, al = 'center') => { x.font = wt + ' ' + size + 'px Inter'; x.fillStyle = col; x.textAlign = al; x.textBaseline = 'middle'; x.fillText(s, X, Y); };
  if (kind === 'logo') {
    t('Rp', w / 2, h * .42, 330, '#f8fafc');
    x.fillStyle = '#22c55e'; const bw = 360, bh = 46, r = 23;
    for (const dy of [0, 80]) { x.beginPath(); x.roundRect(w / 2 - bw / 2, h * .66 + dy, bw, bh, r); x.fill(); }
    return c.toDataURL('image/png');
  }
  // banner: konten penting di area aman tengah 1546x423
  const cy = h / 2;
  // grafik naik di kiri & kanan (hanya terlihat di TV/desktop lebar)
  x.strokeStyle = '#22c55e'; x.lineWidth = 10; x.lineJoin = 'round';
  x.beginPath(); [[40, 1180], [150, 1090], [260, 1120], [370, 980], [470, 900]].forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke();
  x.beginPath(); [[2090, 560], [2200, 500], [2300, 520], [2410, 380], [2520, 280]].forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke();
  x.font = '170px "Noto Color Emoji"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000';
  x.fillText('🧮', 280, cy - 60); x.fillText('📈', 2280, cy + 80);
  t(name, w / 2, cy - 75, 150, '#f8fafc');
  x.fillStyle = '#22c55e'; x.fillRect(w / 2 - 70, cy + 22, 140, 12);
  t('Atur uang pakai hitungan, bukan perasaan.', w / 2, cy + 100, 54, '#cbd5e1', 700);
  t('Video baru tiap Selasa & Sabtu  •  ' + handle, w / 2, cy + 180, 40, '#22c55e', 700);
  return c.toDataURL('image/png');
}</script>`;

(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.setContent(page);
  const fonts = [['700', font('inter-bold.otf')], ['900', font('inter-black.otf')]];
  for (const [kind, w, h] of [['logo', 800, 800], ['banner', 2560, 1440]]) {
    const url = await p.evaluate(a => render(...a), [w, h, kind, name, handle, fonts]);
    fs.writeFileSync(path.join(OUT, `${kind}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log(`✓ output/branding/${kind}.png`);
  }
  await b.close();
})();
