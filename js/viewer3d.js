/* ==========================================================================
   WatchOut! — VIEWER 3D
   --------------------------------------------------------------------------
   Menampilkan model 3D WatchOut! dengan WebGL murni (tanpa library), jadi
   tetap jalan walau index.html dibuka langsung dari folder.

   - Data model : assets/3d/watchout-model.js  (dibuat dengan tools/konversi-model.html)
   - Pengaturan : js/config.js  -> bagian "viewer" (warna, putar otomatis, dll)
   - Teks tombol & keterangan sudut pandang ada di index.html (bagian #lihat-3d)
   ========================================================================== */
(function () {
  'use strict';

  var stage = document.querySelector('[data-viewer]');
  if (!stage) return;

  var canvas = stage.querySelector('canvas');
  var CONFIG = window.WATCHOUT_CONFIG || {};
  var CFG = CONFIG.viewer || {};
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var captionEl = document.querySelector('[data-viewer-caption]');
  var viewButtons = Array.prototype.slice.call(document.querySelectorAll('[data-viewer-view]'));
  var autoButton = document.querySelector('[data-viewer-autorotate]');
  var hintEl = stage.querySelector('[data-viewer-hint]');

  /* ------------------------------------------------------------------ *
   * Sudut pandang kamera (yaw = putar kiri/kanan, pitch = atas/bawah,
   * zoom = jarak relatif, y = titik fokus vertikal)
   * ------------------------------------------------------------------ */
  var VIEWS = {
    front: { yaw: -0.34, pitch: 0.10, zoom: 0.86, x: 0.85, y: 0 },
    back:  { yaw: Math.PI - 0.34, pitch: 0.08, zoom: 0.86, x: 0.85, y: 0 },
    cord:  { yaw: -0.5, pitch: 0.06, zoom: 0.66, x: 1.9, y: 0 }
  };

  /* ------------------------------------------------------------------ *
   * Lazy-load data model: file model (±300 KB) baru dimuat saat bagian
   * 3D hampir terlihat, supaya bagian atas halaman tetap cepat.
   * ------------------------------------------------------------------ */
  var started = false;
  function loadModelScript() {
    if (started) return;
    started = true;
    if (window.WATCHOUT_MODEL) { init(); return; }
    var s = document.createElement('script');
    s.src = stage.getAttribute('data-model-src') || 'assets/3d/watchout-model.js';
    s.onload = init;
    s.onerror = function () { showFallback('File model 3D tidak ditemukan: ' + s.src); };
    document.body.appendChild(s);
  }
  if ('IntersectionObserver' in window) {
    var lazy = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { lazy.disconnect(); loadModelScript(); }
    }, { rootMargin: '700px 0px' });
    lazy.observe(stage);
  } else {
    loadModelScript();
  }

  function showFallback(reason) {
    stage.classList.remove('is-ready');
    stage.classList.add('is-fallback');
    if (window.console && reason) console.warn('[WatchOut 3D] ' + reason);
  }

  /* ------------------------------------------------------------------ *
   * Matematika kecil (matriks 4x4 column-major)
   * ------------------------------------------------------------------ */
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.sqrt(dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  function mat4Multiply(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      var s = 0;
      for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf;
    return m;
  }
  function lookAt(eye, target, up) {
    var z = norm(sub(eye, target)), x = norm(cross(up, z)), y = cross(z, x), m = new Float32Array(16);
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
    m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
    m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
    m[12] = -dot(x, eye); m[13] = -dot(y, eye); m[14] = -dot(z, eye); m[15] = 1;
    return { m: m, x: x, y: y, z: z };
  }
  function transformMatrix(cols, t) { // cols: 3 basis vectors, t: translation
    var m = new Float32Array(16);
    m[0] = cols[0][0]; m[1] = cols[0][1]; m[2] = cols[0][2];
    m[4] = cols[1][0]; m[5] = cols[1][1]; m[6] = cols[1][2];
    m[8] = cols[2][0]; m[9] = cols[2][1]; m[10] = cols[2][2];
    m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1;
    return m;
  }
  function hexToLinear(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (c) { return Math.pow(c / 255, 2.2); });
  }
  function pick(v, d) { return v === undefined || v === null ? d : v; }
  function b64Bytes(b64) {
    var bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  /* ------------------------------------------------------------------ *
   * Shader
   * ------------------------------------------------------------------ */
  var VS = [
    'attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUv;',
    'uniform mat4 uModel; uniform mat4 uViewProj;',
    'varying vec3 vW; varying vec3 vN; varying vec2 vUv;',
    'void main(){',
    '  vec4 w = uModel * vec4(aPos, 1.0);',
    '  vW = w.xyz; vN = (uModel * vec4(aNrm, 0.0)).xyz; vUv = aUv;',
    '  gl_Position = uViewProj * w;',
    '}'
  ].join('\n');

  var FS = [
    'precision highp float;',
    'varying vec3 vW; varying vec3 vN; varying vec2 vUv;',
    'uniform vec3 uCam; uniform vec3 uBase; uniform float uRough; uniform float uCoat;',
    'uniform float uUseMap; uniform sampler2D uMap;',
    'uniform float uScreen; uniform sampler2D uScreenTex;',
    'uniform vec3 uL0; uniform vec3 uC0; uniform vec3 uL1; uniform vec3 uC1; uniform vec3 uL2; uniform vec3 uC2;',
    'uniform vec3 uSky; uniform vec3 uGround; uniform float uExposure;',
    'const float PI = 3.14159265;',
    'vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }',
    'float D_GGX(float NoH, float r){ float a = r*r; float a2 = a*a; float d = NoH*NoH*(a2-1.0)+1.0; return a2/(PI*d*d + 1e-5); }',
    'float Vis(float NoV, float NoL, float r){ float k = r*r*0.5; return 0.25/((NoV*(1.0-k)+k)*(NoL*(1.0-k)+k) + 1e-5); }',
    'vec3 F_S(vec3 f0, float c){ return f0 + (1.0-f0)*pow(1.0-c, 5.0); }',
    // studio environment fixed to the world: overhead softbox, two strip lights, warm floor
    'vec3 studio(vec3 r, float rough){',
    '  float w = 0.10 + rough*0.6;',
    '  float top = smoothstep(0.72-w, 0.72+w, r.y);',
    '  float sl = smoothstep(0.86-w, 0.86+w, dot(r, normalize(vec3(-1.0, 0.25, 0.55))));',
    '  float sr = smoothstep(0.88-w, 0.88+w, dot(r, normalize(vec3(1.0, 0.18, -0.35))));',
    '  float hz = smoothstep(-0.35, 0.45, r.y);',
    '  vec3 base = mix(vec3(0.035,0.010,0.012), vec3(0.22,0.12,0.12), hz);',
    '  return base + top*vec3(2.4,2.3,2.2) + sl*vec3(1.6,1.5,1.45) + sr*vec3(1.1,1.0,1.05);',
    '}',
    'vec3 lightUp(vec3 N, vec3 V, vec3 L, vec3 C, vec3 albedo, float rough, float coat){',
    '  float NoL = max(dot(N, L), 0.0);',
    '  vec3 H = normalize(L + V);',
    '  float NoV = max(dot(N, V), 1e-3), NoH = max(dot(N, H), 0.0), VoH = max(dot(V, H), 0.0);',
    '  vec3 F = F_S(vec3(0.04), VoH);',
    '  vec3 spec = D_GGX(NoH, rough) * Vis(NoV, NoL, rough) * F;',
    '  vec3 diff = (1.0 - F) * albedo / PI;',
    '  vec3 c = (diff + spec) * C * NoL * PI;',
    '  c += D_GGX(NoH, 0.16) * Vis(NoV, NoL, 0.16) * F_S(vec3(0.04), VoH).x * coat * C * NoL * PI;',
    '  return c;',
    '}',
    'void main(){',
    '  vec3 N = normalize(vN);',
    '  vec3 V = normalize(uCam - vW);',
    '  if (dot(N, V) < -0.25) N = -N;',            // tolerate flipped normals from the source model
    '  vec3 albedo = uBase; float alpha = 1.0; float rough = uRough;',
    '  if (uUseMap > 0.5) { vec4 t = texture2D(uMap, vUv); albedo = toLin(t.rgb); alpha = t.a; }',
    '  if (uScreen > 0.5) { albedo = vec3(0.004); rough = 0.06; }',
    '  float NoV = max(dot(N, V), 1e-3);',
    '  vec3 col = albedo * mix(uGround, uSky, N.y * 0.5 + 0.5);',
    '  col += lightUp(N, V, uL0, uC0, albedo, rough, uCoat);',
    '  col += lightUp(N, V, uL1, uC1, albedo, rough, uCoat);',
    '  col += lightUp(N, V, uL2, uC2, albedo, rough, uCoat);',
    '  vec3 R = reflect(-V, N);',
    '  float fr = 0.04 + (max(1.0 - rough, 0.04) - 0.04) * pow(1.0 - NoV, 5.0);',   // roughness-aware Fresnel
    '  col += studio(R, rough) * fr * mix(0.85, 0.45, rough);',
    '  col += studio(R, 0.2) * F_S(vec3(0.04), NoV).x * uCoat * 0.45;',
    '  if (uScreen > 0.5) { col = col * 0.6 + toLin(texture2D(uScreenTex, vUv).rgb) * 1.35; }',
    '  col *= uExposure;',
    '  col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);',   // ACES filmic
    '  gl_FragColor = vec4(pow(col, vec3(1.0/2.2)), alpha);',
    '}'
  ].join('\n');

  var FLOOR_VS = [
    'attribute vec3 aPos; uniform mat4 uViewProj; varying vec3 vW;',
    'void main(){ vW = aPos; gl_Position = uViewProj * vec4(aPos, 1.0); }'
  ].join('\n');
  var FLOOR_FS = [
    'precision mediump float; varying vec3 vW;',
    'uniform vec3 uCenter; uniform vec2 uRadius; uniform float uFade; uniform float uGlow;',
    'void main(){',
    '  vec2 d = (vW.xz - uCenter.xz) / uRadius;',
    '  float r = length(d);',
    '  float pool = (1.0 - smoothstep(0.0, 1.0, r * 0.5)) * 0.28;',
    '  float shade = pow(1.0 - smoothstep(0.0, 1.0, r), 1.8) * 0.55;',
    '  vec3 poolCol = mix(vec3(0.46, 0.10, 0.12), vec3(0.95, 0.18, 0.12), uGlow);',
    '  float a = (pool + uGlow * 0.25 * (1.0 - smoothstep(0.0, 1.0, r * 0.4))) * uFade;',
    '  vec3 c = poolCol * a * (1.0 - shade);',
    '  a = a + shade * uFade - a * shade * uFade;',
    '  gl_FragColor = vec4(c, a);',   // premultiplied
    '}'
  ].join('\n');

  function compile(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var info = { program: p, a: {}, u: {} };
    var na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES), nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, n;
    for (i = 0; i < na; i++) { n = gl.getActiveAttrib(p, i).name; info.a[n] = gl.getAttribLocation(p, n); }
    for (i = 0; i < nu; i++) { n = gl.getActiveUniform(p, i).name; info.u[n] = gl.getUniformLocation(p, n); }
    return info;
  }

  /* ------------------------------------------------------------------ *
   * Geometri tali penarik (dibuat prosedural)
   * ------------------------------------------------------------------ */
  // Sapuan penampang elips sepanjang jalur pada bidang XY.
  function sweep(path, hw, ht, radial, closed, profile) {
    var n = path.length, pos = [], idx = [], i, j;
    for (i = 0; i < n; i++) {
      var prev = path[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)];
      var next = path[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
      var T = norm(sub(next, prev));
      var Nv = [-T[1], T[0], 0], l = Math.sqrt(Nv[0] * Nv[0] + Nv[1] * Nv[1]);
      Nv = l > 1e-6 ? [Nv[0] / l, Nv[1] / l, 0] : [1, 0, 0];
      var s = profile ? profile(n > 1 ? i / (n - 1) : 0) : 1;
      for (j = 0; j < radial; j++) {
        var a = j / radial * Math.PI * 2, ca = Math.cos(a) * hw * s, sa = Math.sin(a) * ht * s;
        pos.push(path[i][0] + Nv[0] * ca, path[i][1] + Nv[1] * ca, path[i][2] + sa);
      }
    }
    var segs = closed ? n : n - 1;
    for (i = 0; i < segs; i++) {
      var i2 = (i + 1) % n;
      for (j = 0; j < radial; j++) {
        var j2 = (j + 1) % radial, A = i * radial + j, B = i * radial + j2, C = i2 * radial + j, D = i2 * radial + j2;
        idx.push(A, C, B, B, C, D);
      }
    }
    return { pos: pos, idx: idx };
  }
  function merge(list) {
    var pos = [], idx = [];
    list.forEach(function (g) {
      var base = pos.length / 3;
      Array.prototype.push.apply(pos, g.pos);
      g.idx.forEach(function (k) { idx.push(k + base); });
    });
    var nrm = new Float32Array(pos.length);
    for (var t = 0; t < idx.length; t += 3) {
      var a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      var e1 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]];
      var e2 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
      var fn = cross(e1, e2);
      [a, b, c].forEach(function (o) { nrm[o] += fn[0]; nrm[o + 1] += fn[1]; nrm[o + 2] += fn[2]; });
    }
    for (var v = 0; v < nrm.length; v += 3) {
      var nn = norm([nrm[v], nrm[v + 1], nrm[v + 2]]);
      // the sweep winds inward; flip so normals face outwards
      nrm[v] = -nn[0]; nrm[v + 1] = -nn[1]; nrm[v + 2] = -nn[2];
    }
    return { pos: new Float32Array(pos), nrm: nrm, idx: new Uint16Array(idx) };
  }
  function line(x0, y0, x1, y1, steps) {
    var p = [];
    for (var i = 0; i <= steps; i++) { var t = i / steps; p.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0]); }
    return p;
  }
  function roundEnds(edge) {
    return function (s) {
      var e = Math.min(s, 1 - s) / edge;
      return e >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - e) * (1 - e)));
    };
  }
  function buildCord() {
    // Ukuran mengikuti render mockup (1 unit ≈ 14,5 mm pada jam asli)
    var thread = [-1, 1].map(function (s) {
      return sweep(line(0.015 * s, 0.05, 0.045 * s, -0.44, 6), 0.011, 0.011, 8, false);
    });
    var cap = sweep(line(0, -0.395, 0, -0.545, 12), 0.105, 0.078, 18, false, roundEnds(0.35));
    var band = sweep(line(0, -0.5, 0, -1.47, 10), 0.068, 0.024, 14, false, roundEnds(0.04));
    var loopPts = [], L = 1.98, top = -1.4, hw = 0.34, N = 72;
    for (var i = 0; i <= N; i++) {
      var t = 0.12 + (Math.PI * 2 - 0.24) * i / N;
      loopPts.push([hw * Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), 1.5), top - L * (1 - Math.cos(t)) / 2, 0]);
    }
    var loop = sweep(loopPts, 0.05, 0.021, 12, false, roundEnds(0.015));
    // a tiny printed mark on the band, like in the render
    var mark = sweep(line(-0.012, -0.66, 0.03, -0.69, 2), 0.022, 0.008, 6, false, roundEnds(0.5));
    return { thread: merge(thread), lower: merge([cap, band, loop]), mark: merge([mark]), length: top - L };
  }

  /* ------------------------------------------------------------------ *
   * Layar jam (canvas 2D -> tekstur)
   * ------------------------------------------------------------------ */
  var DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function roundRect(x, X, y, w, h, r) {
    x.beginPath();
    x.moveTo(X + r, y); x.lineTo(X + w - r, y); x.quadraticCurveTo(X + w, y, X + w, y + r);
    x.lineTo(X + w, y + h - r); x.quadraticCurveTo(X + w, y + h, X + w - r, y + h);
    x.lineTo(X + r, y + h); x.quadraticCurveTo(X, y + h, X, y + h - r);
    x.lineTo(X, y + r); x.quadraticCurveTo(X, y, X + r, y); x.closePath();
  }
  function drawScreen(cv, now, alarmPhase) {
    var x = cv.getContext('2d'), W = cv.width, H = cv.height;
    var font = '"Poppins", system-ui, sans-serif';
    x.fillStyle = '#030203';
    x.fillRect(0, 0, W, H);
    var mx = W * 0.13, my = H * 0.15;
    if (alarmPhase >= 0) {
      var on = alarmPhase < 0.5;
      x.fillStyle = on ? '#E8321E' : '#1A0204';
      roundRect(x, mx, my, W - mx * 2, H - my * 2, H * 0.08); x.fill();
      var fg = on ? '#FFF6EC' : '#FF4A36';
      // warning triangle
      var U2 = Math.min(W, H), cx = W / 2, cy = H / 2 - U2 * 0.1, s = U2 * 0.17;
      x.strokeStyle = fg; x.lineWidth = U2 * 0.035; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s * 1.12, cy + s * 0.8); x.lineTo(cx - s * 1.12, cy + s * 0.8); x.closePath(); x.stroke();
      x.fillStyle = fg; x.fillRect(cx - U2 * 0.016, cy - s * 0.45, U2 * 0.032, s * 0.75);
      x.beginPath(); x.arc(cx, cy + s * 0.52, U2 * 0.022, 0, Math.PI * 2); x.fill();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '800 ' + Math.round(U2 * 0.11) + 'px ' + font;
      x.fillText('Minta', W / 2, H / 2 + U2 * 0.24);
      x.fillText('tolong!', W / 2, H / 2 + U2 * 0.37);
      return;
    }
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    var U = Math.min(W, H), cy = H / 2;
    x.fillStyle = '#FFF4EA';
    if (H > W * 1.05) { // layar tegak: jam di atas, menit di bawah
      x.font = '700 ' + Math.round(U * 0.46) + 'px ' + font;
      x.fillText(pad(now.getHours()), W / 2, cy - U * 0.1);
      x.fillText(pad(now.getMinutes()), W / 2, cy + U * 0.3);
      x.fillStyle = '#FF8E86';
      x.font = '700 ' + Math.round(U * 0.095) + 'px ' + font;
      x.fillText(DAYS[now.getDay()] + ', ' + now.getDate() + ' ' + MONTHS[now.getMonth()], W / 2, cy + U * 0.48);
      cy += U * 0.57;
    } else {
      x.font = '700 ' + Math.round(U * 0.36) + 'px ' + font;
      x.fillText(pad(now.getHours()) + ':' + pad(now.getMinutes()), W / 2, cy + U * 0.06);
      x.fillStyle = '#FF8E86';
      x.font = '700 ' + Math.round(U * 0.085) + 'px ' + font;
      x.fillText(DAYS[now.getDay()] + ', ' + now.getDate() + ' ' + MONTHS[now.getMonth()], W / 2, cy + U * 0.22);
      cy += U * 0.29;
    }
    // small seconds bar
    var bw = Math.min(W * 0.5, U * 0.4), bx = (W - bw) / 2, by = cy;
    x.fillStyle = 'rgba(255,244,234,0.16)'; roundRect(x, bx, by, bw, U * 0.018, U * 0.009); x.fill();
    x.fillStyle = '#FF8E86'; roundRect(x, bx, by, Math.max(U * 0.018, bw * (now.getSeconds() + 1) / 60), U * 0.018, U * 0.009); x.fill();
  }

  /* ------------------------------------------------------------------ *
   * Inisialisasi
   * ------------------------------------------------------------------ */
  var gl, prog, floorProg, parts = [], cordMeshes = null, floorBuf = null, screenTex = null, screenCanvas = null;
  var roll = function (p) { return p; };
  function rolledMatrix(cols, t) { return transformMatrix(cols.map(function (c) { return roll(c); }), roll(t)); }
  var model = null, centerW = [0, 0, 0], modelMatrix = null, cordAttach = [0, 0, 0], floorY = -5;
  var running = false, raf = 0, lastT = 0, lastSecond = -1, interacted = false;
  var cam = { yaw: VIEWS.front.yaw, pitch: VIEWS.front.pitch, zoom: 1.2, x: VIEWS.front.x, y: VIEWS.front.y };
  var goal = { yaw: VIEWS.front.yaw, pitch: VIEWS.front.pitch, zoom: 1.0, x: VIEWS.front.x, y: VIEWS.front.y };
  var autoRotate = CFG.autoRotate !== false && !reduceMotion;
  var autoSpeed = (pick(CFG.autoRotateSpeed, 12) * Math.PI) / 180;
  var lastInput = 0, alarmOn = false, pull = 0, pullVel = 0;

  function init() {
    model = window.WATCHOUT_MODEL;
    if (!model || !model.parts) { showFallback('Data model 3D kosong.'); return; }
    gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true }) ||
         canvas.getContext('experimental-webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) { showFallback('Browser ini tidak mendukung WebGL.'); return; }
    try { setup(); } catch (err) { showFallback(err && err.message); return; }
    stage.classList.add('is-ready');
    bindInput();
    setView('front', true);
    observeVisibility();
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); showFallback('Konteks WebGL hilang.'); });
  }

  function setup() {
    var ext32 = gl.getExtension('OES_element_index_uint');
    prog = compile(gl, VS, FS);
    floorProg = compile(gl, FLOOR_VS, FLOOR_FS);

    // orientation: where the model's X, Y, Z axes point in the scene
    var ori = (CFG.orientation || ['-y', '+z', '-x']).map(function (s) {
      s = String(s).trim();
      var sign = s.charAt(0) === '-' ? -1 : 1, ax = s.slice(-1).toLowerCase();
      return ax === 'x' ? [sign, 0, 0] : ax === 'y' ? [0, sign, 0] : [0, 0, sign];
    });
    // roll: putar seluruh jam (beserta tali) searah layar, supaya layar tegak seperti dipakai
    var rollA = (CFG.roll == null ? 90 : CFG.roll) * Math.PI / 180, rc = Math.cos(rollA), rs = Math.sin(rollA);
    roll = function (p) { return [rc * p[0] - rs * p[1], rs * p[0] + rc * p[1], p[2]]; };
    function orient(p) {
      return [ori[0][0] * p[0] + ori[1][0] * p[1] + ori[2][0] * p[2],
              ori[0][1] * p[0] + ori[1][1] * p[1] + ori[2][1] * p[2],
              ori[0][2] * p[0] + ori[1][2] * p[1] + ori[2][2] * p[2]];
    }
    var focus = model.parts.filter(function (p) { return p.object === (CFG.focusPart || 'mesh_3'); })[0] || null;
    var fb = focus ? focus.bbox : model.bounds;
    centerW = orient([(fb.min[0] + fb.max[0]) / 2, (fb.min[1] + fb.max[1]) / 2, (fb.min[2] + fb.max[2]) / 2]);
    modelMatrix = rolledMatrix(ori, scale(centerW, -1));

    // Logo di bagian belakang tetap tegak walaupun jam diputar (roll)
    function uprightDecal(part) {
      var b = part.bbox || model.bounds, k = CFG.decalScale || 0.86;
      var c = sub(orient([(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]), centerW);
      var rc2 = roll(c), cols = ori.map(function (v) { return [v[0] * k, v[1] * k, v[2]]; });
      // p -> k*(orient(p) - centerW - c) + roll(c)   (z tidak diskalakan)
      var t0 = sub(scale(centerW, -1), c);
      return transformMatrix(cols, [t0[0] * k + rc2[0], t0[1] * k + rc2[1], t0[2] + rc2[2]]);
    }
    var bmin = model.bounds.min, bsize = [0, 1, 2].map(function (k) { return model.bounds.max[k] - model.bounds.min[k]; });
    var matCfg = CFG.materials || {};
    var screenMat = CFG.screen && CFG.screen.enabled !== false ? CFG.screen.material : null;
    var textures = {};

    model.parts.forEach(function (p) {
      var mtl = model.materials[p.material] || {};
      var mc = matCfg[p.material] || {};
      if (mc.visible === false) return;
      var q = new Uint16Array(b64Bytes(p.position).buffer);
      var pos = new Float32Array(q.length);
      for (var i = 0; i < q.length; i++) { var k = i % 3; pos[i] = bmin[k] + (q[i] / 65535) * bsize[k]; }
      var nrm = new Int8Array(b64Bytes(p.normal).buffer);
      var idxBytes = b64Bytes(p.index);
      var idx = p.index32 ? new Uint32Array(idxBytes.buffer) : new Uint16Array(idxBytes.buffer);
      if (p.index32 && !ext32) return;
      var uv = p.uv ? new Float32Array(b64Bytes(p.uv).buffer) : null;
      var isScreen = p.material === screenMat;
      if (isScreen) { // planar UVs across the screen as seen from the front
        var o = [], mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
        for (var v = 0; v < pos.length; v += 3) {
          var w = roll(sub(orient([pos[v], pos[v + 1], pos[v + 2]]), centerW)); o.push(w);
          mnx = Math.min(mnx, w[0]); mxx = Math.max(mxx, w[0]); mny = Math.min(mny, w[1]); mxy = Math.max(mxy, w[1]);
        }
        uv = new Float32Array(o.length * 2);
        o.forEach(function (w, n) { uv[n * 2] = (w[0] - mnx) / (mxx - mnx); uv[n * 2 + 1] = (w[1] - mny) / (mxy - mny); });
        screenCanvas = document.createElement('canvas');
        screenCanvas.width = 1024;
        screenCanvas.height = Math.round(1024 * (mxy - mny) / (mxx - mnx));
        screenTex = makeTexture(null);
      }
      var mapTex = null;
      if (mtl.map && model.textures && model.textures[mtl.map]) {
        if (!textures[mtl.map]) textures[mtl.map] = loadTexture(model.textures[mtl.map]);
        mapTex = textures[mtl.map];
      }
      parts.push({
        pos: buffer(gl.ARRAY_BUFFER, pos), nrm: buffer(gl.ARRAY_BUFFER, nrm), uv: uv ? buffer(gl.ARRAY_BUFFER, uv) : null,
        idx: buffer(gl.ELEMENT_ARRAY_BUFFER, idx), count: idx.length, type: p.index32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
        nrmType: gl.BYTE, color: mc.color ? hexToLinear(mc.color) : (mtl.kd || [0.8, 0.8, 0.8]),
        rough: pick(mc.roughness, 0.5), coat: pick(mc.clearcoat, 0), screen: isScreen, map: mapTex,
        transparent: !!mapTex, matrix: mapTex ? uprightDecal(p) : modelMatrix
      });
    });

    // Cord
    var cc = CFG.cord || {};
    var lowest = -Infinity;
    if (cc.enabled !== false) {
      cordAttach = sub(orient(cc.attach || [2.774, 0.298, 0.048]), centerW);
      var cord = buildCord();
      var col = hexToLinear(cc.color || '#F4F1EE');
      cordMeshes = {
        thread: meshFrom(cord.thread, col, 0.45),
        lower: meshFrom(cord.lower, col, 0.5),
        mark: meshFrom(cord.mark, hexToLinear('#6E6A68'), 0.6)
      };
      lowest = cordAttach[1] + cord.length;
    }
    // floor below the lowest point
    var minY = Infinity;
    for (var c = 0; c < 8; c++) {
      var corner = [c & 1 ? model.bounds.max[0] : model.bounds.min[0], c & 2 ? model.bounds.max[1] : model.bounds.min[1], c & 4 ? model.bounds.max[2] : model.bounds.min[2]];
      minY = Math.min(minY, roll(sub(orient(corner), centerW))[1]);
    }
    floorY = minY - 0.45;
    var F = 40;
    floorBuf = buffer(gl.ARRAY_BUFFER, new Float32Array([-F, floorY, -F, F, floorY, -F, -F, floorY, F, F, floorY, F]));

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastSecond = -1; });
  }

  function buffer(target, data) {
    var b = gl.createBuffer();
    gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW);
    return b;
  }
  function meshFrom(g, color, rough) {
    return { pos: buffer(gl.ARRAY_BUFFER, g.pos), nrm: buffer(gl.ARRAY_BUFFER, g.nrm), uv: null,
      idx: buffer(gl.ELEMENT_ARRAY_BUFFER, g.idx), count: g.idx.length, type: gl.UNSIGNED_SHORT,
      nrmType: gl.FLOAT, color: color, rough: rough, coat: 0.15, screen: false, map: null, transparent: false, matrix: null };
  }
  function makeTexture(img) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
  function loadTexture(src) {
    var holder = { tex: makeTexture(null), ready: false };
    var img = new Image();
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, holder.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      var pot = (img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0;
      if (pot) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      holder.ready = true;
      requestDraw();
    };
    img.src = src;
    return holder;
  }
  function updateScreen(now) {
    if (!screenCanvas) return;
    var phase = alarmOn ? (now.getTime() % 700) / 700 : -1;
    drawScreen(screenCanvas, now, phase);
    gl.bindTexture(gl.TEXTURE_2D, screenTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, screenCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */
  var needsDraw = true;
  function requestDraw() { needsDraw = true; if (running && !raf) raf = requestAnimationFrame(tick); }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; needsDraw = true; }
  }

  function bindPart(p) {
    gl.bindBuffer(gl.ARRAY_BUFFER, p.pos);
    gl.enableVertexAttribArray(prog.a.aPos);
    gl.vertexAttribPointer(prog.a.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, p.nrm);
    gl.enableVertexAttribArray(prog.a.aNrm);
    gl.vertexAttribPointer(prog.a.aNrm, 3, p.nrmType, p.nrmType === gl.BYTE, 0, 0);
    if (prog.a.aUv !== undefined) {
      if (p.uv) {
        gl.bindBuffer(gl.ARRAY_BUFFER, p.uv);
        gl.enableVertexAttribArray(prog.a.aUv);
        gl.vertexAttribPointer(prog.a.aUv, 2, gl.FLOAT, false, 0, 0);
      } else {
        gl.disableVertexAttribArray(prog.a.aUv);
        gl.vertexAttrib2f(prog.a.aUv, 0, 0);
      }
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.idx);
  }
  function drawPart(p, matrix) {
    var u = prog.u;
    bindPart(p);
    gl.uniformMatrix4fv(u.uModel, false, matrix || p.matrix);
    gl.uniform3fv(u.uBase, p.color);
    gl.uniform1f(u.uRough, p.rough);
    gl.uniform1f(u.uCoat, p.coat);
    gl.uniform1f(u.uScreen, p.screen ? 1 : 0);
    var useMap = p.map && p.map.ready;
    gl.uniform1f(u.uUseMap, useMap ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, useMap ? p.map.tex : screenTex);
    gl.uniform1i(u.uMap, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, screenTex);
    gl.uniform1i(u.uScreenTex, 1);
    if (p.transparent && !useMap) return;
    gl.drawElements(gl.TRIANGLES, p.count, p.type, 0);
  }

  function draw() {
    resize();
    var aspect = canvas.width / canvas.height;
    var fov = 28 * Math.PI / 180;
    // keep the watch + cord framed on any screen shape
    var frameH = 7.6, frameW = 7.8;
    var dist = Math.max((frameH / 2) / Math.tan(fov / 2), (frameW / 2) / (Math.tan(fov / 2) * aspect)) * cam.zoom;
    var target = [cam.x, cam.y, 0];
    var eye = [target[0] + dist * Math.sin(cam.yaw) * Math.cos(cam.pitch), target[1] + dist * Math.sin(cam.pitch), target[2] + dist * Math.cos(cam.yaw) * Math.cos(cam.pitch)];
    var view = lookAt(eye, target, [0, 1, 0]);
    var viewProj = mat4Multiply(perspective(fov, aspect, 0.5, 120), view.m);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // floor (soft light pool + shadow), drawn first without depth writes
    gl.useProgram(floorProg.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, floorBuf);
    gl.enableVertexAttribArray(floorProg.a.aPos);
    gl.vertexAttribPointer(floorProg.a.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(floorProg.u.uViewProj, false, viewProj);
    gl.uniform3fv(floorProg.u.uCenter, [0, floorY, 0]);
    gl.uniform2fv(floorProg.u.uRadius, [6.5, 2.2]);
    gl.uniform1f(floorProg.u.uFade, Math.max(0, Math.min(1, (eye[1] - floorY) / 2.5)));
    gl.uniform1f(floorProg.u.uGlow, alarmOn ? 0.5 + 0.5 * Math.sin(performance.now() / 110) : 0);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(floorProg.a.aPos);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    gl.useProgram(prog.program);
    var u = prog.u;
    gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
    gl.uniform3fv(u.uCam, eye);
    // lights follow the camera so every side of the watch stays readable
    function camDir(x, y, z) { return norm(add(add(scale(view.x, x), scale(view.y, y)), scale(view.z, z))); }
    gl.uniform3fv(u.uL0, camDir(-0.45, 0.6, 0.66)); gl.uniform3fv(u.uC0, [1.55, 1.5, 1.45]);
    gl.uniform3fv(u.uL1, camDir(0.8, -0.05, 0.6)); gl.uniform3fv(u.uC1, [0.34, 0.36, 0.42]);
    gl.uniform3fv(u.uL2, camDir(0.25, 0.45, -0.86)); gl.uniform3fv(u.uC2, [1.5, 1.1, 1.1]);
    gl.uniform3fv(u.uSky, [0.26, 0.25, 0.25]);
    gl.uniform3fv(u.uGround, [0.10, 0.035, 0.04]);
    gl.uniform1f(u.uExposure, 1.0);

    var opaque = parts.filter(function (p) { return !p.transparent; });
    opaque.forEach(function (p) { drawPart(p); });
    if (cordMeshes) {
      var A = cordAttach, stretch = (0.44 + pull) / 0.44;
      drawPart(cordMeshes.thread, rolledMatrix([[1, 0, 0], [0, stretch, 0], [0, 0, 1]], A));
      var low = rolledMatrix([[1, 0, 0], [0, 1, 0], [0, 0, 1]], [A[0], A[1] - pull, A[2]]);
      drawPart(cordMeshes.lower, low);
      drawPart(cordMeshes.mark, rolledMatrix([[1, 0, 0], [0, 1, 0], [0, 0, 1]], [A[0], A[1] - pull, A[2] - 0.021]));
    }
    // transparent decals (logo) last
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    parts.filter(function (p) { return p.transparent; }).forEach(function (p) { drawPart(p); });
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function damp(cur, target, k, dt) { return cur + (target - cur) * (1 - Math.exp(-k * dt)); }

  function tick(t) {
    raf = 0;
    if (!running) return;
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;
    lastT = t;
    var moving = false;

    if (autoRotate && !dragging && performance.now() - lastInput > 2600) { goal.yaw += autoSpeed * dt; moving = true; }
    var k = reduceMotion ? 30 : 7;
    ['yaw', 'pitch', 'zoom', 'x', 'y'].forEach(function (key) {
      var nv = damp(cam[key], goal[key], k, dt);
      if (Math.abs(nv - goal[key]) > 1e-4) moving = true;
      cam[key] = Math.abs(nv - goal[key]) < 1e-5 ? goal[key] : nv;
    });

    // cord pull spring
    var pullGoal = alarmOn ? 0.62 : 0;
    var acc = (pullGoal - pull) * 260 - pullVel * (alarmOn ? 30 : 15);
    pullVel += acc * dt; pull += pullVel * dt;
    if (pull < -0.04) { pull = -0.04; pullVel = 0; }
    if (Math.abs(pull - pullGoal) > 1e-4 || Math.abs(pullVel) > 1e-4) moving = true; else { pull = pullGoal; pullVel = 0; }

    var now = new Date();
    if (alarmOn || now.getSeconds() !== lastSecond) { lastSecond = now.getSeconds(); updateScreen(now); needsDraw = true; }
    if (alarmOn) moving = true;

    if (moving || needsDraw) { draw(); needsDraw = false; }
    raf = requestAnimationFrame(tick);
  }

  function start() { if (running) return; running = true; lastT = 0; raf = requestAnimationFrame(tick); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  function observeVisibility() {
    var visible = true;
    function update() { if (visible && !document.hidden) start(); else stop(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        // the newest entry wins: during smooth scrolling several can arrive at once
        visible = entries[entries.length - 1].isIntersecting;
        update();
      }, { rootMargin: '100px 0px' }).observe(stage);
    }
    document.addEventListener('visibilitychange', update);
    window.addEventListener('resize', requestDraw);
    update();
  }

  /* ------------------------------------------------------------------ *
   * Kontrol: geser, cubit (zoom), keyboard, tombol
   * ------------------------------------------------------------------ */
  var dragging = false, pointers = {}, lastX = 0, lastY = 0, pinchDist = 0;

  function noteInput() {
    lastInput = performance.now();
    if (!interacted) { interacted = true; if (hintEl) hintEl.classList.add('is-hidden'); }
    requestDraw();
  }
  function clampGoal() {
    goal.pitch = Math.max(-0.45, Math.min(0.62, goal.pitch));
    goal.zoom = Math.max(0.45, Math.min(1.6, goal.zoom));
  }
  function setPressed(name) {
    viewButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-viewer-view') === name)); });
  }
  function setView(name, instant) {
    var v = VIEWS[name]; if (!v) return;
    // rotate the shortest way round
    var twoPi = Math.PI * 2, dy = ((v.yaw - goal.yaw) % twoPi + twoPi * 1.5) % twoPi - Math.PI;
    goal.yaw += dy; goal.pitch = v.pitch; goal.zoom = v.zoom; goal.x = v.x || 0; goal.y = v.y;
    if (instant) { cam.yaw = goal.yaw; cam.pitch = goal.pitch; cam.x = goal.x; cam.y = goal.y; }
    setPressed(name);
    var btn = viewButtons.filter(function (b) { return b.getAttribute('data-viewer-view') === name; })[0];
    if (!instant && captionEl && btn && btn.getAttribute('data-caption')) captionEl.textContent = btn.getAttribute('data-caption');
    requestDraw();
  }
  function setAuto(on) {
    autoRotate = on;
    if (autoButton) autoButton.setAttribute('aria-pressed', String(on));
    requestDraw();
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', function (e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2) { var a = pointers[ids[0]], b = pointers[ids[1]]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); }
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      stage.classList.add('is-dragging');
      noteInput();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length >= 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) goal.zoom *= pinchDist / d;
        pinchDist = d; clampGoal(); noteInput();
        return;
      }
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      goal.yaw -= dx * 0.0085;
      if (e.pointerType !== 'touch') goal.pitch += dy * 0.006;
      clampGoal(); setPressed(null); noteInput();
    });
    function end(e) {
      delete pointers[e.pointerId];
      if (!Object.keys(pointers).length) { dragging = false; stage.classList.remove('is-dragging'); }
      pinchDist = 0;
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('dblclick', function () { setView('front'); noteInput(); });
    canvas.addEventListener('keydown', function (e) {
      var step = 0.26, handled = true;
      if (e.key === 'ArrowLeft') goal.yaw += step;
      else if (e.key === 'ArrowRight') goal.yaw -= step;
      else if (e.key === 'ArrowUp') goal.pitch += step * 0.6;
      else if (e.key === 'ArrowDown') goal.pitch -= step * 0.6;
      else if (e.key === '+' || e.key === '=') goal.zoom *= 0.85;
      else if (e.key === '-' || e.key === '_') goal.zoom /= 0.85;
      else handled = false;
      if (handled) { e.preventDefault(); clampGoal(); setPressed(null); noteInput(); }
    });

    viewButtons.forEach(function (b) {
      b.addEventListener('click', function () { setAuto(false); setView(b.getAttribute('data-viewer-view')); noteInput(); });
    });
    if (autoButton) {
      autoButton.setAttribute('aria-pressed', String(autoRotate));
      autoButton.addEventListener('click', function () { setAuto(!autoRotate); lastInput = 0; });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-viewer-zoom]'), function (b) {
      b.addEventListener('click', function () {
        goal.zoom *= b.getAttribute('data-viewer-zoom') === 'in' ? 0.82 : 1 / 0.82;
        clampGoal(); noteInput();
      });
    });
    var reset = document.querySelector('[data-viewer-reset]');
    if (reset) reset.addEventListener('click', function () {
      setView('front'); goal.zoom = 1; if (captionEl) captionEl.textContent = captionEl.getAttribute('data-default') || captionEl.textContent;
      setPressed('front'); noteInput();
    });

    document.addEventListener('watchout:alarm', function (e) {
      alarmOn = !!(e.detail && e.detail.active);
      requestDraw();
    });
    alarmOn = document.documentElement.getAttribute('data-alarm') === 'on';
  }
})();
