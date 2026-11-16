/* ==========================================================================
   WatchOut! — INTERAKSI UMUM
   --------------------------------------------------------------------------
   Menu ponsel, ukuran teks, data kontak dari js/config.js, formulir WhatsApp,
   penanda menu aktif, dan tahun di footer.
   ========================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var CONFIG = window.WATCHOUT_CONFIG || {};
  var contact = CONFIG.contact || {};

  function each(selector, fn) { Array.prototype.forEach.call(document.querySelectorAll(selector), fn); }
  function store(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ } }

  /* ---------- header saat halaman digulir ---------- */
  var header = document.querySelector('[data-header]');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- menu ponsel ---------- */
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    html.classList.toggle('menu-open', open);
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && html.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1040) setMenu(false); });
  }

  /* ---------- ukuran teks (A / A+ / A++) ---------- */
  function setTextSize(level) {
    level = String(Math.max(0, Math.min(2, parseInt(level, 10) || 0)));
    html.setAttribute('data-text-size', level);
    store('watchout-text-size', level);
    each('[data-text-size-set]', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-text-size-set') === level)); });
  }
  each('[data-text-size-set]', function (b) {
    b.addEventListener('click', function () { setTextSize(b.getAttribute('data-text-size-set')); });
  });
  setTextSize(html.getAttribute('data-text-size') || '0');

  /* ---------- data kontak dari config.js ---------- */
  var waNumber = String(contact.whatsapp || '').replace(/\D/g, '');
  var links = {
    whatsapp: waNumber ? { href: 'https://wa.me/' + waNumber, text: contact.whatsappLabel || ('+' + waNumber) } : null,
    email: contact.email ? { href: 'mailto:' + contact.email, text: contact.email } : null,
    instagram: contact.instagram ? { href: 'https://instagram.com/' + String(contact.instagram).replace(/^@/, ''), text: '@' + String(contact.instagram).replace(/^@/, '') } : null
  };
  each('[data-contact]', function (el) {
    var info = links[el.getAttribute('data-contact')];
    var item = el.closest('[data-contact-item]');
    if (!info) { if (item) item.hidden = true; return; }
    el.setAttribute('href', info.href);
    var label = el.querySelector('[data-contact-text]');
    (label || el).textContent = info.text;
  });

  /* ---------- formulir kontak -> WhatsApp ---------- */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.nama.value.trim();
      var message = form.elements.pesan.value.trim();
      var firstInvalid = null;
      [['nama', name], ['pesan', message]].forEach(function (pair) {
        var field = form.elements[pair[0]];
        var invalid = !pair[1];
        field.setAttribute('aria-invalid', String(invalid));
        var err = document.getElementById(field.getAttribute('aria-describedby') || '');
        if (err) err.hidden = !invalid;
        if (invalid && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }
      if (!waNumber) {
        if (status) status.textContent = 'Nomor WhatsApp belum diatur. Isi nomornya di js/config.js.';
        return;
      }
      var text = (contact.whatsappGreeting ? contact.whatsappGreeting + '\n\n' : '') + 'Nama: ' + name + '\n' + message;
      var url = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(text);
      // window.open(..., 'noopener') always returns null, so open normally and cut the link
      var win = null;
      try { win = window.open(url, '_blank'); } catch (err) { win = null; }
      if (win) {
        try { win.opener = null; } catch (err) { /* ignore */ }
        if (status) status.textContent = 'WhatsApp sudah dibuka. Tinggal tekan kirim di sana.';
      } else if (status) {
        // jendela baru diblokir browser: tampilkan tautan yang bisa diklik
        status.textContent = 'Pesan Anda sudah disiapkan. ';
        var link = document.createElement('a');
        link.href = url; link.target = '_blank'; link.rel = 'noopener';
        link.textContent = 'Buka WhatsApp untuk mengirim';
        status.appendChild(link);
      }
    });
    each('[data-contact-form] input, [data-contact-form] textarea', function (field) {
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true' && field.value.trim()) {
          field.setAttribute('aria-invalid', 'false');
          var err = document.getElementById(field.getAttribute('aria-describedby') || '');
          if (err) err.hidden = true;
        }
      });
    });
  }

  /* ---------- penanda menu sesuai bagian yang sedang dibaca ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav] a[href^="#"]'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      (byId[id] = byId[id] || []).push(a);
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        (byId[entry.target.id] || []).forEach(function (a) { a.setAttribute('aria-current', 'true'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    // semua bagian diamati, termasuk yang tidak ada di menu (agar penanda hilang di sana)
    each('main section[id]', function (sec) { observer.observe(sec); });
  }

  /* ---------- tahun di footer ---------- */
  each('[data-year]', function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- interaksi foto: miring mengikuti kursor, aktif juga saat disentuh ---------- */
  each('.story__photo, .solution__photo, .specs__photo', function (fig) {
    function reset() {
      fig.classList.remove('is-photo-active');
      fig.style.setProperty('--rx', '0deg'); fig.style.setProperty('--ry', '0deg');
    }
    function move(e) {
      var r = fig.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      var max = parseFloat(getComputedStyle(fig).getPropertyValue('--photo-tilt')) || 6;
      fig.classList.add('is-photo-active');
      fig.style.setProperty('--ry', (x * max * 2).toFixed(2) + 'deg');
      fig.style.setProperty('--rx', (-y * max * 2).toFixed(2) + 'deg');
    }
    fig.addEventListener('pointermove', move);
    fig.addEventListener('pointerdown', move);
    fig.addEventListener('pointerleave', reset);
    fig.addEventListener('pointercancel', reset);
    fig.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') setTimeout(reset, 600); });
  });
})();
