#!/usr/bin/env node
// Pakai: node src/build.js episodes/ep001-warna.json [--draft] [--ai] [--hanya=naskah|video|shorts|thumbnail]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const A = require('./audio');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const epFile = args.find(a => !a.startsWith('--'));
if (!epFile) { console.log('Pakai: node src/build.js episodes/<file>.json [--draft] [--hanya=naskah|video|shorts|thumbnail]'); process.exit(1); }
const DRAFT = args.includes('--draft');
const AI = args.includes('--ai'); // pakai suara AI Google jika tidak ada rekaman manusia
const ONLY = (args.find(a => a.startsWith('--hanya=')) || '').split('=')[1];
const ep = JSON.parse(fs.readFileSync(epFile, 'utf8'));
const OUT = path.join(ROOT, 'output', ep.id);
const THEMES = {
  anak: { stage: 'stage-anak.html', fonts: [['Fredoka', 'fredoka-600.woff2', 600]], musik: 'ceria', lead: 0.7, gap: 0.7, tail: 1.1,
    gaya: 'Bacalah dengan ceria, pelan, dan jelas (seperti bicara ke anak umur 5 tahun).' },
  keuangan: { stage: 'stage-keuangan.html', fonts: [['Inter', 'inter-bold.otf', 700], ['Inter', 'inter-black.otf', 900]], musik: 'tenang', lead: 0.5, gap: 0.45, tail: 0.9,
    gaya: 'Bacalah dengan santai, yakin, dan jelas — seperti menjelaskan ke teman sambil ngopi. Tempo sedang, jangan terburu-buru.' },
};
const TH = THEMES[ep.tema || 'anak'];
fs.mkdirSync(OUT, { recursive: true });
const FPS = DRAFT ? 24 : 30;
const AUDIO_EXT = ['m4a', 'mp3', 'wav', 'ogg', 'aac', 'webm', 'opus', 'flac', '3gp', 'amr'];
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------- 1. Naskah rekaman ----------
const lines = [];
ep.adegan.forEach((sc, si) => sc.baris.forEach((b, bi) => {
  const text = typeof b === 'string' ? b : b.teks;
  lines.push({ no: lines.length + 1, si, bi, text, hint: typeof b === 'string' ? '' : (b.catatan || ''), muncul: b.muncul });
}));
const pad = n => String(n).padStart(3, '0');
fs.mkdirSync(path.join(ROOT, 'naskah'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'naskah', `${ep.id}.txt`), [
  `NASKAH REKAMAN — ${ep.judul}`,
  `Total ${lines.length} baris. ${TH.gaya}`,
  '',
  'CARA 1 (paling mudah): rekam semuanya dalam SATU file, beri jeda ±2 detik di antara setiap baris.',
  `   Simpan sebagai: rekaman/${ep.id}.m4a`,
  'CARA 2: rekam per baris, simpan dengan nomor barisnya.',
  `   Contoh: rekaman/${ep.id}/001.m4a, rekaman/${ep.id}/002.m4a, ...`,
  '',
  ...lines.map(l => `[${pad(l.no)}] ${l.text}${l.hint ? `\n       (${l.hint})` : ''}`),
  '',
].join('\n'));
console.log(`✓ Naskah: naskah/${ep.id}.txt (${lines.length} baris)`);
if (ONLY === 'naskah') process.exit(0);

// ---------- 2. Rekaman suara ----------
async function loadVoice() {
  const dir = path.join(ROOT, 'rekaman', ep.id);
  const single = AUDIO_EXT.map(e => path.join(ROOT, 'rekaman', `${ep.id}.${e}`)).find(fs.existsSync);
  if (single) {
    console.log(`… Memotong rekaman ${path.basename(single)} menjadi ${lines.length} baris`);
    A.split(A.decode(single), lines.length).forEach((pcm, i) => { lines[i].pcm = A.normalize(pcm); });
    return 'satu file';
  }
  let n = 0;
  for (const l of lines) {
    const f = AUDIO_EXT.map(e => path.join(dir, `${pad(l.no)}.${e}`)).find(fs.existsSync);
    if (f) { l.pcm = A.normalize(A.trim(A.decode(f))); n++; }
  }
  if (n && n < lines.length) console.log(`! Hanya ${n}/${lines.length} baris yang ada rekamannya; sisanya diam.`);
  if (n) return `${n} file`;
  if (!AI) return null;
  const files = await require('./tts').voiceLines(lines, ep.suara, path.join(OUT, 'tts'));
  files.forEach((f, i) => { lines[i].pcm = A.normalize(A.trim(A.decode(f))); });
  return `AI (${(ep.suara && ep.suara.nama) || require('./tts').DEFAULT.nama})`;
}

