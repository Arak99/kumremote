const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const posts=[]; await ctx.route(/sabaijai|ntfy\.sh/, r => { const q=r.request(); if(q.method()==='POST') posts.push(q.postData()); return q.url().includes('/sse') ? r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:': x\n\n'}) : r.fulfill({ status: 200, body: q.url().includes('/sub') ? '{"messages":[],"last":0}' : '{}' }); });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { localStorage.setItem('kumremote_topic', 'shottest_abcdef'); window.WebSocket = undefined; });
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(1000);
  await p.evaluate(() => document.getElementById('bSet').click()); await p.click('#setVeil [data-tab=char]'); await p.click('#bDrawChar'); await p.waitForTimeout(500);
  await p.setInputFiles('#drawVeil input[type=file]', '/tmp/blob.png'); await p.waitForTimeout(1200);
  await p.screenshot({ path: '/tmp/crop1.png' });
  const btn = await p.$('.kdcrop .save'); if (btn) { await btn.click(); await p.waitForTimeout(1500); }
  await p.screenshot({ path: '/tmp/crop2.png' });
  console.log('posts', posts.map(x=>x.slice(0,15)), 'errs', errs);
  await b.close();
})();
