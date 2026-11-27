const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const posts=[]; await ctx.route(/sabaijai|ntfy\.sh/, r => { const q=r.request(); if(q.method()==='POST') posts.push(q.postData()); return q.url().includes('/sse') ? r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:': x\n\n'}) : r.fulfill({ status: 200, body: q.url().includes('/sub') ? '{"messages":[],"last":0}' : '{}' }); });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { localStorage.setItem('kumremote_topic', 'shottest_abcdef'); window.WebSocket = undefined; });
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(700);
  await p.click('#bSet'); await p.click('#setVeil [data-tab=screen]'); await p.waitForTimeout(400);
  await p.evaluate(()=>document.querySelector('#setVeil .row2b').scrollIntoView({block:'center'})); await p.waitForTimeout(200);
  await p.screenshot({ path: '/tmp/go2.png' });
  await p.click('#setVeil .row2b button >> nth=1'); await p.waitForTimeout(300);
  const t1 = await p.textContent('#setVeil .row2b button >> nth=1');
  await p.screenshot({ path: '/tmp/go3.png' });
  await p.waitForTimeout(2800); const t2 = await p.textContent('#setVeil .row2b button >> nth=1');
  console.log(JSON.stringify({sent: posts.includes('show now'), after: t1, later: t2, errs}));
  await b.close();
})();
