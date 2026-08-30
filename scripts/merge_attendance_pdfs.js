const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { attendanceGroups } = require('./generate_attendance_excel');

async function mergeAttendancePDFs() {
  const rootDir = path.resolve(__dirname, '..');
  const outBaseDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'ใบเช็คชื่อ');
  const sourcePdfDir = path.join(outBaseDir, 'ไฟล์PDF');
  const outName = '00_ไฟล์รวมเล่ม_ใบเช็คชื่อทุกฝ่ายและทุกระดับชั้น_ปี69.pdf';
  const outPathInFolder = path.join(sourcePdfDir, outName);
  const outPathMain = path.join(outBaseDir, outName);

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 📑 กำลังรวมไฟล์ PDF ใบเช็คชื่อทุกชุดเป็นเล่มรวมเดียว...          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const mergedPdf = await PDFDocument.create();
  let totalPages = 0;

  for (const group of attendanceGroups) {
    const filePath = path.join(sourcePdfDir, group.pdfFileName);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ ข้าม: ไม่พบไฟล์ ${group.pdfFileName}`);
      continue;
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

    copiedPages.forEach(page => mergedPdf.addPage(page));
    totalPages += copiedPages.length;
    console.log(`  ➕ รวมไฟล์: ${group.pdfFileName} (${copiedPages.length} หน้า)`);
  }

  const mergedBytes = await mergedPdf.save();
  fs.writeFileSync(outPathInFolder, mergedBytes);
  fs.writeFileSync(outPathMain, mergedBytes);

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log(`║ ✅ รวมเล่มใบเช็คชื่อสำเร็จทั้งหมด ${totalPages} หน้า!                             ║`);
  console.log(`║ 📁 ไฟล์ผลลัพธ์: ${outName}`);
  console.log(`║ 📍 ขนาดไฟล์: ${(mergedBytes.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

if (require.main === module) {
  mergeAttendancePDFs().catch(console.error);
}

module.exports = { mergeAttendancePDFs };