// ---------- 3. Linimasa ----------
function timeline(sceneIdx) {
  const scenes = [], clips = [], effects = [];
  let t = 0;
  for (const si of sceneIdx) {
    const src = ep.adegan[si], sc = { ...src, warna: src.warna || ep.warna, start: t, lines: [] };
    t += TH.lead;
    lines.filter(l => l.si === si).forEach((l, k) => {
      if (k > 0) t += src.type === 'kuis' && k === 1 ? 3.6 : src.type === 'hitung' ? 0.35 : TH.gap; // jeda; kuis = hitung mundur
      sc.lines.push({ start: t, end: t + l.dur, text: l.text, muncul: l.muncul });
      if (l.pcm) clips.push({ start: t, pcm: l.pcm });
      t += l.dur;
    });
    t += src.type === 'kuis' || src.type === 'hitung' ? 1.6 : (src.jeda_akhir ?? TH.tail);
    sc.end = t;
    // efek suara pada momen penting
    if (TH.musik === 'tenang') {
      effects.push({ t: sc.start + 0.05, kind: 'whoosh' });
      sc.lines.forEach(l => l.muncul && effects.push({ t: l.start, kind: 'tick' }));
    } else effects.push({ t: sc.start + 0.2, kind: 'pop' });
    if (src.type === 'kata' && sc.lines[1]) effects.push({ t: sc.lines[1].start, kind: 'ding' });
    if (src.type === 'kuis' && sc.lines[1]) {
      for (let i = 1; i <= 3; i++) effects.push({ t: sc.lines[1].start - i, kind: 'tick' });
      effects.push({ t: sc.lines[1].start, kind: 'ding' });
    }
    if (src.type === 'hitung') sc.lines.slice(1, src.jumlah + 1).forEach(l => effects.push({ t: l.start, kind: 'pop' }));
    if (src.type === 'hitung' && sc.lines[src.jumlah + 1]) effects.push({ t: sc.lines[src.jumlah + 1].start, kind: 'ding' });
    scenes.push(sc);
  }
  return { scenes, clips, effects, total: t, thumbnail: [].concat(ep.thumbnail)[0] };
}

// ---------- 4. Render ----------
let browser;
async function render(tl, w, h, outFile, label) {
  const frames = Math.ceil(tl.total * FPS);
  const { pcm, voice: v } = A.mixdown(tl.total, tl.clips, tl.effects, ep.musik_seed || 7, TH.musik);
  const wav = outFile.replace(/\.mp4$/, '.tmp.wav');
  A.writeWav(wav, pcm);
  const mouth = v.some(x => x !== 0) ? A.mouthTrack(v, FPS, frames)
    : Array.from({ length: frames }, (_, f) => { const t = f / FPS; const on = tl.scenes.some(s => s.lines.some(l => t >= l.start && t < l.end)); return on ? (Math.sin(t * 22) + 1) / 2 : 0; });

  const page = await stage(w, h, tl, mouth);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', wav,
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000',
    '-c:v', 'libx264', '-preset', DRAFT ? 'veryfast' : 'medium', '-crf', DRAFT ? '28' : '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg gagal')) : res()));
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const url = await page.evaluate(t => window.frame(t), f / FPS);
    if (!ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (FPS * 10) === 0) process.stdout.write(`\r… ${label}: ${Math.round(f / frames * 100)}%  `);
  }
  ff.stdin.end(); await done; await page.close(); fs.unlinkSync(wav);
  console.log(`\r✓ ${label}: ${path.relative(ROOT, outFile)} (${fmt(tl.total)}, dirender ${Math.round((Date.now() - t0) / 1000)} dtk)`);
}

async function stage(w, h, tl, mouth) {
  browser ||= await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('file://' + path.join(__dirname, TH.stage));
  const fonts = TH.fonts.map(([family, file, weight]) => ({ family, weight: String(weight), b64: fs.readFileSync(path.join(ROOT, 'assets/fonts', file)).toString('base64') }));
  await page.evaluate(cfg => window.setup(cfg), { width: w, height: h, timeline: { ...tl, clips: undefined }, mouth, fps: FPS, draft: DRAFT, fonts, info: { channel: ep.channel || '', total: tl.total } });
  return page;
}

