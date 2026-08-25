const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const masterList = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'students_master.json'), 'utf8'));

// 1. Target Consolidated Output Directory
const consolidatedDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'รวมไฟล์PDF_พร้อมส่ง');
if (!fs.existsSync(consolidatedDir)) {
  fs.mkdirSync(consolidatedDir, { recursive: true });
}

// 2. Define Department Configurations
const depts = [
  {
    name: 'ฝ่ายสแตนเชียร์',
    filter: (d) => d.includes('สแตนเชียร์'),
    folder: path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'สแตนเชียร์'),
    file: 'รายชื่อฝ่ายสแตนเชียร์_คณะสีแสด_ปี69.pdf',
    consolidatedName: '01_รายชื่อฝ่ายสแตนเชียร์_คณะสีแสด_ปี69.pdf'
  },
  {
    name: 'ฝ่ายขบวนพาเหรด',
    filter: (d) => (d.includes('ขบวน') || d.includes('พาเหรด')) && !d.includes('พร็อพ'),
    folder: path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'ขบวนพาเหรด'),
    file: 'รายชื่อฝ่ายขบวนพาเหรด_คณะสีแสด_ปี69.pdf',
    consolidatedName: '02_รายชื่อฝ่ายขบวนพาเหรด_คณะสีแสด_ปี69.pdf'
  },
  {
    name: 'ฝ่ายพร็อพ',
    filter: (d) => d.includes('พร็อพ') || d.includes('พร้อพ') || d.includes('อุปกรณ์'),
    folder: path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'พร็อพ'),
    file: 'รายชื่อฝ่ายพร็อพ_คณะสีแสด_ปี69.pdf',
    consolidatedName: '03_รายชื่อฝ่ายพร็อพ_คณะสีแสด_ปี69.pdf'
  },
  {
    name: 'ฝ่ายเชียร์ลีดเดอร์',
    filter: (d) => d.includes('เชียร์ลีดเดอร์') || d.includes('หลีด'),
    folder: path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'เชียร์ลีดเดอร์'),
    file: 'รายชื่อฝ่ายเชียร์ลีดเดอร์_คณะสีแสด_ปี69.pdf',
    consolidatedName: '04_รายชื่อฝ่ายเชียร์ลีดเดอร์_คณะสีแสด_ปี69.pdf'
  },
  {
    name: 'ฝ่ายดรัมเมเยอร์',
    filter: (d) => d.includes('ดรัมเมเยอร์') || d.includes('ดรัม'),
    folder: path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'ดรัมเมเยอร์'),
    file: 'รายชื่อฝ่ายดรัมเมเยอร์_คณะสีแสด_ปี69.pdf',
    consolidatedName: '05_รายชื่อฝ่ายดรัมเมเยอร์_คณะสีแสด_ปี69.pdf'
  },
  {
    name: 'ฝ่ายคัลเลอร์การ์ด',
    filter: (d) => d.includes('คัลเลอร์การ์ด') || d.includes('คัลเลอร์'),
    folder: path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'ดรัมเมเยอร์'),
    file: 'รายชื่อฝ่ายคัลเลอร์การ์ด_คณะสีแสด_ปี69.pdf',
    consolidatedName: '06_รายชื่อฝ่ายคัลเลอร์การ์ด_คณะสีแสด_ปี69.pdf'
  },
  {
    name: 'ฝ่ายสวัสดิการ',
    filter: (d) => d.includes('สวัสดิการ'),
    folder: path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'สวัสดิการ'),
    file: 'รายชื่อฝ่ายสวัสดิการ_คณะสีแสด_ปี69.pdf',
    consolidatedName: '07_รายชื่อฝ่ายสวัสดิการ_คณะสีแสด_ปี69.pdf'
  },
  {
    name: 'ฝ่ายสตาฟและคณะกรรมการ (ม.5)',
    filter: (d) => d.includes('สตาฟ') || d.includes('ประธาน') || d.includes('หัวหน้า') || d.includes('เหรัญญิก') || d.includes('เฮด'),
    folder: path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'สตาฟ'),
    file: 'รายชื่อฝ่ายสตาฟ_คณะสีแสด_ปี69.pdf',
    consolidatedName: '08_รายชื่อฝ่ายสตาฟ_คณะสีแสด_ปี69.pdf'
  }
];

