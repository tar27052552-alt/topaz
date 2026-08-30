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

console.log(`✅ โหลดทะเบียนนักเรียนจาก XLS ทั้งหมด: ${xlsMap.size} คน`);

const master = JSON.parse(fs.readFileSync('data/students_master.json', 'utf8'));

let diffCount = 0;
master.forEach((s, idx) => {
  const xls = xlsMap.get(s.id);
  if (!xls) {
    console.log(`[ไม่พบใน XLS] รหัส ${s.id}: ${s.name} (${s.roomFull})`);
    return;
  }

  const diffs = [];
  if (s.name !== xls.name) diffs.push(`ชื่อ: "${s.name}" -> "${xls.name}"`);
  if (s.grade !== xls.grade) diffs.push(`ระดับชั้น: ม.${s.grade} -> ม.${xls.grade}`);
  if (s.room !== xls.room) diffs.push(`ห้อง: /${s.room} -> /${xls.room}`);
  if (s.classNo !== xls.classNo) diffs.push(`เลขที่: ${s.classNo} -> ${xls.classNo}`);
  if (s.gender !== xls.gender) diffs.push(`เพศ: ${s.gender} -> ${xls.gender}`);

  if (diffs.length > 0) {
    diffCount++;
    console.log(`[ความต่าง #${diffCount}] รหัส ${s.id} (${s.name}):`);
    diffs.forEach(d => console.log(`   • ${d}`));
  }
});

console.log(`\nรวมพบจุดที่ต้องปรับให้ตรงกับทะเบียนโรงเรียน: ${diffCount} รายการ`);
