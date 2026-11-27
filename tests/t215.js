const { chromium } = require('playwright');
let pass = 0, fail = 0; const ok = (c, n, d) => { c ? (pass++, console.log('PASS ' + n)) : (fail++, console.log('FAIL ' + n + ' -> ' + JSON.stringify(d))); };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const posts = [];
  await ctx.route(/sabaijai|ntfy\.sh/, r => { const q = r.request(); if (q.method() === 'POST') posts.push(q.postData());
    return q.url().includes('/sse') ? r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:': x\n\n'}) : r.fulfill({ status: 200, body: q.url().includes('/sub') ? '{"messages":[{"id":1,"ts":'+Date.now()+',"body":"🟢 RUBY_PC เปิดอยู่"},{"id":2,"ts":'+Date.now()+',"body":"💡 จอตัวปลุก: ความสว่าง 60% · หรี่เอง: เปิด"}],"last":2}' : '{}' }); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { localStorage.setItem('kumremote_topic', 'shottest_abcdef'); window.WebSocket = undefined; });
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__mic = 0; window.micStart = function () { window.__mic++; window.listening = true; }; });
  const r = await p.evaluate(() => { const m = document.getElementById('bMic').getBoundingClientRect(); return { x: m.x + m.width / 2, y: m.y + m.height / 2 }; });
  const fire = (type, x, y) => p.evaluate(([t, x, y]) => document.getElementById('bMic').dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerId: 1, bubbles: true, pointerType: 'touch' })), [type, x, y]);
  // ไถผ่าน (เลื่อน 60px) → ต้องไม่เปิดไมค์
  await fire('pointerdown', r.x, r.y); await fire('pointermove', r.x, r.y - 30); await fire('pointermove', r.x, r.y - 60); await fire('pointercancel', r.x, r.y - 60); await p.waitForTimeout(400);
  ok(await p.evaluate(() => window.__mic) === 0, 'swipe over mic does not start mic');
  // ไถแล้วปล่อยโดยไม่มี cancel
  await fire('pointerdown', r.x, r.y); await fire('pointermove', r.x + 2, r.y - 40); await fire('pointerup', r.x + 2, r.y - 40); await p.waitForTimeout(400);
  ok(await p.evaluate(() => window.__mic) === 0, 'swipe+release does not start mic');
  // แตะสั้น → เปิดไมค์
  await p.evaluate(() => { window.listening = false; });
  await fire('pointerdown', r.x, r.y); await p.waitForTimeout(80); await fire('pointerup', r.x, r.y); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.__mic) === 1, 'tap starts mic', await p.evaluate(() => window.__mic));
  ok((await p.evaluate(() => getComputedStyle(document.getElementById('bMic')).touchAction)) === 'pan-y', 'mic allows vertical scroll (pan-y)');
  ok(await p.evaluate(() => !document.querySelector('main #scr') && !!document.querySelector('#setVeil #scr')), 'brightness card moved into settings');
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  console.log('main page height css px:', h);
  await p.screenshot({ path: '/tmp/n_main.png', fullPage: true });
  await p.click('#bSet'); await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/n_set_char.png' });
  await p.click('#setVeil [data-tab=screen]'); await p.waitForTimeout(1200);
  ok((await p.textContent('#briVal')).includes('60'), 'brightness value shown in settings', await p.textContent('#briVal'));
  const px = await p.evaluate(() => { const c = document.getElementById('pv'); const d = c.getContext('2d').getImageData(320, 200, 1, 1).data; return [d[0], d[1], d[2], d[3]]; });
  ok(px[3] > 0 && (px[0] + px[1] + px[2]) > 0, 'preview canvas draws', px);
  await p.screenshot({ path: '/tmp/n_set_scr.png' });
  await p.evaluate(() => document.querySelector('#setVeil .sheet').scrollTop = 99999); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/n_set_scr2.png' });
  await p.click('#setVeil .row2b .go'); await p.waitForTimeout(500);
  ok(posts.includes('show now'), 'board show-now button sends command', posts);
  await p.click('#setVeil [data-tab=app]'); await p.waitForTimeout(300); await p.screenshot({ path: '/tmp/n_set_app.png' });
  const footVisible = await p.evaluate(() => { const r = document.getElementById('setClose').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top > 0; });
  ok(footVisible, '"เสร็จ" button visible');
  ok(errs.length === 0, 'no page errors', errs);
  await b.close(); console.log('----\npassed=' + pass + ' failed=' + fail);
})();
