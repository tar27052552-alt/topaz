const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SHEET_ID = '1QE3K2Y4LiJWsBzmcu0Lm8h54BDr-VULuOGGKT4oVSl8';
const GRADES = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];

function formatPhone(p) {
  if (!p) return '';
  const d = String(p).replace(/[^\d]/g, '');
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  if (d.length === 9) return `0${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5, 9)}`;
  return p;
}

function deduplicateDuty(d) {
  if (!d) return '';
  const parts = d.split(',').map(s => s.trim()).filter(Boolean);
  return Array.from(new Set(parts)).join(', ');
}

async function fetchGradeSheet(gradeName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(gradeName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split('\n');
    const students = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split('","').map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length < 8) continue;

      const studentId = cols[5] ? cols[5].replace(/[^\d]/g, '') : '';
      if (!studentId || studentId.length !== 5) continue;

      students.push({
        id: studentId,
        name: cols[6] || '',
        gender: cols[7] || '',
        roomFull: cols[3] || `${gradeName}/-`,
        classNo: cols[4] || '-',
        duty: deduplicateDuty(cols[8] || ''),
        phone: formatPhone(cols[9] || ''),
        note: cols[10] || ''
      });
    }
    return students;
  } catch (err) {
    console.error(`Error fetching ${gradeName}:`, err.message);
    return [];
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 🔄 ดึงข้อมูลสดจาก Google Sheet -> อัปเดตลงในโฟลเดอร์เอกสารแยกฝ่าย ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('>>> [1/3] กำลังดาวน์โหลดข้อมูลสดจาก Google Sheet ม.1 - ม.6...');
  let sheetStudents = [];
  for (const g of GRADES) {
    const list = await fetchGradeSheet(g);
    console.log(`  ✅ แท็บ ${g}: โหลดสำเร็จ ${list.length} คน`);
    sheetStudents = sheetStudents.concat(list);
  }

  console.log(`\n>>> [2/3] กำลังอัปเดตฐานข้อมูลกลาง (Master Data)...`);
  const masterFile = path.join(__dirname, '..', 'data', 'students_master.json');
  let masterData = [];
  if (fs.existsSync(masterFile)) {
    masterData = JSON.parse(fs.readFileSync(masterFile, 'utf8'));
  }

  const sheetMap = new Map(sheetStudents.map(s => [s.id, s]));
  masterData.forEach(st => {
    if (sheetMap.has(st.id)) {
      const live = sheetMap.get(st.id);
      if (live.duty) st.duty = live.duty;
      if (live.phone && live.phone !== '-') st.phone = live.phone;
      if (live.note) st.note = live.note;
    }
  });
  fs.writeFileSync(masterFile, JSON.stringify(masterData, null, 2), 'utf8');

  // Update M.5 staff list with live phones & roles
  const m5StaffPath = path.join(__dirname, '..', 'data', 'm5_staff_with_phones.json');
  if (fs.existsSync(m5StaffPath)) {
    const m5List = JSON.parse(fs.readFileSync(m5StaffPath, 'utf8'));
    m5List.forEach(st => {
      if (sheetMap.has(st.id)) {
        const live = sheetMap.get(st.id);
        if (live.duty) {
          const parts = live.duty.split(',').map(s => s.trim());
          const staffRole = parts.find(p => !p.includes('บอล') && !p.includes('บาส') && !p.includes('วอลเลย์') && !p.includes('ตะกร้อ') && !p.includes('เปตอง') && !p.includes('กรีฑา') && !p.includes('16 ขา'));
          if (staffRole) st.role = staffRole;
        }
        if (live.phone && live.phone !== '-') st.phone = live.phone;
      }
    });
    fs.writeFileSync(m5StaffPath, JSON.stringify(m5List, null, 2), 'utf8');
  }

  console.log('  ✅ อัปเดต students_master.json และ m5_staff_with_phones.json เรียบร้อยแล้ว');

  console.log('\n>>> [3/3] รันระบบสร้างไฟล์ Excel และ PDF ทั้งหมดลงในโฟลเดอร์:');
  console.log('    📁 d:\\กีฬาสีแสด\\เอกสารและรายชื่อคณะสีแสด_ปี69\\');
  
  const buildAll = require('./build_all');
  await buildAll.buildAll();

  console.log('\n✨ อัปเดตไฟล์ทั้งหมดในโฟลเดอร์ "เอกสารและรายชื่อคณะสีแสด_ปี69" และโฟลเดอร์แยกฝ่ายสำเร็จ 100%!');
}

main();
