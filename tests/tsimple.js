// v2.24: แบบง่าย — 4 ปุ่ม, ถามก่อนเมื่อชน, แถบของค้างแตะยกเลิก, ทุกทางสั่ง (ปุ่ม/พิมพ์/เสียงจำลอง) ได้ผลเดียวกัน
const { chromium } = require('playwright');
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  // bodies: [ข้อความ, กี่วินาทีที่แล้ว]
  const run = async (name, bodies, fn) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const now = Date.now(), posts = [];
    const hist = bodies.map((x, i) => ({ id: i + 1, ts: now - x[1] * 1000, body: x[0] }));
    await ctx.route(/sabaijai|ntfy\.sh/, r => { const q = r.request(); if (q.method() === 'POST') posts.push(q.postData());
      return q.url().includes('/sse') ? r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: ': x\n\n' }) : r.fulfill({ status: 200, body: q.url().includes('/sub') ? JSON.stringify({ messages: hist, last: hist.length }) : '' }); });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(400);
    await p.fill('#setupIn', 'https://ntfy.sh/simpletest_abc'); await p.click('#setupBtn'); await p.waitForTimeout(1800);
    await fn(p, posts);
    ok(!errs.length, name + ': no page errors ' + errs.join(' | '));
    await ctx.close();
  };
  const pends = p => p.evaluate(() => [...document.querySelectorAll('#pends .pend')].map(x => ({ cls: x.className, text: x.innerText.replace(/\n/g, ' / ') })));
  const dlg = p => p.evaluate(() => ({ open: document.getElementById('veil').classList.contains('show'), title: document.getElementById('askT').innerText, text: document.getElementById('askP').innerText, btns: [...document.querySelectorAll('#veil button')].filter(x => x.offsetParent).map(x => x.innerText) }));
  const typeCmd = async (p, t) => { await p.fill('#txtIn', t); await p.press('#txtIn', 'Enter'); await p.waitForTimeout(400); };
  const sent = (posts, n) => posts.slice(n);
  const ON = ['🟢 RUBY_PC เปิดอยู่', 300];
  const WORK = ['🤖 Claude กำลังทำงานบนคอม: จัดไฟล์ Drive', 30];

  await run('layout', [ON], async (p) => {
    const L = await p.evaluate(() => ({ wake: document.getElementById('bWake').innerText.trim(), sleep: document.getElementById('bSleep').innerText.trim(), off: document.getElementById('bOff').innerText.trim(), stay: !!document.getElementById('bStay'), tabs: [...document.querySelectorAll('#setVeil [role=tab]')].map(x => x.innerText) }));
    ok(L.wake === 'ปลุกคอม' && L.sleep === 'คอมหลับ' && L.off === 'ปิดคอม', 'layout: 3 buttons with new names ' + JSON.stringify(L));
    ok(!L.stay, 'layout: no "อยู่ต่อ" button');
    ok(!(await p.evaluate(() => !!document.getElementById('bCheck') || !!document.querySelector('footer'))), 'layout: no เช็คสถานะ button, no bottom bar');
    const box = await p.locator('#bot').boundingBox();
    await p.mouse.click(box.x + box.width * 144 / 320, box.y + box.height * 17 / 240); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.getElementById('setVeil').classList.contains('show')), 'layout: tapping ตั้งค่า on the screen opens settings');
    await p.evaluate(() => document.getElementById('setX').click()); await p.waitForTimeout(300);
    ok(!L.tabs.includes('คอม'), 'layout: settings has no คอม tab ' + L.tabs.join(','));
    ok((await pends(p)).length === 0, 'layout: nothing pending → no bar');
    const np = await p.evaluate(() => { const e = document.getElementById('noPend'); return e && e.offsetParent ? e.innerText : null; });
    ok(np && /ไม่มีคำสั่งค้าง/.test(np), 'layout: shows "ไม่มีคำสั่งค้าง" line ' + np);
    const hv = await p.evaluate(() => document.querySelector('header h1').innerText);
    ok(/^สบายใจ\s*v2\.\d+/.test(hv), 'layout: version right after app name in header → ' + hv);
    await p.screenshot({ path: '/tmp/s_main.png', fullPage: true });
  });
  await run('sleep-plain', [ON], async (p, posts) => {
    const n0 = posts.length; await p.click('#bSleep'); await p.waitForTimeout(300); const d = await dlg(p);
    ok(sent(posts, n0).includes('busy'), 'sleep: dialog asks the PC what it is doing (busy)');
    ok(d.open && d.title === 'คอมหลับ' && d.btns.some(x => /คอมหลับเลยตอนนี้/.test(x)) && d.btns.some(x => /คอมหลับเมื่อทำงานเสร็จ/.test(x)) && !/ค้างอยู่/.test(d.text), 'sleep: dialog always has both choices ' + d.btns.join(' | '));
    ok(/กำลังเช็คว่าคอมทำงานอยู่ไหม/.test(d.text), 'sleep: shows "checking…" while waiting for PC');
    const n = posts.length; await p.click('#askCol button:has-text("คอมหลับเลยตอนนี้")'); await p.waitForTimeout(400); ok(sent(posts, n).includes('sleep'), 'sleep: หลับเลย sends sleep');
  });
  await run('sleep-while-claude', [ON, WORK], async (p, posts) => {
    await p.click('#bSleep'); await p.waitForTimeout(300); const d = await dlg(p);
    ok(d.open && /Claude กำลังทำงาน/.test(d.text) && /คอมหลับเมื่อทำงานเสร็จ/.test(d.btns[0]) && d.btns.some(x => /คอมหลับเลยตอนนี้[\s\S]*จะหยุด/.test(x)), 'claude working: when-done offered first, now warns work stops ' + d.btns.join(' | '));
    await p.screenshot({ path: '/tmp/s_choose.png' });
    await p.click('#askCol button.yes'); await p.waitForTimeout(300); const d2 = await dlg(p);
    const chip = p => p.evaluate(() => { const c = document.querySelector('#idleChips button.on'); return c ? c.innerText : null; });
    ok(d2.open && /ว่างนานแค่ไหน/.test(d2.title) && ['1 นาที', '5 นาที', '10 นาที', '30 นาที'].every(m => d2.btns.includes(m)), 'when-done asks how long idle: 1/5/10/30 ' + d2.btns.join(' | '));
    ok(await chip(p) === '5 นาที' && /ตกลง.*5 นาที/.test(await p.textContent('#idleOk')), 'default 5 min selected, ตกลง shows 5');
    const n = posts.length; await p.click('#idleChips button:has-text("10 นาที")'); await p.waitForTimeout(300);
    ok(!sent(posts, n).length && (await dlg(p)).open, 'tapping 10 min only selects — sends nothing, dialog stays open');
    ok(await chip(p) === '10 นาที' && /ตกลง.*10 นาที/.test(await p.textContent('#idleOk')), '10 now selected, ตกลง shows 10');
    await p.click('#idleChips button:has-text("30 นาที")'); await p.waitForTimeout(200); await p.click('#idleChips button:has-text("10 นาที")'); await p.waitForTimeout(200);
    ok(!sent(posts, n).length && await chip(p) === '10 นาที', 'change mind 30 → 10: still nothing sent');
    await p.screenshot({ path: '/tmp/s_idle.png' });
    await p.click('#idleOk'); await p.waitForTimeout(400);
    ok(JSON.stringify(sent(posts, n)) === '["sleepdone busy 10"]' && !(await dlg(p)).open, 'ตกลง sends sleepdone busy 10 once and closes ' + JSON.stringify(sent(posts, n)));
    await p.click('#bSleep'); await p.waitForTimeout(300); await p.click('#askCol button.yes'); await p.waitForTimeout(300);
    ok(await chip(p) === '10 นาที', 'app remembers last choice (10 min)');
    const n2 = posts.length; await p.click('#askCol button.no'); await p.waitForTimeout(300);
    ok(!sent(posts, n2).length && !(await dlg(p)).open, 'ยกเลิก in picker sends nothing');
  });
  await run('pending-sd', [ON, WORK, ['sleepdone jobs 5', 20], ["🌙 ตั้งแล้ว: จะ Sleep เมื่อClaude ทำงานเสร็จ แล้วรอ 5 นาที (เตือนก่อน 60 วินาที แตะแถบในแอปเพื่อยกเลิก)", 19]], async (p, posts) => {
    const pb = await pends(p); ok(pb.length === 1 && /คอมจะหลับเมื่อ Claude ทำงานเสร็จ/.test(pb[0].text), 'sd pending: bar shown ' + JSON.stringify(pb));
    // กดปิดคอม → บอกว่าจะยกเลิก 🌙
    await p.click('#bOff'); await p.waitForTimeout(300); let d = await dlg(p);
    ok(/ค้างอยู่/.test(d.text) && /จะยกเลิกอันนี้/.test(d.text) && /Claude กำลังทำงาน/.test(d.text) && /บูต/.test(d.text), 'shutdown dialog warns about pending + Claude + boot');
    await p.click('#askCol button.no'); await p.waitForTimeout(200);
    // แตะแถบ → ถามยกเลิก → ส่ง cancel
    await p.click('#pends .pend'); await p.waitForTimeout(300); d = await dlg(p); ok(/ยกเลิก/.test(d.title), 'tap bar asks to cancel');
    const n = posts.length; await p.click('#askYes'); await p.waitForTimeout(400); ok(sent(posts, n).includes('cancel'), 'tap bar → sends cancel');
  });
  await run('typed-cancel', [ON, ["🌙 ตั้งแล้ว: จะ Sleep เมื่อClaude ทำงานเสร็จ แล้วรอ 5 นาที (x)", 30]], async (p, posts) => {
    const n = posts.length; await typeCmd(p, 'อย่าเพิ่งหลับ'); ok(sent(posts, n).includes('cancel'), 'typed "อย่าเพิ่งหลับ" with pending → cancel ' + JSON.stringify(sent(posts, n)));
  });
  await run('typed-nothing', [ON], async (p, posts) => {
    const n = posts.length; await typeCmd(p, 'ห้ามหลับ'); const note = await p.textContent('#note');
    ok(!sent(posts, n).length && /ไม่มีอะไรค้าง/.test(note), 'typed "ห้ามหลับ" with nothing pending → explains, sends nothing');
    await typeCmd(p, 'ยังไม่ต้องปิดเครื่อง'); const d = await dlg(p); ok(!d.open && !sent(posts, n).includes('shutdown'), '"ยังไม่ต้องปิดเครื่อง" does NOT open shutdown');
    await typeCmd(p, 'ฝันดี ไปนอนแล้ว'); const d2 = await dlg(p); ok(!d2.open, '"ฝันดี ไปนอนแล้ว" is chat, no sleep dialog');
    await typeCmd(p, 'ให้คอมหลับ'); const d3 = await dlg(p); ok(d3.open && /คอมหลับ/.test(d3.title), 'typed "ให้คอมหลับ" opens the same sleep dialog as the button');
  });
  await run('shutdown-countdown', [ON, ['shutdown', 4], ['⏻ RUBY_PC กำลังปิดเครื่อง (อีก 15 วินาที) - แตะแถบในแอปเพื่อยกเลิก', 3]], async (p, posts) => {
    const pb = await pends(p); ok(pb.length === 1 && /red/.test(pb[0].cls) && /คอมจะปิดในอีก ([89]|1[0-2]) วินาที/.test(pb[0].text), 'shutdown: red countdown bar ' + JSON.stringify(pb));
    await p.screenshot({ path: '/tmp/s_shut.png' });
    await p.waitForTimeout(2100); const pb2 = await pends(p); ok(/อีก ([5-9]|10) วินาที/.test(pb2[0].text), 'shutdown: counts down live ' + pb2[0].text);
    await p.click('#bWake'); await p.waitForTimeout(300); const d = await dlg(p); ok(/กำลังจะปิด/.test(d.title), 'wake during shutdown asks to cancel shutdown');
    const n = posts.length; await p.click('#askYes'); await p.waitForTimeout(400); ok(sent(posts, n).includes('cancel') && !sent(posts, n).includes('wake'), 'wake-during-shutdown sends cancel (not wake)');
  });
  await run('shutdown-tap-cancel', [ON, ['⏻ RUBY_PC กำลังปิดเครื่อง (อีก 15 วินาที) - แตะแถบในแอปเพื่อยกเลิก', 2]], async (p, posts) => {
    const n = posts.length; await p.click('#pends .pend'); await p.waitForTimeout(400); ok(sent(posts, n).includes('cancel'), 'tap red bar cancels immediately');
    ok(!(await p.evaluate(() => !!document.getElementById('noPend'))), 'with pending: no "ไม่มีคำสั่งค้าง" line');
  });
  await run('cancelled-done', [ON, ['⏻ RUBY_PC กำลังปิดเครื่อง (อีก 15 วินาที)', 8], ['cancel', 6], ['↩️ RUBY_PC ยกเลิกแล้ว: ปิดเครื่อง — คอมเปิดอยู่ตามปกติ', 5]], async (p) => {
    ok((await pends(p)).length === 0, 'after PC confirms cancel → no bar');
    ok(/ยกเลิกแล้ว: ปิดเครื่อง/.test(await p.textContent('#log')) && /สั่งยกเลิกที่ค้างอยู่/.test(await p.textContent('#log')), 'cancel + PC reply in recent list');
  });
  await run('shutdown-expired', [ON, ['⏻ RUBY_PC กำลังปิดเครื่อง (อีก 15 วินาที)', 120]], async (p) => { ok((await pends(p)).length === 0, 'old shutdown (2 min ago) → no bar'); });
  await run('warn', [ON, ["🌙 ตั้งแล้ว: จะ Sleep เมื่อClaude ทำงานเสร็จ แล้วรอ 1 นาที (x)", 120], ["⏳ RUBY_PC จะ Sleep ใน 60 วินาที เพราะClaude ทำงานเสร็จ แล้วรอ 1 นาที - แตะแถบในแอปเพื่อยกเลิก", 5]], async (p, posts) => {
    const pb = await pends(p); ok(pb.length === 1 && /warn/.test(pb[0].cls) && /คอมจะหลับในอีกไม่ถึง 1 นาที/.test(pb[0].text), 'warn: orange bar ' + JSON.stringify(pb));
    const n = posts.length; await p.click('#pends .pend'); await p.waitForTimeout(400); ok(sent(posts, n).includes('cancel'), 'warn: tap → cancel');
  });
  await run('slept', [["🌙 ตั้งแล้ว: จะ Sleep เมื่อClaude ทำงานเสร็จ แล้วรอ 1 นาที (x)", 200], ['⏳ RUBY_PC จะ Sleep ใน 60 วินาที', 130], ['😴 RUBY_PC กำลัง Sleep', 70]], async (p) => { ok((await pends(p)).length === 0, 'slept → bar gone'); });
  await run('sleep-clears-sd', [ON, ["🌙 ตั้งแล้ว: จะ Sleep เมื่อClaude ทำงานเสร็จ แล้วรอ 5 นาที (x)", 60]], async (p, posts) => {
    await p.click('#bSleep'); await p.waitForTimeout(300); const d = await dlg(p);
    ok(/ค้างอยู่/.test(d.text) && /จะยกเลิกอันนี้/.test(d.text), 'sleep while sd pending: dialog says it will cancel it');
  });
  await run('old-stay-history', [ON, ['stay', 100], ['🖥️ RUBY_PC อยู่ต่อ - จะไม่ Sleep เองจนกว่าจะสั่ง', 99]], async (p) => { ok((await pends(p)).length === 0, 'old "อยู่ต่อ" in history → no bar, no error'); });
  await run('busy-reply', [ON, ['🔎 RUBY_PC กำลังทำงาน: Claude Code กำลังทำงาน, CPU ทำงาน 40%', 3]], async (p, posts) => {
    await p.click('#bSleep'); await p.waitForTimeout(300); const d = await dlg(p);
    ok(/คอมกำลังทำงาน: Claude Code กำลังทำงาน, CPU ทำงาน 40%/.test(d.text) && /คอมหลับเมื่อทำงานเสร็จ/.test(d.btns[0]), 'PC reports busy (other project) → shown + when-done first');
    await p.screenshot({ path: '/tmp/s_busy.png' });
    await p.click('#askCol button.no'); await p.waitForTimeout(200);
    await p.click('#bOff'); await p.waitForTimeout(300); const d2 = await dlg(p); ok(/คอมกำลังทำงาน: Claude Code/.test(d2.text), 'shutdown dialog also says what the PC is doing');
  });
  await run('idle-reply', [ON, ['🔎 RUBY_PC ว่างอยู่ ไม่มีงานค้าง', 3]], async (p) => {
    await p.click('#bSleep'); await p.waitForTimeout(300); const d = await dlg(p);
    ok(/คอมว่างอยู่/.test(d.text) && /คอมหลับเลยตอนนี้/.test(d.btns[0]) && d.btns.some(x => /คอมหลับเมื่อทำงานเสร็จ/.test(x)), 'PC idle → หลับเลย first, when-done still there');
  });
  await run('tap-char', [ON], async (p, posts) => {
    const box = await p.locator('#bot').boundingBox(); const n = posts.length;
    for (let i = 0; i < 4; i++) { await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5); await p.waitForTimeout(150); }
    await p.waitForTimeout(300);
    ok(!sent(posts, n).length, 'tapping the character 4x sends nothing ' + JSON.stringify(sent(posts, n)));
    ok(!/แตะจอเพื่อเช็ค/.test(await p.evaluate(() => document.body.innerText)), 'no "แตะจอเพื่อเช็คใหม่" text');
  });
  await run('off-dialog', [ON], async (p, posts) => {
    await p.click('#bOff'); await p.waitForTimeout(300); const d = await dlg(p);
    ok(d.open && d.title === 'ปิดคอม' && /ปิดคอมเลยตอนนี้/.test(d.btns[0]) && d.btns.some(x => /ปิดคอมเมื่อทำงานเสร็จ/.test(x)) && /บูต/.test(d.text), 'off: dialog has both choices + boot warning ' + d.btns.join(' | '));
    await p.screenshot({ path: '/tmp/s_off.png' });
    const n = posts.length; await p.click('#askCol button:has-text("ปิดคอมเลยตอนนี้")'); await p.waitForTimeout(400); ok(sent(posts, n).includes('shutdown'), 'off: ปิดเลย sends shutdown');
  });
  await run('off-when-done', [ON, WORK], async (p, posts) => {
    await p.click('#bOff'); await p.waitForTimeout(300); const d = await dlg(p);
    ok(/ปิดคอมเมื่อทำงานเสร็จ/.test(d.btns[0]) && d.btns.some(x => /ปิดคอมเลยตอนนี้[\s\S]*จะหยุด/.test(x)), 'off while busy: when-done first ' + d.btns.join(' | '));
    await p.click('#askCol button.yes'); await p.waitForTimeout(300); const d2 = await dlg(p);
    ok(/ว่างนานแค่ไหนก่อนปิด/.test(d2.title), 'off picker title says ปิด ' + d2.title);
    const n = posts.length; await p.click('#idleChips button:has-text("30 นาที")'); await p.waitForTimeout(200); ok(!sent(posts, n).length, 'off picker: select only');
    await p.click('#idleOk'); await p.waitForTimeout(400); ok(JSON.stringify(sent(posts, n)) === '["sleepdone busy 30 off"]', 'off ตกลง sends sleepdone busy 30 off ' + JSON.stringify(sent(posts, n)));
  });
  await run('off-mode-pending', [ON, ['sleepdone busy 10 off', 31], ["🌙 ตั้งแล้ว: จะ ปิดเครื่อง เมื่อคอมทำงานเสร็จ แล้วว่างต่อเนื่อง 10 นาที (เตือนก่อน 60 วินาที แตะแถบในแอปเพื่อยกเลิก)", 30]], async (p, posts) => {
    const pb = await pends(p); ok(pb.length === 1 && /ตั้งไว้: คอมจะปิดเมื่อคอมทำงานเสร็จ แล้วว่างต่อเนื่อง 10 นาที/.test(pb[0].text), 'off mode pending bar says ปิด ' + JSON.stringify(pb));
    ok(/สั่งปิดคอมเมื่อทำงานเสร็จ/.test(await p.textContent('#log')), 'off mode label in list');
    await p.click('#bSleep'); await p.waitForTimeout(300); ok(/ตั้งไว้ให้คอมปิดเมื่อ/.test((await dlg(p)).text), 'sleep dialog warns the pending ปิด will be cancelled');
    await p.click('#askCol button.no'); await p.waitForTimeout(200);
    await p.click('#pends .pend'); await p.waitForTimeout(300); ok(/ยกเลิก "คอมปิดเมื่อ/.test((await dlg(p)).title), 'tap bar → cancel ปิด');
  });
  await run('off-warn', [ON, ["⏳ RUBY_PC จะ ปิดเครื่อง ใน 60 วินาที เพราะคอมทำงานเสร็จ แล้วว่างต่อเนื่อง 1 นาที - แตะแถบในแอปเพื่อยกเลิก", 5]], async (p) => {
    const pb = await pends(p); ok(pb.length === 1 && /warn/.test(pb[0].cls) && /คอมจะปิดในอีกไม่ถึง 1 นาที/.test(pb[0].text), 'off warn: orange bar says ปิด ' + JSON.stringify(pb));
  });
  await run('busy-mode-pending', [ON, ['sleepdone busy 5', 31], ["🌙 ตั้งแล้ว: จะ Sleep เมื่อคอมทำงานเสร็จ แล้วว่างต่อเนื่อง 5 นาที (เตือนก่อน 60 วินาที แตะแถบในแอปเพื่อยกเลิก)", 30]], async (p) => {
    const pb = await pends(p); ok(pb.length === 1 && /ตั้งไว้: คอมจะหลับเมื่อคอมทำงานเสร็จ แล้วว่างต่อเนื่อง 5 นาที/.test(pb[0].text), 'busy mode pending bar ' + JSON.stringify(pb));
    ok(/สั่งคอมหลับเมื่อทำงานเสร็จ/.test(await p.textContent('#log')), 'busy mode command label in list');
  });
  await run('resumed', [ON, ["🌙 ตั้งแล้ว: จะ Sleep เมื่อคอมทำงานเสร็จ แล้วว่างต่อเนื่อง 5 นาที (x)", 400], ['⏳ RUBY_PC จะ Sleep ใน 60 วินาที', 50], ['🌙 คอมกลับมาทำงานอีก (CPU ทำงาน 60%) — ยังไม่หลับ รอให้ว่างก่อน', 20]], async (p) => {
    const pb = await pends(p); ok(pb.length === 1 && !/warn/.test(pb[0].cls) && /คอมทำงานเสร็จ/.test(pb[0].text), 'PC busy again after warning → back to waiting (not orange) ' + JSON.stringify(pb));
  });
  const dims = p => p.evaluate(() => ['bWake', 'bSleep', 'bOff'].filter(id => document.getElementById(id).classList.contains('dim')));
  await run('btn-on', [['🟢 RUBY_PC เปิดอยู่', 60]], async (p, posts) => {
    ok(JSON.stringify(await dims(p)) === '["bWake"]', 'PC on: only ปลุกคอม is dim ' + JSON.stringify(await dims(p)));
    const n = posts.length; await p.click('#bWake'); await p.waitForTimeout(300);
    ok(!sent(posts, n).includes('wake') && /เปิดอยู่แล้ว/.test(await p.textContent('#note')), 'PC on: tap dim ปลุกคอม → explains, sends nothing');
    await typeCmd(p, 'ปลุกคอม'); ok(!sent(posts, n).includes('wake'), 'PC on: typed "ปลุกคอม" also sends nothing');
    await p.screenshot({ path: '/tmp/s_on.png' });
  });
  await run('btn-off', [['⚫ RUBY_PC ปิด/หลับอยู่', 60]], async (p, posts) => {
    ok(JSON.stringify(await dims(p)) === '["bSleep","bOff"]', 'PC off: คอมหลับ + ปิดคอม dim ' + JSON.stringify(await dims(p)));
    await p.click('#bSleep'); await p.waitForTimeout(300); ok(!(await dlg(p)).open, 'PC off: tap dim คอมหลับ → no dialog');
    await p.click('#bOff'); await p.waitForTimeout(300); ok(!(await dlg(p)).open, 'PC off: tap dim ปิดคอม → no dialog');
    const n = posts.length; await p.click('#bWake'); await p.waitForTimeout(400); ok(sent(posts, n).includes('wake'), 'PC off: ปลุกคอม works');
    await p.screenshot({ path: '/tmp/s_off.png' });
  });
  await run('btn-stale', [['🟢 RUBY_PC เปิดอยู่', 1200]], async (p) => { ok((await dims(p)).length === 0, 'status older than 15 min → all buttons usable'); });
  await run('btn-shut', [ON, ['⏻ RUBY_PC กำลังปิดเครื่อง (อีก 15 วินาที)', 2]], async (p) => {
    ok(JSON.stringify(await dims(p)) === '["bOff"]', 'shutdown counting: only ปิดคอม dim (ปลุก = ยกเลิกปิด, หลับ = หลับแทน) ' + JSON.stringify(await dims(p)));
  });
  console.log('----\npassed=' + pass + ' failed=' + fail); await b.close();
})();
