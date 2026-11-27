const { chromium } = require('playwright');
const out = [];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const vp of [[360, 640], [412, 915]]) {
    const tag = vp.join('x');
    const ctx = await b.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const posts = [];
    const now = Date.now();
    const hist = [['🟢 RUBY_PC เปิดอยู่', 60], ['💡 จอตัวปลุก: ความสว่าง 60% · หรี่เอง: เปิด', 50], ['sleep', 40], ['😴 RUBY_PC กำลัง Sleep', 39], ['🤖✅ Claude ทำงานเสร็จ: งานทดสอบที่มีชื่อยาวมากๆ เพื่อดูว่าข้อความยาวล้นไหมในรายการ', 30], ['🎤? เปิดไฟหน่อย', 20], ['⚡ ส่งสัญญาณปลุก RUBY_PC แล้ว', 10], ['🟢 RUBY_PC เปิดอยู่', 5]]
      .map((x, i) => ({ id: i + 1, ts: now - x[1] * 60000, body: x[0] }));
    await ctx.route(/sabaijai|ntfy\.sh/, r => { const q = r.request(); if (q.method() === 'POST') posts.push(q.postData());
      return q.url().includes('/sse') ? r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: ': x\n\n' }) : r.fulfill({ status: 200, body: q.url().includes('/sub') ? JSON.stringify({ messages: hist, last: hist.length }) : '' }); });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    // ตรวจทั่วไปของหน้าจอที่เห็นอยู่
    const check = async (name) => {
      const r = await p.evaluate(() => {
        const W = innerWidth, H = innerHeight, issues = [];
        const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const lbl = e => (e.id ? '#' + e.id : '') + '.' + (e.className || '').toString().split(' ')[0] + ' "' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 25) + '"';
        // ล้นแนวนอน
        if (document.documentElement.scrollWidth > W + 1) issues.push('page wider than screen: ' + document.documentElement.scrollWidth);
        document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.right > W + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('.mine,.gridw.zoom,.hlist')) issues.push('sticks out right: ' + lbl(e) + ' right=' + Math.round(r.right)); });
        // ปุ่มเล็กเกิน (ในส่วนที่มองเห็นจริง)
        document.querySelectorAll('button,input,select,a').forEach(e => { if (!vis(e) || e.type === 'hidden' || e.type === 'range' || e.type === 'checkbox') return; const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > H) return; if (e.closest('.pal')) return; if (r.height < 36 || r.width < 36) issues.push('small target: ' + lbl(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
        // ข้อความโดนตัด (ยกเว้นที่ตั้งใจใส่ ...)
        document.querySelectorAll('button,span,div,h1,h2,h3,h4,p,li').forEach(e => { if (!vis(e) || e.children.length) return; const s = getComputedStyle(e); if (s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none') return; if (e.scrollWidth > e.clientWidth + 2 && s.overflowX !== 'visible') issues.push('text cut: ' + lbl(e)); });
        // ปุ่มที่โดนอย่างอื่นบัง (จุดกลางปุ่ม)
        document.querySelectorAll('button,input').forEach(e => { if (!vis(e) || e.type === 'hidden') return; const r = e.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2; if (cy < 0 || cy > H || cx < 0 || cx > W) return; const t = document.elementFromPoint(cx, cy); if (t && t !== e && !e.contains(t) && !t.closest('.veil.show') !== !e.closest('.veil.show')) return; if (t && t !== e && !e.contains(t) && !t.contains(e)) { const topVeil = t.closest('.veil.show'); const myVeil = e.closest('.veil.show'); if (topVeil === myVeil) issues.push('covered: ' + lbl(e) + ' by ' + lbl(t)); } });
        // ตัวหนังสือบนปุ่มอ่านไม่ออก (สีตัวหนังสือกับสีพื้นใกล้กันเกิน)
        const rgb = c => { const m = c.match(/[\d.]+/g); return m ? m.slice(0, 4).map(Number) : [0, 0, 0, 0]; };
        const lum = a => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(a[0]) + .7152 * f(a[1]) + .0722 * f(a[2]); };
        const bgOf = e => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c[3] === undefined || c[3] > .5) return c; } return [23, 33, 54]; };
        document.querySelectorAll('button').forEach(e => { if (!vis(e) || e.disabled || !(e.innerText || '').trim()) return; const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > H) return; const fg = rgb(getComputedStyle(e).color), bg = bgOf(e); const L1 = lum(fg), L2 = lum(bg), cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); if (cr < 3) issues.push('hard to read: ' + lbl(e) + ' contrast ' + cr.toFixed(1)); });
        // ตัวหนังสือเล็กเกิน
        let tiny = 0; document.querySelectorAll('body *').forEach(e => { if (!vis(e) || e.children.length || !(e.innerText || '').trim()) return; if (parseFloat(getComputedStyle(e).fontSize) < 11.5) tiny++; }); if (tiny) issues.push('tiny text elements: ' + tiny);
        return [...new Set(issues)].slice(0, 25);
      });
      await p.screenshot({ path: `/tmp/au_${tag}_${name}.png` });
      out.push(`[${tag}] ${name}: ` + (r.length ? '\n   - ' + r.join('\n   - ') : 'OK'));
    };
    // 1 ตั้งค่าครั้งแรก
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(800); await check('01-first-setup');
    await p.fill('#setupIn', 'ไม่ใช่ลิงก์'); await p.click('#setupBtn'); await p.waitForTimeout(300); out.push(`[${tag}] bad link message: ` + (await p.textContent('#setupNote')));
    await p.fill('#setupIn', 'https://ntfy.sh/audittest_abcdef'); await p.click('#setupBtn'); await p.waitForTimeout(1500);
    // 2 หน้าหลัก
    await check('02-main');
    await p.evaluate(() => scrollTo(0, 99999)); await p.waitForTimeout(200); await check('03-main-bottom'); await p.evaluate(() => scrollTo(0, 0));
    // 3 ยืนยัน Sleep / ปิดเครื่อง (ยกเลิก)
    const before = posts.length;
    await p.click('#bSleep'); await p.waitForTimeout(300); await check('04-ask-sleep'); await p.click('#askNo'); await p.waitForTimeout(200);
    await p.click('#bOff'); await p.waitForTimeout(300); await check('05-ask-shutdown'); await p.click('#askNo'); await p.waitForTimeout(200);
    out.push(`[${tag}] cancel sleep/shutdown sent nothing: ` + (posts.length === before ? 'OK' : 'SENT ' + posts.slice(before)));
    // 4 พิมพ์คำที่ไม่รู้จัก → ปุ่มเลือก
    await p.fill('#txtIn', 'อะไรก็ไม่รู้ ฟฟฟ'); await p.press('#txtIn', 'Enter'); await p.waitForTimeout(400); await check('06-chips');
    await p.evaluate(() => { const c = document.querySelector('#chips [data-c=cancel]'); if (c) c.click(); });
    // 5 ประวัติ
    await p.click('#bHist'); await p.waitForTimeout(400); await check('07-history');
    await p.evaluate(() => { const b = [...document.querySelectorAll('.veil.show button')].find(x => /ปิด|เสร็จ|close/i.test(x.textContent)); if (b) b.click(); else document.querySelectorAll('.veil.show').forEach(v => v.classList.remove('show')); }); await p.waitForTimeout(300);
    // 6 ตั้งค่า 4 แท็บ
    await p.evaluate(() => document.getElementById('bSet').click()); await p.waitForTimeout(400);
    for (const t of ['char', 'screen', 'app']) { await p.click(`#setVeil [data-tab=${t}]`); await p.waitForTimeout(400); await check('08-set-' + t); await p.evaluate(() => document.querySelector('#setVeil .sheet').scrollTop = 99999); await p.waitForTimeout(200); await check('08-set-' + t + '-bottom'); }
    await p.click('#setVeil [data-tab=screen]'); await p.evaluate(() => document.querySelector('#setVeil .row2b').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); await check('08-set-screen-buttons');
    // 7 หน้าวาด
    await p.click('#setVeil [data-tab=char]'); await p.click('#bDrawChar'); await p.waitForTimeout(600); await check('09-draw');
    await p.click('.kd summary'); await p.evaluate(() => document.querySelector('.kd .sheet').scrollTop = 99999); await p.waitForTimeout(300); await check('09-draw-options');
    await p.click('#kdClose'); await p.waitForTimeout(400);
    out.push(`[${tag}] closing draw returns to settings: ` + (await p.evaluate(() => document.getElementById('setVeil').classList.contains('show')) ? 'OK' : 'NO'));
    await p.click('#setClose'); await p.waitForTimeout(300);
    // 8 โหมดโชว์เต็มจอ
    await p.evaluate(() => KumShow.start()); await p.waitForTimeout(800); await p.screenshot({ path: `/tmp/au_${tag}_10-show.png` });
    await p.mouse.click(vp[0] / 2, vp[1] / 2); await p.waitForTimeout(300);
    out.push(`[${tag}] tap show returns to app: ` + (await p.evaluate(() => !KumShow.isRunning()) ? 'OK' : 'NO'));
    out.push(`[${tag}] page errors: ` + (errs.length ? errs.join(' | ') : 'none'));
    await ctx.close();
  }
  await b.close(); console.log(out.join('\n'));
})();
