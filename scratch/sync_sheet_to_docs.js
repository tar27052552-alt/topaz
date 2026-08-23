const https = require('https');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.headers.location) {
        https.get(res.headers.location, (res2) => {
          let data = '';
          res2.on('data', d => data += d);
          res2.on('end', () => resolve(data));
        }).on('error', reject);
      } else {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve(data));
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('🚀 Step 1: ดึงข้อมูลนักเรียนทั้งหมดจาก Google Sheets...');
  
  let sheetStudents = [];
  try {
    const raw = await fetchUrl(WEBHOOK_URL + '?action=getAllMaster');
    const parsed = JSON.parse(raw);
    if (parsed.status === 'success' && Array.isArray(parsed.data) && parsed.data.length > 0) {
      sheetStudents = parsed.data;
      console.log(`✅ ดึงข้อมูลสำเร็จ: ${sheetStudents.length} คน จาก Google Sheets`);
    } else {
      throw new Error('getAllMaster not supported or empty');
    }
  } catch (err) {
    console.log('ℹ️ ใช้วิธีดึงผ่าน students_master.json ควบคู่ Firestore cache...');
    sheetStudents = JSON.parse(fs.readFileSync('data/students_master.json', 'utf8'));
  }

  // 1. Update data/students_master.json and public/data/students_master.json
  console.log('📁 Step 2: อัปเดตข้อมูล students_master.json ในระบบ...');
  fs.writeFileSync('data/students_master.json', JSON.stringify(sheetStudents, null, 2), 'utf8');
  fs.writeFileSync('public/data/students_master.json', JSON.stringify(sheetStudents, null, 2), 'utf8');

  // 2. Update Excel (.xlsx) file: เอกสารและรายชื่อคณะสีแสด_ปี69/รายชื่อคณะสีแสด_ปี69.xlsx
  console.log('📊 Step 3: อัปเดตไฟล์ Excel ในโฟลเดอร์ เอกสารและรายชื่อคณะสีแสด_ปี69/รายชื่อคณะสีแสด_ปี69.xlsx ...');
  const excelPath = path.join(__dirname, '..', 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'รายชื่อคณะสีแสด_ปี69.xlsx');
  
  const wb = xlsx.utils.book_new();

  // Create sheets for ม.1 - ม.6
  for (let g = 1; g <= 6; g++) {
    const gradeStudents = sheetStudents.filter(s => Number(s.grade) === g);
    const rows = gradeStudents.map((s, idx) => ({
      'ลำดับ': idx + 1,
      'ระดับชั้น': s.gradeName || `ม.${g}`,
      'ห้อง': s.roomNo || s.room || '',
      'ชั้น/ห้อง': s.roomFull || `ม.${g}/${s.roomNo || s.room || ''}`,
      'เลขที่': s.classNo || '',
      'รหัสประจำตัว': s.id,
      'ชื่อ - นามสกุล': s.name,
      'เพศ': s.gender || '',
      'ฝ่าย / หน้าที่': s.duty || '',
      'เบอร์โทรศัพท์': s.phone || '',
      'หมายเหตุ': s.note || ''
    }));

    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, `ม.${g}`);
  }

  xlsx.writeFile(wb, excelPath);
  console.log('✅ อัปเดตไฟล์ Excel สำเร็จ!');

  console.log('🎉 อัปเดตข้อมูลในโฟลเดอร์ "เอกสารและรายชื่อคณะสีแสด_ปี69" เรียบร้อยสมบูรณ์ทุกไฟล์!');
}

main().catch(console.error);
