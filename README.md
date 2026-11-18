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
│   ├── shop.js              pembelian: jumlah, total harga, jendela QRIS
│   ├── pull-cord.js         tali yang bisa ditarik (hero, jam simulator)
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
  email: '',                          // kosong = disembunyikan
  instagram: 'watch0ut09',            // tanpa tanda @
  whatsappGreeting: 'Halo WatchOut!, saya ingin bertanya tentang jam WatchOut!.'
}
```

Nomor WhatsApp masih **contoh**. Ganti dengan nomor asli toko (nomor ini juga dipakai untuk konfirmasi pembayaran QRIS). Data ini otomatis muncul di bagian
"Hubungi kami" dan dipakai oleh formulir yang membuka WhatsApp. Jika salah satu dikosongkan (`''`),
barisnya otomatis disembunyikan.

---

## 4. Revisi yang sering dilakukan

| Ingin mengubah… | Buka file | Caranya |
|---|---|---|
| Teks judul, paragraf, tombol | `index.html` | Tekan Ctrl+F, cari teksnya, lalu ganti. Setiap bagian diberi penanda komentar seperti `<!-- HERO -->`, `<!-- CARA KERJA -->`. |
| Baris spesifikasi | `index.html` | Salin satu baris `<div class="spec">…</div>`. Bila datanya sudah ada, sebaiknya tambahkan baterai, berat, ukuran, tingkat tahan air (IP), dan kekerasan alarm (dB). |
| Warna | `css/style.css` | Bagian `:root` di paling atas. Contoh: `--crimson: #A60914;` adalah merah logo. |
| Font | `index.html` + `css/style.css` | Ganti link Google Fonts di `<head>` lalu ubah `--font-display` dan `--font-text`. |
| Keterangan tombol viewer 3D | `index.html` | Bagian `#lihat-3d`, atribut `data-caption="…"` di tiap tombol. |
| Isi layar jam di bagian "Fitur" | `index.html` | Bagian `#fitur`. Isi tiap layar ada di blok `data-sim-panel`, keterangannya di `data-caption` tombol. |
| Harga & jumlah maksimal pembelian | `js/config.js` | Bagian `shop`: `price` dan `maxQty`. Ubah juga teks harga di `index.html` (cari "289.000"). |
| Gambar QRIS | `assets/img/` | Ganti file `qris-watchout.jpg` dengan nama yang sama. |
| Volume / lama alarm simulasi | `js/config.js` | Bagian `alarm`: `volume` (0–1) dan `durationSeconds`. |
| Warna & kilap model 3D | `js/config.js` | Bagian `viewer.materials`: `color` (HEX) dan `roughness` (0 = mengilap, 1 = doff). |
| Putaran otomatis model 3D | `js/config.js` | `autoRotate: true/false` dan `autoRotateSpeed`. |

**Mengganti gambar:** simpan gambar baru di `assets/img/` dengan nama file yang sama, lalu ganti juga
versi `.webp`-nya (atau hapus baris `<source … .webp>` di index.html agar memakai `.png`).
Gambar jam di bagian atas (`watchout-band`) adalah mockup asli tim (1435 × 215 piksel) **tanpa tali**; talinya digambar dengan SVG di `index.html` supaya bisa ditarik. Foto produk (`watchout-product`) adalah foto asli jam WatchOut! (tanpa fitur tarik tali).

Di tampilan 3D, jam diputar supaya layarnya tegak seperti saat dipakai. Sudutnya diatur lewat `roll` di `js/config.js` (90 = layar tegak, tali penarik di kanan; 0 = posisi asli file 3D). Foto-foto di halaman miring mengikuti kursor; kekuatannya diatur lewat `--photo-tilt` di `css/style.css`.

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

- **Font:** Bagel Fat One (judul), Beatrix Antiqua (subjudul), dan Poppins (teks biasa). Beatrix Antiqua
  adalah font berlisensi dari Zetafonts dan tidak tersedia di Google Fonts. Setelah tim memiliki lisensinya,
  simpan filenya sebagai `assets/fonts/BeatrixAntiqua-Regular.woff2` (atau `.ttf`), dan website otomatis
  memakainya. Sebelum itu, subjudul memakai font Marcellus dari Google Fonts.
- **Warna:** judul & elemen `#A60816`, latar `#EFE6DD`, teks biasa & subjudul `#580010` (lihat `:root` di `css/style.css`).
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
- Data statistik, kutipan Oma Halimah, perbandingan kompetitor, harga, dan spesifikasi diambil dari
  proposal dan pitch deck WatchOut!.
- QRIS yang dipakai atas nama merchant "NEXUS STORE". QRIS ini statis, jadi pembeli mengetik nominal sendiri.
