const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function mergeAllPDFs() {
  const rootDir = path.resolve(__dirname, '..');
  const sourceDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'รวมไฟล์PDF_พร้อมส่ง');
  const outName = 'เอกสารรวมเล่ม_แยกทุกฝ่ายและกีฬา_คณะสีแสด_ปี69.pdf';
  const outPathInFolder = path.join(sourceDir, outName);
  const outPathMain = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', outName);

  // Generate latest Cover Summary Page
  const { generateCoverSummaryPDF } = require('./generate_cover_summary_pdf');
  await generateCoverSummaryPDF();

  const filesToMerge = [
    '00_หน้าปกสรุปยอดแยกฝ่าย_คณะสีแสด_ปี69.pdf',
    '01_รายชื่อฝ่ายสแตนเชียร์_คณะสีแสด_ปี69.pdf',
    '02_รายชื่อฝ่ายขบวนพาเหรด_คณะสีแสด_ปี69.pdf',
    '03_รายชื่อฝ่ายพร็อพ_คณะสีแสด_ปี69.pdf',
    '04_รายชื่อฝ่ายเชียร์ลีดเดอร์_คณะสีแสด_ปี69.pdf',
    '05_รายชื่อฝ่ายดรัมเมเยอร์_คณะสีแสด_ปี69.pdf',
    '06_รายชื่อฝ่ายคัลเลอร์การ์ด_คณะสีแสด_ปี69.pdf',
    '07_รายชื่อฝ่ายสวัสดิการ_คณะสีแสด_ปี69.pdf',
    '08_รายชื่อฝ่ายสตาฟ_คณะสีแสด_ปี69.pdf',
    '09_รายชื่อนักกีฬา_ฟุตบอล_คณะสีแสด_ปี69.pdf',
    '10_รายชื่อนักกีฬา_บาสเกตบอล_คณะสีแสด_ปี69.pdf',
    '11_รายชื่อนักกีฬา_วอลเลย์บอล_คณะสีแสด_ปี69.pdf',
    '12_รายชื่อนักกีฬา_ตะกร้อ_คณะสีแสด_ปี69.pdf',
    '13_รายชื่อนักกีฬา_เปตอง_คณะสีแสด_ปี69.pdf',
    '14_รายชื่อนักกีฬา_กรีฑา_คณะสีแสด_ปี69.pdf',
    '15_รายชื่อนักกีฬา_วิ่ง16ขา_คณะสีแสด_ปี69.pdf'
  ];

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 📑 กำลังรวมไฟล์ PDF แยกทุกฝ่ายและทุกประเภทกีฬาเป็นไฟล์เดียว...   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const mergedPdf = await PDFDocument.create();
  let totalPages = 0;

  for (const fileName of filesToMerge) {
    const filePath = path.join(sourceDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ ข้าม: ไม่พบไฟล์ ${fileName}`);
      continue;
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    
    copiedPages.forEach((page) => mergedPdf.addPage(page));
    totalPages += copiedPages.length;
    console.log(`  ➕ รวมไฟล์: ${fileName} (${copiedPages.length} หน้า)`);
  }

  const mergedBytes = await mergedPdf.save();
  fs.writeFileSync(outPathInFolder, mergedBytes);
  fs.writeFileSync(outPathMain, mergedBytes);

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log(`║ ✅ รวมไฟล์สำเร็จทั้งหมด ${totalPages} หน้า!                                  ║`);
  console.log(`║ 📁 ไฟล์ผลลัพธ์: ${outName}`);
  console.log(`║ 📍 ขนาดไฟล์: ${(mergedBytes.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

if (require.main === module) {
  mergeAllPDFs().catch(console.error);
}

module.exports = { mergeAllPDFs };
