/*
  KumRemote — โหมดโชว์ (หน้าจอหรู สลับหน้าเป็นรอบเมื่อไม่มีคนแตะ)  ·  Arak Lab Tools
  ใช้:  KumShow.init({ getInfo: function(){ return {state, since, claude:{mode,title}, char}; } });
        KumShow.settings() -> ค่าที่ตั้งไว้ · KumShow.set({...}) · KumShow.start() / KumShow.stop() · KumShow.busy = function(){ return true ถ้าห้ามเปิดโชว์ตอนนี้ }
  หน้า: city เมืองกลางคืน · clock นาฬิกาหรู · space ล่องอวกาศ · panel แผงสถานะ (ข้อมูลจริงเท่านั้น ไม่มีตัวเลขปลอม)
  แตะจอ = ปิดโชว์กลับหน้าหลัก
  ประวัติ: 1.0 (26/11/2026) เวอร์ชันแรก — ตามตัวอย่างหน้าจอหรู, ตั้งค่าได้ (เปิด/ปิด, รอกี่วินาที, หน้าที่ชอบ, สลับทุกกี่วินาที)
*/
(function () {
  'use strict';
  var KEY = 'kumremote_show', F = 'system-ui,"Noto Sans Thai","Leelawadee UI",sans-serif';
  var PAGES = [['city', 'เมืองกลางคืน'], ['clock', 'นาฬิกาหรู'], ['space', 'ล่องอวกาศ'], ['panel', 'แผงสถานะ']];
  var DEF = { on: true, idle: 60, every: 15, pages: { city: true, clock: true, space: true, panel: true } };
  var cfg = load(), info = function () { return {}; }, overlay = null, cv = null, c = null, raf = 0, running = false, idleT = 0, pageIdx = 0, pageSince = 0, fade = 1, hintUntil = 0;
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var o = { on: DEF.on, idle: DEF.idle, every: DEF.every, pages: {} };
    PAGES.forEach(function (p) { o.pages[p[0]] = DEF.pages[p[0]]; });
    if (s) {
      if (typeof s.on === 'boolean') o.on = s.on;
      if ([30, 60, 120, 300].indexOf(s.idle) >= 0) o.idle = s.idle;
      if ([8, 15, 30].indexOf(s.every) >= 0) o.every = s.every;
      if (s.pages) PAGES.forEach(function (p) { if (typeof s.pages[p[0]] === 'boolean') o.pages[p[0]] = s.pages[p[0]]; });
    }
    return o;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  function activePages() { var a = PAGES.filter(function (p) { return cfg.pages[p[0]]; }).map(function (p) { return p[0]; }); return a.length ? a : ['city']; }

  // ---------- ตัวช่วยวาด ----------
  var rnd = (function (s) { return function () { return (s = (s * 16807) % 2147483647) / 2147483647; }; })(7);
  var STARS = [], WIN = [], i0;
  for (i0 = 0; i0 < 70; i0++) STARS.push([rnd() * 320, rnd() * 240, rnd()]);
  for (i0 = 0; i0 < 60; i0++) WIN.push([rnd(), rnd()]);
  function two(n) { return ('0' + n).slice(-2); }
  function hhmm() { var d = new Date(); return two(d.getHours()) + ':' + two(d.getMinutes()); }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function pill(c, x, y, txt, col) {
    c.font = '600 11px ' + F; var w = c.measureText(txt).width + 22;
    c.fillStyle = 'rgba(10,15,30,.6)'; rr(c, x, y, w, 20, 10); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x + 10, y + 10, 4, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, x + 18, y + 10.5);
    return w;
  }
  function statusPill(c, x, y) {
    var I = info(), st = I.state, cl = I.claude && I.claude.mode === 'work';
    if (cl) return pill(c, x, y, 'Claude กำลังทำงาน', '#ffa94d');
    var t = st === 'on' ? 'คอมเปิดอยู่' : (st === 'off' || st === 'sleeping' || st === 'shuttingdown') ? 'คอมหลับ / ปิดอยู่' : st === 'waking' ? 'กำลังปลุก…' : st === 'wakefail' || st === 'noboard' ? 'ปลุกไม่ขึ้น' : 'กำลังเช็ค…';
    return pill(c, x, y, t, st === 'on' ? '#34d399' : (st === 'wakefail' || st === 'noboard') ? '#f87171' : st === 'waking' ? '#fbbf24' : '#64748b');
  }

  // ---------- ตัวละครนูนเงาวาว ----------
  // ปีศาจน้อย: วาดเวกเตอร์ไล่แสงเงา (ตามตัวอย่าง) · ตัวอื่น/ตัวที่วาดเอง: วาดจากแผนที่พิกเซลแล้วทับด้วยแสงเงาให้ดูนูน
  var cache = {};
  function glossy(ch, u) {
    var k = ch.id + '|' + u + '|' + ch.map.join(''); if (cache[k]) return cache[k];
    var rows = ch.map.length, cvs = document.createElement('canvas'), pad = u * 2; cvs.width = 12 * u + pad * 2; cvs.height = rows * u + pad * 2;
    var g = cvs.getContext('2d'), j, i, chr;
    for (j = 0; j < rows; j++) for (i = 0; i < 12; i++) { chr = ch.map[j][i]; if (!chr || chr === '.') continue; g.fillStyle = ch.pal[chr] || '#888'; g.fillRect(pad + i * u, pad + j * u, u + .6, u + .6); }
    g.globalCompositeOperation = 'source-atop';
    var rg = g.createRadialGradient(pad + 4 * u, pad + rows * u * .3, u * .5, pad + 6 * u, pad + rows * u * .5, 9 * u);
    rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(.35, 'rgba(255,255,255,.08)'); rg.addColorStop(.8, 'rgba(0,0,0,.2)'); rg.addColorStop(1, 'rgba(0,0,0,.5)');
    g.fillStyle = rg; g.fillRect(0, 0, cvs.width, cvs.height);
    var o = { cvs: cvs, pad: pad }; cache[k] = o; return o;
  }
  function eyesAt(c, ch, x0, y0, u, t, look) {
    var blink = (t % 3800) < 140, E = ch.es || 1;
    (ch.eyes || []).forEach(function (e) {
      var w = u * 2 * E, X = x0 + e[0] * u - (E - 1) * u, Y = y0 + e[1] * u - (E - 1) * u;
      if (blink) { c.fillStyle = '#2a0605'; c.fillRect(X, Y + w * .55, w, Math.max(2, u * .25)); return; }
      c.fillStyle = ch.eyeStyle === 'dark' ? '#1a0505' : '#fff'; rr(c, X, Y, w, w, w * .3); c.fill();
      c.fillStyle = ch.eyeStyle === 'dark' ? '#fff' : '#1a0505'; c.fillRect(X + w * (.3 + look * .12), Y + w * .35, w * .36, w * .4);
    });
  }
  function pixChar(c, ch, cx, floorY, s, t, walk) {
    var rows = ch.map.length, u = Math.max(2, s / Math.max(12, rows)), W = 12 * u, H = rows * u, legH = ch.legs && ch.legs.length ? u * 1.5 : 0;
    var hop = (!legH && walk) ? Math.abs(Math.sin(t / 180)) * u * .4 : 0;
    var x0 = cx - W / 2, y0 = floorY - legH - H - hop, g = glossy(ch, Math.round(u * 4) / 4 || u);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, floorY + 1, W * .42, u * .5, 0, 0, 7); c.fill();
    (ch.legs || []).forEach(function (lx, n) { var up = walk && Math.floor(t / 200) % 2 === n ? u * .4 : 0; c.fillStyle = ch.pal[ch.legColor || 'A'] || '#888'; c.fillRect(x0 + lx * u, floorY - legH - up, u, legH); });
    var sc = u / (Math.round(u * 4) / 4 || u);
    c.drawImage(g.cvs, x0 - g.pad * sc, y0 - g.pad * sc, g.cvs.width * sc, g.cvs.height * sc);
    eyesAt(c, ch, x0, y0, u, t, Math.sin(t / 1600));
  }
  function devil(c, x, y, s, t, o) {
    o = o || {}; var b = Math.sin(t / 300) * s * .03, sd; y += b;
    c.save(); c.translate(x, y);
    if (o.shadow !== false) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, s * .62 - b, s * .42, s * .07, 0, 0, 7); c.fill(); }
    for (sd = -1; sd <= 1; sd += 2) { var lift = o.walk ? Math.max(0, Math.sin(t / 160 + (sd > 0 ? Math.PI : 0))) * s * .06 : 0; var gr = c.createRadialGradient(sd * s * .2 - s * .03, s * .48 - lift, 2, sd * s * .2, s * .5 - lift, s * .14); gr.addColorStop(0, '#ff8a73'); gr.addColorStop(1, '#a8170c'); c.fillStyle = gr; c.beginPath(); c.ellipse(sd * s * .2, s * .52 - lift, s * .11, s * .08, 0, 0, 7); c.fill(); }
    for (sd = -1; sd <= 1; sd += 2) { var hg = c.createLinearGradient(sd * s * .25, -s * .55, sd * s * .4, -s * .2); hg.addColorStop(0, '#ffe0a3'); hg.addColorStop(.5, '#ffa11c'); hg.addColorStop(1, '#c25f00'); c.fillStyle = hg; c.beginPath(); c.moveTo(sd * s * .18, -s * .33); c.quadraticCurveTo(sd * s * .42, -s * .42, sd * s * .38, -s * .7); c.quadraticCurveTo(sd * s * .5, -s * .38, sd * s * .36, -s * .2); c.closePath(); c.fill(); }
    var bg = c.createRadialGradient(-s * .18, -s * .22, s * .05, 0, 0, s * .62); bg.addColorStop(0, '#ffb3a3'); bg.addColorStop(.3, '#ff4b3a'); bg.addColorStop(.8, '#c41d12'); bg.addColorStop(1, '#6e0b05');
    c.fillStyle = bg; rr(c, -s * .45, -s * .38, s * .9, s * .86, s * .34); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-s * .2, -s * .24, s * .13, s * .06, -.5, 0, 7); c.fill();
    var blink = (t % 3800) < 140, look = Math.sin(t / 1600) * s * .03;
    for (sd = -1; sd <= 1; sd += 2) {
      var ex = sd * s * .17, ey = -s * .04;
      if (blink) { c.strokeStyle = '#2a0605'; c.lineWidth = s * .035; c.lineCap = 'round'; c.beginPath(); c.arc(ex, ey, s * .08, .2 * Math.PI, .8 * Math.PI); c.stroke(); continue; }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, s * .11, s * .13, 0, 0, 7); c.fill();
      c.fillStyle = '#1a0505'; c.beginPath(); c.ellipse(ex + look, ey + s * .02, s * .055, s * .07, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + look - s * .02, ey - s * .01, s * .018, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(255,120,150,.55)'; for (sd = -1; sd <= 1; sd += 2) { c.beginPath(); c.ellipse(sd * s * .3, s * .12, s * .07, s * .04, 0, 0, 7); c.fill(); }
    c.strokeStyle = '#3a0806'; c.lineWidth = s * .035; c.lineCap = 'round'; c.beginPath(); c.arc(0, s * .1, s * .1, .15 * Math.PI, .85 * Math.PI); c.stroke();
    if (o.helmet) { var hl = c.createRadialGradient(-s * .2, -s * .3, s * .05, 0, 0, s * .75); hl.addColorStop(0, 'rgba(255,255,255,.35)'); hl.addColorStop(.7, 'rgba(160,210,255,.12)'); hl.addColorStop(1, 'rgba(160,210,255,.4)'); c.fillStyle = hl; c.beginPath(); c.arc(0, -s * .05, s * .75, 0, 7); c.fill(); c.strokeStyle = 'rgba(220,240,255,.8)'; c.lineWidth = 2; c.stroke(); }
    c.restore();
  }
  // วาดตัวละครที่ผู้ใช้เลือกไว้ (center x, ตำแหน่ง y: ถ้าเป็นปีศาจใช้กลางตัว, ตัวอื่นใช้พื้น), s = ขนาด
  function hero(c, x, mid, s, t, o) {
    var I = info(), ch = I.char;
    if (!ch || ch.id === 'devil') { devil(c, x, mid, s, t, o); return; }
    pixChar(c, ch, x, mid + s * .55, s * 1.05, t, o && o.walk);
  }

  // ---------- 4 หน้า ----------
  function pCity(c, t) {
    var g = c.createLinearGradient(0, 0, 0, 240); g.addColorStop(0, '#0a0f2e'); g.addColorStop(.6, '#3a1f5c'); g.addColorStop(1, '#ff7a59'); c.fillStyle = g; c.fillRect(0, 0, 320, 240);
    STARS.slice(0, 40).forEach(function (s) { c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t / 700 + s[2] * 9)); c.fillStyle = '#fff'; c.fillRect(s[0], s[1] * .5, 1.5, 1.5); }); c.globalAlpha = 1;
    c.fillStyle = '#ffe9b0'; c.shadowColor = '#ffe9b0'; c.shadowBlur = 20; c.beginPath(); c.arc(260, 40, 16, 0, 7); c.fill(); c.shadowBlur = 0;
    for (var L = 0; L < 2; L++) {
      var off = (t / (L ? 60 : 120)) % 360; c.fillStyle = L ? '#140c2a' : '#25164a';
      for (var k = -1; k < 2; k++) for (var i = 0; i < 12; i++) {
        var bx = i * 30 - off + k * 360, h = (L ? 60 : 90) + ((i * 37) % 5) * (L ? 12 : 15); c.fillStyle = L ? '#140c2a' : '#25164a'; c.fillRect(bx, 240 - h, 26, h);
        if (L) WIN.slice(i * 4, i * 4 + 4).forEach(function (w, j) { if (Math.sin(t / 900 + w[0] * 20) > -.2) { c.fillStyle = '#ffd166'; c.fillRect(bx + 4 + (j % 2) * 10, 240 - h + 8 + Math.floor(j / 2) * 14, 5, 6); } });
      }
    }
    hero(c, 160 + Math.sin(t / 2500) * 90, 150, 120, t, { walk: true });
    statusPill(c, 10, 10); c.fillStyle = '#fff'; c.font = '700 14px ' + F; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(hhmm(), 308, 20);
  }
  function pClock(c, t) {
    var g = c.createRadialGradient(160, 90, 10, 160, 120, 260); g.addColorStop(0, '#24124a'); g.addColorStop(1, '#05060f'); c.fillStyle = g; c.fillRect(0, 0, 320, 240);
    for (var i = 0; i < 24; i++) { var a = t / 4000 + i, r = 60 + ((i * 23) % 70); c.fillStyle = 'rgba(255,200,120,' + (.15 + .15 * Math.sin(t / 500 + i)) + ')'; c.beginPath(); c.arc(160 + Math.cos(a) * r * 1.6, 95 + Math.sin(a) * r * .5, 1.6, 0, 7); c.fill(); }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 76px ' + F; c.shadowColor = '#ffb347'; c.shadowBlur = 22;
    var tg = c.createLinearGradient(0, 50, 0, 130); tg.addColorStop(0, '#fff4d6'); tg.addColorStop(1, '#ffb347'); c.fillStyle = tg; c.fillText(hhmm(), 160, 92); c.shadowBlur = 0;
    c.fillStyle = '#c9b8ee'; c.font = '15px ' + F; c.fillText(new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }), 160, 142);
    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(20, 200, 280, 1);
    hero(c, 40 + ((t / 40) % 260), 188, 46, t, { walk: true });
    statusPill(c, 200, 212);
  }
  function pSpace(c, t) {
    c.fillStyle = '#02030c'; c.fillRect(0, 0, 320, 240);
    var n1 = c.createRadialGradient(230, 70, 5, 230, 70, 140); n1.addColorStop(0, 'rgba(120,80,255,.45)'); n1.addColorStop(1, 'rgba(120,80,255,0)'); c.fillStyle = n1; c.fillRect(0, 0, 320, 240);
    var n2 = c.createRadialGradient(60, 190, 5, 60, 190, 120); n2.addColorStop(0, 'rgba(255,90,140,.35)'); n2.addColorStop(1, 'rgba(255,90,140,0)'); c.fillStyle = n2; c.fillRect(0, 0, 320, 240);
    STARS.forEach(function (s) { var sp = .3 + s[2] * 1.6, x = (s[0] - t / 40 * sp) % 320; c.fillStyle = 'rgba(255,255,255,' + (.3 + s[2] * .7) + ')'; c.fillRect(x < 0 ? x + 320 : x, s[1], 1 + s[2] * 1.5, 1 + s[2] * 1.5); });
    c.fillStyle = '#ffb36b'; c.beginPath(); c.arc(270, 190, 26, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,220,170,.7)'; c.lineWidth = 3; c.beginPath(); c.ellipse(270, 190, 44, 10, -.3, 0, 7); c.stroke();
    hero(c, 150 + Math.sin(t / 1800) * 50, 110 + Math.sin(t / 1100) * 20, 90, t, { helmet: true, shadow: false });
    statusPill(c, 10, 10);
  }
  function pPanel(c, t) {
    var I = info(), st = I.state, g = c.createLinearGradient(0, 0, 320, 240); g.addColorStop(0, '#0d1424'); g.addColorStop(1, '#1a1030'); c.fillStyle = g; c.fillRect(0, 0, 320, 240);
    c.fillStyle = '#fff'; c.font = '700 15px ' + F; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('คอมที่ร้าน', 14, 18);
    c.textAlign = 'right'; c.fillText(hhmm(), 306, 18);
    var big = st === 'on' ? 'เปิดอยู่' : (st === 'off' || st === 'sleeping' || st === 'shuttingdown') ? 'หลับ / ปิดอยู่' : st === 'waking' ? 'กำลังปลุก…' : st === 'wakefail' || st === 'noboard' ? 'ปลุกไม่ขึ้น' : 'กำลังเช็ค…';
    var col = st === 'on' ? ['#34d399', '#10b981'] : st === 'waking' ? ['#fbbf24', '#f97316'] : (st === 'wakefail' || st === 'noboard') ? ['#f87171', '#dc2626'] : ['#64748b', '#475569'];
    var cx = 160, cy = 92, r = 44, pulse = st === 'waking' ? .5 + .5 * Math.sin(t / 250) : 1;
    c.lineWidth = 11; c.strokeStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
    var rg = c.createLinearGradient(cx - r, cy, cx + r, cy); rg.addColorStop(0, col[0]); rg.addColorStop(1, col[1]); c.strokeStyle = rg; c.lineCap = 'round'; c.globalAlpha = pulse; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2 + t / 1500, -Math.PI / 2 + t / 1500 + (st === 'on' ? 5.2 : 3.2)); c.stroke(); c.globalAlpha = 1;
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '700 18px ' + F; c.fillText(big, cx, cy - 4);
    if (I.since && (st === 'on' || st === 'off')) { var m = Math.max(0, Math.floor((Date.now() / 1000 - I.since) / 60)); c.fillStyle = '#8ea0bf'; c.font = '12px ' + F; c.fillText(m >= 60 ? 'มา ' + Math.floor(m / 60) + ' ชม. ' + (m % 60) + ' นาที' : m < 1 ? 'เมื่อสักครู่' : 'มา ' + m + ' นาที', cx, cy + 16); }
    c.fillStyle = 'rgba(255,255,255,.05)'; rr(c, 12, 154, 296, 74, 14); c.fill();
    hero(c, 52, 190, 46, t, {});
    c.textAlign = 'left'; c.textBaseline = 'middle';
    if (I.claude && I.claude.mode === 'work') { c.fillStyle = '#ffa94d'; c.font = '600 13px ' + F; c.fillText('Claude กำลังทำงาน', 92, 174); c.fillStyle = '#e8eef7'; c.font = '12px ' + F; var tt = I.claude.title || ''; c.fillText(tt.length > 28 ? tt.slice(0, 27) + '…' : tt, 92, 194); for (var j = 0; j < 3; j++) { c.fillStyle = Math.floor(t / 300) % 3 === j ? '#ffa94d' : '#334155'; c.fillRect(92 + j * 10, 208, 6, 6); } }
    else { c.fillStyle = '#c9d6ea'; c.font = '600 14px ' + F; c.fillText('ไม่มีงาน Claude ตอนนี้', 92, 184); c.fillStyle = '#8ea0bf'; c.font = '12px ' + F; c.fillText('ว่างอยู่ — พร้อมรับงาน', 92, 206); }
  }
  var FN = { city: pCity, clock: pClock, space: pSpace, panel: pPanel };

  // ---------- ตัวเล่น ----------
  function build() {
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:50;display:none;align-items:center;justify-content:center;touch-action:manipulation;cursor:pointer';
    cv = document.createElement('canvas'); cv.width = 640; cv.height = 480; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'โหมดโชว์ — แตะเพื่อกลับหน้าหลัก');
    cv.style.cssText = 'width:min(100vw,calc(100vh * 4 / 3));aspect-ratio:4/3;display:block;border-radius:6px';
    overlay.appendChild(cv); document.body.appendChild(overlay); c = cv.getContext('2d');
    overlay.addEventListener('click', function (e) { e.preventDefault(); stop(); });
    document.addEventListener('keydown', function (e) { if (running && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); stop(); } });
  }
  function frame(now) {
    if (!running) return;
    var t = still ? 4000 : now, pg = activePages();
    if (!pageSince) pageSince = now;
    if (now - pageSince > cfg.every * 1000 && pg.length > 1) { pageIdx = (pageIdx + 1) % pg.length; pageSince = now; fade = 0; }
    var name = pg[pageIdx % pg.length];
    c.setTransform(2, 0, 0, 2, 0, 0); c.imageSmoothingEnabled = true; c.globalAlpha = 1;
    c.save(); try { FN[name](c, t); } catch (e) {} c.restore();
    if (fade < 1) { fade = Math.min(1, fade + .04); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgba(0,0,0,' + (1 - fade) + ')'; c.fillRect(0, 0, 640, 480); }
    if (now < hintUntil) { c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = 'rgba(0,0,0,.55)'; rr(c, 80, 214, 160, 20, 10); c.fill(); c.fillStyle = '#fff'; c.font = '12px ' + F; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('แตะจอเพื่อกลับหน้าหลัก', 160, 224.5); }
    if (!still) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return; if (!overlay) build();
    running = true; pageIdx = 0; pageSince = 0; fade = 0; hintUntil = performance.now() + 4000; overlay.style.display = 'flex';
    clearTimeout(idleT); raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (!running) return; running = false; cancelAnimationFrame(raf); overlay.style.display = 'none'; bump();
  }
  function bump() {
    clearTimeout(idleT); if (!cfg.on || running) return;
    idleT = setTimeout(function () { if (document.hidden || (api.busy && api.busy())) { bump(); return; } start(); }, cfg.idle * 1000);
  }
  function activity() { if (!running) bump(); }
  var api = {
    PAGES: PAGES, busy: null,
    init: function (o) {
      info = o.getInfo || info; ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) { document.addEventListener(ev, activity, { passive: true, capture: true }); });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) bump(); }); bump();
    },
    settings: function () { return JSON.parse(JSON.stringify(cfg)); },
    set: function (o) { if (o.on !== undefined) cfg.on = !!o.on; if (o.idle) cfg.idle = o.idle; if (o.every) cfg.every = o.every; if (o.pages) for (var k in o.pages) if (k in cfg.pages) cfg.pages[k] = !!o.pages[k]; save(); if (!cfg.on) { clearTimeout(idleT); if (running) stop(); } else bump(); },
    start: start, stop: stop, isRunning: function () { return running; }
  };
  window.KumShow = api;
})();
