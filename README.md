# Ciko — Pabrik Video Edukasi Anak 🐤

Sistem otomatis untuk membuat video YouTube edukatif anak (4–10 tahun) dengan maskot **Ciko si anak ayam**.
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
5. **Upload** ke YouTube dengan isi `metadata-youtube.txt`. **Wajib** pilih *"Ya, dibuat untuk anak-anak"*.

Kompilasi (video 15–30 menit, bagus untuk jam tayang):
```
node src/compile.js kompilasi-01 ep001 ep002 ep003
```

Opsi: `--hanya=naskah|video|shorts|thumbnail` untuk membuat satu bagian saja.

## Jenis adegan

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
