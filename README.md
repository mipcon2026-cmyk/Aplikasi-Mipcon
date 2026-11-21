# Pabrik Video YouTube Otomatis

Dua tema tersedia (pilih lewat field `"tema"` di file episode):

- **`keuangan`**: motion graphics edukasi keuangan & bisnis (grafik, angka, perhitungan). Contoh: `episodes/k001-gaji-5-juta.json`
- **`anak`** (bawaan): video edukasi anak dengan maskot **Ciko si anak ayam**. Contoh: `episodes/ep001-warna.json`

Satu file episode (`episodes/*.json`) menghasilkan:

- **Video panjang** 1920×1080 (untuk monetisasi utama)
- **Shorts** 1080×1920 (untuk menarik subscriber)
- **Thumbnail** 1280×720
- **Naskah rekaman** untuk Anda bacakan
- **Metadata YouTube**: judul, deskripsi, bab/chapters, tag

## Alur kerja per episode

1. **Claude membuat episode**: minta di sesi Claude Code, mis. *"Buatkan ep002 tentang nama-nama hewan"*.
2. **Cek draft**: `node src/build.js episodes/ep002-....json --draft` (tanpa suara, ada teks bantu di bawah layar).
3. **Rekam suara** dengan membaca `output/<id>/naskah-rekaman.txt`:
   - **Cara 1 (termudah):** rekam semua baris dalam satu file, beri jeda ±2 detik antar baris → `rekaman/<id>.m4a`
   - **Cara 2:** satu file per baris → `rekaman/<id>/001.m4a`, `002.m4a`, ...
   - Format apa saja boleh (m4a, mp3, wav, ogg, …). Rekam di ruangan sunyi, HP sejarak ±20 cm.
4. **Render final**: `node src/build.js episodes/<file>.json`
   - Suara otomatis dibersihkan dari noise, disamakan volumenya, musik mengecil saat Anda bicara, dan paruh Ciko bergerak mengikuti suara.
5. **Upload** ke YouTube dengan isi `metadata-youtube.txt` (pengaturan audiens sudah tertulis di sana sesuai tema).

> Konten keuangan: cek ulang semua angka sebelum upload, dan jangan pernah mempromosikan produk yang tidak terdaftar di OJK.

Kompilasi (video 15–30 menit, bagus untuk jam tayang):
```
node src/compile.js kompilasi-01 ep001 ep002 ep003
```

Opsi: `--hanya=naskah|video|shorts|thumbnail` untuk membuat satu bagian saja.

## Jenis adegan — tema keuangan

Setiap baris naskah boleh diberi `"muncul": n`, artinya saat baris itu dibaca, item ke-1 sampai ke-n tampil di layar.

| type | Fungsi |
|---|---|
| `hook` | Kalimat besar pembuka/penegas (`items`: teks) |
| `judul` | Kartu bab: `nomor`, `judul_besar`, `ikon` |
| `poin` | Daftar ikon + teks + nilai Rp, opsional `total` |
| `donut` | Diagram lingkaran porsi (mis. 50/30/20) |
| `batang` | Grafik batang |
| `garis` | Grafik garis (mis. pertumbuhan investasi), `x` + `items[].data` |
| `angka` | Angka besar yang menghitung naik + `catatan` |
| `rumus` | Langkah perhitungan: `teks` → `hasil` |
| `banding` | Dua kolom: kebiasaan buruk vs baik |
| `penutup` | Ringkasan dengan tanda centang |

Field umum: `bab` (bab YouTube + label di pojok), `warna` (`green`, `gold`, `blue`, `red`, `purple` atau kode hex), `catatan_kecil` (disclaimer kecil di bawah layar).

## Jenis adegan — tema anak

| type | Fungsi | Baris rekaman |
|---|---|---|
| `intro` | Judul + maskot menyapa | bebas |
| `kata` | Kosakata: gambar + kata Indonesia + Inggris | 1: kalimat Indonesia, 2: kata Inggris (muncul saat baris 2 dibaca) |
| `kuis` | Tebak: siluet → hitung mundur 3-2-1 → jawaban | 1: pertanyaan, 2: jawaban |
| `hitung` | Berhitung benda satu per satu | 1: ajakan, 2..N+1: angka, terakhir: kesimpulan |
| `outro` | Penutup | bebas |

Gambar memakai emoji Noto Color Emoji (lisensi Apache 2.0) dan font Fredoka (lisensi OFL), keduanya aman dipakai komersial. Musik latar dan efek suara dibuat oleh kode, jadi bebas klaim hak cipta.

## Kebutuhan
Node.js 18+, ffmpeg, Playwright + Chromium, font "Noto Color Emoji". Semua sudah tersedia di sesi cloud Claude Code.
