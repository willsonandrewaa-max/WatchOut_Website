# WatchOut! — Website Profil Produk

> **Your Safety, Our Priority!**
> Jam digital dengan tali alarm darurat untuk lansia.

Website ini dibuat dengan HTML, CSS, dan JavaScript murni, tanpa library tambahan,
jadi mudah direvisi dan bisa dibuka langsung dari folder.

---

## 1. Cara membuka website

1. Ekstrak (unzip) file ini.
2. Klik dua kali **index.html**. Website terbuka di browser (Chrome, Edge, Firefox, atau Safari).

Semua fitur, termasuk model 3D dan demo tarik tali, tetap jalan walau dibuka langsung dari folder.
Font judul dan teks diambil dari Google Fonts, jadi butuh internet. Tanpa internet,
website memakai font cadangan bawaan komputer.

---

## 2. Isi folder

```
watchout-website/
├── index.html               semua TEKS dan susunan halaman
├── README.md                panduan ini
├── css/
│   └── style.css            WARNA, font, ukuran, tata letak
├── js/
│   ├── config.js            PENGATURAN: kontak, alarm, viewer 3D  ← paling sering diedit
│   ├── alarm.js             suara sirene simulasi
│   ├── cord-demo.js         demo tarik tali di bagian atas halaman
│   ├── viewer3d.js          viewer model 3D
│   ├── features.js          simulator layar jam (bagian "Fitur")
│   └── main.js              menu, ukuran teks, formulir WhatsApp
├── assets/
│   ├── img/                 logo, gambar mockup, favicon, gambar untuk dibagikan
│   ├── 3d/                  model 3D (watchout.obj, watchout.mtl, tekstur logo, watchout-model.js)
│   └── source/              file asli dari tim (logo & mockup) untuk keperluan revisi
└── tools/
    ├── konversi-model.html  alat untuk mengganti model 3D
    └── obj-converter.js     mesin konversi (tidak perlu diedit)
```

Cara mengedit: buka file dengan editor teks, misalnya **Visual Studio Code** (gratis) atau Notepad.
Setelah menyimpan, **refresh** browser (tekan F5) untuk melihat hasilnya.

---

## 3. Wajib sebelum dipublikasikan: ganti kontak

Buka **js/config.js**, bagian `contact`:

```js
contact: {
  whatsapp: '6281200000000',          // 62 + nomor tanpa angka 0 di depan
  whatsappLabel: '+62 812-0000-0000', // cara nomor ditampilkan
  email: 'halo@watchout.id',
  instagram: 'watchout.id',           // tanpa tanda @
  whatsappGreeting: 'Halo WatchOut!, saya ingin bertanya tentang jam WatchOut!.'
}
```

Semua kontak di atas masih **contoh**. Ganti dengan kontak asli tim. Data ini otomatis muncul di bagian
"Hubungi kami" dan dipakai oleh formulir yang membuka WhatsApp. Jika salah satu dikosongkan (`''`),
barisnya otomatis disembunyikan.

---

## 4. Revisi yang sering dilakukan

| Ingin mengubah… | Buka file | Caranya |
|---|---|---|
| Teks judul, paragraf, tombol | `index.html` | Tekan Ctrl+F, cari teksnya, lalu ganti. Setiap bagian diberi penanda komentar seperti `<!-- HERO -->`, `<!-- CARA KERJA -->`. |
| Pertanyaan di "Tanya jawab" | `index.html` | Salin satu blok `<details class="qa">…</details>`, lalu ubah pertanyaan & jawabannya. |
| Baris spesifikasi | `index.html` | Salin satu baris `<div class="spec">…</div>`. Bila datanya sudah ada, sebaiknya tambahkan baterai, berat, ukuran, tingkat tahan air (IP), dan kekerasan alarm (dB). |
| Warna | `css/style.css` | Bagian `:root` di paling atas. Contoh: `--crimson: #A60914;` adalah merah logo. |
| Font | `index.html` + `css/style.css` | Ganti link Google Fonts di `<head>` lalu ubah `--font-display` dan `--font-text`. |
| Keterangan tombol viewer 3D | `index.html` | Bagian `#lihat-3d`, atribut `data-caption="…"` di tiap tombol. |
| Isi layar jam di bagian "Fitur" | `index.html` | Bagian `#fitur`. Isi tiap layar ada di blok `data-sim-panel`, keterangannya di `data-caption` tombol. |
| Volume / lama alarm simulasi | `js/config.js` | Bagian `alarm`: `volume` (0–1) dan `durationSeconds`. |
| Warna & kilap model 3D | `js/config.js` | Bagian `viewer.materials`: `color` (HEX) dan `roughness` (0 = mengilap, 1 = doff). |
| Putaran otomatis model 3D | `js/config.js` | `autoRotate: true/false` dan `autoRotateSpeed`. |

