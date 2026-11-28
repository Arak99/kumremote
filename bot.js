/*
  KumRemote — ตัวบอทพิกเซลนูนที่ขยับเอง (Arak Lab Tools)
  ใช้:  var bot = KumBot.create(canvas);  bot.setMood('on');  bot.setCharacter('pencil');  bot.poke();
  อารมณ์ (mood): on เดินเล่น · sleep หลับ · waking กำลังตื่น · work Claude ทำงาน · done เสร็จแล้ว · bad มีปัญหา · listen กำลังฟัง
  ข้อมูลตัวละครอยู่ใน characters.js (เพิ่มตัวใหม่ได้โดยไม่ต้องแก้ไฟล์นี้)
  ตัวเลือก: { width, height, character, stage:{y,h} (โหมดจอบอร์ด: วาดบอทในแถบเดียวกับจอบอร์ด KumWake), chrome: function(ctx,t) วาดส่วนอื่นของจอ }
  ประวัติ: 1.0 (26/11/2026) เวอร์ชันแรก
          1.1 (26/11/2026) โหมดจอบอร์ด (stage/chrome) + หน้าตา/ขนาด/ท่าทางให้ตรงกับบนบอร์ด KumWake v2.0
          1.3 (27/11/2026) รองรับตัวละครกว้างไม่ใช่ 12 ช่อง (ch.cols)
          1.2 (26/11/2026) ฉากหลังพิกเซลตามเวลาจริง: กลางวัน (ฟ้า พระอาทิตย์ เมฆ) / เย็น / กลางคืน (พระจันทร์ ดาวกะพริบ), ภูเขา, พื้นหญ้า — ตรงกับบนบอร์ด KumWake v2.2
*/
(function () {
  'use strict';
  var COL = { on: '#5ee6ff', sleep: '#5b7cff', waking: '#ffd166', work: '#ffa94d', done: '#5be38f', bad: '#ff6b6b', listen: '#c08cff' };
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgb(' + ((n >> 16) * f | 0) + ',' + (((n >> 8) & 255) * f | 0) + ',' + ((n & 255) * f | 0) + ')';
  }
  function find(id) {
    var list = window.KUM_CHARACTERS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function create(canvas, opt) {
    opt = opt || {};
    var W = opt.width || 320, H = opt.height || 190;
    var c = canvas.getContext('2d');
    var ch = find(opt.character), mood = 'on', since = 0, poked = 0;
    var b = { x: W / 2, tx: W / 2, face: 1, act: 'walk', until: 0, look: 1 };
    var U = 10, last = 0, raf = 0, alive = true;
    function cw() { return (ch && ch.cols) || 12; }   // v2.9 ความกว้างตัวละคร (ช่อง)

    function DPR() { return Math.min(3, window.devicePixelRatio || 1); }
    function fit() {
      var dpr = DPR();
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.imageSmoothingEnabled = false;
      if (opt.stage) { U = 6; while (U > 3 && ch.map.length * U + (ch.legs.length ? U * 1.5 : 0) + 14 > opt.stage.h) U--; }   // เหมือนบนบอร์ด
      else U = Math.max(5, Math.floor(Math.min((H * 0.66) / (ch.map.length + (ch.legs.length ? 1.5 : 0)), (W * 0.42) / cw())));
    }
    fit();
    canvas.addEventListener('contextrestored', fit);

    function think(t, dt) {
      var half = (cw() / 2) * U + 8, lo = opt.walk ? Math.max(half, opt.walk[0]) : half, hi = opt.walk ? Math.min(W - half, opt.walk[1]) : W - half;   // v2.31 walk = ช่วงที่เดินได้
      if (mood === 'on' || mood === 'work') {
        var speed = mood === 'work' ? 55 : 18;
        if (b.act === 'walk') {
          var dx = b.tx - b.x;
          if (Math.abs(dx) < 1) {
            if (mood === 'work') { b.tx = b.tx < W / 2 ? hi : lo; }
            else {
              var r = Math.random();
              b.act = r < .35 ? 'look' : r < .6 ? 'sit' : r < .8 ? 'jump' : 'blink';
              b.until = t + 2000 + Math.random() * 2500;
            }
          } else { b.face = dx > 0 ? 1 : -1; b.x += b.face * Math.min(Math.abs(dx), speed * dt); }
        } else if (t > b.until) { b.act = 'walk'; b.tx = lo + Math.random() * (hi - lo); }
      } else { b.act = 'stand'; }
      b.x = Math.max(lo, Math.min(hi, b.x));
      b.look = b.act === 'look' ? (Math.floor(t / 700) % 2 ? 1 : -1) : b.face;
    }

    function sprite(x0, y0, face, legUp, sit, t) {
      var rows = ch.map, pal = {}, k;
      for (k in ch.pal) pal[k] = mood === 'sleep' ? shade(ch.pal[k], .55) : ch.pal[k];
      var DEP = Math.max(2, Math.round(U * .38));
      function cx(i) { return face < 0 ? x0 + (cw() - 1 - i) * U : x0 + i * U; }
      var legY = y0 + rows.length * U;
      if (!sit && mood !== 'sleep' && ch.legs.length) {
        ch.legs.forEach(function (lx, n) {
          var up = (legUp && n === 0) || (!legUp && n === 1 && b.act === 'walk') ? U * .5 : 0;
          var xx = cx(lx), base = pal[ch.legColor || 'A'];
          c.fillStyle = shade(ch.pal[ch.legColor || 'A'], .5); c.fillRect(xx + DEP, legY + DEP - up, U, U * 1.5);
          c.fillStyle = base; c.fillRect(xx, legY - up, U, U * 1.5);
        });
      }
      for (var pass = 0; pass < 2; pass++) {
        for (var j = 0; j < rows.length; j++) for (var i = 0; i < cw(); i++) {
          var chr = rows[j][i]; if (!chr || chr === '.') continue;
          var xx = cx(i), yy = y0 + j * U;
          if (pass === 0) { c.fillStyle = shade(ch.pal[chr] || '#888888', mood === 'sleep' ? .3 : .55); c.fillRect(xx + DEP, yy + DEP, U, U); }
          else { c.fillStyle = pal[chr] || '#888'; c.fillRect(xx, yy, U, U); }
        }
      }
      if (ch.tail === 'devil' && mood !== 'sleep') {
        var wag = Math.sin(t / 300) > 0 ? 1 : 0, tx = face < 0 ? x0 - U : x0 + 12 * U;
        c.fillStyle = pal.A; c.fillRect(tx, y0 + (7 - wag) * U, U, U);
        var ax = face < 0 ? x0 - 2 * U : x0 + 13 * U, ay = y0 + (5 - wag) * U;
        c.fillRect(ax, ay, U, U * 2); c.fillRect(ax - U * .5, ay, U * 2, U * .6);
      }
      eyes(x0, y0, face, t);
    }

    function eyes(x0, y0, face, t) {
      var blink = (t % 3900) < 150 || (b.act === 'blink' && (t % 900) < 150);
      var dark = ch.eyeStyle === 'dark', E = ch.es || 1, line = dark ? '#ffffff' : '#1b2333';
      ch.eyes.forEach(function (e) {
        var ex = face < 0 ? cw() - 1 - e[0] - 1 : e[0], X = x0 + ex * U, Y = y0 + e[1] * U;
        var big = (mood === 'listen' ? 1.25 : 1) * E, w = U * 2 * big, X0 = X - (big - 1) * U, Y0 = Y - (big - 1) * U;
        if (mood === 'sleep' || ((mood === 'on' || mood === 'listen') && blink)) { c.fillStyle = '#1b2333'; c.fillRect(X0, Y0 + w * .55, w, Math.max(2, U * .3)); return; }
        if (mood === 'done') { c.fillStyle = '#1b2333'; var s = Math.max(2, U * .3); c.fillRect(X0, Y0 + w * .45, w * .3, s); c.fillRect(X0 + w * .3, Y0 + w * .25, w * .4, s); c.fillRect(X0 + w * .7, Y0 + w * .45, w * .3, s); return; }
        if (mood === 'bad') {
          c.save(); c.translate(X0 + w / 2, Y0 + w / 2); c.fillStyle = '#1b2333';
          c.restore(); c.strokeStyle = '#1b2333'; c.lineWidth = 2; c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X0 + w, Y0 + w); c.moveTo(X0 + w, Y0); c.lineTo(X0, Y0 + w); c.stroke(); return;
        }
        var open = 1;
        if (mood === 'waking') open = Math.min(1, (t - since) / 2200) * (.6 + .4 * Math.abs(Math.sin(t / 400)));
        var h = (mood === 'work' ? w * .5 : w) * open, top = Y0 + (w - h) * (mood === 'work' ? .6 : 1);
        c.fillStyle = dark ? '#1a0505' : '#ffffff'; c.fillRect(X0, top, w, h);
        var dir = face < 0 ? -b.look : b.look, ps = w * .42;
        c.fillStyle = dark ? '#ffffff' : '#1b2333';
        if (dark) c.fillRect(X0 + (dir > 0 ? w * .55 : w * .15), top + 2, w * .28, w * .28);
        else c.fillRect(X0 + (dir > 0 ? w - ps - w * .06 : w * .06), top + h * .3, ps, Math.min(ps, h * .6));
      });
    }

    function extras(x, y0, t) {
      var col = COL[mood], j, a, top = y0 - 10;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (mood === 'sleep') for (j = 0; j < 3; j++) { var p = ((t / 2200) + j / 3) % 1; if (p < .8) { c.fillStyle = '#9fb6ff'; c.font = '700 13px sans-serif'; c.fillText('Z', x + 6 * U + 10 + p * 18, top + 12 - p * 22); } }
      if (mood === 'work') for (j = 0; j < 3; j++) { c.fillStyle = Math.floor(t / 300) % 3 === j ? col : '#334155'; c.fillRect(x - 12 + j * 10, Math.max(0, top - 4), 6, 6); }
      if (mood === 'done') for (j = 0; j < 4; j++) { a = j * 1.57 + t / 900; if (Math.sin(t / 300 + j) > 0) { var sx = x + Math.cos(a) * 7 * U, sy = y0 + 4 * U + Math.sin(a) * 3 * U; c.fillStyle = '#ffe066'; c.fillRect(sx - 1, sy - 4, 3, 9); c.fillRect(sx - 4, sy - 1, 9, 3); } }
      if (mood === 'bad') { c.fillStyle = col; c.font = '700 13px sans-serif'; c.fillText('?', x + 6 * U + 10, Math.max(8, top + 6)); c.fillStyle = '#7fd3ff'; c.fillRect(x + 5 * U, top + 14 + ((t / 1500) % 1) * 16, 4, 6); }
      if (mood === 'listen') { c.strokeStyle = col; c.lineWidth = 3; for (var sd = -1; sd <= 1; sd += 2) for (j = 0; j < 3; j++) { c.globalAlpha = .5 + .5 * Math.sin(t / 160 + j); c.beginPath(); c.arc(x + sd * (6 * U + 10), y0 + 5 * U, 8 + j * 7, sd > 0 ? -.6 : Math.PI - .6, sd > 0 ? .6 : Math.PI + .6); c.stroke(); } c.globalAlpha = 1; }
    }

    // ---------- ฉากหลัง (เหมือนบนบอร์ด: kwScene ใน main.cpp) ----------
    var SKY = { day: [[0x4f, 0xa3, 0xe0], [0xb4, 0xe0, 0xf5]], eve: [[0x2b, 0x2f, 0x77], [0xf2, 0x8c, 0x5a]], night: [[0x07, 0x0b, 0x26], [0x2a, 0x20, 0x5e]] };
    var STARS = []; (function () { var r = 12345; for (var i = 0; i < 22; i++) { r = (r * 1103515245 + 12345) & 0x7fffffff; var x = r % 320; r = (r * 1103515245 + 12345) & 0x7fffffff; STARS.push([x, r % 52]); } })();
    function hex(a) { return 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')'; }
    function mix(a, b, f) { return [a[0] + (b[0] - a[0]) * f | 0, a[1] + (b[1] - a[1]) * f | 0, a[2] + (b[2] - a[2]) * f | 0]; }
    function scene(sy, sh, t) {
      var hr = new Date().getHours(), tod = mood === 'sleep' ? 'night' : (hr >= 6 && hr < 17) ? 'day' : (hr >= 17 && hr < 19) ? 'eve' : 'night';
      var g = SKY[tod], ground = sh - 8, y, i;
      for (y = 0; y < ground; y += 2) { c.fillStyle = hex(mix(g[0], g[1], y / ground)); c.fillRect(0, sy + y, W, 2); }
      if (tod === 'night') {
        for (i = 0; i < STARS.length; i++) { var tw = ((t / 400 + i * 7) | 0) % 9; c.fillStyle = tw === 0 ? '#7c86b8' : '#ffffff'; c.fillRect(STARS[i][0], sy + STARS[i][1], tw === 0 ? 1 : 2, tw === 0 ? 1 : 2); }
        c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(270, sy + 18, 10, 0, 7); c.fill();
        c.fillStyle = hex(mix(g[0], g[1], 18 / ground)); c.beginPath(); c.arc(275, sy + 15, 9, 0, 7); c.fill();
      } else {
        c.fillStyle = tod === 'day' ? '#ffd84a' : '#ff9a4a'; c.beginPath(); c.arc(270, sy + (tod === 'day' ? 18 : 40), 10, 0, 7); c.fill();
        if (tod === 'day') for (i = 0; i < 8; i++) { var a = i * .785 + t / 4000; c.fillRect(270 + Math.cos(a) * 15 - 1, sy + 18 + Math.sin(a) * 15 - 1, 3, 3); }
        c.fillStyle = tod === 'day' ? '#ffffff' : '#ffd1b8';
        for (i = 0; i < 3; i++) { var cx = ((t / (70 + i * 25) + i * 130) % 380) - 40, cy = sy + 10 + i * 13; c.fillRect(cx, cy + 4, 34, 6); c.fillRect(cx + 6, cy, 16, 6); c.fillRect(cx + 18, cy + 2, 10, 4); }
      }
      // ภูเขา 2 ชั้น
      var far = tod === 'day' ? '#6f9fc9' : tod === 'eve' ? '#5b3f7a' : '#1b1f45', near = tod === 'day' ? '#4f8a6b' : tod === 'eve' ? '#3d2d5c' : '#141834';
      for (i = 0; i < W; i += 4) {
        var h1 = 18 + Math.round(Math.sin(i / 37) * 8 + Math.sin(i / 13) * 3), h2 = 10 + Math.round(Math.sin(i / 23 + 2) * 6 + Math.sin(i / 9) * 2);
        c.fillStyle = far; c.fillRect(i, sy + ground - h1, 4, h1); c.fillStyle = near; c.fillRect(i, sy + ground - h2, 4, h2);
      }
      // พื้นหญ้า + ดิน
      c.fillStyle = tod === 'night' ? '#2c6b3a' : '#45b04f'; c.fillRect(0, sy + ground, W, 3);
      c.fillStyle = tod === 'night' ? '#3b2a1e' : '#7a4e2d'; c.fillRect(0, sy + ground + 3, W, sh - ground - 3);
      c.fillStyle = tod === 'night' ? '#2f2118' : '#664026'; for (i = 0; i < W; i += 8) c.fillRect(i + ((i / 8) % 2) * 4, sy + ground + 5, 3, 2);
      return sy + ground + 1;
    }

    function frame(t) {
      if (!alive) return;
      if (still) t = 1000;
      var dt = Math.min(.1, (t - last) / 1000 || 0); last = t;
      think(t, dt);
      if (canvas.width !== Math.floor(W * DPR()) || c.getTransform().a !== DPR()) fit();   // มือถือคืนหน่วยความจำ canvas ตอนแอปอยู่เบื้องหลัง → ขนาด/สเกลหาย ภาพเล็กมุมซ้าย (Arak เจอ 28/11)
      c.clearRect(0, 0, W, H);
      var floor = H - 14;
      if (opt.chrome) opt.chrome(c, t);
      if (opt.stage) floor = opt.stage.plain ? opt.stage.y + opt.stage.h - 7 : scene(opt.stage.y, opt.stage.h, t);   // v2.31 plain = ไม่วาดฟ้า (ธีมวาดพื้นหลังเอง)
      else { c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(0, floor, W, 2); }
      var jump = 0;
      if (mood === 'on' && b.act === 'jump') jump = Math.max(0, Math.sin((t % 700) / 700 * Math.PI)) * 10;
      if (mood === 'done') jump = Math.abs(Math.sin(t / 260)) * 10;
      if (t - poked < 600) jump = Math.max(jump, Math.sin((t - poked) / 600 * Math.PI) * 12);
      var noLeg = !ch.legs.length, sit = b.act === 'sit' && mood === 'on';
      var hop = noLeg && b.act === 'walk' && (mood === 'on' || mood === 'work') ? Math.abs(Math.sin(t / 180)) * 4 : 0;
      var x = b.x + (mood === 'bad' ? Math.sin(t / 45) * 2 : 0), face = (mood === 'on' || mood === 'work') ? b.face : 1;
      var hgt = ch.map.length * U;
      var y = floor - (noLeg ? 0 : U * 1.5) - hgt - jump - hop + (sit ? U : 0) + (mood === 'sleep' && !noLeg ? U * 1.5 : 0) + (mood === 'waking' ? Math.sin(t / 140) * 2 : 0);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, floor, Math.max(8, 5 * U - jump), 3, 0, 0, 7); c.fill();
      sprite(x - (cw() / 2) * U, y, face, Math.floor(t / 220) % 2, sit, t);
      extras(x, y, t);
      if (!still) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      setMood: function (m) { if (!COL[m] || m === mood) return; mood = m; since = performance.now(); if (m === 'on') { b.act = 'walk'; b.tx = b.x; } },
      getMood: function () { return mood; },
      setCharacter: function (id) { ch = find(id); fit(); },
      poke: function () { poked = performance.now(); },
      redraw: function () { if (still) frame(1000); },
      destroy: function () { alive = false; cancelAnimationFrame(raf); }
    };
  }
  window.KumBot = { create: create, moods: Object.keys(COL) };
})();
