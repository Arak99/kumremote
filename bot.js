/*
  KumRemote — ตัวบอทพิกเซลนูนที่ขยับเอง (Arak Lab Tools)
  ใช้:  var bot = KumBot.create(canvas);  bot.setMood('on');  bot.setCharacter('pencil');  bot.poke();
  อารมณ์ (mood): on เดินเล่น · sleep หลับ · waking กำลังตื่น · work Claude ทำงาน · done เสร็จแล้ว · bad มีปัญหา · listen กำลังฟัง
  ข้อมูลตัวละครอยู่ใน characters.js (เพิ่มตัวใหม่ได้โดยไม่ต้องแก้ไฟล์นี้)
  ประวัติ: 1.0 (26/11/2026) เวอร์ชันแรก
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

    function fit() {
      var dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = W * dpr; canvas.height = H * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.imageSmoothingEnabled = false;
      U = Math.max(5, Math.floor(Math.min((H * 0.66) / (ch.map.length + (ch.legs.length ? 1.5 : 0)), (W * 0.42) / 12)));
    }
    fit();

    function think(t, dt) {
      var half = 6 * U + 8, lo = half, hi = W - half;
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
      function cx(i) { return face < 0 ? x0 + (11 - i) * U : x0 + i * U; }
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
        for (var j = 0; j < rows.length; j++) for (var i = 0; i < 12; i++) {
          var chr = rows[j][i]; if (!chr || chr === '.') continue;
          var xx = cx(i), yy = y0 + j * U;
          if (pass === 0) { c.fillStyle = shade(ch.pal[chr] || '#888888', mood === 'sleep' ? .3 : .55); c.fillRect(xx + DEP, yy + DEP, U, U); }
          else { c.fillStyle = pal[chr] || '#888'; c.fillRect(xx, yy, U, U); c.fillStyle = 'rgba(255,255,255,.13)'; c.fillRect(xx, yy, U, 1); }
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
        var ex = face < 0 ? 11 - e[0] - 1 : e[0], X = x0 + ex * U, Y = y0 + e[1] * U;
        var big = (mood === 'listen' ? 1.25 : 1) * E, w = U * 2 * big, X0 = X - (big - 1) * U, Y0 = Y - (big - 1) * U;
        if (mood === 'sleep' || ((mood === 'on' || mood === 'listen') && blink)) { c.fillStyle = '#1b2333'; c.fillRect(X0, Y0 + w * .55, w, Math.max(2, U * .3)); return; }
        if (mood === 'done') { c.fillStyle = '#1b2333'; var s = Math.max(2, U * .3); c.fillRect(X0, Y0 + w * .45, w * .3, s); c.fillRect(X0 + w * .3, Y0 + w * .25, w * .4, s); c.fillRect(X0 + w * .7, Y0 + w * .45, w * .3, s); return; }
        if (mood === 'bad') {
          c.save(); c.translate(X0 + w / 2, Y0 + w / 2); c.fillStyle = '#1b2333';
          c.rotate(.785); c.fillRect(-w * .5, -U * .18, w, U * .36); c.rotate(1.57); c.fillRect(-w * .5, -U * .18, w, U * .36); c.restore(); return;
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

    function extras(x, top, t) {
      var col = COL[mood], j, a;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (mood === 'sleep') for (j = 0; j < 3; j++) { var p = ((t / 2200) + j / 3) % 1; c.globalAlpha = 1 - p; c.fillStyle = '#9fb6ff'; c.font = '700 ' + (12 + j * 4) + 'px sans-serif'; c.fillText('Z', x + 6 * U + 10 + p * 20, top + 10 - p * 26); }
      if (mood === 'work') for (j = 0; j < 3; j++) { c.globalAlpha = .3 + .7 * (Math.floor(t / 300) % 3 === j); c.fillStyle = col; c.fillRect(x - 14 + j * 12, top - 8, 8, 8); }
      if (mood === 'done') for (j = 0; j < 4; j++) { a = j * 1.57 + t / 900; c.globalAlpha = (Math.sin(t / 300 + j) + 1) / 2; c.fillStyle = '#ffe066'; c.font = '16px sans-serif'; c.fillText('✦', x + Math.cos(a) * 7.5 * U, top + 5 * U + Math.sin(a) * 4 * U); }
      if (mood === 'bad') { c.fillStyle = col; c.font = '700 26px sans-serif'; c.fillText('?', x + 6.5 * U + 8, top + 8); c.fillStyle = '#7fd3ff'; c.fillRect(x + 5 * U, top + 16 + ((t / 1500) % 1) * 20, 6, 8); }
      if (mood === 'listen') { c.strokeStyle = col; c.lineWidth = 3; for (var sd = -1; sd <= 1; sd += 2) for (j = 0; j < 3; j++) { c.globalAlpha = .5 + .5 * Math.sin(t / 160 + j); c.beginPath(); c.arc(x + sd * (6 * U + 10), top + 5 * U, 10 + j * 9, sd > 0 ? -.6 : Math.PI - .6, sd > 0 ? .6 : Math.PI + .6); c.stroke(); } }
      c.globalAlpha = 1;
    }

    function frame(t) {
      if (!alive) return;
      if (still) t = 1000;
      var dt = Math.min(.1, (t - last) / 1000 || 0); last = t;
      think(t, dt);
      c.clearRect(0, 0, W, H);
      var floor = H - 14;
      c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(0, floor, W, 2);
      var jump = 0;
      if (mood === 'on' && b.act === 'jump') jump = Math.max(0, Math.sin((t % 700) / 700 * Math.PI)) * 14;
      if (mood === 'done') jump = Math.abs(Math.sin(t / 260)) * 16;
      if (t - poked < 600) jump = Math.max(jump, Math.sin((t - poked) / 600 * Math.PI) * 20);
      var noLeg = !ch.legs.length, sit = b.act === 'sit' && mood === 'on';
      var hop = noLeg && b.act === 'walk' && (mood === 'on' || mood === 'work') ? Math.abs(Math.sin(t / 180)) * 5 : 0;
      var x = b.x + (mood === 'bad' ? Math.sin(t / 45) * 2 : 0), face = (mood === 'on' || mood === 'work') ? b.face : 1;
      var hgt = ch.map.length * U;
      var y = floor - (noLeg ? 0 : U * 1.5) - hgt - jump - hop + (sit ? U : 0) + (mood === 'sleep' && !noLeg ? U * 1.5 : 0) + (mood === 'waking' ? Math.sin(t / 140) * 2 : 0);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, floor + 1, Math.max(10, 5 * U - jump), 5, 0, 0, 7); c.fill();
      sprite(x - 6 * U, y, face, Math.floor(t / 220) % 2, sit, t);
      extras(x, y - 14, t);
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
