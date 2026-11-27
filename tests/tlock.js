const { chromium } = require('playwright');
let pass=0,fail=0; const ok=(c,n,d)=>{c?(pass++,console.log('PASS '+n)):(fail++,console.log('FAIL '+n+' -> '+JSON.stringify(d)));};
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const vp of [[360,640],[390,844]]) {
  const tag=vp.join('x');
  const ctx = await b.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.route(/sabaijai|ntfy\.sh/, r => r.request().url().includes('/sse') ? r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:': x\n\n'}) : r.fulfill({ status: 200, body: r.request().url().includes('/sub') ? '{"messages":[],"last":0}' : '{}' }));
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { localStorage.setItem('kumremote_topic', 'shottest_abcdef'); window.WebSocket = undefined; });
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(900);
  const cdp = await ctx.newCDPSession(p);
  const swipe = async (x, y1, y2) => { // นิ้วไถจริง (touch)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y1 }] });
    for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y1 + (y2 - y1) * i / 12 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(500);
  };
  await p.evaluate(() => document.getElementById('bSet').click()); await p.click('#setVeil [data-tab=screen]'); await p.waitForTimeout(400);
  const y0 = await p.evaluate(()=>scrollY);
  // ไถขึ้นในหน้าตั้งค่าหลายครั้ง (จนสุด แล้วไถต่อ)
  for (let i=0;i<5;i++) await swipe(vp[0]/2, vp[1]*0.85, vp[1]*0.35);
  const st = await p.evaluate(()=>({y:scrollY, sheet: document.querySelector('#setVeil .sheet').scrollTop}));
  ok(st.sheet > 0, `[${tag}] settings itself scrolls with finger`, st);
  ok(st.y === y0, `[${tag}] home page behind does NOT move`, {before:y0, after:st.y});
  for (let i=0;i<5;i++) await swipe(vp[0]/2, vp[1]*0.35, vp[1]*0.85);
  ok(await p.evaluate(()=>scrollY) === y0, `[${tag}] still not moving when swiping down`);
  // ดูเต็มจอแล้วแตะออก → ต้องกลับมาตั้งค่าที่เดิม
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('#setVeil .row2b button')][0]; b.scrollIntoView({block:'center'}); });
  const before = await p.evaluate(()=>document.querySelector('#setVeil .sheet').scrollTop);
  await p.click('#setVeil .row2b button >> nth=0'); await p.waitForTimeout(700);
  ok(await p.evaluate(()=>KumShow.isRunning()), `[${tag}] fullscreen show started`);
  await p.mouse.click(vp[0]/2, vp[1]/2); await p.waitForTimeout(500);
  const back = await p.evaluate(()=>({open: document.getElementById('setVeil').classList.contains('show'), tab: document.querySelector('#setVeil [aria-selected=true]').dataset.tab, top: document.querySelector('#setVeil .sheet').scrollTop}));
  ok(back.open && back.tab==='screen' && Math.abs(back.top-before)<5, `[${tag}] tap out returns to same settings tab & position`, {before, back});
  await p.click('#setClose'); await p.waitForTimeout(300);
  ok(!(await p.evaluate(()=>document.documentElement.classList.contains('locked'))), `[${tag}] home scrolls again after closing`);
  ok(errs.length===0, `[${tag}] no page errors`, errs);
  await ctx.close(); }
  await b.close(); console.log('----\npassed='+pass+' failed='+fail);
})();
