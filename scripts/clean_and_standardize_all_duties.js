const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec";

function standardizeDuty(duty) {
  if (!duty || duty === '-' || duty === 'ไม่มีหน้าที่') return '';
  const dirtyWords = ["กัป", "การ์ตูน", "โยเกิร์ต", "สิ", "หยก", "นาเดียร์", "อลิษา", "อัญชณพร", "กัน", "ออกแล้ว"];
  
  const parts = duty.split(',').map(s => s.trim()).filter(Boolean);
  const cleanedParts = parts.map(p => {
    if (dirtyWords.includes(p)) return '';
    let s = p;
    if (s === 'ฝ่ายสแตนเชียร์' || s === 'สแตนเชียร์') return 'สแตนเชียร์';
    if (s === 'ฝ่ายขบวนพาเหรด' || s === 'ขบวนพาเหรด' || s === 'ฝ่ายขบวน' || s === 'ขบวน') return 'ขบวนพาเหรด';
    if (s === 'ฝ่ายอุปกรณ์และพร็อพ' || s === 'ฝ่ายพร็อพ' || s === 'พร็อพ' || s === 'พร้อบ' || s === 'พร้อพ' || s === 'อุปกรณ์และพร็อพ') return 'พร็อพ';
    if (s === 'ฝ่ายเชียร์ลีดเดอร์' || s === 'เชียร์ลีดเดอร์' || s === 'หลีด' || s === 'ลีด') return 'เชียร์ลีดเดอร์';
    if (s === 'ฝ่ายดรัมเมเยอร์' || s === 'ดรัมเมเยอร์') return 'ดรัมเมเยอร์';
    if (s === 'ฝ่ายคัลเลอร์การ์ด' || s === 'คัลเลอร์การ์ด') return 'คัลเลอร์การ์ด';
    if (s === 'ฝ่ายสวัสดิการ' || s === 'สวัสดิการ') return 'สวัสดิการ';
    
    // Staff roles with "ฝ่าย"
    if (s === 'สตาฟฝ่ายขบวนพาเหรด' || s === 'สตาฟฝ่ายขบวน' || s === 'สตาฟขบวน') return 'สตาฟขบวนพาเหรด';
    if (s === 'หัวหน้าฝ่ายขบวนพาเหรด' || s === 'หัวหน้าฝ่ายขบวน' || s === 'เฮดขบวน') return 'หัวหน้าฝ่ายขบวนพาเหรด';
    if (s === 'สตาฟฝ่ายอุปกรณ์และพร็อพ' || s === 'สตาฟฝ่ายพร็อพ' || s === 'สตาฟพร็อพ') return 'สตาฟพร็อพ';
    if (s === 'หัวหน้าฝ่ายอุปกรณ์และพร็อพ' || s === 'หัวหน้าฝ่ายพร็อพ' || s === 'เฮดพร็อพ') return 'หัวหน้าฝ่ายพร็อพ';
    if (s === 'สตาฟฝ่ายเชียร์ลีดเดอร์' || s === 'สตาฟเชียร์ลีดเดอร์' || s === 'สตาฟหลีด') return 'สตาฟเชียร์ลีดเดอร์';
    if (s === 'หัวหน้าฝ่ายเชียร์ลีดเดอร์' || s === 'เฮดเชียร์ลีดเดอร์' || s === 'เฮดหลีด') return 'หัวหน้าฝ่ายเชียร์ลีดเดอร์';
    if (s === 'สตาฟฝ่ายสวัสดิการ' || s === 'สตาฟสวัสดิการ') return 'สตาฟสวัสดิการ';
    if (s === 'หัวหน้าฝ่ายสวัสดิการ' || s === 'เฮดสวัสดิการ') return 'หัวหน้าฝ่ายสวัสดิการ';

    if (s.startsWith('ฝ่าย')) {
      s = s.replace(/^ฝ่าย/, '').trim();
    }
    return s;
  }).filter(Boolean);

  return Array.from(new Set(cleanedParts)).join(', ');
}

async function main() {
  console.log('=== [1/3] ปรับมาตรฐานชื่อหน้าที่ใน data/students_master.json ===');
  const masterPath = path.join(rootDir, 'data', 'students_master.json');
  const students = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

  let changedCount = 0;
  const updateList = [];

  students.forEach(s => {
    const oldDuty = s.duty || '';
    const clean = standardizeDuty(oldDuty);
    if (clean !== oldDuty) {
      s.duty = clean;
      changedCount++;
      updateList.push({
        studentId: s.id,
        grade: s.grade,
        roomFull: s.roomFull,
        activityTitle: clean,
        phone: s.phone || '',
        note: s.note || '',
        overwrite: true
      });
    }
  });

  fs.writeFileSync(masterPath, JSON.stringify(students, null, 2), 'utf8');
  console.log(`✅ อัปเดต students_master.json เรียบร้อยแล้ว (ปรับเปลี่ยน ${changedCount} คน)`);

  // Update M.5 staff
  const m5StaffPath = path.join(rootDir, 'data', 'm5_staff_with_phones.json');
  if (fs.existsSync(m5StaffPath)) {
    const m5Staff = JSON.parse(fs.readFileSync(m5StaffPath, 'utf8'));
    m5Staff.forEach(st => {
      st.role = standardizeDuty(st.role || '');
    });
    fs.writeFileSync(m5StaffPath, JSON.stringify(m5Staff, null, 2), 'utf8');
    console.log(`✅ อัปเดต m5_staff_with_phones.json เรียบร้อยแล้ว`);
  }

  // Copy to public/data
  const pubMasterPath = path.join(rootDir, 'public', 'data', 'students_master.json');
  if (fs.existsSync(pubMasterPath)) {
    fs.writeFileSync(pubMasterPath, JSON.stringify(students, null, 2), 'utf8');
  }

  console.log(`\n=== [2/3] กำลังซิงค์ข้อมูลหน้าที่ที่สะอาดขึ้นไปยัง Google Sheet (${updateList.length} คน) ===`);
  for (let i = 0; i < updateList.length; i += 5) {
    const batch = updateList.slice(i, i + 5);
    const promises = batch.map(async (item) => {
      try {
        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
          redirect: "follow"
        });
      } catch (e) {
        console.error(`  ⚠️ Sync error [${item.studentId}]:`, e.message);
      }
    });
    await Promise.all(promises);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`✅ ซิงค์ข้อมูลขึ้น Google Sheet สำเร็จครบถ้วน!`);

  console.log('\n=== [3/3] สร้างและรวมไฟล์ PDF ทั้งหมดใหม่ ===');
  const consolidatePdfGen = require('./generate_all_consolidated_pdfs');
  await consolidatePdfGen.generateAllDeptPDFs();

  console.log('\n🎉 ดำเนินการปรับมาตรฐานชื่อหน้าที่ และอัปเดตไฟล์ PDF รวมทั้งหมดเสร็จสมบูรณ์ 100%!');
}

main().catch(console.error);
