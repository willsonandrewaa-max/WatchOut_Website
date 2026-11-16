/* ==========================================================================
   WatchOut! — DEMO TARIK TALI (bagian atas halaman)
   --------------------------------------------------------------------------
   Tali di bawah gambar jam bisa ditarik ke bawah (mouse / jari). Jika ditarik
   cukup jauh, alarm simulasi berbunyi lewat js/alarm.js. Tombol tali juga bisa
   diklik atau ditekan Enter / Spasi untuk pengguna keyboard.

   Koordinat di file ini mengikuti ukuran gambar assets/img/watchout-band.png
   (1435 x 215 piksel). Jika gambar diganti dengan ukuran berbeda, sesuaikan
   VIEW_W dan posisi tali di index.html (elemen <svg class="band__cord">).
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-cord-demo]');
  if (!root) return;

  var figure = root.querySelector('.band__figure');
  var thread = root.querySelector('[data-cord-thread]');
  var lower = root.querySelector('[data-cord-lower]');
  var handle = root.querySelector('[data-cord-handle]');
  if (!figure || !thread || !lower || !handle) return;

  var VIEW_W = 1435;     // lebar viewBox SVG (= lebar gambar)
  var CAP_Y = 229;       // posisi atas penutup tali sebelum ditarik
  var FREE = 52;         // tarikan bebas sebelum terasa "berat"
  var MAX = 150;         // tarikan maksimum
  var TRIGGER = 84;      // jarak tarikan yang membunyikan alarm

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pull = 0, vel = 0, raf = 0;
  var dragging = false, startY = 0, startPull = 0, moved = false, fired = false, suppressClick = false, touched = false;

  function unitsPerPx() { return VIEW_W / (figure.getBoundingClientRect().width || VIEW_W); }

  function render() {
    var p = Math.round(pull * 10) / 10;
    thread.setAttribute('d', 'M744.6 199 L742.3 ' + (CAP_Y + p) + ' M748.4 199 L750.7 ' + (CAP_Y + p));
    lower.setAttribute('transform', 'translate(0 ' + p + ')');
    handle.style.transform = 'translate(-50%, ' + (p / unitsPerPx()).toFixed(2) + 'px)';
    root.style.setProperty('--pull', Math.max(0, Math.min(1, pull / TRIGGER)).toFixed(3));
  }

  function rubber(raw) {
    if (raw <= 0) return raw * 0.12;
    if (raw <= FREE) return raw;
    return Math.min(MAX, FREE + (raw - FREE) * 0.55);
  }

  function trigger() {
    if (fired) return;
    fired = true;
    if (window.WatchOutAlarm) window.WatchOutAlarm.start('hero');
  }

  function springBack() {
    cancelAnimationFrame(raf);
    if (reduce) { pull = 0; vel = 0; render(); return; }
    var last = performance.now();
    function step(t) {
      var dt = Math.min(0.032, (t - last) / 1000);
      last = t;
      vel += (-pull * 240 - vel * 15) * dt;
      pull += vel * dt;
      if (pull < -8) { pull = -8; vel = 0; }
      render();
      if (Math.abs(pull) > 0.05 || Math.abs(vel) > 0.5) raf = requestAnimationFrame(step);
      else { pull = 0; vel = 0; render(); }
    }
    raf = requestAnimationFrame(step);
  }

  function animateTo(target, ms, done) {
    cancelAnimationFrame(raf);
    if (!ms) { pull = target; render(); if (done) done(); return; }
    var from = pull, t0 = performance.now();
    function step(t) {
      var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      pull = from + (target - from) * e;
      render();
      if (k < 1) raf = requestAnimationFrame(step); else if (done) done();
    }
    raf = requestAnimationFrame(step);
  }

  /* ---------- tarik dengan mouse / jari ---------- */
  handle.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true; moved = false; fired = false; touched = true;
    startY = e.clientY; startPull = pull;
    if (window.WatchOutAlarm) window.WatchOutAlarm.prime();
    cancelAnimationFrame(raf);
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    root.classList.add('is-dragging');
  });

  handle.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    if (Math.abs(e.clientY - startY) > 4) moved = true;
    pull = rubber(startPull + (e.clientY - startY) * unitsPerPx());
    if (pull >= TRIGGER) trigger();
    render();
  });

  function release() {
    if (!dragging) return;
    dragging = false;
    if (window.WatchOutAlarm) window.WatchOutAlarm.prime();
    root.classList.remove('is-dragging');
    if (moved) suppressClick = true;
    springBack();
  }
  handle.addEventListener('pointerup', release);
  handle.addEventListener('pointercancel', release);
  handle.addEventListener('lostpointercapture', release);

  /* ---------- klik / Enter / Spasi: tarikan otomatis ---------- */
  handle.addEventListener('click', function () {
    if (suppressClick) { suppressClick = false; return; }
    touched = true; fired = false;
    if (window.WatchOutAlarm) window.WatchOutAlarm.prime();
    animateTo(TRIGGER + 18, reduce ? 0 : 240, function () { trigger(); springBack(); });
  });

  /* ---------- petunjuk: satu tarikan kecil saat halaman dibuka ---------- */
  if (!reduce) {
    setTimeout(function () {
      var r = figure.getBoundingClientRect();
      if (touched || r.bottom < 0 || r.top > window.innerHeight) return;
      animateTo(26, 320, springBack);
    }, 1600);
  }

  window.addEventListener('resize', render);
  render();
})();
