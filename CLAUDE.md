# CLAUDE.md: Pabrik Video YouTube

Sistem pembuat video YouTube otomatis. Channel utama: **edukasi keuangan & bisnis** (bahasa Indonesia), suara diisi pemilik channel.
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
Rekaman pemilik ada di `rekaman/<id>.m4a` (satu file, jeda ±2 dtk antar baris) atau `rekaman/<id>/001.m4a, 002.m4a, …`.
Jalankan `node src/build.js episodes/<file>.json` (tanpa `--draft`). Jika muncul error jumlah kalimat tidak cocok,
laporkan angkanya ke pemilik. Kirim `output/<id>/<id>.mp4`, Shorts, `thumbnail.png`, `metadata-youtube.txt` ke pemilik.
Video tidak di-commit (terlalu besar).

Kompilasi: `node src/compile.js <nama> k001 k002 …`

## Aturan konten keuangan
- Bahasa santai, jelas, untuk pekerja/UMKM Indonesia. Sapaan "kamu". Contoh angka konkret & dekat dengan kehidupan sehari-hari.
- Target **900–1.100 kata** di semua `baris` (≈8–9 menit setelah direkam), 15–22 adegan, dibagi 4–6 bab.
- Di `baris` (dibacakan): angka **ditulis dengan kata** ("dua setengah juta rupiah"). Di visual: angka (`2500000`, "Rp2,5 jt").
- Semua perhitungan harus benar. Hitung dengan Python jika perlu (bunga majemuk, cicilan, dll.).
- Imbal hasil/inflasi = **asumsi ilustrasi**, beri `catatan_kecil` "Ilustrasi, bukan jaminan…".
- Jangan merekomendasikan produk/merek/aplikasi tertentu. Sebut "terdaftar dan diawasi OJK".
- Adegan `penutup` terakhir wajib punya `catatan_kecil` disclaimer edukasi. Deskripsi YouTube wajib memuat disclaimer.
- Buka dengan `hook` yang menyentuh masalah penonton dalam 10 detik pertama.

## Skema episode (tema keuangan)
```json
{
  "id": "k002", "tema": "keuangan", "channel": "Hitung Cuan", "judul": "…", "musik_seed": 12,
  "adegan": [ { "type": "…", "bab": "Nama bab (opsional, membuat chapter YouTube)", "warna": "green", "baris": [ … ] } ],
  "shorts": [ { "adegan": [0, 3, 4] } ],
  "thumbnail": { "baris": ["TEKS 1", { "teks": "TEKS 2", "warna": "gold" }], "sorot": "LABEL", "emojis": ["💳"], "warna": "red" },
  "youtube": { "judul": "…", "deskripsi": "…", "hashtag": ["#…"], "tag": ["…"] }
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
| `angka` | `label`, `nilai` (angka → animasi hitung naik, atau string), `format`, `catatan` (tampil di baris ber-`muncul: 2`, atau baris ke-2) |
| `rumus` | `judul`, `items: [{teks, hasil, warna?}]` (maks 4) |
| `banding` | `judul`, `kiri/kanan: {judul, ikon, warna}`, `items: [{kiri, kanan}]` (maks 4, teks pendek) |
| `penutup` | `judul`, `items`: string checklist (maks 5) |

Shorts: 1–3 potongan dari adegan yang berdiri sendiri (mis. hook + grafik), masing-masing ≤ 60–90 detik.
