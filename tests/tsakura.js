// v2.35: ธีมซากุระแบบใหม่ — อยู่ในจอเดียว (ไม่ต้องเลื่อน) ทุกขนาดจอ, ตัวการ์ตูนภาพวาด, ไมค์ไม่ทับป้าย, ทัชแพด/ประวัติอยู่ในตั้งค่า
const { chromium } = require('playwright');
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [w, h] of [[360, 640], [390, 844], [412, 915], [390, 740]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    const hist = [{ id: 1, ts: Date.now() - 300000, body: '🟢 RUBY_PC เปิดอยู่' }];
    await ctx.route(/sabaijai|ntfy\.sh/, r => { const q = r.request();
      return q.url().includes('/sse') ? r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: ': x\n\n' }) : r.fulfill({ status: 200, body: q.url().includes('/sub') ? JSON.stringify({ messages: hist, last: 1 }) : '' }); });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => { try { localStorage.setItem('kumremote_theme', 'sakura'); } catch (e) {} });
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(300);
    await p.fill('#setupIn', 'https://ntfy.sh/sakuratest_abc'); await p.click('#setupBtn'); await p.waitForTimeout(1800);
    const L = await p.evaluate(() => {
      const r = id => document.getElementById(id).getBoundingClientRect();
      const ring = r('bMic').top - 0, art = document.getElementById('charArt');
      return { over: document.documentElement.scrollHeight - innerHeight, gridBottom: document.querySelector('.grid').getBoundingClientRect().bottom,
        art: art.offsetParent !== null, canvasHidden: document.getElementById('bot').offsetParent === null,
        pillBottom: document.querySelector('.pill').getBoundingClientRect().bottom, artTop: art.getBoundingClientRect().top,
        pendBottom: document.getElementById('noPend').getBoundingClientRect().bottom, micTop: document.querySelector('.micbtn').getBoundingClientRect().top - 24,
        labelTop: r('micT').top, micBottom: document.querySelector('.micbtn').getBoundingClientRect().bottom + 24, log: document.querySelector('.log').offsetParent !== null };
    });
    const tag = w + 'x' + h + ': ';
    ok(L.over <= 0 && L.gridBottom <= h, tag + 'all fits in one screen (no scroll) ' + JSON.stringify({ over: L.over, gridBottom: Math.round(L.gridBottom) }));
    ok(L.art && L.canvasHidden, tag + 'drawn character shown instead of pixel canvas');
    ok(L.labelTop >= L.micBottom - 1, tag + '"กดค้างแล้วพูด" not over the outer ring ' + Math.round(L.labelTop) + '>=' + Math.round(L.micBottom));
    ok(L.pendBottom <= L.micTop + 1, tag + '"ไม่มีคำสั่งค้าง" not over the mic ring ' + Math.round(L.pendBottom) + '<=' + Math.round(L.micTop));
    ok(!L.log, tag + 'no "ล่าสุด" box');
    if (w === 390 && h === 844) {
      await p.click('#charArt', { force: true }); await p.waitForTimeout(100);
      ok(await p.evaluate(() => document.getElementById('charArt').classList.contains('hop')), 'tap character → hop');
      await p.click('#bGear'); await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelector('#setVeil [data-tab=app]').click()); await p.waitForTimeout(200);
      ok(await p.evaluate(() => !!document.getElementById('bPad2').offsetParent && !!document.getElementById('bHist2').offsetParent), 'settings → app has ทัชแพด + ประวัติ');
      await p.click('#bHist2'); await p.waitForTimeout(300);
      ok(await p.evaluate(() => document.getElementById('histVeil').classList.contains('show') && !document.getElementById('setVeil').classList.contains('show')), 'ประวัติ in settings opens history');
      await p.evaluate(() => document.getElementById('histClose').click());
      await p.evaluate(() => { localStorage.setItem('kumremote_char', 'crab'); });
      await p.reload(); await p.waitForTimeout(1500);
      ok(await p.evaluate(() => document.getElementById('bot').offsetParent !== null && document.getElementById('charArt').offsetParent === null), 'other character → pixel canvas still used');
    }
    ok(!errs.length, tag + 'no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
})();
