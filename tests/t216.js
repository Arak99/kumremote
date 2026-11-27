const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const vp of [[390, 844], [360, 640], [412, 915]]) {
    const ctx = await b.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await ctx.route(/sabaijai|ntfy\.sh/, r => r.request().url().includes('/sse') ? r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:': x\n\n'}) : r.fulfill({ status: 200, body: r.request().url().includes('/sub') ? '{"messages":[],"last":0}' : '{}' }));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => { localStorage.setItem('kumremote_topic', 'shottest_abcdef'); window.WebSocket = undefined; });
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(1000);
    await p.evaluate(() => document.getElementById('bSet').click()); await p.waitForTimeout(400);
    const pos = {};
    for (const t of ['char', 'screen', 'app', 'char']) {
      await p.click(`#setVeil [data-tab=${t}]`); await p.waitForTimeout(250);
      pos[t] = await p.evaluate(() => { const a = document.querySelector('#setVeil .tabs').getBoundingClientRect().top, f = document.getElementById('setClose').getBoundingClientRect(); return [Math.round(a), Math.round(f.bottom), innerHeight]; });
      if (vp[0] === 390) await p.screenshot({ path: `/tmp/v216_${t}.png` });
    }
    const tops = Object.values(pos).map(x => x[0]); const same = tops.every(x => x === tops[0]);
    const footOk = Object.values(pos).every(x => x[1] <= x[2] + 1);
    console.log(`${vp.join('x')}: tabs top ${JSON.stringify(pos)} -> ${same ? 'PASS same place' : 'FAIL moves'}, footer ${footOk ? 'PASS visible' : 'FAIL'}, errors ${errs.length}`);
    await ctx.close();
  }
  await b.close();
})();
