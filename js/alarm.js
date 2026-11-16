/* ==========================================================================
   WatchOut! — SIMULASI ALARM
   --------------------------------------------------------------------------
   Membunyikan sirene (dibuat langsung oleh browser, tanpa file audio) dan
   memberi tahu bagian lain halaman bahwa alarm sedang aktif.

   Tombol di index.html yang terhubung ke file ini:
     data-alarm-toggle  -> bunyikan / matikan alarm
     data-alarm-stop    -> matikan alarm
     data-sound-toggle  -> suara aktif / mati
     data-alarm-status  -> teks status untuk pembaca layar
   Volume & durasi diatur di js/config.js (bagian "alarm").
   ========================================================================== */
window.WatchOutAlarm = (function () {
  'use strict';

  var cfg = (window.WATCHOUT_CONFIG && window.WATCHOUT_CONFIG.alarm) || {};
  var volume = Math.max(0, Math.min(1, cfg.volume === undefined ? 0.22 : cfg.volume));
  var duration = (cfg.durationSeconds === undefined ? 6 : cfg.durationSeconds) * 1000;
  var html = document.documentElement;
  var SOUND_KEY = 'watchout-sound';

  var active = false, stopTimer = 0, audioCtx = null, nodes = null;
  var soundOn = read(SOUND_KEY) !== 'off';

  function read(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } }

  /* ---------- Sirene (Web Audio API) ---------- */
  function audio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') {
        var resumed = audioCtx.resume();
        if (resumed && resumed.catch) resumed.catch(function () { /* browser menolak audio */ });
      }
    } catch (e) { return null; }
    return audioCtx;
  }

  function startSiren() {
    if (nodes || !soundOn || volume <= 0) return;
    var ctx = audio();
    if (!ctx) return;
    try { buildSiren(ctx); } catch (e) { nodes = null; /* tanpa suara, tampilan alarm tetap jalan */ }
  }

  function buildSiren(ctx) {
    var now = ctx.currentTime;

    var master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(volume, now + 0.05);

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 3600; filter.Q.value = 0.7;
    var comp = ctx.createDynamicsCompressor();

    // two-tone "wail": a bright tone plus a softer one an octave lower
    var tone = ctx.createOscillator(); tone.type = 'sawtooth'; tone.frequency.value = 1180;
    var low = ctx.createOscillator(); low.type = 'square'; low.frequency.value = 590;
    var lowGain = ctx.createGain(); lowGain.gain.value = 0.16;

    var lfo = ctx.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = 1.6;
    var sweep = ctx.createGain(); sweep.gain.value = 360;
    var sweepLow = ctx.createGain(); sweepLow.gain.value = 180;
    lfo.connect(sweep); sweep.connect(tone.frequency);
    lfo.connect(sweepLow); sweepLow.connect(low.frequency);

    tone.connect(filter); low.connect(lowGain); lowGain.connect(filter);
    filter.connect(comp); comp.connect(master); master.connect(ctx.destination);
    tone.start(now); low.start(now); lfo.start(now);
    nodes = { master: master, oscs: [tone, low, lfo] };
  }

  function stopSiren() {
    if (!nodes || !audioCtx) return;
    var n = nodes, now = audioCtx.currentTime;
    nodes = null;
    n.master.gain.cancelScheduledValues(now);
    n.master.gain.setValueAtTime(n.master.gain.value, now);
    n.master.gain.linearRampToValueAtTime(0, now + 0.12);
    n.oscs.forEach(function (o) { try { o.stop(now + 0.16); } catch (e) { /* already stopped */ } });
  }

  /* ---------- Status ---------- */
  function announce() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-alarm-status]'), function (el) {
      el.textContent = active ? (el.getAttribute('data-text-on') || '') : (el.getAttribute('data-text-off') || '');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-alarm-toggle]'), function (b) {
      b.setAttribute('aria-pressed', String(active));
    });
  }

  function emit(source) {
    var ev;
    try { ev = new CustomEvent('watchout:alarm', { detail: { active: active, source: source || null } }); }
    catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('watchout:alarm', false, false, { active: active, source: source || null }); }
    document.dispatchEvent(ev);
  }

  function start(source) {
    clearTimeout(stopTimer);
    stopTimer = setTimeout(function () { stop('timeout'); }, duration);
    if (active) return;
    active = true;
    html.setAttribute('data-alarm', 'on');
    startSiren();
    if (cfg.vibrate !== false && navigator.vibrate) { try { navigator.vibrate([180, 90, 180, 90, 380]); } catch (e) { /* not allowed */ } }
    announce();
    emit(source);
  }

  function stop(source) {
    clearTimeout(stopTimer);
    if (!active) return;
    active = false;
    html.setAttribute('data-alarm', 'off');
    stopSiren();
    if (navigator.vibrate) { try { navigator.vibrate(0); } catch (e) { /* ignore */ } }
    announce();
    emit(source);
  }

  function setSound(on) {
    soundOn = !!on;
    write(SOUND_KEY, soundOn ? 'on' : 'off');
    html.setAttribute('data-sound', soundOn ? 'on' : 'off');
    Array.prototype.forEach.call(document.querySelectorAll('[data-sound-toggle]'), function (b) {
      b.setAttribute('aria-pressed', String(soundOn));
    });
    if (!soundOn) stopSiren();
    else if (active) startSiren();
  }

  /* ---------- Hubungkan tombol ---------- */
  function bind() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-alarm-toggle],[data-alarm-stop],[data-sound-toggle]') : null;
      if (!t) return;
      if (t.hasAttribute('data-alarm-toggle')) { if (active) stop('button'); else start(t.getAttribute('data-alarm-source') || 'button'); }
      else if (t.hasAttribute('data-alarm-stop')) stop('button');
      else if (t.hasAttribute('data-sound-toggle')) setSound(!soundOn);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active) stop('escape'); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop('hidden'); });
    setSound(soundOn);
    announce();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();

  // Safari/iOS hanya mengizinkan audio yang disiapkan saat ada sentuhan/klik.
  function prime() { if (soundOn) audio(); }

  return {
    prime: prime,
    start: start,
    stop: stop,
    isActive: function () { return active; },
    setSound: setSound,
    isSoundOn: function () { return soundOn; }
  };
})();
