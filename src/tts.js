// Suara AI lewat Google Cloud Text-to-Speech. Hasil disimpan di cache supaya tidak membayar dua kali untuk teks yang sama.
// Key: dari network secret environment (header X-Goog-Api-Key disuntikkan proxy) atau variabel GOOGLE_TTS_API_KEY.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const DEFAULT = { nama: 'id-ID-Chirp3-HD-Umbriel', kecepatan: 1.0 };

async function synth(text, suara, file) {
  const voice = { ...DEFAULT, ...suara };
  const audioConfig = { audioEncoding: 'LINEAR16', sampleRateHertz: 48000 };
  if (voice.kecepatan !== 1) audioConfig.speakingRate = voice.kecepatan;
  const body = JSON.stringify({ input: { text }, voice: { languageCode: 'id-ID', name: voice.nama }, audioConfig });
  for (let attempt = 1; ; attempt++) {
    // curl dipakai (bukan fetch) karena mengikuti proxy sesi yang menyisipkan key.
    const out = execFileSync('curl', ['-s', '-w', '\n%{http_code}', '-X', 'POST', URL, '-H', 'Content-Type: application/json',
      '-H', `X-Goog-Api-Key: ${process.env.GOOGLE_TTS_API_KEY || 'disuntik-proxy'}`, '--data-binary', '@-'], { input: body, maxBuffer: 1 << 28 }).toString();
    const cut = out.lastIndexOf('\n'), status = +out.slice(cut + 1), txt = out.slice(0, cut);
    if (status === 200) { fs.writeFileSync(file, Buffer.from(JSON.parse(txt).audioContent, 'base64')); return; }
    if (attempt >= 4 || status < 500 && status !== 429) throw new Error(`Google TTS ${status}: ${txt.slice(0, 300)}`);
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
