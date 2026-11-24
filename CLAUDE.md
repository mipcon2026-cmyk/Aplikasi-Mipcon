# CLAUDE.md: Pabrik Video YouTube

Sistem pembuat video YouTube otomatis. Channel utama: **edukasi keuangan & bisnis** (bahasa Indonesia), narasi **suara AI Google TTS** (`id-ID-Chirp3-HD-Umbriel`).
Satu file `episodes/<id>-<slug>.json` → video panjang 1080p, Shorts vertikal, thumbnail, naskah rekaman, metadata YouTube.

- Cabang kerja: `claude/youtube-monetisasi-konten-anak-b8orje` (commit & push ke sini).
- Rencana 1 tahun: `RENCANA-EPISODE.md` (episode berikutnya = baris pertama berstatus `belum`).
- Contoh lengkap: `episodes/k001-gaji-5-juta.json` (baca hanya jika skema di bawah kurang jelas).
- Tema anak (`ep001`, maskot Ciko) masih ada tapi bukan prioritas.

## Hemat token (penting, pemilik juga memakai kuota yang sama untuk pekerjaan lain)
- **Jangan** membaca `src/*.html`, `src/*.js` kecuali diminta mengubah tampilan/sistem.
- **Jangan** mengekstrak/melihat frame video atau gambar untuk dicek, kecuali diminta. Cukup pastikan perintah render tidak error.
- Jangan menjelajah repo; semua yang dibutuhkan untuk membuat episode ada di file ini.

## Tugas A: "Buat episode berikutnya"
1. Ambil baris pertama berstatus `belum` di `RENCANA-EPISODE.md` (ID, judul kerja, poin inti).
2. Topik bertanda VERIFIKASI (pajak, BPJS, KUR, SBN, regulasi): cari dulu di web, utamakan sumber resmi
   (pajak.go.id, ojk.go.id, bi.go.id, kemenkeu.go.id, bpjs). Jika tidak yakin, jangan sebut angka pasti.
3. Tulis `episodes/<id>-<slug>.json` mengikuti skema di bawah.
4. Validasi: `node src/build.js episodes/<file>.json --draft --hanya=video` harus selesai tanpa `✗`.
   (Ini juga menulis `naskah/<id>.txt`. Folder `output/` tidak di-commit.)
5. Ubah status di `RENCANA-EPISODE.md` menjadi `naskah siap`.
6. Commit (`episodes/…json`, `naskah/<id>.txt`, `RENCANA-EPISODE.md`) lalu push.
7. Laporkan singkat: judul final, durasi perkiraan, jumlah baris naskah.

## Tugas B: "Render final <id>"
Jalankan `node src/build.js episodes/<file>.json --ai` (tanpa `--draft`). Suara AI dibuat lewat Google TTS; key disuntikkan
proxy environment "Aplikasi-Mipcon" (header X-Goog-Api-Key ke texttospeech.googleapis.com). Rekaman manusia di
`rekaman/<id>.m4a` atau `rekaman/<id>/001.m4a…` otomatis diutamakan jika ada.
Lalu kirim ke pemilik (SendUserFile, display attach): `output/<id>/<id>.mp4`, semua `<id>-shorts-*.mp4`,
`thumbnail*.png`, `kartu-upload.txt` (isian YouTube Studio + jadwal tayang, otomatis). Video tidak di-commit (terlalu besar). Ubah status rencana menjadi `video siap`.

Kompilasi: `node src/compile.js <nama> k001 k002 …`

## Aturan konten keuangan
- **Gaya bahasa santai/ngobrol** khas anak muda Indonesia di `baris` (dibacakan): "udah", "nggak", "aja", "gimana",
  "kayak", "banget", "ngatur", "yuk". Tetap sopan, tanpa kata kasar, tanpa singkatan tulisan (bukan "gk", "yg").
  Teks di layar (judul, items, catatan) boleh lebih rapi/baku. Sapaan "kamu". Untuk pekerja/UMKM Indonesia. Contoh angka konkret & dekat dengan kehidupan sehari-hari.
- Target **1.200–1.400 kata** di semua `baris` (suara AI membaca ±175 kata/menit → ≈8,5–10 menit; wajib ≥ 8 menit agar bisa iklan tengah), 15–22 adegan, dibagi 4–6 bab.
- Di `baris` (dibacakan): angka **ditulis dengan kata** ("dua setengah juta rupiah"). Di visual: angka (`2500000`, "Rp2,5 jt").
- Semua perhitungan harus benar. Hitung dengan Python jika perlu (bunga majemuk, cicilan, dll.).
- Imbal hasil/inflasi = **asumsi ilustrasi**, beri `catatan_kecil` "Ilustrasi, bukan jaminan…".
- Jangan merekomendasikan produk/merek/aplikasi tertentu. Sebut "terdaftar dan diawasi OJK".
- Adegan `penutup` terakhir wajib punya `catatan_kecil` disclaimer edukasi. Deskripsi YouTube wajib memuat disclaimer.
- Buka dengan `hook` yang menyentuh masalah penonton dalam 10 detik pertama.

