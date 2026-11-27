const { chromium } = require('playwright');
let pass=0,fail=0; const ok=(c,n,d)=>{c?(pass++,console.log('PASS '+n)):(fail++,console.log('FAIL '+n+' -> '+JSON.stringify(d)));};
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const posts=[];
  await ctx.route(/sabaijai|ntfy\.sh/, r => { const q=r.request(); if(q.method()==='POST') posts.push(q.postData()); return q.url().includes('/sse') ? r.fulfill({status:200,headers:{'content-type':'text/event-stream'},body:': x\n\n'}) : r.fulfill({ status: 200, body: q.url().includes('/sub') ? '{"messages":[],"last":0}' : '{}' }); });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => {
    localStorage.setItem('kumremote_topic', 'shottest_abcdef'); window.WebSocket = undefined;
    if (!localStorage.getItem('seeded')) { localStorage.setItem('seeded','1');
      const mk=(id,name)=>({id,name,cols:12,pal:['#ff3b30'],map:Array(12).fill('..AAAAAAAA..'),eyes:[[3,4],[7,4]],legs:[]});
      localStorage.setItem('kumremote_customchars', JSON.stringify([mk('c_test1','ตัวทดสอบ1'), mk('c_test2','ตัวทดสอบ2')]));
      localStorage.setItem('kumremote_char','c_test1'); }
  });
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(1200);
  await p.click('#bSet'); await p.click('#setVeil [data-tab=char]'); await p.waitForTimeout(400);
  const n0 = await p.evaluate(()=>document.querySelectorAll('#chars button').length);
  await p.click('#bDelMode'); await p.waitForTimeout(200);
  await p.screenshot({ path: '/tmp/del_mode.png' });
  // แตะตัวมาตรฐาน → ไม่เกิดอะไร
  await p.click('#chars button.fixed >> nth=0'); await p.waitForTimeout(200);
  ok(!(await p.evaluate(()=>document.getElementById('veil').classList.contains('show'))), 'tapping built-in in delete mode does nothing');
  // แตะตัวที่ทำเอง (ตัวที่ใช้อยู่) → ถามยืนยัน → ลบ
  await p.click('#chars button:not(.fixed) >> nth=0'); await p.waitForTimeout(200);
  const askVisible = await p.evaluate(()=>{ const v=document.getElementById('veil'); const r=document.getElementById('askYes').getBoundingClientRect(); const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return v.classList.contains('show') && top && top.id==='askYes'; });
  ok(askVisible, 'confirm dialog shows on top of settings');
  await p.screenshot({ path: '/tmp/del_ask.png' });
  await p.click('#askYes'); await p.waitForTimeout(400);
  const after = await p.evaluate(()=>({n:document.querySelectorAll('#chars button').length, stored: JSON.parse(localStorage.getItem('kumremote_customchars')).map(d=>d.id), cur: localStorage.getItem('kumremote_char')}));
  ok(after.n === n0-1 && after.stored.join()==='c_test2', 'custom char removed', after);
  ok(after.cur !== 'c_test1' && posts.some(x=>/^char /.test(x)), 'current char switched and sent to board', {cur:after.cur, posts});
  ok(await p.evaluate(()=>document.getElementById('chars').classList.contains('del')), 'still in delete mode for next delete');
  await p.click('#bDelMode'); await p.waitForTimeout(200);
  ok(!(await p.evaluate(()=>document.getElementById('chars').classList.contains('del'))), 'exit delete mode');
  ok(errs.length===0, 'no page errors', errs);
  await b.close(); console.log('----\npassed='+pass+' failed='+fail);
})();
