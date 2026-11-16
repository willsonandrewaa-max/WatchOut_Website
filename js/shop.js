/* ==========================================================================
   WatchOut! — PEMBELIAN & PEMBAYARAN QRIS (bagian #beli)
   --------------------------------------------------------------------------
   1. Pengunjung memilih jumlah (tombol − / + atau ketik angka).
   2. Total harga dihitung otomatis.
   3. Setelah tombol "Beli" ditekan, jendela pembayaran QRIS muncul,
      lengkap dengan total yang harus dibayar dan tombol kirim bukti ke WhatsApp.
   Harga, batas jumlah, dan pesan WhatsApp diatur di js/config.js (bagian "shop").
   ========================================================================== */
(function () {
  'use strict';

  var form = document.querySelector('[data-shop]');
  if (!form) return;

  var CONFIG = window.WATCHOUT_CONFIG || {};
  var shop = CONFIG.shop || {};
  var contact = CONFIG.contact || {};
  var price = Number(shop.price) || 289000;
  var maxQty = Math.max(1, Number(shop.maxQty) || 10);
  var name = shop.productName || 'WatchOut!';

  var input = form.querySelector('[data-qty-input]');
  var hint = form.querySelector('[data-qty-hint]');
  var dialog = document.querySelector('[data-pay-dialog]');
  var lastFocus = null;

  function rupiah(n) { return 'Rp' + Math.round(n).toLocaleString('id-ID'); }
  function each(root, sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), fn); }

  input.max = String(maxQty);
  if (hint) hint.textContent = 'Maksimal ' + maxQty + ' unit per pesanan.';
  each(document, '[data-unit-price]', function (el) { el.textContent = rupiah(price); });

  function qty() {
    var q = parseInt(input.value, 10);
    if (isNaN(q)) q = 1;
    return Math.max(1, Math.min(maxQty, q));
  }
  function color() {
    var c = form.querySelector('input[name="warna"]:checked');
    return c ? c.value : '';
  }
  function update() {
    var q = qty();
    each(form, '[data-total]', function (el) { el.textContent = rupiah(q * price); });
    each(form, '[data-qty="-1"]', function (b) { b.disabled = q <= 1; });
    each(form, '[data-qty="1"]', function (b) { b.disabled = q >= maxQty; });
  }

  each(form, '[data-qty]', function (b) {
    b.addEventListener('click', function () {
      input.value = String(Math.max(1, Math.min(maxQty, qty() + Number(b.getAttribute('data-qty')))));
      update();
    });
  });
  input.addEventListener('input', update);
  input.addEventListener('blur', function () { input.value = String(qty()); update(); });

  /* ---------- jendela pembayaran ---------- */
  function openPay() {
    var q = qty();
    input.value = String(q);
    update();
    var item = q + ' × ' + name + (color() ? ' (' + color() + ')' : '');
    var total = rupiah(q * price);
    each(dialog, '[data-pay-item]', function (el) { el.textContent = item; });
    each(dialog, '[data-pay-total]', function (el) { el.textContent = total; });

    var wa = String(contact.whatsapp || '').replace(/\D/g, '');
    var confirm = dialog.querySelector('[data-pay-confirm]');
    if (confirm) {
      if (wa) {
        var text = (shop.confirmMessage || 'Halo WatchOut!, saya sudah membayar pesanan berikut:') +
          '\n' + item + '\nTotal: ' + total + '\n\nNama:\nAlamat pengiriman:\n(lampirkan bukti pembayaran)';
        confirm.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(text);
        confirm.hidden = false;
      } else {
        confirm.hidden = true;
      }
    }

    lastFocus = document.activeElement;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else { // browser lama
      dialog.setAttribute('open', '');
      dialog.classList.add('is-fallback-open');
    }
    document.documentElement.classList.add('pay-open');
    var close = dialog.querySelector('[data-pay-close]');
    if (close) close.focus();
  }

  function closePay() {
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    dialog.removeAttribute('open');
    dialog.classList.remove('is-fallback-open');
    document.documentElement.classList.remove('pay-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); openPay(); });
  if (dialog) {
    each(dialog, '[data-pay-close]', function (b) { b.addEventListener('click', closePay); });
    dialog.addEventListener('close', function () { document.documentElement.classList.remove('pay-open'); });
    dialog.addEventListener('cancel', function () { document.documentElement.classList.remove('pay-open'); });
    // klik di luar kotak menutup jendela
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closePay(); });
  }

  update();
})();
