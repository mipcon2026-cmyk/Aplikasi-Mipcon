// Suara AI lewat Google Cloud Text-to-Speech. Hasil disimpan di cache supaya tidak membayar dua kali untuk teks yang sama.
// Key: dari network secret environment (header X-Goog-Api-Key disuntikkan proxy) atau variabel GOOGLE_TTS_API_KEY.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const DEFAULT = { nama: 'id-ID-Chirp3-HD-Charon', kecepatan: 1.0 };

async function synth(text, suara, file) {
  const voice = { ...DEFAULT, ...suara };
  const audioConfig = { audioEncoding: 'LINEAR16', sampleRateHertz: 48000 };
  if (voice.kecepatan !== 1) audioConfig.speakingRate = voice.kecepatan;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_TTS_API_KEY || 'disuntik-proxy' },
      body: JSON.stringify({ input: { text }, voice: { languageCode: 'id-ID', name: voice.nama }, audioConfig }),
    });
    if (res.ok) { fs.writeFileSync(file, Buffer.from((await res.json()).audioContent, 'base64')); return; }
    const msg = (await res.text()).slice(0, 300);
    if (attempt >= 4 || res.status < 500 && res.status !== 429) throw new Error(`Google TTS ${res.status}: ${msg}`);
    await new Promise(r => setTimeout(r, 2000 * attempt));
  }
}

// Kembalikan path file WAV untuk tiap baris (dibuat jika belum ada di cache).
async function voiceLines(lines, suara, cacheDir) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const files = [];
  let made = 0;
  for (const l of lines) {
    const key = crypto.createHash('sha1').update(JSON.stringify([l.text, suara || DEFAULT])).digest('hex').slice(0, 12);
    const f = path.join(cacheDir, `${String(l.no).padStart(3, '0')}-${key}.wav`);
    if (!fs.existsSync(f)) { await synth(l.text, suara, f); made++; process.stdout.write(`\r… Suara AI: ${made} baris  `); }
    files.push(f);
  }
  if (made) console.log();
  return files;
}

module.exports = { voiceLines, synth, DEFAULT };