// Sports PDF Mapping
const sportsPdfs = [
  { origFile: 'ฟุตบอล.pdf', consolidatedName: '09_รายชื่อนักกีฬา_ฟุตบอล_คณะสีแสด_ปี69.pdf' },
  { origFile: 'บาสเกตบอล.pdf', consolidatedName: '10_รายชื่อนักกีฬา_บาสเกตบอล_คณะสีแสด_ปี69.pdf' },
  { origFile: 'วอลเลย์บอล.pdf', consolidatedName: '11_รายชื่อนักกีฬา_วอลเลย์บอล_คณะสีแสด_ปี69.pdf' },
  { origFile: 'ตะกร้อ.pdf', consolidatedName: '12_รายชื่อนักกีฬา_ตะกร้อ_คณะสีแสด_ปี69.pdf' },
  { origFile: 'เปตอง.pdf', consolidatedName: '13_รายชื่อนักกีฬา_เปตอง_คณะสีแสด_ปี69.pdf' },
  { origFile: 'กรีฑา.pdf', consolidatedName: '14_รายชื่อนักกีฬา_กรีฑา_คณะสีแสด_ปี69.pdf' },
  { origFile: 'วิ่ง 16 ขา.pdf', consolidatedName: '15_รายชื่อนักกีฬา_วิ่ง16ขา_คณะสีแสด_ปี69.pdf' }
];

