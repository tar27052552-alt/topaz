const path = require('path');
const fs = require('fs');

async function buildAll() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        🚀 เริ่มต้นสร้างและประมวลผลไฟล์เอกสารคณะสีแสด ปี 2569        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    console.log('>>> [STEP 1/7] สร้างไฟล์รายชื่อรวมหลัก ม.1-ม.6 และไฟล์แยกฝ่าย (สวัสดิการ/ดรัมเมเยอร์/สแตนเชียร์/สตาฟ)...');
    const masterGen = require('./generate_departments_and_master');
    await masterGen.main();

    console.log('\n>>> [STEP 2/7] สร้างไฟล์ Excel กีฬาทุกประเภท...');
    const sportsExcelGen = require('./generate_sports_excel');
    await sportsExcelGen.main();

    console.log('\n>>> [STEP 3/7] สร้างไฟล์ PDF กีฬาแยกรายชนิด 7 ไฟล์...');
    const sportsPdfGen = require('./generate_sports_pdf');
    await sportsPdfGen.main();

    console.log('\n>>> [STEP 4/7] สร้างไฟล์ PDF รวมนักกีฬาทุกประเภท...');
    const masterPdfGen = require('./generate_master_pdf');
    await masterPdfGen.main();

    console.log('\n>>> [STEP 5/7] สร้างและรวบรวมไฟล์ PDF ทุกฝ่ายไว้ในโฟลเดอร์รวมพร้อมส่ง...');
    const consolidatePdfGen = require('./generate_all_consolidated_pdfs');
    await consolidatePdfGen.generateAllDeptPDFs();

    console.log('\n>>> [STEP 6/7] สร้างไฟล์ Excel และ PDF ใบเช็คชื่อ (ทุกฝ่าย/ทุกม./ทุกกลุ่มพ่อครูแม่ครู)...');
    const attendanceExcelGen = require('./generate_attendance_excel');
    await attendanceExcelGen.generateAttendanceExcel();
    const attendancePdfGen = require('./generate_attendance_pdf');
    await attendancePdfGen.generateAttendancePDFs();

    console.log('\n>>> [STEP 7/7] อัปโหลดข้อมูลและเอกสารขึ้น Firebase Cloud Firestore และ Public Web...');
    const rootDir = path.resolve(__dirname, '..');
    const sourceConsolidated = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'รวมไฟล์PDF_พร้อมส่ง');
    const pubPdf = path.join(rootDir, 'public', 'pdf');
    const mainPdf = path.join(rootDir, 'pdf');
    const pubData = path.join(rootDir, 'public', 'data');
    const mainData = path.join(rootDir, 'data');

    // Attendance Dirs
    const sourceAttPdf = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'ใบเช็คชื่อ', 'ไฟล์PDF');
    const sourceAttExcel = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'ใบเช็คชื่อ', 'ไฟล์Excel');
    const pubAttPdf = path.join(pubPdf, 'attendance');
    const pubAttExcel = path.join(rootDir, 'public', 'excel', 'attendance');

    if (!fs.existsSync(pubPdf)) fs.mkdirSync(pubPdf, { recursive: true });
    if (!fs.existsSync(mainPdf)) fs.mkdirSync(mainPdf, { recursive: true });
    if (!fs.existsSync(pubData)) fs.mkdirSync(pubData, { recursive: true });
    if (!fs.existsSync(pubAttPdf)) fs.mkdirSync(pubAttPdf, { recursive: true });
    if (!fs.existsSync(pubAttExcel)) fs.mkdirSync(pubAttExcel, { recursive: true });

    // Copy Consolidated PDFs
    fs.readdirSync(sourceConsolidated).filter(f => f.endsWith('.pdf')).forEach(f => {
      fs.copyFileSync(path.join(sourceConsolidated, f), path.join(pubPdf, f));
      fs.copyFileSync(path.join(sourceConsolidated, f), path.join(mainPdf, f));
    });

    // Copy Attendance PDFs
    if (fs.existsSync(sourceAttPdf)) {
      fs.readdirSync(sourceAttPdf).filter(f => f.endsWith('.pdf')).forEach(f => {
        fs.copyFileSync(path.join(sourceAttPdf, f), path.join(pubAttPdf, f));
      });
    }

    // Copy Attendance Excel
    if (fs.existsSync(sourceAttExcel)) {
      fs.readdirSync(sourceAttExcel).filter(f => f.endsWith('.xlsx')).forEach(f => {
        fs.copyFileSync(path.join(sourceAttExcel, f), path.join(pubAttExcel, f));
      });
    }

    // Copy Data
    fs.readdirSync(mainData).filter(f => f.endsWith('.json')).forEach(f => {
      fs.copyFileSync(path.join(mainData, f), path.join(pubData, f));
    });

    // Sync Firestore
    const { syncToCloudFirestore } = require('./upload_to_firestore_headless');
    await syncToCloudFirestore();

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
