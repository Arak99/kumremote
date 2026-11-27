const { chromium } = require('playwright');
let pass=0,fail=0; const ok=(c,n,d)=>{c?(pass++,console.log('PASS '+n)):(fail++,console.log('FAIL '+n+' -> '+JSON.stringify(d)));};
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.route(/sabaijai|ntfy\.sh/, r => r.request().url().includes('/sse') ? r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:': x\n\n'}) : r.fulfill({ status: 200, body: r.request().url().includes('/sub') ? '{"messages":[],"last":0}' : '{}' }));
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { localStorage.setItem('kumremote_topic', 'shottest_abcdef'); window.WebSocket = undefined; });
  const openDraw = async () => { await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(700); await p.click('#bSet'); await p.click('#setVeil [data-tab=char]'); await p.click('#bDrawChar'); await p.waitForTimeout(400); };
  const isOpen = () => p.evaluate(()=>document.querySelector('.kd details').open);
  await openDraw();
  ok(!(await isOpen()), 'first time: options folded');
  await p.click('.kd summary'); await p.waitForTimeout(200);
  // ใช้งานระหว่างกาง: เปลี่ยนตา/ขนาดตา/ขา/วาด → ต้องยังกางอยู่
  await p.click('.kd .seg button[data-m=still]'); await p.click('.kd .seg button[data-m=sys]'); await p.click('.kd .orow .sw'); await p.click('.kd .pal button >> nth=1');
  const g = await p.evaluate(()=>{const c=document.querySelector('.kd canvas.g'); c.scrollIntoView({block:'center'}); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width};});
  await p.mouse.move(g.x+g.w*.4,g.y+g.w*.4); await p.mouse.down(); await p.mouse.move(g.x+g.w*.6,g.y+g.w*.5,{steps:5}); await p.mouse.up(); await p.waitForTimeout(200);
  ok(await isOpen(), 'stays open while drawing and changing options');
  await p.click('#kdClose'); await p.click('#bDrawChar'); await p.waitForTimeout(300);
  ok(await isOpen(), 'still open after close and reopen');
  await openDraw();
  ok(await isOpen(), 'still open after page refresh');
  await p.click('.kd summary'); await p.waitForTimeout(200); await openDraw();
  ok(!(await isOpen()), 'folded stays folded after refresh');
  ok(errs.length===0, 'no page errors', errs);
  await b.close(); console.log('----\npassed='+pass+' failed='+fail);
})();