**Mengganti gambar:** simpan gambar baru di `assets/img/` dengan nama file yang sama, lalu ganti juga
versi `.webp`-nya (atau hapus baris `<source … .webp>` di index.html agar memakai `.png`).
Gambar jam di bagian atas (`watchout-band`) berukuran 1435 × 215 piksel dan **tanpa tali**, karena
talinya digambar oleh kode supaya bisa ditarik. Jika ukurannya berubah, sesuaikan angka di `js/cord-demo.js`.

---

## 5. Mengganti atau merevisi model 3D

1. Di Blender: **File › Export › Wavefront (.obj)**. Centang *Normals*, *UV Coordinates*, dan *Materials*.
2. Buka **tools/konversi-model.html** di browser.
3. Pilih file `.obj`, `.mtl`, dan gambar tekstur (misalnya `logo watchout.png`), lalu tekan **Buat file model**.
4. Unduh `watchout-model.js` dan simpan ke **assets/3d/**, timpa file lama.
5. Refresh index.html.

Catatan tentang model saat ini:

- **Tali penarik tidak ikut ter-export** di file OBJ, jadi viewer menggambar talinya sendiri
  mengikuti render mockup. Jika model baru sudah punya tali, matikan tali buatan di `js/config.js`:
  `cord: { enabled: false }`.
- File OBJ berisi **salinan jam berukuran sangat kecil** (14 objek) dan **dua potongan kecil yang
  melayang** jauh dari jam. Semuanya otomatis dibuang oleh konverter; daftarnya bisa dilihat dan diubah
  di "Pengaturan lanjutan".
- Layar jam pada model 3D menampilkan **jam yang berjalan sesuai waktu sekarang**, dan berubah menjadi
  tampilan "Minta tolong!" saat alarm simulasi berbunyi. Bisa dimatikan di `viewer.screen.enabled`.
- Warna material di file `.mtl` tidak semuanya sama dengan render (misalnya penghubung tali tertulis biru),
  jadi warna yang dipakai diatur di `viewer.materials` pada `js/config.js`.

---

## 6. Fitur ramah lansia

- **Tombol ukuran teks** (A / A / A) di menu memperbesar seluruh teks; pilihannya diingat browser.
- Font **Atkinson Hyperlegible Next** dirancang khusus agar mudah dibaca orang dengan penglihatan lemah.
- Teks dasar 20 px, tombol besar (minimal 48 px), dan kontras warna memenuhi standar keterbacaan (WCAG AA).
- Semua fitur bisa dipakai dengan keyboard. Animasi dikurangi otomatis bila perangkat diatur
  "kurangi gerakan".
- Demo alarm hanya berbunyi jika pengunjung menarik tali atau menekan tombol, dan punya tombol
  "Suara mati" serta berhenti sendiri setelah 6 detik.

---

## 7. Mempublikasikan website (gratis)

- **Netlify Drop**: buka app.netlify.com/drop lalu tarik folder `watchout-website` ke halaman itu.
- **GitHub Pages**: unggah isi folder ke repository GitHub, lalu aktifkan Pages di pengaturan repository.

Setelah online, ganti `assets/img/og-image.jpg` pada tag `og:image` di `<head>` index.html dengan alamat
lengkap (misalnya `https://namadomainanda.com/assets/img/og-image.jpg`) agar gambar muncul saat link
dibagikan di WhatsApp atau media sosial.

---

## 8. Isi contoh yang perlu diperiksa

Beberapa isi masih berupa contoh dan sebaiknya disesuaikan:

- Kontak di `js/config.js` (lihat bagian 3).
- Tampilan layar di simulator fitur: suhu "29°", jalan "Jl. Melati", lagu "Lagu kenangan",
  dan pengingat "06:30 Minum obat pagi". Semuanya hanya ilustrasi tampilan.
- Klaim produk mengikuti brief tim: jangkauan suara ±200 meter, tahan air, desain ramah lansia dan ringan.
  Contoh pemakaian "cuci tangan, wudu, atau kehujanan" ada di bagian Keunggulan dan Tanya jawab;
  sesuaikan bila tingkat tahan airnya berbeda.
