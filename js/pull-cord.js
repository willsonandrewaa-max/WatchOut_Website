/* ==========================================================================
   WatchOut! — TALI YANG BISA DITARIK
   --------------------------------------------------------------------------
   Dipakai di tiga tempat: gambar jam di bagian atas, jam simulator (Fitur),
   dan foto produk (Pesan sekarang). Tarik tali (ke bawah, atau ke kanan untuk foto produk) dengan mouse / jari,
   atau klik / tekan Enter pada tali. Jika ditarik cukup jauh, alarm berbunyi
   lewat js/alarm.js.

   Setiap tali di index.html ditandai data-pullcord, dengan pengaturan:
     data-view-w   lebar viewBox SVG tali
     data-free     tarikan ringan sebelum terasa "berat"
     data-max      tarikan maksimum
     data-trigger  jarak tarikan yang membunyikan alarm
     data-hint     isi "tug" jika tali perlu memberi contoh tarikan saat halaman dibuka
     data-axis     isi "x" jika tali ditarik ke kanan (default: ke bawah)
     data-scale    skala grup SVG tali, jika grup tali diperkecil/diperbesar (default 1)
   Semua angka memakai satuan viewBox SVG.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setup(root) {
    var svg = root.querySelector('[data-pullcord-svg]');
    var thread = root.querySelector('[data-cord-thread]');
    var lower = root.querySelector('[data-cord-lower]');
    var handle = root.querySelector('[data-pullcord-handle]');
    if (!svg || !thread || !lower || !handle) return;

    var VIEW_W = Number(root.getAttribute('data-view-w')) || 100;
    var FREE = Number(root.getAttribute('data-free')) || 40;
    var MAX = Number(root.getAttribute('data-max')) || 120;
    var TRIGGER = Number(root.getAttribute('data-trigger')) || 70;
    var tpl = thread.getAttribute('data-tpl');
    var baseY = Number(thread.getAttribute('data-base-y')) || 0;
    var source = root.getAttribute('data-source') || 'cord';
    var AXIS_X = root.getAttribute('data-axis') === 'x';
    var SCALE = Number(root.getAttribute('data-scale')) || 1;

    var pull = 0, vel = 0, raf = 0;
    var dragging = false, startPos = 0, startPull = 0, moved = false, fired = false, suppressClick = false, touched = false;

    function unitsPerPx() { return VIEW_W / (svg.getBoundingClientRect().width || VIEW_W); }

    function render() {
      var p = Math.round(pull * 10) / 10;
      if (tpl) thread.setAttribute('d', tpl.replace(/\{y\}/g, String(baseY + p)));
      lower.setAttribute('transform', 'translate(0 ' + p + ')');
      var px = (p * SCALE / unitsPerPx()).toFixed(2);
      handle.style.transform = AXIS_X ? 'translate(' + px + 'px, -50%)' : 'translate(-50%, ' + px + 'px)';
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
      if (window.WatchOutAlarm) window.WatchOutAlarm.start(source);
    }
    function springBack() {
      cancelAnimationFrame(raf);
      if (reduce) { pull = 0; vel = 0; render(); return; }
      var last = performance.now(), min = -MAX * 0.05;
      function step(t) {
        var dt = Math.min(0.032, (t - last) / 1000);
        last = t;
        vel += (-pull * 240 - vel * 15) * dt;
        pull += vel * dt;
        if (pull < min) { pull = min; vel = 0; }
        render();
        if (Math.abs(pull) > MAX * 0.0004 || Math.abs(vel) > MAX * 0.003) raf = requestAnimationFrame(step);
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
    function prime() { if (window.WatchOutAlarm) window.WatchOutAlarm.prime(); }

    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true; moved = false; fired = false; touched = true;
      startPos = AXIS_X ? e.clientX : e.clientY; startPull = pull;
      prime();
      cancelAnimationFrame(raf);
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      root.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var delta = (AXIS_X ? e.clientX : e.clientY) - startPos;
      if (Math.abs(delta) > 4) moved = true;
      pull = rubber(startPull + delta * unitsPerPx() / SCALE);
      if (pull >= TRIGGER) trigger();
      render();
    });
    function release() {
      if (!dragging) return;
      dragging = false;
      prime();
      root.classList.remove('is-dragging');
      if (moved) suppressClick = true;
      springBack();
    }
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
    handle.addEventListener('lostpointercapture', release);
    handle.addEventListener('click', function () {
      if (suppressClick) { suppressClick = false; return; }
      touched = true; fired = false;
      prime();
      animateTo(TRIGGER * 1.2, reduce ? 0 : 240, function () { trigger(); springBack(); });
    });

    if (root.getAttribute('data-hint') === 'tug' && !reduce) {
      setTimeout(function () {
        var r = root.getBoundingClientRect();
        if (touched || r.bottom < 0 || r.top > window.innerHeight) return;
        animateTo(TRIGGER * 0.3, 320, springBack);
      }, 1600);
    }
    window.addEventListener('resize', render);
    render();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-pullcord]'), setup);
})();
