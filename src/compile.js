#!/usr/bin/env node
// Gabungkan beberapa video panjang jadi satu kompilasi (lebih banyak jam tayang & slot iklan).
// Pakai: node src/compile.js kompilasi-01 ep001 ep002 ep003
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [name, ...ids] = process.argv.slice(2);
if (!name || ids.length < 2) { console.log('Pakai: node src/compile.js <nama> ep001 ep002 [ep003 ...]'); process.exit(1); }
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'output', name);
fs.mkdirSync(OUT, { recursive: true });

const files = ids.map(id => path.join(ROOT, 'output', id, `${id}.mp4`));
const missing = files.filter(f => !fs.existsSync(f));
if (missing.length) { console.error('✗ Belum dirender:', missing.map(f => path.relative(ROOT, f)).join(', ')); process.exit(1); }

const list = path.join(OUT, 'daftar.txt');
fs.writeFileSync(list, files.map(f => `file '${f}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(OUT, `${name}.mp4`)]);
fs.unlinkSync(list);

// Bab (chapters) untuk deskripsi YouTube
let t = 0;
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const bab = ids.map((id, i) => {
  const ep = fs.readdirSync(path.join(ROOT, 'episodes')).find(f => f.startsWith(id));
  const judul = ep ? JSON.parse(fs.readFileSync(path.join(ROOT, 'episodes', ep), 'utf8')).judul : id;
  const line = `${fmt(t)} ${judul}`;
  t += parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', files[i]]).toString());
  return line;
});
fs.writeFileSync(path.join(OUT, 'bab-youtube.txt'), bab.join('\n') + '\n');
console.log(`✓ output/${name}/${name}.mp4 (${fmt(t)})\n${bab.join('\n')}`);
