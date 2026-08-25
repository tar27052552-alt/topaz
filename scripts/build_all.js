const path = require('path');
const fs = require('fs');

async function buildAll() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        🚀 เริ่มต้นสร้างและประมวลผลไฟล์เอกสารคณะสีแสด ปี 2569        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    console.log('>>> [STEP 1/4] สร้างไฟล์รายชื่อรวมหลัก ม.1-ม.6 และไฟล์แยกฝ่าย (สวัสดิการ/ดรัมเมเยอร์/สแตนเชียร์/สตาฟ)...');
    const masterGen = require('./generate_departments_and_master');
    await masterGen.main();

    console.log('\n>>> [STEP 2/4] สร้างไฟล์ Excel กีฬาทุกประเภท...');
    const sportsExcelGen = require('./generate_sports_excel');
    await sportsExcelGen.main();

    console.log('\n>>> [STEP 3/4] สร้างไฟล์ PDF กีฬาแยกรายชนิด 7 ไฟล์...');
    const sportsPdfGen = require('./generate_sports_pdf');
    await sportsPdfGen.main();

    console.log('\n>>> [STEP 4/5] สร้างไฟล์ PDF รวมนักกีฬาทุกประเภท...');
    const masterPdfGen = require('./generate_master_pdf');
    await masterPdfGen.main();

    console.log('\n>>> [STEP 5/5] สร้างและรวบรวมไฟล์ PDF ทุกฝ่ายไว้ในโฟลเดอร์รวมพร้อมส่ง...');
    const consolidatePdfGen = require('./generate_all_consolidated_pdfs');
    await consolidatePdfGen.generateAllDeptPDFs();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log(`║   ✅ สำเร็จเรียบร้อย 100% (ใช้เวลา ${elapsed} วินาที)                     ║`);
    console.log('║   📁 ที่จัดเก็บ: d:\\กีฬาสีแสด\\เอกสารและรายชื่อคณะสีแสด_ปี69\\         ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาดระหว่างการ Build:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  buildAll();
}

module.exports = { buildAll };