async function generateAllDeptPDFs() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 🚀 เริ่มสร้างและรวมไฟล์ PDF ทั้งหมดไว้ที่เดียวเพื่อความสะดวกในการส่ง ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const dept of depts) {
    let students = masterList.filter(s => dept.filter(s.duty || ''));

    students.sort((a, b) => {
      if (a.grade !== b.grade) return (a.grade || 0) - (b.grade || 0);
      if (a.room !== b.room) return (a.room || 0) - (b.room || 0);
      return (parseInt(a.classNo) || 0) - (parseInt(b.classNo) || 0);
    });

    const rows = students.map((s, idx) => `
      <tr>
        <td class="center font-bold">${idx + 1}</td>
        <td class="center font-bold text-orange">${s.roomFull || `ม.${s.grade}/${s.room || '-'}`}</td>
        <td class="center">${s.classNo || '-'}</td>
        <td class="center font-mono">${s.id}</td>
        <td class="left font-bold">${s.name}</td>
        <td class="center">${s.gender || '-'}</td>
        <td class="left text-orange font-bold">${s.duty || '-'}</td>
        <td class="center font-mono">${s.phone || '-'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>${dept.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Prompt:wght@600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 10mm 8mm; }
          * { box-sizing: border-box; font-family: 'Sarabun', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: #fff; color: #0f172a; font-size: 10px; line-height: 1.25; margin: 0; padding: 0; }
          .pdf-page { width: 100%; box-sizing: border-box; }
          .pdf-grade-header { display: flex; justify-content: space-between; align-items: center; background-color: #fff3e0 !important; padding: 10px 16px; border-radius: 10px; margin-bottom: 12px; border-left: 5px solid #ea580c; }
          .pdf-grade-title { font-family: 'Prompt', sans-serif; font-size: 16px; font-weight: 800; color: #c2410c; margin: 0; }
          .pdf-grade-sub { font-size: 11.5px; color: #78716c; margin-top: 2px; }
          .pdf-grade-badge { background-color: #ea580c !important; color: #fff !important; font-family: 'Prompt', sans-serif; font-weight: 800; font-size: 13px; padding: 4px 12px; border-radius: 6px; }
          .pdf-roster-table { width: 100%; border-collapse: collapse; }
          .pdf-roster-table th { background-color: #ea580c !important; color: #fff !important; font-family: 'Prompt', sans-serif; font-size: 10.5px; font-weight: 700; padding: 5px 4px; border: 1px solid #c2410c; text-align: center; }
          .pdf-roster-table td { border: 1px solid #e7e5e4; padding: 4px 4px; font-size: 9.8px; vertical-align: middle; }
          .pdf-roster-table tbody tr:nth-child(even) td { background-color: #fafaf9 !important; }
          .center { text-align: center; }
          .left { text-align: left; }
          .font-bold { font-weight: 700; }
          .text-orange { color: #c2410c; }
          .font-mono { font-family: monospace; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="pdf-page">
          <div class="pdf-grade-header">
            <div>
              <h2 class="pdf-grade-title">รายชื่อ${dept.name} — คณะสีแสด 2569</h2>
              <div class="pdf-grade-sub">โรงเรียนสรรพวิทยาคม | จำนวนสมาชิกรวม: ${students.length} คน</div>
            </div>
            <div class="pdf-grade-badge">สีแสด</div>
          </div>
          <table class="pdf-roster-table">
            <thead>
              <tr>
                <th style="width: 5%;">ลำดับ</th>
                <th style="width: 8%;">ห้อง</th>
                <th style="width: 6%;">เลขที่</th>
                <th style="width: 11%;">รหัสประจำตัว</th>
                <th style="width: 26%; text-align: left; padding-left: 8px;">ชื่อ - นามสกุล</th>
                <th style="width: 7%;">เพศ</th>
                <th style="width: 23%; text-align: left; padding-left: 8px;">ฝ่าย / หน้าที่</th>
                <th style="width: 14%;">เบอร์โทรศัพท์</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    if (!fs.existsSync(dept.folder)) fs.mkdirSync(dept.folder, { recursive: true });
    const fullOutPath = path.join(dept.folder, dept.file);
    const consolidatedPath = path.join(consolidatedDir, dept.consolidatedName);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' }
    });
    await page.close();

    fs.writeFileSync(fullOutPath, pdfBuf);
    fs.writeFileSync(consolidatedPath, pdfBuf);
    console.log(`✅ [ฝ่าย] ${dept.name}: สร้างสำเร็จ (${students.length} คน) -> ${dept.consolidatedName}`);
  }

  await browser.close();

  // Copy Sports PDFs to consolidated folder
  console.log('\n>>> กำลังรวบรวมไฟล์ PDF นักกีฬาแยกรายชนิด...');
  const sportsSourceDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'กีฬา', 'รายชื่อนักกีฬา_PDF');
  sportsPdfs.forEach(sp => {
    const src = path.join(sportsSourceDir, sp.origFile);
    const dst = path.join(consolidatedDir, sp.consolidatedName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`  ✅ [กีฬา] ${sp.origFile} -> ${sp.consolidatedName}`);
    } else {
      console.log(`  ⚠️ ไม่พบไฟล์กีฬาต้นฉบับ: ${src}`);
    }
  });

  // Copy Master Sports PDF
  const masterSportsSrc = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'กีฬา', 'รายชื่อนักกีฬาทุกประเภท_คณะสีแสด_ปี69.pdf');
  if (fs.existsSync(masterSportsSrc)) {
    fs.copyFileSync(masterSportsSrc, path.join(consolidatedDir, '16_รายชื่อนักกีฬาทุกประเภท_คณะสีแสด_ปี69.pdf'));
    console.log(`  ✅ [เล่มรวมกีฬา] -> 16_รายชื่อนักกีฬาทุกประเภท_คณะสีแสด_ปี69.pdf`);
  }

  // Copy Master All Students PDF
  const masterAllSrc = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'รายชื่อคณะสีแสด_ปี69.pdf');
  if (fs.existsSync(masterAllSrc)) {
    fs.copyFileSync(masterAllSrc, path.join(consolidatedDir, '00_รายชื่อคณะสีแสด_เล่มรวมทั้งหมด_ปี69.pdf'));
    console.log(`  ✅ [เล่มรวมทั้งคณะ ม.1-ม.6] -> 00_รายชื่อคณะสีแสด_เล่มรวมทั้งหมด_ปี69.pdf`);
  }

  // Merge all individual PDFs into a single comprehensive master document
  const { mergeAllPDFs } = require('./merge_all_pdfs');
  await mergeAllPDFs();

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 🎉 รวมไฟล์ PDF ทั้งหมดสำเร็จ 100% ครบทุกฝ่ายและทุกประเภทกีฬา!        ║');
  console.log(`║ 📁 โฟลเดอร์รวมไฟล์: ${consolidatedDir}`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

if (require.main === module) {
  generateAllDeptPDFs().catch(console.error);
}

module.exports = { generateAllDeptPDFs };
