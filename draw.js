/*
  KumRemote — หน้า "วาดตัวละคร" (Arak Lab Tools)
  ให้เพิ่มตัวละครเองได้: ระบายพิกเซล 12 ช่อง หรือเลือกรูปจากมือถือให้แปลงเป็นพิกเซลเอง → ดูตัวอย่างเดินเล่นทันที → บันทึกในมือถือ → ส่งให้บอร์ด
  ใช้:  KumDraw.open({ send: function(text){...}, onChange: function(id){...}, getCurrent: function(){return id} })
  ตัวละครที่วาดเอง เก็บใน localStorage 'kumremote_customchars' และถูกเติมเข้า window.KUM_CHARACTERS ตอนโหลดไฟล์นี้ (โหลดหลัง characters.js ก่อนบอท)
  ข้อความที่ส่งให้บอร์ด (ntfy):  charset {"id":"c_ab12","n":"ชื่อ","p":{"A":"#ff3b30",...},"m":["แถว12ตัวอักษร",...],"e":[[3,4],[7,4]],"s":1.2,"l":[3,8]}  (≤ 4KB, ใช้เฉพาะสีที่ใช้จริง)
  ประวัติ: 1.0 (26/11/2026) เวอร์ชันแรก
*/
(function () {
  'use strict';
  var KEY = 'kumremote_customchars', N = 12, MAXROWS = 12;
  var PAL = ['#ff3b30', '#ff9f1c', '#ffd60a', '#34c759', '#14b8a6', '#3d8bff', '#7c5cff', '#ff6fa8', '#ffffff', '#c9d1dc', '#5b6678', '#1b1f2a', '#7a4e2d', '#f3d19c', '#ffb3a3', '#8fe3ff'];
  var LET = 'ABCDEFGHIJKLMNOP';
  var SIZES = [['เล็ก', 1], ['กลาง', 1.25], ['ใหญ่', 1.5]];
  var api = {}, st = null, undo = [], opts = null, root = null, preview = null, painting = false, lastCell = '';

  // ---------- เก็บ/โหลด ----------
  function loadAll() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveAll(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }
  function toChar(d) {   // d = ข้อมูลที่เก็บ -> ตัวละครที่บอทใช้
    var pal = {}; PAL.forEach(function (c, i) { pal[LET[i]] = c; });
    return { id: d.id, name: d.name, custom: true, pal: pal, map: d.map.slice(), eyes: d.eyes.map(function (e) { return e.slice(); }), es: d.es || 1.25, legs: d.legs || [], legColor: d.legColor || undefined };
  }
  function register() {
    var list = window.KUM_CHARACTERS = (window.KUM_CHARACTERS || []).filter(function (c) { return !c.custom; });
    loadAll().forEach(function (d) { try { list.push(toChar(d)); } catch (e) {} });
  }
  register();
  function newId() { return 'c_' + Math.random().toString(36).slice(2, 6) + Date.now().toString(36).slice(-3); }

  // ---------- สภาพการแก้ไข ----------
  function blank() { var g = []; for (var j = 0; j < MAXROWS; j++) g.push(new Array(N).fill('.')); return { id: null, name: '', grid: g, eyes: [[3, 4], [7, 4]], es: 1.25, legs: [3, 8], hasLegs: true, color: 0, tool: 'paint' }; }
  function fromData(d) {
    var s = blank(); s.id = d.id; s.name = d.name; s.es = d.es || 1.25; s.eyes = d.eyes.map(function (e) { return e.slice(); });
    s.hasLegs = !!(d.legs && d.legs.length); if (s.hasLegs) s.legs = d.legs.slice();
    d.map.forEach(function (row, j) { for (var i = 0; i < N; i++) s.grid[j][i] = row[i] || '.'; });
    return s;
  }
  function rows() {   // ตัด "แถวว่างท้ายสุด" ออก (ไม่ตัดแถวบน เพราะตำแหน่งตาอ้างอิงจากแถวบน)
    var last = -1, j, i; for (j = 0; j < MAXROWS; j++) for (i = 0; i < N; i++) if (st.grid[j][i] !== '.') last = j;
    return st.grid.slice(0, Math.max(last + 1, 1)).map(function (r) { return r.join(''); });
  }
  function isEmpty() { return rows().join('').replace(/\./g, '') === ''; }
  function curData() {
    var m = rows(), eyes = st.eyes.map(function (e) { return [e[0], Math.min(e[1], Math.max(0, m.length - 2))]; });
    return { id: st.id || newId(), name: (st.name || '').trim() || 'ตัวของฉัน', map: m, eyes: eyes, es: st.es, legs: st.hasLegs ? st.legs.slice() : [] };
  }
  function pushUndo() { undo.push(JSON.stringify([st.grid, st.eyes])); if (undo.length > 60) undo.shift(); upd(); }

  // ---------- หน้าจอ ----------
  function css() {
    if (document.getElementById('kdcss')) return;
    var s = document.createElement('style'); s.id = 'kdcss';
    s.textContent = '.kd .sheet{max-height:94vh;overflow:auto}.kd h3{margin:0 0 4px}.kd .hint{color:var(--dim);font-size:14px;margin:0 0 10px}' +
      '.kd .gridw{position:relative;width:100%;max-width:340px;margin:0 auto 10px;touch-action:none;user-select:none;-webkit-user-select:none}' +
      '.kd canvas.g{width:100%;aspect-ratio:1;display:block;border-radius:12px;border:2px solid var(--line);background:#0e1626;touch-action:none}' +
      '.kd .pal{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:0 0 10px}' +
      '.kd .pal button{aspect-ratio:1;border-radius:10px;border:3px solid transparent;min-height:36px}' +
      '.kd .pal button[aria-pressed=true]{border-color:#fff;box-shadow:0 0 0 2px var(--accent)}' +
      '.kd .tools,.kd .acts{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}' +
      '.kd .tools button,.kd .acts button{flex:1 1 auto;background:#24304a;border-radius:12px;padding:11px 10px;font-size:15px;font-weight:600;min-height:44px}' +
      '.kd .tools button[aria-pressed=true]{background:var(--accent);color:#04121f}' +
      '.kd .acts button[disabled]{opacity:.4}' +
      '.kd .nm{width:100%;font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:#0e1626;color:var(--text);margin:0 0 10px}' +
      '.kd .pv{display:block;width:100%;max-width:340px;aspect-ratio:320/150;margin:0 auto 10px;border-radius:10px;border:2px solid #222;background:#0F172A;image-rendering:pixelated}' +
      '.kd .bot2{display:flex;gap:8px;margin-top:6px}.kd .bot2 button{flex:1;border-radius:14px;padding:14px;font-size:16px;font-weight:650;min-height:48px}' +
      '.kd .bar{position:sticky;bottom:calc(-1 * (env(safe-area-inset-bottom) + 20px));background:#172136;padding:8px 0 4px;margin-top:6px;border-top:1px solid var(--line)}.kd .bar .bot2{margin-top:6px}.kd .save{background:var(--accent);color:#04121f}.kd .send{background:#34d399;color:#04201a}.kd .cancel{background:#24304a}' +
      '.kd .mine{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.kd .mine button{background:#0e1626;border:1px solid var(--line);border-radius:999px;padding:8px 14px;font-size:14.5px;min-height:40px}' +
      '.kd .mine button[aria-pressed=true]{border-color:var(--accent)}' +
      '.kd .msg{min-height:22px;font-size:14.5px;color:var(--dim);text-align:center;margin:2px 0 4px}.kd .msg.ok{color:var(--on)}.kd .msg.bad{color:var(--bad)}' +
      '.kd label.opt{display:flex;align-items:center;gap:8px;font-size:14.5px;color:var(--dim);margin:0 0 8px}';
    document.head.appendChild(s);
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  var X = {};   // ชิ้นส่วนหน้าจอ
  function build() {
    css();
    root = el('div', 'veil kd'); root.id = 'drawVeil';
    var sh = el('div', 'sheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-labelledby', 'kdT');
    var h = el('h3', '', 'วาดตัวละครของฉัน'); h.id = 'kdT'; sh.appendChild(h);
    sh.appendChild(el('p', 'hint', 'ระบายช่องสี่เหลี่ยมทีละช่อง หรือเลือกรูปจากมือถือให้แปลงให้เอง · ตัวละครของแบรนด์/คนอื่น ไม่ควรใช้'));
    X.mine = el('div', 'mine'); sh.appendChild(X.mine);
    X.name = el('input', 'nm'); X.name.placeholder = 'ตั้งชื่อตัวละคร'; X.name.maxLength = 24; X.name.setAttribute('aria-label', 'ชื่อตัวละคร'); sh.appendChild(X.name);
    var gw = el('div', 'gridw'); X.cv = el('canvas', 'g'); X.cv.width = 360; X.cv.height = 360; X.cv.setAttribute('aria-label', 'ตารางวาดตัวละคร 12 คูณ 12 ช่อง'); gw.appendChild(X.cv); sh.appendChild(gw);
    X.pal = el('div', 'pal'); PAL.forEach(function (c, i) { var b = el('button'); b.style.background = c; b.setAttribute('aria-label', 'สีที่ ' + (i + 1)); b.onclick = function () { st.color = i; st.tool = 'paint'; upd(); }; X.pal.appendChild(b); }); sh.appendChild(X.pal);
    X.tools = el('div', 'tools');
    [['paint', '🖌️ ระบายสี'], ['erase', '🧽 ยางลบ'], ['eye', '👀 วางตา']].forEach(function (t) { var b = el('button', '', t[1]); b.dataset.t = t[0]; b.onclick = function () { st.tool = t[0]; upd(); }; X.tools.appendChild(b); });
    sh.appendChild(X.tools);
    var o2 = el('div', 'tools'); X.legs = el('button'); X.legs.onclick = function () { st.hasLegs = !st.hasLegs; upd(); }; o2.appendChild(X.legs);
    X.es = el('button'); X.es.onclick = function () { var k = 0; SIZES.forEach(function (s, i) { if (Math.abs(s[1] - st.es) < .01) k = i; }); st.es = SIZES[(k + 1) % SIZES.length][1]; upd(); }; o2.appendChild(X.es); sh.appendChild(o2);
    var a = el('div', 'acts');
    X.undo = el('button', '', '↩️ ย้อนกลับ'); X.undo.onclick = function () { if (!undo.length) return; var p = JSON.parse(undo.pop()); st.grid = p[0]; st.eyes = p[1]; upd(); }; a.appendChild(X.undo);
    X.clear = el('button', '', '🗑️ ล้างทั้งหมด'); X.clear.onclick = function () { if (isEmpty()) return; pushUndo(); st.grid = blank().grid; upd(); }; a.appendChild(X.clear);
    X.pic = el('button', '', '🖼️ เลือกรูปจากมือถือ'); X.file = el('input'); X.file.type = 'file'; X.file.accept = 'image/*'; X.file.hidden = true; X.pic.onclick = function () { X.file.click(); }; X.file.onchange = function () { if (X.file.files && X.file.files[0]) fromImage(X.file.files[0]); X.file.value = ''; };
    a.appendChild(X.pic); a.appendChild(X.file); sh.appendChild(a);
    var lb = el('label', 'opt'); X.nobg = el('input'); X.nobg.type = 'checkbox'; X.nobg.checked = true; lb.appendChild(X.nobg); lb.appendChild(document.createTextNode('ลบพื้นหลังของรูปให้ (ใช้ได้ดีกับรูปที่พื้นหลังสีเรียบ)')); sh.appendChild(lb);
    X.pv = el('canvas', 'pv'); X.pv.width = 320; X.pv.height = 150; X.pv.setAttribute('aria-label', 'ตัวอย่างตัวละครเดินเล่น'); sh.appendChild(X.pv);
    X.msg = el('div', 'msg'); X.msg.setAttribute('aria-live', 'polite'); 
    var bar = el('div', 'bar'), b2 = el('div', 'bot2'); bar.appendChild(X.msg);
    X.bSave = el('button', 'save', 'บันทึก (ใช้ในแอป)'); X.bSave.onclick = function () { doSave(false); };
    X.bSend = el('button', 'send', 'บันทึก + ส่งให้บอร์ด'); X.bSend.onclick = function () { doSave(true); };
    b2.appendChild(X.bSave); b2.appendChild(X.bSend); bar.appendChild(b2);
    var b3 = el('div', 'bot2'); X.bDel = el('button', 'cancel', '🗑️ ลบตัวนี้'); X.bDel.onclick = doDelete; X.bClose = el('button', 'cancel', 'ปิด'); X.bClose.onclick = close; b3.appendChild(X.bDel); b3.appendChild(X.bClose); bar.appendChild(b3); sh.appendChild(bar);
    root.appendChild(sh); document.body.appendChild(root);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    X.name.oninput = function () { st.name = X.name.value; };
    // วาดด้วยนิ้ว/เมาส์ (ลากต่อเนื่องได้)
    function cell(e) { var r = X.cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * MAXROWS); return (x < 0 || y < 0 || x >= N || y >= MAXROWS) ? null : [x, y]; }
    function apply(e, first) {
      var p = cell(e); if (!p) return; var k = p[0] + ',' + p[1]; if (!first && k === lastCell) return; lastCell = k;
      if (st.tool === 'eye') { if (first) { pushUndo(); var i = p[0] < N / 2 ? 0 : 1; st.eyes[i] = [Math.min(p[0], N - 2), Math.min(p[1], MAXROWS - 2)]; upd(); } return; }
      var v = st.tool === 'erase' ? '.' : LET[st.color]; if (st.grid[p[1]][p[0]] === v) return; if (first) pushUndo(); st.grid[p[1]][p[0]] = v; upd(true);
    }
    X.cv.addEventListener('pointerdown', function (e) { e.preventDefault(); painting = true; lastCell = ''; try { X.cv.setPointerCapture(e.pointerId); } catch (x) {} apply(e, true); });
    X.cv.addEventListener('pointermove', function (e) { if (painting) apply(e, false); });
    ['pointerup', 'pointercancel'].forEach(function (n) { X.cv.addEventListener(n, function () { painting = false; lastCell = ''; }); });
    document.addEventListener('keydown', function (e) { if (root.classList.contains('show') && e.key === 'Escape') close(); });
  }

  // ---------- วาดตาราง + ปุ่มสถานะ ----------
  function msg(t, cls) { X.msg.textContent = t || ''; X.msg.className = 'msg' + (cls ? ' ' + cls : ''); }
  function drawGrid() {
    var g = X.cv.getContext('2d'), s = X.cv.width / N, j, i;
    g.clearRect(0, 0, X.cv.width, X.cv.height);
    for (j = 0; j < MAXROWS; j++) for (i = 0; i < N; i++) { g.fillStyle = (i + j) % 2 ? '#111b2e' : '#0e1626'; g.fillRect(i * s, j * s, s, s); }
    for (j = 0; j < MAXROWS; j++) for (i = 0; i < N; i++) { var v = st.grid[j][i]; if (v !== '.') { g.fillStyle = PAL[LET.indexOf(v)]; g.fillRect(i * s + 1, j * s + 1, s - 2, s - 2); } }
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; for (i = 0; i <= N; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, X.cv.height); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(X.cv.width, i * s); g.stroke(); }
    st.eyes.forEach(function (e) { g.fillStyle = '#fff'; g.fillRect(e[0] * s + 3, e[1] * s + 3, s * 2 - 6, s * 2 - 6); g.fillStyle = '#1b2333'; g.fillRect(e[0] * s + s * 1.0, e[1] * s + s * .8, s * .8, s * 1); });
    if (st.hasLegs) { g.fillStyle = 'rgba(255,255,255,.35)'; st.legs.forEach(function (l) { g.fillRect(l * s + s * .2, MAXROWS * s - 5, s * .6, 4); }); }
  }
  function upd(light) {
    drawGrid();
    if (light) { refreshPreview(); return; }
    Array.prototype.forEach.call(X.pal.children, function (b, i) { b.setAttribute('aria-pressed', st.tool === 'paint' && i === st.color ? 'true' : 'false'); });
    Array.prototype.forEach.call(X.tools.children, function (b) { b.setAttribute('aria-pressed', b.dataset.t === st.tool ? 'true' : 'false'); });
    X.legs.textContent = st.hasLegs ? '🦵 มีขา: เปิด (แตะเพื่อปิด)' : '🦵 มีขา: ปิด (แตะเพื่อเปิด)';
    var sz = '';
    SIZES.forEach(function (s) { if (Math.abs(s[1] - st.es) < .01) sz = s[0]; });
    X.es.textContent = '👁️ ขนาดตา: ' + sz + ' (แตะเพื่อเปลี่ยน)';
    X.undo.disabled = !undo.length; X.clear.disabled = isEmpty();
    var hasMine = !!st.id && loadAll().some(function (d) { return d.id === st.id; }); X.bDel.hidden = !hasMine;
    X.bSend.disabled = !(opts && opts.send); X.bSave.textContent = hasMine ? 'บันทึกทับตัวเดิม' : 'บันทึก (ใช้ในแอป)';
    buildMine(); refreshPreview();
  }
  function buildMine() {
    X.mine.textContent = ''; var all = loadAll();
    var nb = el('button', '', '＋ ตัวใหม่'); nb.onclick = function () { st = blank(); undo = []; X.name.value = ''; msg(''); upd(); }; nb.setAttribute('aria-pressed', st.id ? 'false' : 'true'); X.mine.appendChild(nb);
    all.forEach(function (d) { var b = el('button', '', d.name); b.setAttribute('aria-pressed', st.id === d.id ? 'true' : 'false'); b.onclick = function () { st = fromData(d); undo = []; X.name.value = d.name; msg(''); upd(); }; X.mine.appendChild(b); });
  }
  function refreshPreview() {
    if (preview) { preview.destroy(); preview = null; }
    var d = curData(), tmp = toChar(d); tmp.id = '__preview';
    var list = window.KUM_CHARACTERS; for (var k = list.length - 1; k >= 0; k--) if (list[k].id === '__preview') list.splice(k, 1);
    if (isEmpty()) { var c0 = X.pv.getContext('2d'); c0.fillStyle = '#0F172A'; c0.fillRect(0, 0, 320, 150); c0.fillStyle = '#8b98b0'; c0.font = '15px system-ui,sans-serif'; c0.textAlign = 'center'; c0.fillText('ระบายสีสักช่อง ตัวอย่างจะเดินให้ดูตรงนี้', 160, 80); return; }
    list.push(tmp);
    preview = KumBot.create(X.pv, { character: '__preview', width: 320, height: 150, stage: { y: 0, h: 150 } });
  }

  // ---------- แปลงรูป -> พิกเซล ----------
  function dist(a, b) { var r = a[0] - b[0], g = a[1] - b[1], bl = a[2] - b[2]; return 2 * r * r + 4 * g * g + 3 * bl * bl; }
  var PALRGB = PAL.map(function (h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
  function fromImage(file) {
    msg('กำลังแปลงรูป…');
    var url = URL.createObjectURL(file), img = new Image();
    img.onerror = function () { URL.revokeObjectURL(url); msg('เปิดรูปนี้ไม่ได้ ลองรูปอื่น (jpg / png)', 'bad'); };
    img.onload = function () {
      URL.revokeObjectURL(url);
      var cv = document.createElement('canvas'); cv.width = N; cv.height = MAXROWS; var g = cv.getContext('2d', { willReadFrequently: true });
      var sc = Math.min(N / img.width, MAXROWS / img.height), w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, Math.floor((N - w) / 2), Math.floor((MAXROWS - h) / 2), w, h);
      var d = g.getImageData(0, 0, N, MAXROWS).data, px = [], j, i;
      for (j = 0; j < MAXROWS; j++) { px.push([]); for (i = 0; i < N; i++) { var o = (j * N + i) * 4; px[j].push([d[o], d[o + 1], d[o + 2], d[o + 3]]); } }
      var hasAlpha = false; for (j = 0; j < MAXROWS; j++) for (i = 0; i < N; i++) if (px[j][i][3] < 200) hasAlpha = true;
      var empty = []; for (j = 0; j < MAXROWS; j++) empty.push(new Array(N).fill(false));
      for (j = 0; j < MAXROWS; j++) for (i = 0; i < N; i++) if (px[j][i][3] < 110) empty[j][i] = true;
      // ลบพื้นหลัง: เติมจากขอบเข้ามา เฉพาะช่องที่สีใกล้สีมุมของรูปจริง (ไม่ใช่ขอบที่เป็นช่องว่างจากการจัดกึ่งกลาง)
      if (X.nobg.checked && !hasAlpha) {
        var x0 = Math.floor((N - w) / 2), y0 = Math.floor((MAXROWS - h) / 2), cs = [px[y0][x0], px[y0][x0 + w - 1], px[y0 + h - 1][x0], px[y0 + h - 1][x0 + w - 1]];
        var bg = [0, 1, 2].map(function (k) { return (cs[0][k] + cs[1][k] + cs[2][k] + cs[3][k]) / 4; }), q = [];
        for (j = 0; j < MAXROWS; j++) for (i = 0; i < N; i++) { var out = i < x0 || i >= x0 + w || j < y0 || j >= y0 + h; if (out) { empty[j][i] = true; } }
        for (j = y0; j < y0 + h; j++) for (i = x0; i < x0 + w; i++) if ((i === x0 || j === y0 || i === x0 + w - 1 || j === y0 + h - 1)) q.push([i, j]);
        var seen = {}; while (q.length) {
          var p = q.pop(), k2 = p[0] + ',' + p[1]; if (seen[k2]) continue; seen[k2] = 1;
          if (p[0] < x0 || p[0] >= x0 + w || p[1] < y0 || p[1] >= y0 + h) continue;
          if (dist(px[p[1]][p[0]], bg) > 2 * 60 * 60 * 2.2) continue;
          empty[p[1]][p[0]] = true; q.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]);
        }
      }
      pushUndo(); st.grid = blank().grid; var cnt = 0;
      for (j = 0; j < MAXROWS; j++) for (i = 0; i < N; i++) {
        if (empty[j][i]) continue; var best = 0, bd = 1e12;
        for (var c = 0; c < PALRGB.length; c++) { var dd = dist(px[j][i], PALRGB[c]); if (dd < bd) { bd = dd; best = c; } }
        st.grid[j][i] = LET[best]; cnt++;
      }
      if (!cnt) { msg('แปลงแล้วไม่เหลือพิกเซลเลย ลองปิดตัวเลือก "ลบพื้นหลัง" หรือใช้รูปอื่น', 'bad'); upd(); return; }
      // ใส่ตาให้เองบริเวณ 1/3 บนของตัว (แก้ได้ด้วยเครื่องมือ "วางตา")
      var top = MAXROWS, bot = -1, l = N, r = -1; for (j = 0; j < MAXROWS; j++) for (i = 0; i < N; i++) if (st.grid[j][i] !== '.') { top = Math.min(top, j); bot = Math.max(bot, j); l = Math.min(l, i); r = Math.max(r, i); }
      var ey = Math.min(MAXROWS - 2, top + Math.max(1, Math.round((bot - top) * .3))), mid = (l + r) / 2, sp = Math.max(2, Math.round((r - l) * .22));
      st.eyes = [[Math.max(0, Math.round(mid - sp - 1)), ey], [Math.min(N - 2, Math.round(mid + sp)), ey]]; st.hasLegs = false;
      if (!st.name) { st.name = (file.name || '').replace(/\.[^.]+$/, '').slice(0, 24); X.name.value = st.name; }
      msg('แปลงรูปเสร็จแล้ว — ปรับสี/ตาต่อได้เลย (สีถูกลดเหลือ 16 สี)', 'ok'); upd();
    };
    img.src = url;
  }

  // ---------- บันทึก / ส่ง / ลบ ----------
  function payload(d) {
    var used = {}; d.map.forEach(function (r) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') used[r[i]] = PAL[LET.indexOf(r[i])]; });
    return 'charset ' + JSON.stringify({ id: d.id, n: d.name, p: used, m: d.map, e: d.eyes, s: d.es, l: d.legs });
  }
  function doSave(send) {
    if (isEmpty()) { msg('ยังไม่ได้ระบายสีเลย ระบายอย่างน้อย 1 ช่องก่อน', 'bad'); return; }
    var d = curData(), all = loadAll(), k = -1; all.forEach(function (x, i) { if (x.id === d.id) k = i; });
    if (k >= 0) all[k] = d; else { if (all.length >= 12) { msg('เก็บได้สูงสุด 12 ตัว — ลบตัวเก่าที่ไม่ใช้ก่อน', 'bad'); return; } all.push(d); }
    if (!saveAll(all)) { msg('บันทึกในมือถือไม่ได้ (พื้นที่เก็บเต็ม หรือปิดการจำค่าไว้)', 'bad'); return; }
    st.id = d.id; register(); if (opts && opts.onChange) opts.onChange(d.id, false);
    if (send) {
      var text = payload(d);
      if (text.length > 4000) { msg('บันทึกในแอปแล้ว แต่ตัวนี้ใหญ่เกินจะส่งให้บอร์ด', 'bad'); upd(); return; }
      msg('บันทึกแล้ว กำลังส่งให้บอร์ด…'); X.bSend.disabled = true;
      Promise.resolve(opts.send(text)).then(function (ok) { msg(ok === false ? 'บันทึกในแอปแล้ว แต่ส่งให้บอร์ดไม่ได้ (เช็คเน็ตแล้วกดส่งอีกครั้ง)' : 'ส่งให้บอร์ดแล้ว ✓ — ถ้าบอร์ดยังเป็นรุ่นเก่า จะยังไม่เปลี่ยนตัว', ok === false ? 'bad' : 'ok'); X.bSend.disabled = false; });
      if (opts.onChange) opts.onChange(d.id, true);
    } else msg('บันทึกแล้ว ✓ — เลือกใช้ได้ในรายการตัวละคร', 'ok');
    upd();
  }
  function doDelete() {
    if (!st.id) return; var name = st.name || 'ตัวนี้';
    if (!window.confirm('ลบ "' + name + '" ออกจากมือถือเครื่องนี้?')) return;
    var all = loadAll().filter(function (d) { return d.id !== st.id; }); saveAll(all);
    var was = st.id; register(); if (opts && opts.onDeleted) opts.onDeleted(was);
    st = blank(); undo = []; X.name.value = ''; msg('ลบแล้ว', 'ok'); upd();
  }
  function open(o, editId) {
    opts = o || {}; if (!root) build();
    var d = editId ? loadAll().filter(function (x) { return x.id === editId; })[0] : null;
    st = d ? fromData(d) : blank(); undo = []; X.name.value = st.name || ''; msg(''); root.classList.add('show'); upd();
  }
  function close() { if (preview) { preview.destroy(); preview = null; } var list = window.KUM_CHARACTERS || []; for (var k = list.length - 1; k >= 0; k--) if (list[k].id === '__preview') list.splice(k, 1); if (root) root.classList.remove('show'); if (opts && opts.onClose) opts.onClose(); }
  api.open = open; api.close = close; api.payloadOf = function (id) { var d = loadAll().filter(function (x) { return x.id === id; })[0]; return d ? payload(d) : null; }; api.isOpen = function () { return !!(root && root.classList.contains('show')); };
  window.KumDraw = api;
})();
