/*
  KumRemote — สั่งงานด้วยเสียงภาษาไทย (Arak Lab Tools)
  KumVoice.parse(ข้อความ)  → { cmd, value } หรือ null ถ้าไม่เข้าใจ
  KumVoice.listen({ onInterim, onFinal, onError, onEnd })  → เริ่มฟัง (ใช้ระบบฟังเสียงของเบราว์เซอร์ ต้องต่อเน็ต)
  KumVoice.say(ข้อความ)  → ให้มือถือพูดตอบ
  cmd: wake, sleep, shutdown, status, stay, bright (value 10-100), brighter, dimmer, dim (value true/false), help
  เพิ่มคำใหม่ได้ที่ WORDS ด้านล่าง (คำที่ฟังไม่ออก KumCom จะจดไว้ใน logs\voice_unheard.txt ให้ Claude มาเพิ่ม)
  ประวัติ: 1.0 (26/11/2026) เวอร์ชันแรก
          1.1 (26/11/2026) คุยเล่น/ทักทายได้ (cmd 'chat' + คำตอบ), ฟังนานขึ้น: ไม่ได้ยินเสียงจะฟังต่อเองจนครบ ~10 วินาที (เดิมปิดเร็ว)
*/
(function () {
  'use strict';
  var WORDS = {
    stay: ['อยู่ต่อ', 'ไม่ต้องหลับ', 'อย่าเพิ่งหลับ', 'ไม่ต้องนอน', 'ยังไม่ต้องหลับ', 'อย่าหลับ', 'ไม่ต้องsleep', 'stay'],
    shutdown: ['ปิดเครื่อง', 'ปิดคอม', 'ชัตดาวน์', 'shutdown', 'shutdown', 'ดับเครื่อง', 'ปิดไปเลย', 'ปิดคอมพิวเตอร์'],
    sleep: ['สลีป', 'sleep', 'หลับ', 'นอน', 'พักเครื่อง', 'พักคอม', 'สลีฟ', 'สรีป'],
    wake: ['ปลุก', 'ตื่น', 'เปิดคอม', 'เปิดเครื่อง', 'wake', 'เปิดหน่อย', 'เปิดคอมพิวเตอร์', 'เปิดที'],
    status: ['สถานะ', 'status', 'เช็คคอม', 'เช็กคอม', 'เช็คหน่อย', 'เช็คสถานะ', 'คอมเป็นไง', 'คอมเป็นยังไง', 'คอมโอเคไหม', 'คอมยังอยู่ไหม'],
    help: ['ช่วยด้วย', 'ทำอะไรได้', 'สั่งอะไรได้', 'มีคำสั่งอะไร', 'help', 'ใช้ยังไง'],
    brighter: ['สว่างขึ้น', 'สว่างกว่านี้', 'เพิ่มแสง', 'เพิ่มความสว่าง', 'จอสว่างหน่อย', 'สว่างหน่อย'],
    dimmer: ['หรี่จอ', 'หรี่ลง', 'มืดลง', 'ลดแสง', 'ลดความสว่าง', 'จอมืดหน่อย', 'หรี่หน่อย']
  };
  // คุยเล่น: [คำที่ได้ยิน, คำตอบ (สุ่ม), ท่าบอท]
  var CHAT = [
    [['สวัสดี', 'หวัดดี', 'ดีจ้า', 'ดีครับ', 'ดีค่ะ', 'hello', 'hi', 'ฮัลโหล', 'อรุณสวัสดิ์'], ['สวัสดีครับ วันนี้ให้ช่วยอะไรดี', 'หวัดดีครับ น้องคุมพร้อมแล้ว', 'สวัสดีครับ คอมยังอยู่ดีนะ'], 'done'],
    [['ชื่ออะไร', 'เป็นใคร', 'คือใคร'], ['ผมชื่อน้องคุม ปีศาจน้อยประจำร้านครับ', 'น้องคุมครับ คอยเฝ้าคอมให้'], 'on'],
    [['ขอบคุณ', 'ขอบใจ', 'thank'], ['ยินดีครับ', 'ด้วยความยินดีครับ', 'สบายมากครับ'], 'done'],
    [['เก่งมาก', 'เก่ง', 'น่ารัก', 'เจ๋ง', 'สุดยอด', 'ดีมาก'], ['เขินเลยครับ', 'ขอบคุณครับ ดีใจจัง', 'ฮิๆ ชมแบบนี้เดี๋ยวลอยนะ'], 'done'],
    [['สบายดีไหม', 'เป็นไงบ้าง', 'เป็นยังไงบ้าง', 'โอเคไหม'], ['สบายดีครับ เดินเล่นเฝ้าคอมอยู่', 'ดีครับ วันนี้คอมก็ยังไหวอยู่'], 'on'],
    [['ทำอะไรอยู่', 'ทำไรอยู่'], ['เดินเล่นเฝ้าคอมอยู่ครับ', 'นั่งรอคำสั่งอยู่ครับ'], 'on'],
    [['เหนื่อย', 'ง่วง', 'เพลีย'], ['พักบ้างนะครับ เดี๋ยวผมเฝ้าคอมให้', 'งานหนักไหมครับ พักสายตาหน่อยนะ'], 'sleep'],
    [['มุก', 'ตลก', 'ขำ', 'joke'], ['ทำไมคอมไม่เคยหิว เพราะมีไบต์อยู่แล้วครับ', 'คอมพิวเตอร์ชอบเต้นอะไร ซอฟต์แวร์ไงครับ', 'ผมไม่กลัวผีนะ เพราะผมเป็นปีศาจเอง'], 'done'],
    [['ฝันดี', 'ราตรีสวัสดิ์', 'ไปนอน', 'บ๊ายบาย', 'บาย', 'ไปก่อน'], ['ฝันดีครับ', 'บ๊ายบายครับ เดี๋ยวผมเฝ้าร้านให้', 'แล้วเจอกันครับ'], 'sleep'],
    [['กินข้าว', 'หิว'], ['ผมกินไฟอย่างเดียวครับ', 'ไปกินข้าวก่อนเลยครับ เดี๋ยวผมดูคอมให้'], 'on'],
    [['รัก', 'คิดถึง'], ['รักเจ้าของร้านเหมือนกันครับ', 'คิดถึงเหมือนกันครับ'], 'done'],
    [['เบื่อ', 'เหงา'], ['ลองพูดว่า เล่ามุกหน่อย ดูไหมครับ', 'ผมอยู่ตรงนี้นะครับ'], 'on'],
    [['โง่', 'บ้า', 'แย่'], ['ขอโทษครับ เดี๋ยวผมพยายามใหม่', 'งื้อ ผมจะตั้งใจกว่านี้ครับ'], 'bad']
  ];
  function chat(t) {
    for (var i = 0; i < CHAT.length; i++) if (has(t, CHAT[i][0])) { var r = CHAT[i][1]; return { cmd: 'chat', reply: r[Math.floor(Math.random() * r.length)], mood: CHAT[i][2] }; }
    return null;
  }
  var QUESTION = /(ไหม|มั้ย|หรือเปล่า|รึเปล่า|หรือยัง|ป่าว|ปะ)$/;
  var DIGIT = { 'ศูนย์': 0, 'หนึ่ง': 1, 'เอ็ด': 1, 'สอง': 2, 'ยี่': 2, 'สาม': 3, 'สี่': 4, 'ห้า': 5, 'หก': 6, 'เจ็ด': 7, 'แปด': 8, 'เก้า': 9 };

  // "เปิด" มีคำว่า "ปิด" ซ่อนอยู่ → เปลี่ยน "เปิด" เป็น @ ก่อน จะได้ไม่สับสนกัน
  function norm(s) { return (s || '').toLowerCase().replace(/[\s.,!?'"“”]+/g, '').replace(/ๆ/g, '').replace(/เปิด/g, '@'); }
  function has(t, list) { for (var i = 0; i < list.length; i++) if (t.indexOf(norm(list[i])) >= 0) return true; return false; }

  // อ่านตัวเลขจากคำพูด: "50", "ห้าสิบ", "เจ็ดสิบห้า", "ร้อย", "ครึ่ง", "สุด"
  function number(t) {
    var m = t.match(/(\d{1,3})/); if (m) return +m[1];
    if (/ครึ่ง/.test(t)) return 50;
    if (/(เต็ม|สุด|มากสุด|ร้อย)/.test(t) && !/(มืดสุด|น้อยสุด|ต่ำสุด)/.test(t)) return 100;
    if (/(มืดสุด|น้อยสุด|ต่ำสุด)/.test(t)) return 10;
    var w = t.match(/((?:ศูนย์|หนึ่ง|เอ็ด|สอง|ยี่|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?สิบ(?:ศูนย์|หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?)/);
    if (w) {
      var s = w[1], p = s.split('สิบ');
      return (p[0] ? DIGIT[p[0]] : 1) * 10 + (p[1] ? DIGIT[p[1]] : 0);
    }
    return null;
  }
  function clamp10(v) { return Math.max(10, Math.min(100, Math.round(v / 10) * 10)); }

  function parse(raw) {
    var t = norm(raw);
    if (!t) return null;
    if (/^(ไม่ต้อง|ไม่|อย่า)(ปลุก|ปิด|สลีป)/.test(t)) return null;                 // ประโยคปฏิเสธ = ไม่ทำอะไร
    if (/หรี่เอง|หรี่อัตโนมัติ|หรี่อัตโน/.test(t)) return { cmd: 'dim', value: !/(ปิด|ไม่ต้อง|ยกเลิก|เลิก)/.test(t) };
    var n = number(t);
    if (n !== null && /(สว่าง|ความสว่าง|จอ|แสง|เปอร์เซ็น|%)/.test(t)) return { cmd: 'bright', value: clamp10(n) };
    if (has(t, WORDS.brighter)) return { cmd: 'brighter' };
    if (has(t, WORDS.dimmer)) return { cmd: 'dimmer' };
    if (has(t, WORDS.stay)) return { cmd: 'stay' };
    if (has(t, WORDS.help)) return { cmd: 'help' };
    if (t.indexOf('ปลุก') >= 0) return { cmd: 'wake' };
    if (QUESTION.test(t) && /(@|ตื่น|อยู่|หลับ|ทำงาน)/.test(t)) return { cmd: 'status' };   // "คอมเปิดอยู่ไหม" = ถามสถานะ
    if (has(t, WORDS.shutdown)) return { cmd: 'shutdown' };
    if (has(t, WORDS.sleep)) return { cmd: 'sleep' };
    if (has(t, WORDS.wake)) return { cmd: 'wake' };
    if (has(t, WORDS.status)) return { cmd: 'status' };
    return chat(t);
  }

  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition, cur = null, stopped = false;
  // ฟังได้นานสุด ~10 วินาที: ถ้ายังไม่ได้ยินอะไร มือถือจะปิดเองเร็ว → เปิดฟังต่อให้เองจนครบเวลา
  function listen(cb) {
    if (!Rec) { cb.onError && cb.onError('unsupported'); cb.onEnd && cb.onEnd(); return null; }
    if (cur) { try { cur.abort(); } catch (e) {} }
    stopped = false;
    var deadline = Date.now() + 10000, done = false, lastErr = null;
    function round() {
      var r = new Rec(); cur = r;
      r.lang = 'th-TH'; r.interimResults = true; r.maxAlternatives = 4; r.continuous = false;
      r.onresult = function (ev) {
        var res = ev.results[ev.results.length - 1];
        if (!res.isFinal) { cb.onInterim && cb.onInterim(res[0].transcript); return; }
        done = true;
        var best = res[0].transcript, intent = null;
        for (var i = 0; i < res.length && !intent; i++) { intent = parse(res[i].transcript); if (intent) best = res[i].transcript; }
        cb.onFinal && cb.onFinal(best, intent);
      };
      r.onerror = function (ev) { lastErr = ev.error || 'error'; };
      r.onend = function () {
        cur = null;
        if (!done && !stopped && (lastErr === null || lastErr === 'no-speech' || lastErr === 'aborted') && Date.now() < deadline) { lastErr = null; setTimeout(round, 150); return; }
        if (!done) { if (lastErr && lastErr !== 'no-speech' && lastErr !== 'aborted') cb.onError && cb.onError(lastErr); else cb.onFinal && cb.onFinal('', null, true); }
        cb.onEnd && cb.onEnd();
      };
      try { r.start(); } catch (e) { cb.onError && cb.onError('start'); cb.onEnd && cb.onEnd(); }
    }
    round();
    return true;
  }
  function stop() { stopped = true; if (cur) { try { cur.stop(); } catch (e) {} } }

  var thVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    var v = speechSynthesis.getVoices();
    for (var i = 0; i < v.length; i++) if (/^th/i.test(v[i].lang)) { thVoice = v[i]; return; }
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    if (!window.speechSynthesis || !text) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text); u.lang = 'th-TH'; if (thVoice) u.voice = thVoice; u.rate = 1.05; u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  window.KumVoice = { parse: parse, listen: listen, stop: stop, say: say, supported: !!Rec };
})();
