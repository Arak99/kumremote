/*
  KumRemote — หน้า "วาดตัวละคร" (Arak Lab Tools)
  ให้เพิ่มตัวละครเองได้: ระบายพิกเซล 24 ช่อง หรือเลือกรูปจากมือถือ (มีหน้าครอบรูปให้จัดก่อน)ให้แปลงเป็นพิกเซลเอง → ดูตัวอย่างเดินเล่นทันที → บันทึกในมือถือ → ส่งให้บอร์ด
  ใช้:  KumDraw.open({ send: function(text){...}, onChange: function(id){...}, getCurrent: function(){return id} })
  ตัวละครที่วาดเอง เก็บใน localStorage 'kumremote_customchars' และถูกเติมเข้า window.KUM_CHARACTERS ตอนโหลดไฟล์นี้ (โหลดหลัง characters.js ก่อนบอท)
  ข้อความที่ส่งให้บอร์ด (ntfy):  charset {"id":"c_ab12","n":"ชื่อ","p":{"A":"#ff3b30",...},"m":["แถว12ตัวอักษร",...],"e":[[3,4],[7,4]],"s":1.2,"l":[3,8]}  (≤ 4KB, ใช้เฉพาะสีที่ใช้จริง)
  ประวัติ: 1.0 (26/11/2026) เวอร์ชันแรก
          1.5 (27/11/2026) เลือกความละเอียดรูปได้: สูงมาก 32×32 (ค่าเริ่มต้น) หรือ 24×24 (32×32 ต้อง KumWake v2.10)
          1.4 (27/11/2026) หน้าครอบรูปจัดรูปให้เองอัตโนมัติ (หากรอบตัวละคร ซูม+เลื่อนให้เต็มกรอบ; ลากปรับต่อได้) · แปลงรูปใช้สีที่พบมากสุดในแต่ละช่อง (คมกว่า ไม่เลอะที่ขอบ)
          1.3 (27/11/2026) ตาจากรูปที่ขยับได้: กรอบตา (🔲) → บอร์ดตัดตาในรูปไปกะพริบ/เลื่อนมอง (ต้อง KumWake v2.8) · หน้าครอบรูปเลือกโหมดตาได้ 3 แบบ
          1.2 (27/11/2026) เลือก "ใช้ตาในรูป" ได้ (ปิดตาของระบบ → ส่ง e:[] ให้บอร์ด; ต้อง KumWake v2.6) ทั้งตอนครอบรูปและปุ่มสลับในหน้าวาด
          1.1 (27/11/2026) ตัวละคร 24×24 (ละเอียดขึ้น 4 เท่า; ตัวเก่า 12×12 ยังใช้ได้) · หน้าครอบรูป (ลากเลื่อน/ซูม) ก่อนแปลง · พาเลตสีของตัวละครมาจากสีหลักของรูป (ไม่ตายตัว 16 สี) · ปุ่มซูม/เลื่อนดูตอนระบายมือ · ส่งขึ้นบอร์ดต้อง KumWake v2.5
*/
(function () {
  'use strict';
  var KEY = 'kumremote_customchars', N = 24, MAXROWS = 24;
  var DEFPAL = ['#ff3b30', '#ff9f1c', '#ffd60a', '#34c759', '#14b8a6', '#3d8bff', '#7c5cff', '#ff6fa8', '#ffffff', '#c9d1dc', '#5b6678', '#1b1f2a', '#7a4e2d', '#f3d19c', '#ffb3a3', '#8fe3ff'];
  var PAL = DEFPAL.slice();
  var LET = 'ABCDEFGHIJKLMNOP', zoomed = false;
  function sizes() { return N > 24 ? [['เล็ก', 2], ['กลาง', 2.5], ['ใหญ่', 3]] : N > 12 ? [['เล็ก', 1.5], ['กลาง', 2], ['ใหญ่', 2.5]] : [['เล็ก', 1], ['กลาง', 1.25], ['ใหญ่', 1.5]]; }
  var api = {}, st = null, undo = [], redo = [], opts = null, root = null, preview = null, painting = false, lastCell = '', boxStart = null, boxIdx = 0, boxNext = 0;

  // ---------- เก็บ/โหลด ----------
  function loadAll() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveAll(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }
  function toChar(d) {   // d = ข้อมูลที่เก็บ -> ตัวละครที่บอทใช้
    var P = d.pal || DEFPAL, pal = {}; P.forEach(function (c, i) { pal[LET[i]] = c; });
    return { id: d.id, name: d.name, custom: true, cols: d.cols || 12, pal: pal, map: d.map.slice(), eyes: d.eyes.map(function (e) { return e.slice(); }), es: d.es || 1.25, legs: d.legs || [], legColor: d.legColor || undefined };
  }
  function register() {
    var list = window.KUM_CHARACTERS = (window.KUM_CHARACTERS || []).filter(function (c) { return !c.custom; });
    loadAll().forEach(function (d) { try { list.push(toChar(d)); } catch (e) {} });
  }
  register();
  function newId() { return 'c_' + Math.random().toString(36).slice(2, 6) + Date.now().toString(36).slice(-3); }

  // ---------- สภาพการแก้ไข ----------
  function setDims(n) { N = MAXROWS = n; if (X.cv) X.cv.setAttribute('aria-label', 'ตารางวาดตัวละคร ' + n + ' คูณ ' + n + ' ช่อง'); }
  function grid0() { var g = []; for (var j = 0; j < MAXROWS; j++) g.push(new Array(N).fill('.')); return g; }
  function blank(n) {
    setDims(n || 24); var f = N / 12, R = Math.round; PAL = DEFPAL.slice();
    return { id: null, name: '', grid: grid0(), eyes: [[R(3 * f), R(4 * f)], [R(7 * f), R(4 * f)]], es: N > 12 ? 2 : 1.25, legs: [R(3 * f), R(8 * f)], hasLegs: true, color: 0, tool: 'paint', pal: PAL, noEyes: false, ec: [] };
  }
  function fromData(d) {
    var s = blank(d.cols || 12); if (d.pal) { s.pal = d.pal.slice(); PAL = s.pal; } s.noEyes = !!d.eyes && d.eyes.length === 0; s.ec = (d.ec || []).map(function (r) { return r.slice(); }); s.id = d.id; s.name = d.name; s.es = d.es || 1.25; if (d.eyes.length) s.eyes = d.eyes.map(function (e) { return e.slice(); });
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
    var m = rows(), eyes = st.noEyes ? [] : st.eyes.map(function (e) { return [e[0], Math.min(e[1], Math.max(0, m.length - 2))]; });
    var d = { id: st.id || newId(), name: (st.name || '').trim() || 'ตัวของฉัน', map: m, eyes: eyes, es: st.es, legs: st.hasLegs ? st.legs.slice() : [], cols: N, pal: st.pal.slice() };
    if (st.noEyes && st.ec.length) {   // ตาจากรูปที่ขยับได้: กรอบตา + สีพื้นที่ใช้ทาทับตอนกะพริบ
      d.ec = st.ec.slice(0, 2).map(function (r) { var x = Math.max(0, Math.min(N - 1, r[0])), y = Math.max(0, Math.min(m.length - 1, r[1])); return [x, y, Math.max(1, Math.min(N - x, r[2])), Math.max(1, Math.min(m.length - y, r[3]))]; });
      d.ef = fillLetter(d.ec, m);
    }
    return d;
  }
  function defaultBoxes() {   // กรอบตาเริ่มต้นรอบตำแหน่งตาเดิม (ลากปรับต่อได้)
    return st.eyes.map(function (e) { var x = Math.max(0, Math.min(N - 4, e[0] - 1)), y = Math.max(0, Math.min(MAXROWS - 4, e[1] - 1)); return [x, y, 4, 4]; });
  }
  function fillLetter(ec, m) {   // สีที่พบมากสุดรอบกรอบตา (ถ้าไม่มี ใช้สีที่พบมากสุดทั้งตัว)
    var cnt = {}, inR = function (i, j) { return ec.some(function (r) { return i >= r[0] && i < r[0] + r[2] && j >= r[1] && j < r[1] + r[3]; }); };
    function add(i, j) { if (j < 0 || j >= m.length || i < 0 || i >= N || inR(i, j)) return; var c = m[j][i]; if (c && c !== '.') cnt[c] = (cnt[c] || 0) + 1; }
    function top() { var best = '', bn = 0; Object.keys(cnt).forEach(function (k) { if (cnt[k] > bn) { bn = cnt[k]; best = k; } }); return best; }
    ec.forEach(function (r) { for (var i = r[0] - 1; i <= r[0] + r[2]; i++) { add(i, r[1] - 1); add(i, r[1] + r[3]); } for (var j = r[1]; j < r[1] + r[3]; j++) { add(r[0] - 1, j); add(r[0] + r[2], j); } });
    var b = top(); if (b) return b;
    m.forEach(function (row, j) { for (var i = 0; i < N; i++) add(i, j); });
    return top() || 'A';
  }
  function snap() { return JSON.stringify([st.grid, st.eyes, st.pal, st.ec]); }
  function restore(j) { var p = JSON.parse(j); st.grid = p[0]; st.eyes = p[1]; if (p[2]) { st.pal = p[2]; PAL = st.pal; } st.ec = p[3] || []; }
  function pushUndo() { undo.push(snap()); if (undo.length > 60) undo.shift(); redo = []; upd(); }
  function doUndo() { if (!undo.length) return; redo.push(snap()); restore(undo.pop()); upd(); }
  function doRedo() { if (!redo.length) return; undo.push(snap()); restore(redo.pop()); upd(); }

  // ---------- หน้าจอ ----------
  function css() {
    if (document.getElementById('kdcss')) return;
    var s = document.createElement('style'); s.id = 'kdcss';
    // v2.17 จัดหน้าวาดใหม่: หัวติดบน (ชื่อ+ปิด), ตาราง, แถบเครื่องมือไอคอน, จานสี, ตัวเลือกเพิ่มเติมพับเก็บ, แถบบันทึกติดล่าง
    // ทุกกฎขึ้นต้นด้วย .kd .sheet เพื่อชนะ ".sheet button" ของหน้าหลัก
    s.textContent =
      '.kd.veil{background:#172136}.kd .sheet{height:100vh;height:100dvh;max-height:100dvh;border-radius:0;border:0;overflow:auto;padding-top:0;padding-bottom:0;display:flex;flex-direction:column}.kd .head{padding-top:calc(env(safe-area-inset-top) + 14px)}.kd .sheet>*{flex:none}' +
      '.kd .sheet button{flex:none;padding:0;font-size:15px;font-weight:600;border-radius:12px;min-height:0;background:#24304a;color:var(--text,#e8eefc)}' +
      '.kd .head{position:sticky;top:0;z-index:4;background:#172136;display:flex;align-items:center;gap:10px;padding:14px 0 10px;border-bottom:1px solid var(--line);margin:0 0 10px}' +
      '.kd .head h3{margin:0;font-size:19px;flex:1}' +
      '.kd .sheet .head .x{width:44px;height:44px;border-radius:50%;font-size:18px;background:#24304a}' +
      '.kd .sheet .head .ur{font-size:22px;font-weight:700}.kd .sheet .head .ur[disabled]{opacity:.3}.kd .sheet .head .ur+.x:not(.ur){margin-left:8px}' +
      '.kd .mine{display:flex;gap:6px;overflow-x:auto;margin:0 0 10px;padding-bottom:2px;scrollbar-width:none}.kd .mine::-webkit-scrollbar{display:none}' +
      '.kd .sheet .mine button{background:#0e1626;border:1px solid var(--line);border-radius:999px;padding:8px 14px;font-size:14px;white-space:nowrap;min-height:38px}' +
      '.kd .sheet .mine button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}' +
      '.kd .sheet .mine .pic{background:#1c2a44;border-color:#2c4a7a}' +
      '.kd .nm{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:11px 14px;border-radius:12px;border:1px solid var(--line);background:#0e1626;color:var(--text);margin:0 0 10px}' +
      '.kd .gridw{position:relative;width:100%;max-width:330px;margin:0 auto 10px;touch-action:none;user-select:none;-webkit-user-select:none}' +
      '.kd canvas.g{width:100%;aspect-ratio:1;display:block;border-radius:12px;border:1px solid var(--line);background:#0e1626;touch-action:none}' +
      '.kd .gridw.zoom{overflow:auto;max-height:330px;touch-action:auto;border-radius:12px;border:1px solid var(--line)}.kd .gridw.zoom canvas.g{width:200%;max-width:none;border:0;border-radius:0}' +
      '.kd .tools{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:0 0 10px}' +
      '.kd .sheet .tools button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:7px 2px;min-height:54px;font-size:11.5px;font-weight:600;color:#b9c5dc}' +
      '.kd .sheet .tools button b{font-size:19px;line-height:1;font-weight:400}' +
      '.kd .sheet .tools button[aria-pressed=true]{background:var(--accent);color:#04121f}' +
      '.kd .sheet .tools button[disabled]{opacity:.35}' +
      '.kd .pal{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:0 0 12px}' +
      '.kd .sheet .pal button{aspect-ratio:1;border-radius:9px;border:2px solid rgba(255,255,255,.08);min-height:0}' +
      '.kd .sheet .pal button[aria-pressed=true]{border-color:#fff;box-shadow:0 0 0 2px var(--accent)}' +
      '.kd .pvw{position:relative;margin:0 0 10px}.kd .pvw span{position:absolute;left:10px;top:8px;font-size:12px;color:#8b98b0}' +
      '.kd .pv{display:block;width:100%;aspect-ratio:320/150;border-radius:12px;border:1px solid var(--line);background:#0F172A;image-rendering:pixelated}' +
      '.kd details{border:1px solid var(--line);border-radius:14px;margin:0 0 10px;background:#121c2f}' +
      '.kd summary{list-style:none;cursor:pointer;padding:12px 14px;font-size:15px;font-weight:600;display:flex;justify-content:space-between}.kd summary::-webkit-details-marker{display:none}' +
      '.kd summary::after{content:"▾";color:var(--dim)}.kd details[open] summary::after{content:"▴"}' +
      '.kd .opts{padding:0 14px 12px}' +
      '.kd .orow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;min-height:44px;border-top:1px solid var(--line);font-size:14.5px}' +
      '.kd .orow:first-child{border-top:0}' +
      '.kd .olab{font-size:13px;color:var(--dim);margin:10px 0 6px}' +
      '.kd .seg{display:flex;gap:6px}' +
      '.kd .sheet .seg button{flex:1;padding:9px 4px;font-size:13.5px;min-height:40px}' +
      '.kd .sheet .seg button[aria-pressed=true]{background:var(--accent);color:#04121f}' +
      '.kd .sheet .sw{width:50px;height:30px;border-radius:30px;background:#33405c;position:relative;padding:0}' +
      '.kd .sheet .sw::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:left .15s}' +
      '.kd .sheet .sw[aria-checked=true]{background:var(--on)}.kd .sheet .sw[aria-checked=true]::after{left:23px}' +
      '.kd .sheet .orow .mini{padding:9px 14px;font-size:14px;min-height:40px}.kd .sheet .orow .danger{background:#3a1620;color:#fca5a5}' +
      '.kd label.opt{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--dim);padding:8px 0;border-top:1px solid var(--line)}.kd label.opt input{margin-top:3px;width:18px;height:18px;flex:none}' +
      '.kd .bar{position:sticky;bottom:0;z-index:4;background:#172136;padding:8px 0 calc(env(safe-area-inset-bottom) + 12px);margin-top:auto;border-top:1px solid var(--line)}' +
      '.kd .msg{min-height:20px;font-size:14px;color:var(--dim);text-align:center;margin:0 0 6px}.kd .msg.ok{color:var(--on)}.kd .msg.bad{color:var(--bad)}' +
      '.kd .bot2{display:flex;gap:8px}.kd .sheet .bot2 button{flex:1;border-radius:14px;padding:13px 8px;font-size:15.5px;font-weight:650;min-height:48px}' +
      '.kd .sheet .save{background:#24304a}.kd .sheet .send{background:var(--on,#34d399);color:#04201a}.kd .sheet .cancel{background:#24304a}' +
      '.kd .sheet .bot2 button[disabled]{opacity:.45}' +
      '.kdcrop .sheet{padding-top:16px}.kdcrop .sheet button{flex:1;min-height:48px}' +
      '.kd select{width:100%;box-sizing:border-box;font:inherit;font-size:14.5px;padding:11px 34px 11px 12px;margin:2px 0 10px;border-radius:12px;border:1px solid var(--line);background-color:#0e1626;color:var(--text,#e8eefc);text-overflow:ellipsis;-webkit-appearance:none;appearance:none;background-image:linear-gradient(45deg,transparent 50%,#8b98b0 50%),linear-gradient(135deg,#8b98b0 50%,transparent 50%);background-position:calc(100% - 18px) 50%,calc(100% - 12px) 50%;background-size:6px 6px;background-repeat:no-repeat}' +
      '.kd .kdcrop label.opt{border-top:0;padding:4px 0 8px}' +
      '.kd .cropcv{width:100%;max-width:340px;aspect-ratio:1;display:block;margin:0 auto 6px;border-radius:12px;border:2px solid var(--line);touch-action:none}.kd .zr{width:100%;margin:4px 0 12px}';
    document.head.appendChild(s);
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  var X = {};   // ชิ้นส่วนหน้าจอ
  function eyeMode() { return !st.noEyes ? 'sys' : st.ec.length ? 'move' : 'still'; }
  function setEyeMode(m) {
    if (m === eyeMode()) return; pushUndo();
    if (m === 'sys') { st.noEyes = false; st.ec = []; if (st.tool === 'ebox') st.tool = 'paint'; }
    else if (m === 'still') { st.noEyes = true; st.ec = []; if (st.tool === 'eye' || st.tool === 'ebox') st.tool = 'paint'; }
    else { st.noEyes = true; st.ec = defaultBoxes(); st.tool = 'ebox'; }
    upd();
  }
  function build() {
    css();
    root = el('div', 'veil kd'); root.id = 'drawVeil';
    var sh = el('div', 'sheet'); sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-labelledby', 'kdT');
    // หัว: ชื่อหน้า + ปิด
    var hd = el('div', 'head'), h = el('h3', '', 'วาดตัวละคร'); h.id = 'kdT'; hd.appendChild(h);
    X.undo = el('button', 'x ur', '↩︎'); X.undo.id = 'kdUndo'; X.undo.setAttribute('aria-label', 'ย้อนกลับ'); X.undo.title = 'ย้อนกลับ'; X.undo.onclick = doUndo; hd.appendChild(X.undo);
    X.redo = el('button', 'x ur', '↪︎'); X.redo.id = 'kdRedo'; X.redo.setAttribute('aria-label', 'ทำซ้ำ'); X.redo.title = 'ทำซ้ำ'; X.redo.onclick = doRedo; hd.appendChild(X.redo);
    X.bClose = el('button', 'x', '✕'); X.bClose.id = 'kdClose'; X.bClose.setAttribute('aria-label', 'ปิด'); X.bClose.onclick = close; hd.appendChild(X.bClose); sh.appendChild(hd);
    // ตัวที่เคยทำ + ตัวใหม่ + จากรูป
    X.mine = el('div', 'mine'); sh.appendChild(X.mine);
    X.file = el('input'); X.file.type = 'file'; X.file.accept = 'image/*'; X.file.hidden = true; X.file.onchange = function () { if (X.file.files && X.file.files[0]) openCrop(X.file.files[0]); X.file.value = ''; }; sh.appendChild(X.file);
    X.name = el('input', 'nm'); X.name.placeholder = 'ชื่อตัวละคร'; X.name.maxLength = 24; X.name.setAttribute('aria-label', 'ชื่อตัวละคร'); sh.appendChild(X.name);
    // ตาราง
    var gw = el('div', 'gridw'); X.cv = el('canvas', 'g'); X.cv.width = 480; X.cv.height = 480; X.cv.setAttribute('aria-label', 'ตารางวาดตัวละคร'); gw.appendChild(X.cv); sh.appendChild(gw); X.gw = gw;
    // แถบเครื่องมือ (ไอคอน + คำสั้น)
    X.tools = el('div', 'tools');
    function tb(icon, label) { var b = el('button'); var i = el('b', '', icon); b.appendChild(i); b.appendChild(document.createTextNode(label)); return b; }
    [['paint', '🖌️', 'ระบาย'], ['erase', '🧽', 'ยางลบ'], ['eye', '👀', 'วางตา'], ['ebox', '🔲', 'กรอบตา'], ['pan', '✋', 'เลื่อน']].forEach(function (t) { var b = tb(t[1], t[2]); b.dataset.t = t[0]; b.onclick = function () { st.tool = t[0]; upd(); }; X.tools.appendChild(b); });
    X.zoom = tb('🔍', 'ซูม'); X.zoom.onclick = function () { zoomed = !zoomed; if (!zoomed && st.tool === 'pan') st.tool = 'paint'; upd(); }; X.tools.appendChild(X.zoom);
    sh.appendChild(X.tools);
    // จานสี
    X.pal = el('div', 'pal'); PAL.forEach(function (c, i) { var b = el('button'); b.style.background = c; b.setAttribute('aria-label', 'สีที่ ' + (i + 1)); b.onclick = function () { st.color = i; st.tool = 'paint'; upd(); }; X.pal.appendChild(b); }); sh.appendChild(X.pal);
    // ตัวอย่างเดินเล่น
    var pw = el('div', 'pvw'); X.pv = el('canvas', 'pv'); X.pv.width = 320; X.pv.height = 150; X.pv.setAttribute('aria-label', 'ตัวอย่างตัวละครเดินเล่น'); pw.appendChild(X.pv); pw.appendChild(el('span', '', 'ตัวอย่าง')); sh.appendChild(pw);
    // ตัวเลือกเพิ่มเติม (พับเก็บ)
    var det = el('details'), sum = el('summary', '', 'ตัวเลือกเพิ่มเติม (ตา ขา รูป)'), op = el('div', 'opts'); det.appendChild(sum); det.appendChild(op); X.det = det;
    op.appendChild(el('div', 'olab', 'ตา'));
    X.eyeSeg = el('div', 'seg');
    [['sys', 'ระบบวาดตา'], ['still', 'ตาในรูป (นิ่ง)'], ['move', 'ตาในรูป (ขยับ)']].forEach(function (m) { var b = el('button', '', m[1]); b.dataset.m = m[0]; b.onclick = function () { setEyeMode(m[0]); }; X.eyeSeg.appendChild(b); });
    op.appendChild(X.eyeSeg);
    X.esLab = el('div', 'olab', 'ขนาดตา'); op.appendChild(X.esLab);
    X.esSeg = el('div', 'seg'); op.appendChild(X.esSeg);
    var r1 = el('div', 'orow'); r1.style.marginTop = '8px'; r1.appendChild(el('span', '', 'มีขา (เดินขยับขา)'));
    X.legs = el('button', 'sw'); X.legs.setAttribute('role', 'switch'); X.legs.setAttribute('aria-label', 'มีขา'); X.legs.onclick = function (e) { if (e) e.stopPropagation(); st.hasLegs = !st.hasLegs; upd(); }; r1.appendChild(X.legs); r1.style.cursor = 'pointer'; r1.onclick = function () { X.legs.onclick(); }; op.appendChild(r1);
    var r2 = el('div', 'orow'); r2.appendChild(el('span', '', 'ล้างตารางทั้งหมด'));
    X.clear = el('button', 'mini', '🗑️ ล้าง'); X.clear.onclick = function () { if (isEmpty()) return; pushUndo(); st.grid = grid0(); upd(); }; r2.appendChild(X.clear); op.appendChild(r2);
    var lb = el('label', 'opt'); X.nobg = el('input'); X.nobg.type = 'checkbox'; X.nobg.checked = true; lb.appendChild(X.nobg); lb.appendChild(document.createTextNode('ทำจากรูป: ลบพื้นหลังให้ (ใช้ได้ดีกับรูปพื้นหลังสีเรียบ)')); op.appendChild(lb);
    var lb2 = el('label', 'opt'); X.autosend = el('input'); X.autosend.type = 'checkbox'; X.autosend.checked = true; lb2.appendChild(X.autosend); lb2.appendChild(document.createTextNode('ทำจากรูป: แปลงเสร็จแล้วบันทึก + ส่งขึ้นบอร์ดให้เลย')); op.appendChild(lb2);
    X.delRow = el('div', 'orow'); X.delRow.appendChild(el('span', '', 'ลบตัวนี้ออกจากมือถือ'));
    X.bDel = el('button', 'mini danger', 'ลบตัวนี้'); X.bDel.onclick = doDelete; X.delRow.appendChild(X.bDel); op.appendChild(X.delRow);
    // v2.19 จำว่ากาง/หุบ "ตัวเลือกเพิ่มเติม" ไว้ (เปิดครั้งหน้า/รีเฟรช อยู่แบบเดิม)
    try { det.open = localStorage.getItem('kumremote_drawopts') === '1'; } catch (e) {}
    det.addEventListener('toggle', function () { try { localStorage.setItem('kumremote_drawopts', det.open ? '1' : '0'); } catch (e) {} });
    sh.appendChild(det);
    // แถบบันทึกติดล่าง
    X.msg = el('div', 'msg'); X.msg.setAttribute('aria-live', 'polite');
    var bar = el('div', 'bar'), b2 = el('div', 'bot2'); bar.appendChild(X.msg);
    X.bSave = el('button', 'save', 'บันทึก'); X.bSave.onclick = function () { doSave(false); };
    X.bSend = el('button', 'send', 'บันทึก + ส่งให้บอร์ด'); X.bSend.onclick = function () { doSave(true); };
    b2.appendChild(X.bSave); b2.appendChild(X.bSend); bar.appendChild(b2); sh.appendChild(bar);
    X.pic = { click: function () { X.file.click(); } };
    root.appendChild(sh); document.body.appendChild(root);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    X.name.oninput = function () { st.name = X.name.value; };
    // วาดด้วยนิ้ว/เมาส์ (ลากต่อเนื่องได้)
    function cell(e) { var r = X.cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * MAXROWS); return (x < 0 || y < 0 || x >= N || y >= MAXROWS) ? null : [x, y]; }
    function apply(e, first) {
      var p = cell(e); if (!p) return; var k = p[0] + ',' + p[1]; if (!first && k === lastCell) return; lastCell = k;
      if (st.tool === 'ebox') {
        if (first) { pushUndo(); boxStart = p; boxIdx = st.ec.length >= 2 ? (boxNext++ % 2) : st.ec.length; }
        if (boxStart) { var bx = Math.min(boxStart[0], p[0]), by = Math.min(boxStart[1], p[1]); st.ec[boxIdx] = [bx, by, Math.abs(p[0] - boxStart[0]) + 1, Math.abs(p[1] - boxStart[1]) + 1]; upd(true); }
        return;
      }
      if (st.tool === 'eye') { if (first) { pushUndo(); var i = p[0] < N / 2 ? 0 : 1; st.eyes[i] = [Math.min(p[0], N - 2), Math.min(p[1], MAXROWS - 2)]; upd(); } return; }
      var v = st.tool === 'erase' ? '.' : LET[st.color]; if (st.grid[p[1]][p[0]] === v) return; if (first) pushUndo(); st.grid[p[1]][p[0]] = v; upd(true);
    }
    X.cv.addEventListener('pointerdown', function (e) { if (st.tool === 'pan') return; e.preventDefault(); painting = true; lastCell = ''; try { X.cv.setPointerCapture(e.pointerId); } catch (x) {} apply(e, true); });
    X.cv.addEventListener('pointermove', function (e) { if (painting) apply(e, false); });
    ['pointerup', 'pointercancel'].forEach(function (n) { X.cv.addEventListener(n, function () { painting = false; lastCell = ''; boxStart = null; }); });
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
    if (!st.noEyes) st.eyes.forEach(function (e) { var w = s * 2 * st.es, cx = e[0] * s + s, cy = e[1] * s + s; g.fillStyle = '#fff'; g.fillRect(cx - w / 2, cy - w / 2, w, w); g.fillStyle = '#1b2333'; g.fillRect(cx + w * .02, cy - w * .1, w * .38, w * .46); });
    if (st.noEyes) st.ec.forEach(function (r) { g.strokeStyle = '#22d3ee'; g.lineWidth = 2; g.strokeRect(r[0] * s + 1, r[1] * s + 1, r[2] * s - 2, r[3] * s - 2); });
    if (st.hasLegs) { g.fillStyle = 'rgba(255,255,255,.35)'; st.legs.forEach(function (l) { g.fillRect(l * s + s * .2, MAXROWS * s - 5, s * .6, 4); }); }
  }
  function upd(light) {
    drawGrid();
    if (light) { refreshPreview(); return; }
    Array.prototype.forEach.call(X.pal.children, function (b, i) { b.setAttribute('aria-pressed', st.tool === 'paint' && i === st.color ? 'true' : 'false'); });
    Array.prototype.forEach.call(X.tools.children, function (b) { b.setAttribute('aria-pressed', b.dataset.t === st.tool ? 'true' : 'false'); if (b.dataset.t === 'eye') b.hidden = !!st.noEyes; if (b.dataset.t === 'ebox') b.hidden = !st.noEyes; });
    if (st.noEyes && st.tool === 'eye') st.tool = 'paint'; if (!st.noEyes && st.tool === 'ebox') st.tool = 'paint';
    X.legs.setAttribute('aria-checked', st.hasLegs ? 'true' : 'false');
    var em = eyeMode(); Array.prototype.forEach.call(X.eyeSeg.children, function (b) { b.setAttribute('aria-pressed', b.dataset.m === em ? 'true' : 'false'); });
    X.esLab.hidden = X.esSeg.hidden = !!st.noEyes; X.esSeg.textContent = '';
    sizes().forEach(function (z) { var b = el('button', '', z[0]); b.setAttribute('aria-pressed', Math.abs(z[1] - st.es) < .01 ? 'true' : 'false'); b.onclick = function () { st.es = z[1]; upd(); }; X.esSeg.appendChild(b); });
    X.gw.classList.toggle('zoom', zoomed); X.cv.style.touchAction = st.tool === 'pan' ? 'auto' : 'none';
    X.zoom.setAttribute('aria-pressed', zoomed ? 'true' : 'false'); Array.prototype.forEach.call(X.tools.children, function (b) { if (b.dataset.t === 'pan') b.disabled = !zoomed; });
    Array.prototype.forEach.call(X.pal.children, function (b, i) { b.style.background = st.pal[i]; });
    X.undo.disabled = !undo.length; X.redo.disabled = !redo.length; X.clear.disabled = isEmpty();
    var hasMine = !!st.id && loadAll().some(function (d) { return d.id === st.id; }); X.delRow.hidden = !hasMine;
    X.bSend.disabled = !(opts && opts.send); X.bSave.textContent = hasMine ? 'บันทึกทับ' : 'บันทึก';
    var hT = document.getElementById('kdT'); if (hT) hT.textContent = hasMine ? 'แก้ตัวละคร' : 'วาดตัวละครใหม่';
    buildMine(); refreshPreview();
  }
  function buildMine() {
    X.mine.textContent = ''; var all = loadAll();
    var nb = el('button', '', '＋ ตัวใหม่'); nb.onclick = function () { st = blank(); undo = []; redo = []; X.name.value = ''; msg(''); upd(); }; nb.setAttribute('aria-pressed', st.id ? 'false' : 'true'); X.mine.appendChild(nb);
    var pb = el('button', 'pic', '🖼️ ทำจากรูป'); pb.onclick = function () { X.file.click(); }; X.mine.appendChild(pb);
    all.forEach(function (d) { var b = el('button', '', d.name); b.setAttribute('aria-pressed', st.id === d.id ? 'true' : 'false'); b.onclick = function () { st = fromData(d); undo = []; redo = []; X.name.value = d.name; msg(''); upd(); }; X.mine.appendChild(b); });
  }
  function refreshPreview() {
    if (preview) { preview.destroy(); preview = null; }
    var d = curData(), tmp = toChar(d); tmp.id = '__preview';
    var list = window.KUM_CHARACTERS; for (var k = list.length - 1; k >= 0; k--) if (list[k].id === '__preview') list.splice(k, 1);
    if (isEmpty()) { var c0 = X.pv.getContext('2d'); c0.fillStyle = '#0F172A'; c0.fillRect(0, 0, 320, 150); c0.fillStyle = '#8b98b0'; c0.font = '15px system-ui,sans-serif'; c0.textAlign = 'center'; c0.fillText('ระบายสีสักช่อง ตัวอย่างจะเดินให้ดูตรงนี้', 160, 80); return; }
    list.push(tmp);
    preview = KumBot.create(X.pv, { character: '__preview', width: 320, height: 150, stage: { y: 0, h: 150 } });
  }

  // ---------- แปลงรูป -> พิกเซล (มีหน้าครอบรูปก่อน) ----------
  function dist(a, b) { var r = a[0] - b[0], g = a[1] - b[1], bl = a[2] - b[2]; return 2 * r * r + 4 * g * g + 3 * bl * bl; }
  function hex2(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function rgbOf(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function kmeans(cols, k) {   // แบ่งกลุ่มสี ได้สีหลักของรูป (ใช้เป็นพาเลตของตัวละครนี้)
    if (!cols.length) return [];
    var cen = [cols[0].slice()], it, i, c;
    while (cen.length < k) {
      var bi = -1, bd = -1;
      cols.forEach(function (col, n) { var m = 1e12; cen.forEach(function (q) { m = Math.min(m, dist(col, q)); }); if (m > bd) { bd = m; bi = n; } });
      if (bd < 600) break; cen.push(cols[bi].slice());
    }
    for (it = 0; it < 8; it++) {
      var sum = cen.map(function () { return [0, 0, 0, 0]; });
      cols.forEach(function (col) { var b = 0, m = 1e12; for (c = 0; c < cen.length; c++) { var dd = dist(col, cen[c]); if (dd < m) { m = dd; b = c; } } sum[b][0] += col[0]; sum[b][1] += col[1]; sum[b][2] += col[2]; sum[b][3]++; });
      for (c = 0; c < cen.length; c++) if (sum[c][3]) cen[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]];
    }
    return cen;
  }
  function cornerInfo(img) {   // สีพื้นหลังโดยประมาณจาก 4 มุมของรูป
    var c = document.createElement('canvas'); c.width = c.height = 16; var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 16, 16);
    var sum = [0, 0, 0], al = 0, n = 0;
    [[0, 0], [14, 0], [0, 14], [14, 14]].forEach(function (p) { var d = g.getImageData(p[0], p[1], 2, 2).data; for (var o = 0; o < 16; o += 4) { sum[0] += d[o]; sum[1] += d[o + 1]; sum[2] += d[o + 2]; al += d[o + 3]; n++; } });
    return { bg: [sum[0] / n, sum[1] / n, sum[2] / n], alpha: al / n };
  }
  function openCrop(file) {
    msg('กำลังเปิดรูป…');
    var url = URL.createObjectURL(file), img = new Image();
    img.onerror = function () { URL.revokeObjectURL(url); msg('เปิดรูปนี้ไม่ได้ ลองรูปอื่น (jpg / png)', 'bad'); };
    img.onload = function () {
      var S = 300, zf = 1, ox = 0, oy = 0, drag = null;
      var ov = el('div', 'veil kdcrop'), sh = el('div', 'sheet');
      sh.appendChild(el('h3', '', 'จัดรูปก่อนแปลง'));
      sh.appendChild(el('p', 'hint', 'ลากรูปให้ตัวละครอยู่กลางกรอบ · เลื่อนแถบเพื่อซูมเข้า/ออก · ส่วนนอกกรอบจะไม่ถูกใช้'));
      var cv = el('canvas', 'cropcv'); cv.width = cv.height = S; cv.setAttribute('aria-label', 'กรอบครอบรูป ลากเพื่อเลื่อนรูป'); sh.appendChild(cv);
      var zr = el('input', 'zr'); zr.type = 'range'; zr.min = 30; zr.max = 500; zr.value = 100; zr.setAttribute('aria-label', 'ซูมรูป'); sh.appendChild(zr);
      var lb = el('label', 'opt'), cb = el('input'); cb.type = 'checkbox'; cb.checked = X.nobg.checked; lb.appendChild(cb); lb.appendChild(document.createTextNode('ลบพื้นหลังให้ (ใช้ได้ดีกับรูปที่พื้นหลังสีเรียบ)')); sh.appendChild(lb);
      var lbr = el('label', 'opt'), rs = el('select'); [['32', 'ความละเอียด: สูงมาก 32×32 ช่อง (ละเอียดที่สุด)'], ['24', 'ความละเอียด: 24×24 ช่อง (มาตรฐาน)']].forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; rs.appendChild(op); }); lbr.appendChild(rs); sh.appendChild(lbr);
      var lb3 = el('label', 'opt'), cb3 = el('select'); [['0', 'ตา: ระบบวาดตาให้ (กะพริบ/เหลือบมอง)'], ['1', 'ตา: ใช้ตาในรูป (อยู่นิ่ง)'], ['2', 'ตา: ใช้ตาในรูป + ให้ขยับได้ (ลากกรอบตาปรับได้)']].forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; cb3.appendChild(op); }); lb3.appendChild(cb3); sh.appendChild(lb3);
      var row = el('div', 'bot2'), ok = el('button', 'save', 'ใช้รูปนี้'), no = el('button', 'cancel', 'ยกเลิก'); row.appendChild(ok); row.appendChild(no); sh.appendChild(row);
      ov.appendChild(sh); root.appendChild(ov); ov.classList.add('show');
      function paint(g, Z) { var k = Math.min(Z / img.width, Z / img.height) * zf, w = img.width * k, h = img.height * k, sc = Z / S; g.drawImage(img, Z / 2 + ox * sc - w / 2, Z / 2 + oy * sc - h / 2, w, h); }
      // v1.4 จัดรูปให้อัตโนมัติ: หากรอบของตัวละคร (ส่วนที่ไม่ใช่พื้นหลัง) แล้วซูม/เลื่อนให้เต็มกรอบ
      (function autoFit() {
        try {
          var R = 160, c = document.createElement('canvas'); c.width = c.height = R; var g = c.getContext('2d', { willReadFrequently: true });
          var k0 = Math.min(R / img.width, R / img.height), w0 = img.width * k0, h0 = img.height * k0, X0 = (R - w0) / 2, Y0 = (R - h0) / 2;
          g.drawImage(img, X0, Y0, w0, h0); var d = g.getImageData(0, 0, R, R).data, info = cornerInfo(img);
          var l = R, r = -1, t = R, b = -1, x, y, cnt = 0;
          for (y = 0; y < R; y++) for (x = 0; x < R; x++) {
            if (x < X0 || x >= X0 + w0 || y < Y0 || y >= Y0 + h0) continue;
            var o = (y * R + x) * 4, fg = info.alpha < 200 ? d[o + 3] > 40 : (d[o + 3] > 40 && dist([d[o], d[o + 1], d[o + 2]], info.bg) > 2 * 60 * 60 * 2.2);
            if (fg) { cnt++; if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
          }
          if (cnt < 30 || r < l || b < t) return;
          var bw = (r - l + 1) / k0, bh = (b - t + 1) / k0, cx = ((l + r + 1) / 2 - X0) / k0, cy = ((t + b + 1) / 2 - Y0) / k0;   // หน่วยพิกเซลรูปจริง
          var base = Math.min(S / img.width, S / img.height), want = .86 * S / Math.max(bw, bh);
          zf = Math.max(.3, Math.min(5, want / base)); var kk = base * zf;
          ox = img.width * kk / 2 - cx * kk; oy = img.height * kk / 2 - cy * kk; zr.value = Math.round(zf * 100);
        } catch (e) {}
      })();
      function show() {
        var g = cv.getContext('2d'), x, y; g.clearRect(0, 0, S, S);
        for (y = 0; y < S; y += 20) for (x = 0; x < S; x += 20) { g.fillStyle = ((x + y) / 20) % 2 ? '#1b2640' : '#141d33'; g.fillRect(x, y, 20, 20); }
        paint(g, S);
        g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1; g.beginPath(); g.moveTo(S / 3, 0); g.lineTo(S / 3, S); g.moveTo(S * 2 / 3, 0); g.lineTo(S * 2 / 3, S); g.moveTo(0, S / 3); g.lineTo(S, S / 3); g.moveTo(0, S * 2 / 3); g.lineTo(S, S * 2 / 3); g.stroke();
      }
      function done() { URL.revokeObjectURL(url); if (ov.parentNode) ov.parentNode.removeChild(ov); msg(''); }
      cv.addEventListener('pointerdown', function (e) { drag = [e.clientX, e.clientY]; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
      cv.addEventListener('pointermove', function (e) { if (!drag) return; var r = cv.getBoundingClientRect(); ox += (e.clientX - drag[0]) * S / r.width; oy += (e.clientY - drag[1]) * S / r.height; drag = [e.clientX, e.clientY]; show(); });
      ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { drag = null; }); });
      zr.oninput = function () { zf = zr.value / 100; show(); };
      cv.addEventListener('wheel', function (e) { e.preventDefault(); zf = Math.max(.3, Math.min(5, zf * (e.deltaY < 0 ? 1.1 : .9))); zr.value = Math.round(zf * 100); show(); }, { passive: false });
      no.onclick = done;
      ok.onclick = function () {
        X.nobg.checked = cb.checked;
        var RES = +rs.value, HR = RES * 8, hc = document.createElement('canvas'); hc.width = hc.height = HR; var g = hc.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; paint(g, HR);
        var info = cornerInfo(img); info.hasEyes = +cb3.value; info.res = RES; done(); convert(hc, info, file.name || '');
      };
      show();
    };
    img.src = url;
  }
  function convert(hc, info, fname) {
    msg('กำลังแปลงรูป…');
    st = blank(info.res || 24); undo = []; redo = []; X.name.value = '';   // รูปใหม่ = ตัวละครใหม่เสมอ (ไม่ทับตัวเดิม)
    var Z = N * 4, c2 = document.createElement('canvas'); c2.width = c2.height = Z; var g2 = c2.getContext('2d', { willReadFrequently: true });
    g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high'; g2.drawImage(hc, 0, 0, Z, Z);
    var d = g2.getImageData(0, 0, Z, Z).data, px = [], empty = [], i, j, u, v;
    for (j = 0; j < N; j++) {
      px.push([]); empty.push([]);
      for (i = 0; i < N; i++) {
        var rs = 0, gs = 0, bs = 0, as = 0, all = [], fgs = [], useBg = X.nobg.checked && info.alpha > 200;
        for (v = 0; v < 4; v++) for (u = 0; u < 4; u++) { var o = ((j * 4 + v) * Z + (i * 4 + u)) * 4, a = d[o + 3] / 255; as += a; if (a > .5) { var sp = [d[o], d[o + 1], d[o + 2]]; all.push(sp); if (!useBg || dist(sp, info.bg) > 2 * 60 * 60 * 2.2) fgs.push(sp); } }
        // v1.4 ใช้ "สีที่พบมากสุดในช่อง" แทนค่าเฉลี่ย (รูปพิกเซลจะคมไม่เลอะ) และไม่เอาสีพื้นหลังมาผสมที่ขอบ
        var lst = fgs.length ? fgs : all, best = null, bn = -1;
        lst.forEach(function (a1) { var n1 = 0; lst.forEach(function (b1) { if (dist(a1, b1) < 2 * 45 * 45) n1++; }); if (n1 > bn) { bn = n1; best = a1; } });
        if (best) { lst.forEach(function (b1) { if (dist(best, b1) < 2 * 45 * 45) { rs += b1[0]; gs += b1[1]; bs += b1[2]; } }); rs /= bn; gs /= bn; bs /= bn; as = 1; px[j].push([rs, gs, bs]); empty[j].push(all.length < 8); continue; }
        as = 0;
        px[j].push(as > 0 ? [rs / as, gs / as, bs / as] : [0, 0, 0]); empty[j].push(as / 16 < .5);
      }
    }
    // ลบพื้นหลัง: เติมจากขอบกรอบเข้ามา เฉพาะช่องที่สีใกล้สีมุมของรูป (รูปโปร่งใสอยู่แล้วไม่ต้องลบ)
    if (X.nobg.checked && info.alpha > 200) {
      var q = [], seen = {}, TH = 2 * 85 * 85;
      for (i = 0; i < N; i++) q.push([i, 0], [i, N - 1]); for (j = 0; j < N; j++) q.push([0, j], [N - 1, j]);
      while (q.length) {
        var p = q.pop(), k = p[0] + ',' + p[1]; if (seen[k]) continue; seen[k] = 1;
        if (p[0] < 0 || p[1] < 0 || p[0] >= N || p[1] >= N) continue;
        if (!empty[p[1]][p[0]]) { if (dist(px[p[1]][p[0]], info.bg) > TH) continue; empty[p[1]][p[0]] = true; }
        q.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]);
      }
    }
    if (X.nobg.checked && info.alpha > 200) {   // v1.5 ตัดช่องสีเทาจางๆ ที่ติดขอบพื้นหลัง (เศษขอบรูป) 1 รอบ
      var rm = [];
      for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
        if (empty[j][i] || dist(px[j][i], info.bg) > 2 * 105 * 105) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (q) { var a = i + q[0], b = j + q[1]; return a < 0 || b < 0 || a >= N || b >= N || empty[b][a]; })) rm.push([i, j]);
      }
      rm.forEach(function (q) { empty[q[1]][q[0]] = true; });
    }
    var cols = [], cnt = 0; for (j = 0; j < N; j++) for (i = 0; i < N; i++) if (!empty[j][i]) { cols.push(px[j][i]); cnt++; }
    if (!cnt) { msg('แปลงแล้วไม่เหลือพิกเซลเลย ลองจัดรูปใหม่ หรือปิดตัวเลือก "ลบพื้นหลัง"', 'bad'); upd(); return; }
    // พาเลตของตัวนี้ = สีหลักของรูป (สูงสุด 12 สี) + ขาว/ดำเข้ม + เติมสีมาตรฐานจนครบ 16
    var pal = kmeans(cols, 12).map(hex2);
    ['#ffffff', '#1b1f2a'].forEach(function (h) { if (pal.length < 16 && !pal.some(function (x) { return dist(rgbOf(x), rgbOf(h)) < 4000; })) pal.push(h); });
    DEFPAL.forEach(function (h) { if (pal.length < 16 && pal.indexOf(h) < 0) pal.push(h); });
    st.pal = pal.slice(0, 16); PAL = st.pal;
    var PR = st.pal.map(rgbOf);
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      if (empty[j][i]) continue; var best = 0, bd = 1e12;
      for (var c = 0; c < PR.length; c++) { var dd = dist(px[j][i], PR[c]); if (dd < bd) { bd = dd; best = c; } }
      st.grid[j][i] = LET[best];
    }
    // ใส่ตาให้เองบริเวณ 1/3 บนของตัว (แก้ได้ด้วยเครื่องมือ "วางตา")
    var top = N, bot = -1, l = N, r = -1; for (j = 0; j < N; j++) for (i = 0; i < N; i++) if (st.grid[j][i] !== '.') { top = Math.min(top, j); bot = Math.max(bot, j); l = Math.min(l, i); r = Math.max(r, i); }
    var ey = Math.min(N - 2, top + Math.max(1, Math.round((bot - top) * .3))), mid = (l + r) / 2, sp = Math.max(3, Math.round((r - l) * .2));
    st.eyes = [[Math.max(0, Math.min(N - 2, Math.round(mid - sp - 1))), ey], [Math.max(0, Math.min(N - 2, Math.round(mid + sp - 1))), ey]]; st.hasLegs = false; st.es = N > 24 ? 2.5 : 2; st.noEyes = info.hasEyes > 0; st.ec = info.hasEyes === 2 ? defaultBoxes() : []; if (info.hasEyes === 2) st.tool = 'ebox';
    if (!st.name) { st.name = fname.replace(/\.[^.]+$/, '').slice(0, 24); X.name.value = st.name; }
    msg('แปลงรูปเสร็จแล้ว — ปรับสี/ตาต่อได้เลย', 'ok'); upd();
    if (X.autosend && X.autosend.checked) doSave(true);
  }

  // ---------- บันทึก / ส่ง / ลบ ----------
  function payload(d) {
    var used = {}; d.map.forEach(function (r) { for (var i = 0; i < r.length; i++) if (r[i] !== '.') used[r[i]] = (d.pal || DEFPAL)[LET.indexOf(r[i])]; });
    return 'charset ' + JSON.stringify({ id: d.id, n: d.name, p: used, w: d.cols || 12, m: d.map, e: d.eyes, s: d.es, l: d.legs, ec: d.ec, ef: d.ef });
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
      Promise.resolve(opts.send(text)).then(function (ok) { msg(ok === false ? 'บันทึกในแอปแล้ว แต่ส่งให้บอร์ดไม่ได้ (เช็คเน็ตแล้วกดส่งอีกครั้ง)' : 'ส่งให้บอร์ดแล้ว ✓', ok === false ? 'bad' : 'ok'); X.bSend.disabled = false; });
      if (opts.onChange) opts.onChange(d.id, true);
    } else msg('บันทึกแล้ว ✓ — เลือกใช้ได้ในรายการตัวละคร', 'ok');
    upd();
  }
  function doDelete() {
    if (!st.id) return; var name = st.name || 'ตัวนี้';
    if (!window.confirm('ลบ "' + name + '" ออกจากมือถือเครื่องนี้?')) return;
    var all = loadAll().filter(function (d) { return d.id !== st.id; }); saveAll(all);
    var was = st.id; register(); if (opts && opts.onDeleted) opts.onDeleted(was);
    st = blank(); undo = []; redo = []; X.name.value = ''; msg('ลบแล้ว', 'ok'); upd();
  }
  function open(o, editId, photo) {
    opts = o || {}; if (!root) build();
    var d = editId ? loadAll().filter(function (x) { return x.id === editId; })[0] : null;
    st = d ? fromData(d) : blank(); undo = []; redo = []; X.name.value = st.name || ''; msg(''); root.classList.add('show'); upd();
    if (photo && !d && X.file) X.file.click();
  }
  function close() { if (preview) { preview.destroy(); preview = null; } var list = window.KUM_CHARACTERS || []; for (var k = list.length - 1; k >= 0; k--) if (list[k].id === '__preview') list.splice(k, 1); if (root) { Array.prototype.forEach.call(root.querySelectorAll('.kdcrop'), function (n) { n.parentNode.removeChild(n); }); root.classList.remove('show'); } if (opts && opts.onClose) opts.onClose(); }
  // v2.16 ลบตัวละครที่ทำเองจากหน้าตั้งค่าได้เลย
  api.remove = function (id) { saveAll(loadAll().filter(function (d) { return d.id !== id; })); register(); };
  api.open = open; api.close = close; api.payloadOf = function (id) { var d = loadAll().filter(function (x) { return x.id === id; })[0]; return d ? payload(d) : null; }; api.isOpen = function () { return !!(root && root.classList.contains('show')); };
  window.KumDraw = api;
})();
