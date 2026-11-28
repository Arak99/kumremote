/* สบายใจ — เอฟเฟกต์บรรยากาศธีมซากุระ v1.0 (แอป v2.37) — เล่นเฉพาะธีมซากุระ เรียก SakuraFx.start()/stop()
   กลีบซากุระปลิว · ประกายลอย · แสงระยิบบนน้ำ · หมอกลอย · พระจันทร์เรือง
   วาดบน canvas เดียว เบา ๆ หยุดเองเมื่อสลับไปแอปอื่น · ถ้าเครื่องตั้ง "ลดการเคลื่อนไหว" จะไม่เล่น */
(function () {
  var cv = document.createElement('canvas'); cv.className = 'fx'; cv.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(cv, document.body.firstChild);
  var probe = document.createElement('div'); probe.className = 'fxprobe'; document.body.appendChild(probe);   // ตำแหน่ง/ขนาดภาพพื้นหลังจริงจาก CSS (--off, --H)
  var c = cv.getContext('2d'), W = 0, H = 0, dpr = 1, bgH = 0, off = 0, petals = [], motes = [], glints = [], t0 = performance.now();
  function geo() { var r = probe.getBoundingClientRect(); bgH = r.height || innerHeight; off = r.top; }
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0); geo();
    var lakeTop = off + bgH * 0.55;
    glints = []; for (var i = 0; i < 34; i++) glints.push({ x: Math.random() * W, y: lakeTop + Math.random() * (H - lakeTop), len: 6 + Math.random() * 16, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.4 });
  }
  function petal(top) {
    return { x: Math.random() * W, y: top ? -20 - Math.random() * H : Math.random() * H, r: 3.5 + Math.random() * 4.5,
      vy: 18 + Math.random() * 26, vx: 6 + Math.random() * 14, sw: 0.6 + Math.random() * 1.4, ph: Math.random() * 6.28,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 2.4, hue: Math.random() };
  }
  function mote() { return { x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 1.8, vy: -(3 + Math.random() * 8), ph: Math.random() * 6.28, sp: 0.8 + Math.random() * 1.6 }; }
  var last = performance.now(), running = false, on = false, made = false;
  addEventListener('resize', function () { if (on) size(); });
  function frame(now) {
    if (!running || !on) { running = false; return; }
    var dt = Math.min(0.05, (now - last) / 1000), t = (now - t0) / 1000; last = now;
    c.clearRect(0, 0, W, H);
    // พระจันทร์เรือง (ตรงกับตำแหน่งในภาพ)
    var mx = W / 2, my = off + bgH * 0.115, mr = bgH * 0.085, g = 0.18 + 0.1 * Math.sin(t * 0.8);
    var rg = c.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 1.9); rg.addColorStop(0, 'rgba(255,235,255,' + g + ')'); rg.addColorStop(1, 'rgba(255,235,255,0)');
    c.fillStyle = rg; c.beginPath(); c.arc(mx, my, mr * 1.9, 0, 6.29); c.fill();
    // หมอกลอยรอบเกาะ
    for (var k = 0; k < 3; k++) {
      var fy = off + bgH * (0.47 + k * 0.035), fx = (W / 2) + Math.sin(t * 0.12 + k * 2.1) * W * 0.35, fr = W * (0.42 + k * 0.08);
      var fg = c.createRadialGradient(fx, fy, 0, fx, fy, fr); fg.addColorStop(0, 'rgba(235,215,255,0.16)'); fg.addColorStop(1, 'rgba(235,215,255,0)');
      c.save(); c.translate(fx, fy); c.scale(1, 0.28); c.translate(-fx, -fy); c.fillStyle = fg; c.beginPath(); c.arc(fx, fy, fr, 0, 6.29); c.fill(); c.restore();
    }
    // แสงระยิบบนน้ำ
    c.lineCap = 'round';
    glints.forEach(function (p) {
      var a = Math.max(0, Math.sin(t * p.sp + p.ph)); a = a * a * 0.85; if (a < 0.02) return;
      c.strokeStyle = 'rgba(255,240,255,' + a + ')'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x - p.len / 2, p.y); c.lineTo(p.x + p.len / 2, p.y); c.stroke();
      if (a > 0.6) { c.fillStyle = 'rgba(255,255,255,' + (a - 0.5) + ')'; c.beginPath(); c.arc(p.x, p.y, 1.6, 0, 6.29); c.fill(); }
    });
    // ประกายลอยขึ้นช้า ๆ
    motes.forEach(function (p) {
      p.y += p.vy * dt; p.x += Math.sin(t * 0.7 + p.ph) * 0.15; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      var a = 0.35 + 0.55 * Math.abs(Math.sin(t * p.sp + p.ph));
      c.fillStyle = 'rgba(255,225,255,' + a + ')'; c.shadowColor = 'rgba(255,190,255,.9)'; c.shadowBlur = 8;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.29); c.fill();
    });
    c.shadowBlur = 0;
    // กลีบซากุระปลิว
    petals.forEach(function (p, i) {
      p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * p.sw + p.ph) * 22) * dt; p.rot += p.vr * dt;
      if (p.y > H + 20 || p.x > W + 30) petals[i] = petal(true);
      var flip = Math.cos(t * p.sw * 2 + p.ph);   // พลิกไปมาเหมือนกลีบจริง
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, 0.35 + 0.65 * Math.abs(flip));
      c.fillStyle = p.hue < 0.5 ? 'rgba(255,190,220,.92)' : 'rgba(255,214,235,.9)';
      c.beginPath(); c.moveTo(0, -p.r); c.bezierCurveTo(p.r * 1.1, -p.r * 0.6, p.r * 0.8, p.r, 0, p.r * 1.1); c.bezierCurveTo(-p.r * 0.8, p.r, -p.r * 1.1, -p.r * 0.6, 0, -p.r); c.fill();
      c.fillStyle = 'rgba(255,140,190,.5)'; c.beginPath(); c.arc(0, p.r * 0.5, p.r * 0.25, 0, 6.29); c.fill();
      c.restore();
    });
    requestAnimationFrame(frame);
  }
  function go() { if (on && !document.hidden && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else go(); });
  window.SakuraFx = {
    start: function () { if (on) return; on = true; cv.style.display = 'block'; size();
      if (!made) { made = true; for (var i = 0; i < 26; i++) petals.push(petal(false)); for (i = 0; i < 28; i++) motes.push(mote()); } go(); },
    stop: function () { on = false; running = false; cv.style.display = 'none'; c.clearRect(0, 0, W, H); }
  };
})();
