// v2.23: แถบ "Sleep เมื่องานเสร็จ" บนหน้าหลัก + คำสั่ง/คำตอบขึ้นในรายการล่าสุด
const { chromium } = require('playwright');
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const run = async (name, bodies, fn) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const now = Date.now(), posts = [];
    const hist = bodies.map((x, i) => ({ id: i + 1, ts: now - (bodies.length - i) * 20000, body: x }));
    await ctx.route(/sabaijai|ntfy\.sh/, r => { const q = r.request(); if (q.method() === 'POST') posts.push(q.postData());
      return q.url().includes('/sse') ? r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: ': x\n\n' }) : r.fulfill({ status: 200, body: q.url().includes('/sub') ? JSON.stringify({ messages: hist, last: hist.length }) : '' }); });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(500);
    await p.fill('#setupIn', 'https://ntfy.sh/sdtest_abcdef'); await p.click('#setupBtn'); await p.waitForTimeout(1800);
    await fn(p, posts);
    ok(!errs.length, name + ': no page errors ' + errs.join(' | '));
    await ctx.close();
  };
  const chip = p => p.evaluate(() => { const c = document.getElementById('sdChip'); return { shown: !c.hidden && c.getBoundingClientRect().height > 0, text: c.innerText, warn: c.classList.contains('warn') }; });
  const log = p => p.evaluate(() => document.getElementById('log').innerText);

  await run('armed', ['🟢 RUBY_PC เปิดอยู่', 'sleepdone jobs 10', "🌙 ตั้งแล้ว: จะ Sleep เมื่องานในกล่องงานเสร็จ แล้วรอ 10 นาที (เตือนก่อน 60 วินาที ส่ง 'อยู่ต่อ' เพื่อยกเลิก)"], async (p) => {
    const c = await chip(p); ok(c.shown && /Sleep เองเมื่องานของ Claude บนคอมเสร็จ แล้วรอ 10 นาที/.test(c.text), 'armed: chip shows what is set → ' + c.text.replace(/\n/g, ' / '));
    const l = await log(p); ok(/ตั้ง Sleep เมื่องาน Claude เสร็จ \+ 10 นาที/.test(l), 'armed: my command in recent list');
    ok(/🌙 ตั้งแล้ว/.test(l), 'armed: PC reply in recent list');
    await p.tap('#sdChip'); await p.waitForTimeout(400);
    const t = await p.evaluate(() => ({ open: document.getElementById('setVeil').classList.contains('show'), tab: document.querySelector('#setVeil [role=tab][aria-selected=true]').getAttribute('data-tab'), seg: [...document.querySelectorAll('#sdSet .seg button[aria-pressed=true]')].map(x => x.innerText) }));
    ok(t.open && t.tab === 'pc', 'armed: tap chip opens settings on คอม tab');
    ok(t.seg.includes('งาน Claude เสร็จ') && t.seg.includes('10 นาที'), 'armed: settings show the same choice ' + t.seg.join(','));
    await p.screenshot({ path: '/tmp/sd_armed.png' });
  });
  await run('pending', ['🌙 ยกเลิก หลับเมื่อเสร็จ แล้ว', 'sleepdone jobs 5'], async (p) => {
    const c = await chip(p); ok(c.shown && /รอคอมตอบรับ/.test(c.text), 'pending: sent but PC not answered yet shows waiting');
  });
  await run('cancelled', ['sleepdone jobs 10', '🌙 ตั้งแล้ว: จะ Sleep เมื่องานในกล่องงานเสร็จ แล้วรอ 10 นาที (x)', 'sleepdone off', '🌙 ยกเลิก หลับเมื่อเสร็จ แล้ว'], async (p) => {
    const c = await chip(p); ok(!c.shown, 'cancelled: chip hidden');
    const l = await log(p); ok(/ยกเลิก Sleep เมื่องานเสร็จ/.test(l), 'cancelled: cancel command in list');
  });
  await run('warning', ['🌙 ตั้งแล้ว: จะ Sleep เมื่องานในกล่องงานเสร็จ แล้วรอ 1 นาที (x)', "⏳ RUBY_PC จะ Sleep ใน 60 วินาที เพราะงานในกล่องงานเสร็จ แล้วรอ 1 นาที - ส่ง 'อยู่ต่อ' เพื่อยกเลิก"], async (p, posts) => {
    const c = await chip(p); ok(c.shown && c.warn && /60 วินาที/.test(c.text), 'warning: orange chip with countdown text');
    const n = posts.length; await p.tap('#sdChip'); await p.waitForTimeout(600);
    ok(posts.slice(n).some(x => /อยู่ต่อ|stay/.test(x || '')), 'warning: tap chip sends อยู่ต่อ → ' + JSON.stringify(posts.slice(n)));
    await p.screenshot({ path: '/tmp/sd_warn.png' });
  });
  await run('slept', ['🌙 ตั้งแล้ว: จะ Sleep เมื่องานในกล่องงานเสร็จ แล้วรอ 1 นาที (x)', '⏳ RUBY_PC จะ Sleep ใน 60 วินาที', '😴 RUBY_PC กำลัง Sleep'], async (p) => {
    const c = await chip(p); ok(!c.shown, 'slept: chip gone after PC slept');
  });
  await run('nothing', ['🟢 RUBY_PC เปิดอยู่'], async (p) => { const c = await chip(p); ok(!c.shown, 'nothing set: no chip'); });
  console.log('----\npassed=' + pass + ' failed=' + fail); await b.close();
})();
