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
    whatsapp: '6285174292750',
    // Cara nomor ditampilkan di halaman
    whatsappLabel: '+62 851-7429-2750',
    // Kosongkan ('') untuk menyembunyikan baris email
    email: '',
    // Nama akun Instagram tanpa tanda @
    instagram: 'watch0ut09',
    // Kalimat pembuka pesan WhatsApp dari formulir kontak
    whatsappGreeting: 'Halo WatchOut!, saya ingin bertanya tentang jam WatchOut!.'
  },

  /* ------------------------------------------------------------------------
     2. TOKO (bagian "Pesan WatchOut! sekarang")
     Gambar QRIS ada di assets/img/qris-watchout.jpg (ganti file itu jika QRIS berubah)
     ------------------------------------------------------------------------ */
  shop: {
    productName: 'WatchOut!',
    price: 289000,        // harga per unit dalam rupiah, tanpa titik
    maxQty: 10,           // jumlah maksimal per pesanan
    // Kalimat pembuka pesan WhatsApp saat mengirim bukti pembayaran
    confirmMessage: 'Halo WatchOut!, saya sudah membayar pesanan berikut lewat QRIS:'
  },

  /* ------------------------------------------------------------------------
     3. SIMULASI ALARM (tarik tali di bagian atas halaman & viewer 3D)
     ------------------------------------------------------------------------ */
  alarm: {
    volume: 0.22,          // 0 = senyap, 1 = paling keras. Disarankan 0.15 – 0.3
    durationSeconds: 6,    // alarm simulasi berhenti otomatis setelah sekian detik
    vibrate: true          // getar singkat di ponsel yang mendukung
  },

  /* ------------------------------------------------------------------------
     4. VIEWER 3D
     ------------------------------------------------------------------------ */
  viewer: {
    autoRotate: true,       // model berputar pelan saat tidak disentuh
    autoRotateSpeed: 12,    // derajat per detik

    // Warna & sifat permukaan tiap material.
    // Nama di kiri = nama material di file assets/3d/watchout.mtl
    // color: kode warna HEX | roughness: 0 = mengilap, 1 = doff
    materials: {
      'Material.001':     { color: '#ECE9E3', roughness: 0.62 },                  // badan jam (putih)
      'Material.005':     { color: '#E4E0D9', roughness: 0.55 },                  // tutup belakang
      '05_-_Default':     { color: '#E4E0D9', roughness: 0.5 },                   // tombol samping
      '05_-_Default.005': { color: '#E4E0D9', roughness: 0.5 },                   // tombol samping
      '05_-_Default.006': { color: '#E4E0D9', roughness: 0.5 },                   // tombol samping
      'Material':         { color: '#2A2627', roughness: 0.45 },                  // kenop hitam
      '03_-_Default':     { color: '#0B0607', roughness: 0.08 },                  // layar
      'Material.002':     { color: '#C8101C', roughness: 0.55 },                  // tali jam (sisi berlubang)
      'Material.003':     { color: '#C8101C', roughness: 0.55 },                  // tali jam (sisi pengait)
      '15_-_Default.003': { color: '#B80E19', roughness: 0.55 },                  // pangkal tali jam
      '15_-_Default.004': { color: '#B80E19', roughness: 0.55 },                  // pangkal tali jam
      'Material.004':     { color: '#F4F1EE', roughness: 0.5 }                    // tali penarik alarm
    },

    // Layar jam menampilkan jam digital yang berjalan sesuai waktu sekarang
    screen: {
      material: '03_-_Default',
      enabled: true
    },

    // Tali penarik alarm (sudah ada di file 3D).
    // part = bagian tali yang ikut turun saat ditarik, threadPart = tali tipis yang memanjang,
    // attach = titik kaitan tali di badan jam (koordinat model Blender).
    cord: {
      enabled: true,
      part: 'Puller_String_3d',
      threadPart: 'Puller_String_thread',
      threadLength: 0.7,
      attach: [3.6, 3.66, 0.5]
    },

    // Arah model: ke mana sumbu X, Y, Z model menghadap di layar.
    // Biarkan seperti ini kecuali model 3D baru menghadap ke arah lain.
    orientation: ['-y', '+z', '-x'],
    // Putaran jam di layar (derajat). 90 = layar tegak seperti dipakai, tali penarik di kanan.
    roll: 90,
    // Bagian model yang dijadikan pusat putaran kamera
    focusPart: 'mesh_3_1'
  }
};