// ---------- 5. Metadata YouTube ----------
// Tanggal tayang berikutnya (Selasa/Sabtu 19:00 WIB), bisa dipaksa dengan --tayang=YYYY-MM-DD.
function airDate() {
  const arg = (args.find(a => a.startsWith('--tayang=')) || '').split('=')[1];
  if (arg) return new Date(arg + 'T00:00:00Z');
  const now = new Date(Date.now() + 7 * 3600e3); // jam WIB dibaca dengan getter UTC
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if ([2, 6].includes(d.getUTCDay()) && now.getUTCHours() < 17) return d;
  do d.setUTCDate(d.getUTCDate() + 1); while (![2, 6].includes(d.getUTCDay()));
  return d;
}

// Kartu upload: semua isian YouTube Studio (tampilan bahasa Inggris) sesuai urutan pengisian.
function metadata(tl) {
  const chapters = tl.scenes.filter(s => s.bab).map(s => `${fmt(s.start)} ${s.bab}`);
  if (chapters.length && !chapters[0].startsWith('0:00')) chapters.unshift('0:00 Pembuka');
  const m = ep.youtube, anak = TH.musik === 'ceria';
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = (d, plus, jam) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + plus);
    return `${BLN[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}  ·  ${jam}  (${HARI[x.getUTCDay()]})`; };
  const air = airDate(), sab = air.getUTCDay() === 6;
  const shortSlots = sab ? [[1, '10:00 AM'], [2, '7:00 PM'], [3, '12:00 PM']] : [[1, '12:00 PM'], [2, '7:00 PM'], [3, '12:00 PM']];
  const desc = [m.deskripsi, '', ...(chapters.length ? ['Bab:', ...chapters, ''] : []), (m.hashtag || []).join(' ')].join('\n');
  const line = '='.repeat(64), sub = '-'.repeat(64);
  const out = [
    `KARTU UPLOAD ${ep.id.toUpperCase()}  ·  ${ep.channel || ''}`, line,
    'Buka studio.youtube.com (pastikan channel yang benar) → Create → Upload videos.', '',
    `1) VIDEO PANJANG: pilih file ${ep.id}.mp4`, sub,
    '[Title]', m.judul, '',
    '[Description]  (klik kotak → Ctrl+A → Delete → tempel semua teks di bawah)', desc, '',
    `[Thumbnail]  Upload file → thumbnail.png${[].concat(ep.thumbnail).length > 1 ? '   (jika ada "Test & compare", tambahkan thumbnail-2.png)' : ''}`,
    ...(m.playlist ? [`[Playlists]  Select → centang "${m.playlist}" (jika belum ada: Create playlist, Public) → Done`] : []),
    `[Audience]  ${anak ? '"Yes, it\'s made for kids"' : '"No, it\'s not made for kids"'}`,
    '[Show more]', '  Paid promotion: No   ·   Altered content (jika ada): No',
    '  Tags:', '  ' + (m.tag || []).join(', '),
    '→ Next', '',
    '[Video elements]  End screen → Add → template "1 video, 1 subscribe" → video: "Best for viewer" → Save → Next',
    '[Checks]  tunggu "No issues found" → Next',
    `[Visibility]  Schedule → ${day(air, 0, '7:00 PM')}  ·  zona GMT+07:00 → Schedule`, '',
    ...(ep.shorts || []).flatMap((sh, i) => [
      `${i + 2}) SHORTS ${i + 1}: pilih file ${ep.id}-shorts-${i + 1}.mp4`, sub,
      '[Title]', sh.judul || m.judul + ' #shorts',
      '[Description]  biarkan isi bawaan',
      `[Audience]  ${anak ? '"Yes, it\'s made for kids"' : '"No, it\'s not made for kids"'}`,
      '[Related video]  pilih video panjang episode ini (jika belum bisa dipilih, isi nanti setelah video panjang tayang)',
      `[Visibility]  Schedule → ${day(air, shortSlots[i] ? shortSlots[i][0] : i + 1, shortSlots[i] ? shortSlots[i][1] : '12:00 PM')}`, '']),
    ...(anak || !(ep.shorts || []).length ? [] : [
      'TIKTOK + FACEBOOK/INSTAGRAM REELS  (file Shorts yang sama, tayang 1 hari setelah YouTube)', sub,
      'TikTok: tiktok.com/upload → pilih file → tempel caption → Settings: nyalakan "AI-generated content" → Schedule',
      'FB + IG: business.facebook.com → Create reel → pilih Facebook & Instagram → tempel caption → AI info: nyalakan jika ditanya → Schedule',
      '',
      ...ep.shorts.flatMap((sh, i) => {
        const t = (sh.judul || m.judul).replace(/\s*#shorts\s*$/i, '');
        const uniq = base => [...new Set([...base, ...(m.hashtag || []).slice(0, 2)])].join(' ');
        const slot = shortSlots[i] || [i + 1, '12:00 PM'];
        return [
          `Shorts ${i + 1}  (${ep.id}-shorts-${i + 1}.mp4)  →  ${day(air, slot[0] + 1, slot[1])}`,
          '[Caption TikTok]', `${t} 🤔 Simak sampai habis! Video lengkapnya ada di YouTube Hitung Dulu. ${uniq(['#fyp', '#keuangan', '#tipskeuangan', '#gajian', '#hitungdulu'])}`,
          '[Caption Facebook/Instagram]', `${t} 👇\nVideo lengkap: YouTube @hitungduluid\n\n${uniq(['#keuangan', '#literasikeuangan', '#financialplanning', '#reels', '#hitungdulu'])}`,
          ''];
      })]),
    `SETELAH VIDEO PANJANG TAYANG (${day(air, 0, '7:00 PM')})`, sub,
    ...(m.komentar_sematan ? ['[Komentar sematan]  tulis di video → titik tiga (⋮) → Pin', m.komentar_sematan, ''] : []),
    '[Teks untuk dibagikan ke WhatsApp/Facebook]', `${m.judul} 👇`, '(tempel link video di sini)', '',
    ...(m.judul_alternatif ? ['[Judul cadangan]  ganti judul jika setelah 7 hari views sepi:', ...m.judul_alternatif.map(j => '- ' + j), ''] : []),
    ...(anak ? [] : ['Cek cepat sebelum upload: tonton sekilas, pastikan angka di layar masuk akal.']),
  ];
  fs.writeFileSync(path.join(OUT, 'kartu-upload.txt'), out.join('\n') + '\n');
}

