const { chromium } = require('playwright');
let pass=0,fail=0; const ok=(c,n,d)=>{c?(pass++,console.log('PASS '+n)):(fail++,console.log('FAIL '+n+' -> '+JSON.stringify(d)));};
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const vp of [[360,640],[390,844],[412,915]]) { const tag=vp.join('x');
  const ctx = await b.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.route(/sabaijai|ntfy\.sh/, r => r.request().url().includes('/sse') ? r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:': x\n\n'}) : r.fulfill({ status: 200, body: r.request().url().includes('/sub') ? '{"messages":[],"last":0}' : '{}' }));
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { localStorage.setItem('kumremote_topic', 'shottest_abcdef'); window.WebSocket = undefined; });
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('bSet').click()); await p.waitForTimeout(400);
  const r1 = await p.evaluate(()=>{ const r=document.querySelector('#setVeil .sheet').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight]; });
  ok(r1[0]===0 && r1[1]===r1[2], `[${tag}] settings fills the screen`, r1);
  if (tag==='390x844') await p.screenshot({path:'/tmp/full_set.png'});
  await p.click('#setX'); await p.waitForTimeout(300);
  ok(!(await p.evaluate(()=>document.getElementById('setVeil').classList.contains('show'))), `[${tag}] ✕ closes settings`);
  await p.evaluate(() => document.getElementById('bSet').click()); await p.click('#setVeil [data-tab=char]'); await p.click('#bDrawChar'); await p.waitForTimeout(500);
  const r2 = await p.evaluate(()=>{ const r=document.querySelector('.kd .sheet').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight]; });
  ok(r2[0]===0 && r2[1]===r2[2], `[${tag}] draw page fills the screen`, r2);
  ok(errs.length===0, `[${tag}] no page errors`, errs);
  await ctx.close(); }
  await b.close(); console.log('----\npassed='+pass+' failed='+fail);
})();
