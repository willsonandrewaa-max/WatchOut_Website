/* ==========================================================================
   WatchOut! — SIMULATOR FITUR HARIAN (bagian #fitur)
   --------------------------------------------------------------------------
   Tombol fitur di kiri mengganti tampilan layar jam di kanan.
   Isi tiap tampilan layar ada di index.html (cari: data-sim-panel).
   ========================================================================== */
(function () {
  'use strict';

  var DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- jam & tanggal yang berjalan ---------- */
  var timeEls = document.querySelectorAll('[data-live-time]');
  var dateEls = document.querySelectorAll('[data-live-date]');
  function tickClock() {
    var now = new Date();
    var t = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var d = DAYS[now.getDay()] + ', ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
    Array.prototype.forEach.call(timeEls, function (el) { if (el.textContent !== t) el.textContent = t; });
    Array.prototype.forEach.call(dateEls, function (el) { if (el.textContent !== d) el.textContent = d; });
  }
  if (timeEls.length || dateEls.length) { tickClock(); setInterval(tickClock, 1000); }

  /* ---------- tab fitur ---------- */
  var list = document.querySelector('[data-sim-tabs]');
  if (!list) return;
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[data-sim-tab]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-sim-panel]'));
  var caption = document.querySelector('[data-sim-caption]');

  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    var id = tab.getAttribute('aria-controls');
    panels.forEach(function (p) { p.hidden = p.id !== id; });
    if (caption) caption.textContent = tab.getAttribute('data-caption') || '';
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next, true); }
    });
  });
  var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
  if (initial) select(initial, false);

  /* ---------- tombol kecil di dalam layar (musik, sakelar alarm) ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-sim-toggle]') : null;
    if (!b) return;
    var on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    var label = on ? b.getAttribute('data-label-on') : b.getAttribute('data-label-off');
    if (label) b.setAttribute('aria-label', label);
  });
})();