(async () => {
  try {
    const voice = await loadVoice();
    console.log(voice ? `✓ Suara: ${voice}` : '! Belum ada rekaman suara — video dibuat dengan musik saja (tambahkan --ai untuk suara AI).');
    for (const l of lines) l.dur = l.pcm ? l.pcm.length / A.SR : Math.max(1.2, l.text.split(/\s+/).length * 0.42 + 0.4);
    const all = ep.adegan.map((_, i) => i).filter(i => !ep.adegan[i].hanya_shorts);
    const tl = timeline(all);
    const [W, H] = DRAFT ? [960, 540] : [1920, 1080];
    if (!ONLY || ONLY === 'video') { await render(tl, W, H, path.join(OUT, `${ep.id}${DRAFT ? '-draft' : ''}.mp4`), 'Video panjang'); metadata(tl); }
    if ((!ONLY || ONLY === 'shorts') && ep.shorts) for (const [i, sh] of ep.shorts.entries()) {
      const stl = timeline(sh.adegan);
      if (stl.total > 180) console.log(`! Shorts ${i + 1} berdurasi ${fmt(stl.total)}; batas Shorts 3 menit, kurangi adegannya.`);
      await render(stl, H, W, path.join(OUT, `${ep.id}-shorts-${i + 1}${DRAFT ? '-draft' : ''}.mp4`), `Shorts ${i + 1}`);
    }
    if (!ONLY || ONLY === 'thumbnail') {
      for (const [i, th] of [].concat(ep.thumbnail).entries()) { // beberapa varian untuk uji A/B
        const page = await stage(1280, 720, { ...tl, thumbnail: th }, [0]);
        const url = await page.evaluate(() => window.frame(1, 'thumb'));
        const name = i ? `thumbnail-${i + 1}.png` : 'thumbnail.png';
        fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
        await page.close();
        console.log(`✓ Thumbnail: output/${ep.id}/${name}`);
      }
    }
  } catch (e) { console.error('✗', e.message); process.exitCode = 1; }
  finally { if (browser) await browser.close(); }
})();
