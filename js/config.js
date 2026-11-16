/* ==========================================================================
   WatchOut! — PENGATURAN WEBSITE
   --------------------------------------------------------------------------
   File ini adalah tempat paling mudah untuk merevisi website tanpa menyentuh
   kode lain. Ubah nilai di sebelah kanan tanda titik dua (:), simpan, lalu
   muat ulang (refresh) index.html di browser.

   - Teks halaman (judul, paragraf, FAQ, dll) diedit langsung di index.html.
   - Warna & font diedit di css/style.css (bagian paling atas, ":root").
   ========================================================================== */

window.WATCHOUT_CONFIG = {

  /* ------------------------------------------------------------------------
     1. KONTAK
     Data ini otomatis muncul di bagian "Hubungi kami" dan di footer.
     PENTING: ganti dengan kontak asli sebelum website dipublikasikan.
     ------------------------------------------------------------------------ */
  contact: {
    // Nomor WhatsApp format internasional: 62 + nomor tanpa angka 0 di depan.
    // Contoh: 0812-3456-7890  ->  '6281234567890'
    whatsapp: '6281200000000',
    // Cara nomor ditampilkan di halaman
    whatsappLabel: '+62 812-0000-0000',
    email: 'halo@watchout.id',
    // Nama akun Instagram tanpa tanda @
    instagram: 'watchout.id',
    // Kalimat pembuka pesan WhatsApp dari formulir kontak
    whatsappGreeting: 'Halo WatchOut!, saya ingin bertanya tentang jam WatchOut!.'
  },

  /* ------------------------------------------------------------------------
     2. SIMULASI ALARM (tarik tali di bagian atas halaman & viewer 3D)
     ------------------------------------------------------------------------ */
  alarm: {
    volume: 0.22,          // 0 = senyap, 1 = paling keras. Disarankan 0.15 – 0.3
    durationSeconds: 6,    // alarm simulasi berhenti otomatis setelah sekian detik
    vibrate: true          // getar singkat di ponsel yang mendukung
  },

  /* ------------------------------------------------------------------------
     3. VIEWER 3D
     ------------------------------------------------------------------------ */
  viewer: {
    autoRotate: true,       // model berputar pelan saat tidak disentuh
    autoRotateSpeed: 12,    // derajat per detik

    // Warna & sifat permukaan tiap material.
    // Nama di kiri = nama material di file assets/3d/watchout.mtl
    // color: kode warna HEX | roughness: 0 = mengilap, 1 = doff
    materials: {
      '05_-_Default':     { color: '#F0525A', roughness: 0.38, clearcoat: 0.35 }, // badan jam
      '03_-_Default':     { color: '#0B0607', roughness: 0.08 },                  // layar
      'Material.002':     { color: '#E3301B', roughness: 0.55 },                  // tali jam (sisi berlubang)
      'Material.003':     { color: '#E3301B', roughness: 0.55 },                  // tali jam (sisi pengait)
      '15_-_Default.003': { color: '#F1E6D8', roughness: 0.42 },                  // penghubung tali
      '15_-_Default.004': { color: '#F1E6D8', roughness: 0.42 },                  // penghubung tali
      'Material_26':      { color: '#E9DED2', roughness: 0.35 },                  // tombol samping
      'Material_26.003':  { color: '#E9DED2', roughness: 0.35 }                   // tombol samping
    },

    // Layar jam menampilkan jam digital yang berjalan sesuai waktu sekarang
    screen: {
      material: '03_-_Default',
      enabled: true
    },

    // Tali penarik alarm. Tali ini dibuat langsung oleh viewer karena tidak ikut
    // ter-export di file OBJ. attach = titik kaitan tali (koordinat model Blender).
    cord: {
      enabled: true,
      color: '#F4F1EE',
      attach: [2.774, 0.298, 0.048]
    },

    // Arah model: ke mana sumbu X, Y, Z model menghadap di layar.
    // Biarkan seperti ini kecuali model 3D baru menghadap ke arah lain.
    orientation: ['-y', '+z', '-x'],
    // Bagian model yang dijadikan pusat putaran kamera
    focusPart: 'mesh_3'
  }
};
