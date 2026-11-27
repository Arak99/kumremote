const { chromium } = require('playwright');
let pass=0,fail=0; const ok=(c,n,d)=>{c?(pass++,console.log('PASS '+n)):(fail++,console.log('FAIL '+n+' -> '+JSON.stringify(d)));};
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const vp of [[390,844],[360,640]]) {
  const ctx = await b.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const posts=[];
  await ctx.route(/sabaijai|ntfy\.sh/, r => { const q=r.request(); if(q.method()==='POST') posts.push(q.postData()); return q.url().includes('/sse') ? r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:': x\n\n'}) : r.fulfill({ status: 200, body: q.url().includes('/sub') ? '{"messages":[],"last":0}' : '{}' }); });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { localStorage.setItem('kumremote_topic', 'shottest_abcdef'); window.WebSocket = undefined; });
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(1000);
  await p.click('#bSet'); await p.click('#setVeil [data-tab=char]'); await p.click('#bDrawChar'); await p.waitForTimeout(600);
  const tag = vp.join('x');
  await p.screenshot({ path: `/tmp/dr_${tag}_1.png` });
  // ระบายสี: ลากบนตาราง
  const g = await p.evaluate(()=>{const c=document.querySelector('.kd canvas.g'); c.scrollIntoView({block:'center'}); const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width};});
  await p.click('.kd .pal button >> nth=2'); const g2 = await p.evaluate(()=>{const c=document.querySelector('.kd canvas.g'); c.scrollIntoView({block:'center'}); const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width};}); Object.assign(g,g2);
  await p.mouse.move(g.x+g.w*0.3, g.y+g.w*0.5); await p.mouse.down(); await p.mouse.move(g.x+g.w*0.7, g.y+g.w*0.55, {steps:10}); await p.mouse.up();
  await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!document.querySelector('.kd .tools button:nth-child(7)').disabled), `[${tag}] painting enables undo`);
  // ปุ่มทั้งหมดในแถบเครื่องมืออยู่แถวเดียว
  const rowsTools = await p.evaluate(()=>new Set([...document.querySelectorAll('.kd .tools button')].filter(b=>!b.hidden).map(b=>Math.round(b.getBoundingClientRect().top))).size);
  ok(rowsTools===1, `[${tag}] tools fit one row`, rowsTools);
  // จานสีมองเห็นครบไม่ถูกบัง
  const palOk = await p.evaluate(()=>{ const bar=document.querySelector('.kd .bar').getBoundingClientRect(); const bs=[...document.querySelectorAll('.kd .pal button')]; const last=bs[bs.length-1]; last.scrollIntoView({block:'center'}); const r=last.getBoundingClientRect(); const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return top===last; });
  ok(palOk, `[${tag}] last palette color reachable (not covered)`);
  // ตัวเลือกเพิ่มเติม: ตา 3 แบบ
  await p.click('.kd summary'); await p.waitForTimeout(200);
  await p.click('.kd .seg button[data-m=move]'); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>document.querySelector('.kd .tools button[data-t=ebox]').getAttribute('aria-pressed')==='true' && !document.querySelector('.kd .tools button[data-t=ebox]').hidden), `[${tag}] eye mode "move" selects eye-box tool`);
  await p.click('.kd .seg button[data-m=sys]'); await p.waitForTimeout(200);
  await p.screenshot({ path: `/tmp/dr_${tag}_2.png`, fullPage: false });
  await p.fill('.kd .nm', 'ทดสอบหน้าใหม่');
  await p.click('.kd .bar .send'); await p.waitForTimeout(500);
  ok(posts.some(x=>x.startsWith('charset ')), `[${tag}] save+send sends charset to board`, posts.map(x=>x.slice(0,20)));
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('kumremote_customchars')||'[]').some(d=>d.name==='ทดสอบหน้าใหม่')), `[${tag}] saved in phone`);
  ok(await p.evaluate(()=>document.getElementById('kdT').textContent)==='แก้ตัวละคร', `[${tag}] title switches to edit`);
  ok(errs.length===0, `[${tag}] no page errors`, errs);
  await ctx.close(); }
  await b.close(); console.log('----\npassed='+pass+' failed='+fail);
})();
