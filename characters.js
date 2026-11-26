/*
  KumRemote — ตัวละครบอท (Arak Lab Tools)
  ไฟล์นี้เก็บ "ข้อมูลตัวละคร" อย่างเดียว ตัวที่วาด/ขยับอยู่ใน bot.js
  เพิ่มตัวใหม่ = เพิ่ม object ใน KUM_CHARACTERS แล้วจะโผล่ในเมนู "ตัวละคร" เอง ไม่ต้องแก้ไฟล์อื่น

  รูปแบบ:
    id     ชื่อภาษาอังกฤษ (ห้ามซ้ำ ใช้จำค่าที่เลือก)
    name   ชื่อที่แสดง
    map    แถวของพิกเซล ทุกแถวกว้าง 12 ตัวอักษร  '.' = ว่าง, ตัวอักษรอื่น = สีตาม pal
    pal    สีของแต่ละตัวอักษรใน map
    eyes   ตำแหน่งตา 2 ข้าง [คอลัมน์, แถว] (มุมซ้ายบนของตา ตาขนาด 2x2 ช่อง)
    es     ขนาดตา (1 = ปกติ)        eyeStyle 'white' (ตาขาวลูกตาดำ, ค่าเริ่มต้น) หรือ 'dark' (ตาดำเงา)
    legs   คอลัมน์ของขา [ซ้าย, ขวา]  ใส่ [] = ไม่มีขา (กระโดดดึ๋งๆ แทนการเดิน)
    tail   'devil' = หางลูกศร (ไม่ใส่ก็ได้)
  ทุกตัวในไฟล์นี้ออกแบบใหม่ทั้งหมดสำหรับร้าน
*/
window.KUM_CHARACTERS = [
  { id: 'pencil', name: 'ดินสอใส่หมวก',
    pal: { A: '#ff3b30', B: '#ff9a8f', D: '#c8241b', H: '#8f1d2c', S: '#ffffff', W: '#f3d19c', G: '#3a3a44', K: '#2a0a08', P: '#ff8fb0' },
    legs: [], eyes: [[3, 6], [7, 6]], es: 1.2,
    map: ['.....SS.....', '....SSSS....', '....HHHH....', '...HHHHHH...', '.HSHSHSHSHH.', '..ABAAAADA..', '..ABAAAADA..', '..ABAAAADA..', '..ABAAAADA..',
          '..APAAAAPA..', '..ABKAAKDA..', '..ABAKKADA..', '..ABAAAADA..', '..WWWWWWWW..', '...WWWWWW...', '....WWWW....', '.....GG.....'] },
  { id: 'devil', name: 'ปีศาจน้อยสีแดง',
    pal: { A: '#ff3b30', B: '#ff9a8f', C: '#ff9f1c', K: '#2a0a08' },
    legs: [3, 8], eyes: [[2, 4], [7, 4]], es: 1.45,
    map: ['C..........C', 'CC........CC', '.CC.AAAA.CC.', '..AAAAAAAA..', '.ABBAAAAAAA.', 'ABAAAAAAAAAA', 'AAAAAAAAAAAA', 'AAAAAAAAAAAA', 'AAAKAAAAKAAA', 'AAAAKKKKAAAA', 'AAAAAAAAAAAA', '.AAAAAAAAAA.'] },
  { id: 'jelly', name: 'เยลลี่สี่เหลี่ยม',
    pal: { A: '#3d8bff', B: '#8fc0ff', C: '#ff8fb0' },
    legs: [3, 8], eyes: [[3, 3], [7, 3]],
    map: ['.AAAAAAAAAA.', 'ABBAAAAAAAAA', 'ABAAAAAAAAAA', 'AAAAAAAAAAAA', 'AAAAAAAAAAAA', 'AACAAAAAACAA', 'AAAAAAAAAAAA', 'AAAAAAAAAAAA', '.AAAAAAAAAA.'] },
  { id: 'inkdrop', name: 'หยดหมึก',
    pal: { A: '#3347c9', B: '#7d8cff', C: '#ff8fb0' },
    legs: [4, 7], eyes: [[3, 5], [7, 5]],
    map: ['.....AA.....', '....AAAA....', '...ABAAAA...', '..ABAAAAAA..', '.AAAAAAAAAA.', 'AAAAAAAAAAAA', 'AAAAAAAAAAAA', 'AACAAAAAACAA', 'AAAAAAAAAAAA', '.AAAAAAAAAA.', '..AAAAAAAA..'] },
  { id: 'heart', name: 'หัวใจ',
    pal: { A: '#ff4d5e', B: '#ff9aa4', C: '#ffd1d6' },
    legs: [5, 6], eyes: [[3, 2], [7, 2]],
    map: ['.AAA....AAA.', 'ABBAA..AAAAA', 'ABAAAAAAAAAA', 'AAAAAAAAAAAA', 'AACAAAAAACAA', '.AAAAAAAAAA.', '..AAAAAAAA..', '...AAAAAA...', '....AAAA....', '.....AA.....'] },
  { id: 'crab', name: 'ปูน้อย',
    pal: { A: '#ff3b3b', B: '#ff9090', C: '#ffd0d0' },
    legs: [3, 8], eyes: [[3, 2], [7, 2]],
    map: ['AA........AA', 'A.A......A.A', 'AA........AA', '.A.AAAAAA.A.', '.AAAAAAAAAA.', '..ABAAAAAA..', '..AAAAAAAA..', '..ACAAAACA..', '..AAAAAAAA..', '.A.A....A.A.'] },
  { id: 'cloud', name: 'ก้อนเมฆ',
    pal: { A: '#7cc4ff', B: '#c4e5ff', C: '#ff8fb0' },
    legs: [3, 8], eyes: [[3, 4], [7, 4]],
    map: ['...AAA......', '..ABBAA.AA..', '.ABAAAAAAAA.', 'AAAAAAAAAAAA', 'AAAAAAAAAAAA', 'AAAAAAAAAAAA', 'AACAAAAAACAA', 'AAAAAAAAAAAA', '.AAAAAAAAAA.'] }
];