## Aturan pertumbuhan channel (wajib di setiap episode)
1. **30 detik pertama** (≤ 70 kata): adegan 0 = `hook` berisi masalah spesifik penonton + angka. Adegan 1 = janji
   manfaat/daftar isi, plus satu "rasa penasaran" yang baru terjawab di akhir ("di akhir ada satu kesalahan yang…").
   Tanpa salam pembuka/perkenalan channel. Jangan minta like/subscribe di awal.
2. **Retensi**: visual berganti paling lama tiap ±20 detik (adegan baru atau item baru muncul). Tiap 2–3 menit sisipkan
   `hook`/`angka` yang mengejutkan sebagai penyegar.
3. **Judul** `youtube.judul`: ≤ 60 karakter, kata kunci yang dicari orang di depan, ada angka/situasi spesifik, wajib
   sesuai isi (tanpa clickbait palsu). Tambah `judul_alternatif`: 2 judul dengan sudut berbeda (penasaran vs manfaat).
4. **Thumbnail**: `thumbnail` berupa array **2 varian** untuk uji A/B. Maks 2 baris × 4 kata, jangan mengulang judul
   persis, 1 emoji besar, warna kontras (`red`/`gold` = masalah, `green` = solusi).
5. **Shorts**: 3 per episode, masing-masing 30–60 detik, tiap entri `shorts` punya `"judul"` (≤ 60 karakter, diakhiri `#shorts`). Setiap Shorts diawali adegan `hook` khusus dengan
   `"hanya_shorts": true` (1 kalimat tanya ≤ 12 kata, tidak tampil di video panjang), lalu 1–2 adegan isi.
6. **Akhir video**: adegan `penutup` diberi `"jeda_akhir": 18` (ruang layar akhir/end screen). Baris terakhir mengajak
   menonton video berikutnya + subscribe, singkat.
   Kalimat penutup khas channel (wajib, paling akhir): **"Ingat, apa pun keputusan keuanganmu, hitung dulu."**
7. `youtube.komentar_sematan`: 1 pertanyaan yang memancing penonton menjawab di komentar.
   `youtube.playlist`: nama playlist sesuai pilar (mis. "Atur Gaji & Budget", "Utang & Cicilan", "Bisnis & UMKM").
   150 karakter pertama `deskripsi` memuat kata kunci utama + manfaat.

## Skema episode (tema keuangan)
```json
{
  "id": "k002", "tema": "keuangan", "channel": "Hitung Dulu", "judul": "…", "musik_seed": 12,
  "adegan": [ { "type": "…", "bab": "Nama bab (opsional, membuat chapter YouTube)", "warna": "green", "baris": [ … ] } ],
  "shorts": [ { "adegan": [0, 3, 4] } ],
  "thumbnail": [ { "baris": ["TEKS 1", { "teks": "TEKS 2", "warna": "gold" }], "sorot": "LABEL", "emojis": ["💳"], "warna": "red" }, { …varian 2… } ],
  "youtube": { "judul": "…", "judul_alternatif": ["…", "…"], "deskripsi": "…", "hashtag": ["#…"], "tag": ["…"],
               "komentar_sematan": "…?", "playlist": "…" }
}
```
- `baris`: string, atau `{ "teks": "...", "muncul": n, "catatan": "petunjuk baca" }`.
  `muncul: n` = saat baris ini dibaca, item ke-1..n tampil. Tanpa `muncul` di adegan itu, item ke-k tampil di baris ke-k.
- `warna`: `green` `gold` `blue` `red` `purple` atau hex `#rrggbb`. `catatan_kecil`: teks kecil di bawah layar.
- `format` angka: `rp` (Rp1.200.000), `jt` (Rp155,3 jt), `persen`, atau kosong.
- `musik_seed`: angka bebas, beda tiap episode agar musik bervariasi. `channel` tetap sama di semua episode.

| type | field khusus |
|---|---|
| `hook` | `items`: string atau `{teks, warna}` (2–3 baris pendek); `ikon` emoji |
| `judul` | `nomor` ("BAGIAN 1"), `judul_besar`, `ikon`; 1 baris |
| `poin` | `judul`, `items: [{ikon, teks, nilai?, warna?}]` (maks 5), `format`, `total?: {teks, nilai}` (= item ke n+1 untuk `muncul`) |
| `donut` | `judul`, `tengah`, `items: [{label, nilai, warna, sub?}]` (2–4) |
| `batang` | `judul`, `items: [{label, nilai, warna}]` (2–6), `format`, `maks?` |
| `garis` | `judul`, `x: [label…]`, `items: [{label, warna, data: [angka…]}]` (1–2 seri), `format`, `maks?` (angka bulat agar garis bantu rapi) |
| `angka` | `label`, `nilai` (angka → animasi hitung naik; atau teks seperti "± 8 bulan" → tampil apa adanya), `format`, `catatan` (tampil di baris ber-`muncul: 2`, atau baris ke-2) |
| `rumus` | `judul`, `items: [{teks, hasil, warna?}]` (maks 4) |
| `banding` | `judul`, `kiri/kanan: {judul, ikon, warna}`, `items: [{kiri, kanan}]` (maks 4, teks pendek) |
| `penutup` | `judul`, `items`: string checklist (maks 5) |

Adegan dengan `"hanya_shorts": true` tetap masuk naskah rekaman, tapi hanya dipakai di Shorts. Letakkan di akhir array `adegan`.
