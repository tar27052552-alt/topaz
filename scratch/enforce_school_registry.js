const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const sourceDir = path.join('ข้อมูลต้นฉบับ', 'รายชื่อนักเรียนทั้งหมด');
const xlsFiles = [
  'รายชื่อ ม.1.xls', 'รายชื่อ ม.2.xls', 'รายชื่อ ม.3.xls',
  'รายชื่อ ม.4.xls', 'รายชื่อ ม.5.xls', 'รายชื่อ ม.6.xls'
];

const xlsMap = new Map();

xlsFiles.forEach(fileName => {
  const filePath = path.join(sourceDir, fileName);
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  $('table').each((i, table) => {
    const prevDesc = $(table).prevAll('.description').first().text();
    const match = prevDesc.match(/มัธยมศึกษาปีที่\s*(\d+)\s*ห้อง\s*(\d+)/);
    const grade = match ? parseInt(match[1]) : 0;
    const room = match ? parseInt(match[2]) : 0;

    $(table).find('tbody tr').each((j, tr) => {
      const tds = $(tr).find('td');
      if (tds.length >= 3) {
        const noInClass = $(tds.get(0)).text().trim();
        const stdId = $(tds.get(1)).text().trim();
        const rawName = $(tds.get(2)).text().trim();
        if (stdId && /^\d+$/.test(stdId)) {
          let gender = '-';
          if (rawName.startsWith('เด็กชาย') || rawName.startsWith('นาย')) {
            gender = 'ชาย';
          } else if (rawName.startsWith('เด็กหญิง') || rawName.startsWith('นางสาว') || rawName.startsWith('น.ส.')) {
            gender = 'หญิง';
          }

          xlsMap.set(stdId, {
            grade,
            room,
            roomFull: `ม.${grade}/${room}`,
            classNo: parseInt(noInClass),
            id: stdId,
            name: rawName,
            gender
          });
        }
      }
    });
  });
});

console.log(`✅ โหลดข้อมูลทะเบียนนักเรียนจาก XLS: ${xlsMap.size} คน`);

const masterPath = path.join('data', 'students_master.json');
const pubMasterPath = path.join('public', 'data', 'students_master.json');
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

let updatedCount = 0;
master.forEach(s => {
  const xls = xlsMap.get(s.id);
  if (xls) {
    let changed = false;
    if (s.name !== xls.name) { s.name = xls.name; changed = true; }
    if (s.grade !== xls.grade) { s.grade = xls.grade; changed = true; }
    if (s.room !== xls.room) { s.room = xls.room; changed = true; }
    if (s.roomFull !== xls.roomFull) { s.roomFull = xls.roomFull; changed = true; }
    if (s.classNo !== xls.classNo) { s.classNo = xls.classNo; changed = true; }
    if (s.gender !== xls.gender) { s.gender = xls.gender; changed = true; }
    if (changed) updatedCount++;
  }
});

// Ensure level is correct (junior: grades 1-3, senior: grades 4-6)
master.forEach(s => {
  s.level = s.grade <= 3 ? 'junior' : 'senior';
});

// Sort by grade, room, classNo/id
master.sort((a, b) => {
  if (a.grade !== b.grade) return (a.grade || 0) - (b.grade || 0);
  if (a.room !== b.room) return (a.room || 0) - (b.room || 0);
  if (a.classNo !== b.classNo) return (parseInt(a.classNo) || 0) - (parseInt(b.classNo) || 0);
  return (a.id || '').localeCompare(b.id || '');
});

fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
fs.writeFileSync(pubMasterPath, JSON.stringify(master, null, 2), 'utf8');

console.log(`✅ บันทึกฐานข้อมูล Master ให้อิงตามทะเบียนโรงเรียน 100% สำเร็จ! (ปรับปรุง ${updatedCount} คน)`);
