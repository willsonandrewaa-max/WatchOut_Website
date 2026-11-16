/*!
 * WatchOut! — Konverter model OBJ → watchout-model.js
 * --------------------------------------------------------------------------
 * File ini dipakai oleh "tools/konversi-model.html" (di browser) dan juga bisa
 * dijalankan lewat Node.js. Tugasnya:
 *   1. Membaca file .obj (+ .mtl) hasil export Blender.
 *   2. Memecah poligon menjadi segitiga (triangulasi).
 *   3. Membuang bagian yang sangat kecil / yang tidak diinginkan.
 *   4. Mengemas hasilnya menjadi satu file JavaScript yang ringkas, supaya
 *      model 3D tetap bisa tampil walau index.html dibuka langsung dari folder
 *      (tanpa server).
 * Anda tidak perlu mengedit file ini.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WatchOutObjConverter = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- MTL ---------- */
  var MAP_OPTION_ARGS = { '-s': 3, '-o': 3, '-t': 3, '-bm': 1, '-mm': 2, '-blendu': 1, '-blendv': 1,
    '-clamp': 1, '-cc': 1, '-boost': 1, '-texres': 1, '-imfchan': 1, '-type': 1 };

  function parseMapName(rest) {
    var tokens = rest.split(/\s+/), out = [], i = 0;
    while (i < tokens.length) {
      var t = tokens[i];
      if (t.charAt(0) === '-' && MAP_OPTION_ARGS[t] !== undefined) { i += 1 + MAP_OPTION_ARGS[t]; continue; }
      out.push(t); i++;
    }
    return out.join(' ');
  }

  function parseMTL(text) {
    var mats = {}, cur = null;
    (text || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line || line.charAt(0) === '#') return;
      var sp = line.search(/\s/);
      var key = sp < 0 ? line : line.slice(0, sp);
      var rest = sp < 0 ? '' : line.slice(sp + 1).trim();
      if (key === 'newmtl') { cur = mats[rest] = { name: rest }; return; }
      if (!cur) return;
      if (key === 'Kd' || key === 'Ks' || key === 'Ke' || key === 'Ka') {
        cur[key] = rest.split(/\s+/).slice(0, 3).map(Number);
      } else if (key === 'Ns' || key === 'd' || key === 'Ni' || key === 'illum' || key === 'Tr') {
        cur[key] = Number(rest);
      } else if (key.indexOf('map_') === 0) {
        cur[key] = parseMapName(rest);
      }
    });
    return mats;
  }

  /* ---------- OBJ ---------- */
  function parseOBJ(text) {
    var pos = [], uv = [], nrm = [];
    var parts = [], partIndex = {};
    var objName = 'object', matName = 'default';
    var lines = text.split('\n');

    function currentPart() {
      var key = objName + '\u0000' + matName;
      var p = partIndex[key];
      if (!p) { p = partIndex[key] = { object: objName, material: matName, faces: [] }; parts.push(p); }
      return p;
    }
    function idx(str, count, size) {
      if (str === undefined || str === '') return -1;
      var n = parseInt(str, 10);
      if (isNaN(n)) return -1;
      return n < 0 ? count / size + n : n - 1;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      while (line.length && line.charAt(line.length - 1) === '\\' && i + 1 < lines.length) {
        line = line.slice(0, -1) + ' ' + lines[++i];
      }
      line = line.trim();
      if (!line || line.charAt(0) === '#') continue;
      var a = line.split(/\s+/);
      switch (a[0]) {
        case 'v': pos.push(+a[1], +a[2], +a[3]); break;
        case 'vt': uv.push(+a[1], +(a[2] || 0)); break;
        case 'vn': nrm.push(+a[1], +a[2], +a[3]); break;
        case 'o': case 'g': objName = line.slice(2).trim() || objName; break;
        case 'usemtl': matName = line.slice(7).trim() || 'default'; break;
        case 'f': {
          var face = [];
          for (var k = 1; k < a.length; k++) {
            var s = a[k].split('/');
            face.push([idx(s[0], pos.length, 3), idx(s[1], uv.length, 2), idx(s[2], nrm.length, 3)]);
          }
          if (face.length >= 3) currentPart().faces.push(face);
          break;
        }
        default: break;
      }
    }
    return { pos: pos, uv: uv, nrm: nrm, parts: parts };
  }

  /* ---------- triangulation (ear clipping, works for concave n-gons) ---------- */
  function triangulate(face, pos) {
    var n = face.length;
    if (n === 3) return [[0, 1, 2]];
    // Newell normal -> drop dominant axis
    var nx = 0, ny = 0, nz = 0, i;
    for (i = 0; i < n; i++) {
      var p = face[i][0] * 3, q = face[(i + 1) % n][0] * 3;
      nx += (pos[p + 1] - pos[q + 1]) * (pos[p + 2] + pos[q + 2]);
      ny += (pos[p + 2] - pos[q + 2]) * (pos[p] + pos[q]);
      nz += (pos[p] - pos[q]) * (pos[p + 1] + pos[q + 1]);
    }
    var ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    var u = 0, v = 1;
    if (ax >= ay && ax >= az) { u = 1; v = 2; } else if (ay >= az) { u = 2; v = 0; }
    var pts = face.map(function (f) { return [pos[f[0] * 3 + u], pos[f[0] * 3 + v]]; });
    var area = 0;
    for (i = 0; i < n; i++) { var j = (i + 1) % n; area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]; }
    var order = [];
    for (i = 0; i < n; i++) order.push(i);
    var flipped = area < 0;
    if (flipped) order.reverse();

    function cross(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
    function inside(p, a, b, c) {
      var d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p);
      return d1 >= 0 && d2 >= 0 && d3 >= 0;
    }
    var tris = [], guard = 0;
    while (order.length > 3 && guard++ < 100000) {
      var found = false;
      for (i = 0; i < order.length; i++) {
        var ia = order[(i + order.length - 1) % order.length], ib = order[i], ic = order[(i + 1) % order.length];
        if (cross(pts[ia], pts[ib], pts[ic]) <= 1e-14) continue;
        var blocked = false;
        for (var m = 0; m < order.length; m++) {
          var o = order[m];
          if (o === ia || o === ib || o === ic) continue;
          if (inside(pts[o], pts[ia], pts[ib], pts[ic])) { blocked = true; break; }
        }
        if (blocked) continue;
        tris.push([ia, ib, ic]); order.splice(i, 1); found = true; break;
      }
      if (!found) { // degenerate polygon: fan the rest
        for (i = 1; i < order.length - 1; i++) tris.push([order[0], order[i], order[i + 1]]);
        order = [];
        break;
      }
    }
    if (order.length === 3) tris.push([order[0], order[1], order[2]]);
    if (flipped) tris = tris.map(function (t) { return [t[0], t[2], t[1]]; });
    return tris;
  }

  /* ---------- binary helpers ---------- */
  function toBase64(typed) {
    var bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    var s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }

  /* ---------- main ---------- */
  /**
   * @param {string} objText  isi file .obj
   * @param {string} mtlText  isi file .mtl (boleh kosong)
   * @param {object} options
   *   minPartRatio: buang bagian yang ukurannya < rasio ini dari ukuran model (default 0.005)
   *   exclude:      daftar nama "objek" atau "objek/material" yang dibuang
   *   textures:     { "nama file.png": "data:image/png;base64,..." }
   *   sourceName:   nama file sumber (untuk catatan)
   *   smoothAngle:  sudut "auto smooth" dalam derajat (default 40). Permukaan yang
   *                 sudutnya lebih kecil dari ini dihaluskan, yang lebih tajam dibuat
   *                 bersudut. Isi 0 untuk memakai normal asli dari file OBJ.
   */
  function convert(objText, mtlText, options) {
    options = options || {};
    var minRatio = options.minPartRatio === undefined ? 0.005 : options.minPartRatio;
    var smoothAngle = options.smoothAngle === undefined ? 40 : Number(options.smoothAngle) || 0;
    var exclude = (options.exclude || []).map(function (s) { return String(s).trim(); }).filter(Boolean);
    var mtl = parseMTL(mtlText || '');
    var obj = parseOBJ(objText);
    var P = obj.pos, T = obj.uv, N = obj.nrm;
    var report = { kept: [], dropped: [], triangles: 0, vertices: 0 };

    // bounding boxes per part (by referenced vertices)
    function bboxOf(part) {
      var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      part.faces.forEach(function (f) { f.forEach(function (c) {
        var o = c[0] * 3;
        for (var k = 0; k < 3; k++) { var x = P[o + k]; if (x < mn[k]) mn[k] = x; if (x > mx[k]) mx[k] = x; }
      }); });
      return { min: mn, max: mx };
    }
    function diag(b) { var dx = b.max[0] - b.min[0], dy = b.max[1] - b.min[1], dz = b.max[2] - b.min[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz); }

    // "Auto smooth": every face corner gets the area-weighted average of the neighbouring
    // face normals that lie within smoothAngle of its own face. Flat areas stay perfectly
    // flat (no streaks in reflections) while rounded edges stay smooth.
    function autoNormals(part, angle) {
      var cosT = Math.cos(angle * Math.PI / 180), fn = [], fa = [], map = {};
      function pkey(i) { return Math.round(P[i * 3] * 1e5) + ',' + Math.round(P[i * 3 + 1] * 1e5) + ',' + Math.round(P[i * 3 + 2] * 1e5); }
      part.faces.forEach(function (f, fi) {
        var n = [0, 0, 0];
        for (var i = 0; i < f.length; i++) {
          var a = f[i][0] * 3, b = f[(i + 1) % f.length][0] * 3;
          n[0] += (P[a + 1] - P[b + 1]) * (P[a + 2] + P[b + 2]);
          n[1] += (P[a + 2] - P[b + 2]) * (P[a] + P[b]);
          n[2] += (P[a] - P[b]) * (P[a + 1] + P[b + 1]);
        }
        var l = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
        fa.push(l / 2);
        fn.push(l ? [n[0] / l, n[1] / l, n[2] / l] : [0, 0, 0]);
        f.forEach(function (c) { var k = pkey(c[0]); (map[k] = map[k] || []).push(fi); });
      });
      return part.faces.map(function (f, fi) {
        var own = fn[fi];
        return f.map(function (c) {
          var s = [0, 0, 0];
          map[pkey(c[0])].forEach(function (g) {
            var o = fn[g];
            if (o[0] * own[0] + o[1] * own[1] + o[2] * own[2] >= cosT) { s[0] += o[0] * fa[g]; s[1] += o[1] * fa[g]; s[2] += o[2] * fa[g]; }
          });
          var l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
          return l ? [s[0] / l, s[1] / l, s[2] / l] : own;
        });
      });
    }

    obj.parts.forEach(function (p) { p.bbox = bboxOf(p); });
    var gAll = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    obj.parts.forEach(function (p) { for (var k = 0; k < 3; k++) { gAll.min[k] = Math.min(gAll.min[k], p.bbox.min[k]); gAll.max[k] = Math.max(gAll.max[k], p.bbox.max[k]); } });
    var gDiag = diag(gAll);

    var kept = obj.parts.filter(function (p) {
      var key = p.object + '/' + p.material;
      if (exclude.indexOf(p.object) >= 0 || exclude.indexOf(key) >= 0) { report.dropped.push({ part: key, reason: 'dikecualikan' }); return false; }
      if (diag(p.bbox) < gDiag * minRatio) { report.dropped.push({ part: key, reason: 'terlalu kecil' }); return false; }
      return true;
    });
    if (!kept.length) throw new Error('Tidak ada bagian model yang tersisa. Periksa pengaturan "bagian yang dibuang".');

    var bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    kept.forEach(function (p) { for (var k = 0; k < 3; k++) { bounds.min[k] = Math.min(bounds.min[k], p.bbox.min[k]); bounds.max[k] = Math.max(bounds.max[k], p.bbox.max[k]); } });
    var size = [0, 1, 2].map(function (k) { return Math.max(bounds.max[k] - bounds.min[k], 1e-9); });

    var materials = {}, usedTextures = {};
    var parts = kept.map(function (part) {
      var m = mtl[part.material] || {};
      var map = m.map_Kd || null;
      var wantUV = !!map;
      if (map) usedTextures[map] = true;
      materials[part.material] = {
        kd: m.Kd || [0.8, 0.8, 0.8], ks: m.Ks || [0, 0, 0], ns: m.Ns === undefined ? 0 : m.Ns,
        d: m.d === undefined ? 1 : m.d, map: map, alphaMap: m.map_d || null
      };

      var keyMap = {}, vPos = [], vNrm = [], vUv = [], hasNormal = true, indices = [];
      var smooth = smoothAngle > 0 ? autoNormals(part, smoothAngle) : null;
      function vert(c, sn) {
        var nk = sn ? Math.round(sn[0] * 1000) + ':' + Math.round(sn[1] * 1000) + ':' + Math.round(sn[2] * 1000) : c[2];
        var key = c[0] + '/' + (wantUV ? c[1] : -1) + '/' + nk;
        var id = keyMap[key];
        if (id !== undefined) return id;
        id = keyMap[key] = vPos.length / 3;
        vPos.push(P[c[0] * 3], P[c[0] * 3 + 1], P[c[0] * 3 + 2]);
        if (sn) vNrm.push(sn[0], sn[1], sn[2]);
        else if (c[2] >= 0) vNrm.push(N[c[2] * 3], N[c[2] * 3 + 1], N[c[2] * 3 + 2]);
        else { hasNormal = false; vNrm.push(0, 0, 0); }
        if (wantUV) vUv.push(c[1] >= 0 ? T[c[1] * 2] : 0, c[1] >= 0 ? T[c[1] * 2 + 1] : 0);
        return id;
      }
      part.faces.forEach(function (f, fi) {
        var ids = f.map(function (c, ci) { return vert(c, smooth ? smooth[fi][ci] : null); });
        triangulate(f, P).forEach(function (t) { indices.push(ids[t[0]], ids[t[1]], ids[t[2]]); });
      });

      var vCount = vPos.length / 3;
      if (!hasNormal) { // smooth normals from faces
        for (var i = 0; i < vNrm.length; i++) vNrm[i] = 0;
        for (var t = 0; t < indices.length; t += 3) {
          var a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
          var e1 = [vPos[b] - vPos[a], vPos[b + 1] - vPos[a + 1], vPos[b + 2] - vPos[a + 2]];
          var e2 = [vPos[c] - vPos[a], vPos[c + 1] - vPos[a + 1], vPos[c + 2] - vPos[a + 2]];
          var n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
          [a, b, c].forEach(function (o) { vNrm[o] += n[0]; vNrm[o + 1] += n[1]; vNrm[o + 2] += n[2]; });
        }
      }

      var qPos = new Uint16Array(vCount * 3), qNrm = new Int8Array(vCount * 3);
      for (var v = 0; v < vCount; v++) {
        for (var k = 0; k < 3; k++) qPos[v * 3 + k] = Math.round((vPos[v * 3 + k] - bounds.min[k]) / size[k] * 65535);
        var nx = vNrm[v * 3], ny = vNrm[v * 3 + 1], nz = vNrm[v * 3 + 2];
        var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        qNrm[v * 3] = Math.round(nx / l * 127); qNrm[v * 3 + 1] = Math.round(ny / l * 127); qNrm[v * 3 + 2] = Math.round(nz / l * 127);
      }
      var idx32 = vCount > 65535;
      var qIdx = idx32 ? new Uint32Array(indices) : new Uint16Array(indices);
      report.triangles += indices.length / 3; report.vertices += vCount;
      report.kept.push({ part: part.object + '/' + part.material, triangles: indices.length / 3 });
      return {
        object: part.object, material: part.material, vertexCount: vCount, indexCount: indices.length,
        bbox: { min: part.bbox.min, max: part.bbox.max },
        position: toBase64(qPos), normal: toBase64(qNrm),
        uv: wantUV ? toBase64(new Float32Array(vUv)) : null,
        index: toBase64(qIdx), index32: idx32
      };
    });

    var textures = {};
    Object.keys(usedTextures).forEach(function (name) {
      if (options.textures && options.textures[name]) textures[name] = options.textures[name];
      else report.missingTextures = (report.missingTextures || []).concat(name);
    });

    var model = {
      format: 'watchout-model', version: 1,
      source: options.sourceName || 'model.obj',
      generated: new Date().toISOString(),
      bounds: bounds, materials: materials, textures: textures, parts: parts,
      dropped: report.dropped
    };
    return { model: model, report: report };
  }

  function toScript(model) {
    return '/* ==========================================================================\n' +
      '   WatchOut! — data model 3D\n' +
      '   Dibuat otomatis dari "' + model.source + '" pada ' + model.generated + '.\n' +
      '   JANGAN diedit manual. Untuk mengganti model, buka tools/konversi-model.html\n' +
      '   ========================================================================== */\n' +
      'window.WATCHOUT_MODEL = ' + JSON.stringify(model) + ';\n';
  }

  return { parseOBJ: parseOBJ, parseMTL: parseMTL, triangulate: triangulate, convert: convert, toScript: toScript };
});
