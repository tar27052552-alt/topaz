const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const studentsMaster = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'students_master.json'), 'utf8'));

const outBaseDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'รายชื่อตามระดับชั้น_ไฮไลต์สถานะหน้าที่');
const outExcelDir = path.join(outBaseDir, 'ไฟล์Excel');
const outPdfDir = path.join(outBaseDir, 'ไฟล์PDF');

[outExcelDir, outPdfDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const gradeConfigs = [
  { grade: 1, name: 'ม.1', title: 'รายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 1 ปี 2569', excelFile: '01_รายชื่อสมาชิก_ม1_คณะสีแสด_ปี69.xlsx', pdfFile: '01_รายชื่อสมาชิก_ม1_คณะสีแสด_ปี69.pdf' },
  { grade: 2, name: 'ม.2', title: 'รายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 2 ปี 2569', excelFile: '02_รายชื่อสมาชิก_ม2_คณะสีแสด_ปี69.xlsx', pdfFile: '02_รายชื่อสมาชิก_ม2_คณะสีแสด_ปี69.pdf' },
  { grade: 3, name: 'ม.3', title: 'รายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 3 ปี 2569', excelFile: '03_รายชื่อสมาชิก_ม3_คณะสีแสด_ปี69.xlsx', pdfFile: '03_รายชื่อสมาชิก_ม3_คณะสีแสด_ปี69.pdf' },
  { grade: 4, name: 'ม.4', title: 'รายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 4 ปี 2569', excelFile: '04_รายชื่อสมาชิก_ม4_คณะสีแสด_ปี69.xlsx', pdfFile: '04_รายชื่อสมาชิก_ม4_คณะสีแสด_ปี69.pdf' },
  { grade: 5, name: 'ม.5', title: 'รายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 5 ปี 2569', excelFile: '05_รายชื่อสมาชิก_ม5_คณะสีแสด_ปี69.xlsx', pdfFile: '05_รายชื่อสมาชิก_ม5_คณะสีแสด_ปี69.pdf' },
  { grade: 6, name: 'ม.6', title: 'รายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 6 ปี 2569', excelFile: '06_รายชื่อสมาชิก_ม6_คณะสีแสด_ปี69.xlsx', pdfFile: '06_รายชื่อสมาชิก_ม6_คณะสีแสด_ปี69.pdf' },
];

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

function hasNoDuty(s) {
  return !s.duty || s.duty.trim() === '' || s.duty === '-' || s.duty === 'ไม่มีหน้าที่';
}

// -------------------------------------------------------------
// 1. Generate Excel Files (Official Formal Style like ใบเช็คชื่อ)
// -------------------------------------------------------------
async function generateExcelFiles() {
  console.log('📊 กำลังสร้างไฟล์ Excel แยกรายชั้น ม.1 - ม.6 (รูปแบบทางการ)...');

  const masterWorkbook = new ExcelJS.Workbook();
  masterWorkbook.creator = 'คณะสีแสด (สีบุษราคัม)';

  for (const cfg of gradeConfigs) {
    const students = studentsMaster.filter(s => s.grade === cfg.grade);
    students.sort((a, b) => {
      if (a.room !== b.room) return (a.room || 0) - (b.room || 0);
      if (a.classNo !== b.classNo) return (parseInt(a.classNo) || 0) - (parseInt(b.classNo) || 0);
      return (a.id || '').localeCompare(b.id || '');
    });

    const noDutyCount = students.filter(hasNoDuty).length;
    const hasDutyCount = students.length - noDutyCount;

    // A. Single Sheet Workbook
    const singleWb = new ExcelJS.Workbook();
    singleWb.creator = 'คณะสีแสด (สีบุษราคัม)';
    const wsSingle = singleWb.addWorksheet(cfg.name);
    setupExcelWorksheet(wsSingle, cfg, students, hasDutyCount, noDutyCount);

    const singlePath = path.join(outExcelDir, cfg.excelFile);
    await singleWb.xlsx.writeFile(singlePath);
    console.log(`  ✅ Excel สร้างสำเร็จ: ${cfg.excelFile} (ทั้งหมด ${students.length} คน | ไม่มีหน้าที่ ${noDutyCount} คน)`);

    // B. Add to Master Workbook
    const wsMaster = masterWorkbook.addWorksheet(cfg.name);
    setupExcelWorksheet(wsMaster, cfg, students, hasDutyCount, noDutyCount);
  }

  const masterPath = path.join(outExcelDir, '00_ไฟล์รวมเล่ม_รายชื่อนักเรียนม1ถึงม6_ไฮไลต์สถานะหน้าที่_ปี69.xlsx');
  await masterWorkbook.xlsx.writeFile(masterPath);
  console.log(`  🎉 Excel เล่มรวม (6 ชีต) สร้างสำเร็จ: 00_ไฟล์รวมเล่ม_รายชื่อนักเรียนม1ถึงม6_ไฮไลต์สถานะหน้าที่_ปี69.xlsx\n`);
}

function setupExcelWorksheet(ws, cfg, students, hasDutyCount, noDutyCount) {
  ws.views = [{ showGridLines: true }];

  // Title Row 1
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${cfg.title}`;
  titleCell.font = { name: 'TH Sarabun New', size: 16, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

  // Subtitle / Note Row 2
  ws.mergeCells('A2:H2');
  const subCell = ws.getCell('A2');
  subCell.value = `(จำนวนสมาชิกทั้งหมด ${students.length} คน  |  มีหน้าที่แล้ว ${hasDutyCount} คน  |  ยังไม่มีหน้าที่ ${noDutyCount} คน)`;
  subCell.font = { name: 'TH Sarabun New', size: 12, italic: true, color: { argb: 'FF333333' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // Headers Row 3
  const headers = [
    { header: 'ลำดับ', key: 'no', width: 7 },
    { header: 'ชั้น/ห้อง', key: 'room', width: 11 },
    { header: 'เลขที่', key: 'classNo', width: 8 },
    { header: 'รหัสประจำตัว', key: 'id', width: 14 },
    { header: 'ชื่อ - นามสกุล', key: 'name', width: 28 },
    { header: 'เพศ', key: 'gender', width: 7 },
    { header: 'หน้าที่ / ฝ่ายงานที่ได้รับมอบหมาย', key: 'duty', width: 32 },
    { header: 'เบอร์โทรศัพท์', key: 'phone', width: 16 }
  ];

  const headerRow = ws.getRow(3);
  headerRow.height = 24;
  headers.forEach((h, idx) => {
    const colNum = idx + 1;
    ws.getColumn(colNum).width = h.width;
    const cell = headerRow.getCell(colNum);
    cell.value = h.header;
    cell.font = { name: 'TH Sarabun New', size: 13, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  // Data Rows 4+
  students.forEach((st, idx) => {
    const rowNum = 4 + idx;
    const row = ws.getRow(rowNum);
    row.height = 20;

    const isNoDuty = hasNoDuty(st);
    const dutyText = isNoDuty ? '— (ยังไม่มีหน้าที่) —' : st.duty;

    row.values = [
      idx + 1,
      st.roomFull || `ม.${st.grade}/${st.room || '-'}`,
      st.classNo || '-',
      st.id || '',
      st.name || '',
      st.gender || (st.name && st.name.startsWith('เด็กหญิง') || st.name && st.name.startsWith('นางสาว') ? 'ญ' : 'ช'),
      dutyText,
      st.phone || ''
    ];

    // Alignments
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

    // Styling & Highlight
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;

      if (isNoDuty) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } }; // Very Soft Light Yellow
        cell.font = { name: 'TH Sarabun New', size: 12.5, bold: (c === 7), color: { argb: 'FF000000' } };
      } else {
        cell.font = { name: 'TH Sarabun New', size: 12.5, color: { argb: 'FF000000' } };
      }
    }
  });

  // Enable AutoFilter
  ws.autoFilter = `A3:H${3 + students.length}`;
}

// -------------------------------------------------------------
// 2. Generate PDF Files (Official Formal Style like ใบเช็คชื่อ)
// -------------------------------------------------------------
function renderPdfHtml(cfg, students, hasDutyCount, noDutyCount) {
  const rows = students.map((st, idx) => {
    const isNoDuty = hasNoDuty(st);
    const gender = st.gender || (st.name && st.name.startsWith('เด็กหญิง') || st.name && st.name.startsWith('นางสาว') ? 'ญ' : 'ช');
    const dutyText = isNoDuty ? '<span class="font-bold">— (ยังไม่มีหน้าที่) —</span>' : (st.duty || '-');

    return `
      <tr class="${isNoDuty ? 'row-noduty' : ''}">
        <td class="center font-mono">${idx + 1}</td>
        <td class="center font-bold">${st.roomFull || `ม.${st.grade}/${st.room || '-'}`}</td>
        <td class="center font-mono">${st.classNo || '-'}</td>
        <td class="center font-mono">${st.id || ''}</td>
        <td class="left">${st.name || ''}</td>
        <td class="center">${gender}</td>
        <td class="left">${dutyText}</td>
        <td class="center font-mono">${st.phone || ''}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>${cfg.title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 10mm 12mm 10mm;
        }
        * {
          box-sizing: border-box;
          font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          background: #ffffff;
          color: #000000;
          font-size: 11px;
          line-height: 1.2;
          margin: 0;
          padding: 0;
        }
        .header-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.5;
          padding-top: 4px;
          margin-bottom: 2px;
          color: #000000;
        }
        .header-sub {
          text-align: center;
          font-size: 11px;
          color: #444444;
          margin-bottom: 10px;
        }
        .roster-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          page-break-inside: auto;
          margin: 0;
          padding: 0;
        }
        .roster-table thead {
          display: table-header-group;
        }
        .roster-table tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        .roster-table th,
        .roster-table td {
          border: 0.5pt solid #000000 !important;
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding: 3.5px 3px;
          font-size: 11px;
          color: #000000;
        }
        .roster-table th {
          font-weight: 700;
          text-align: center;
          background-color: #ffffff;
          color: #000000;
          padding-top: 4px;
          padding-bottom: 4px;
        }
        .roster-table td {
          font-weight: 400;
        }
        .row-noduty td {
          background-color: #fffde7 !important; /* Soft Gentle Tint for No Duty */
        }
        .center { text-align: center; }
        .left { text-align: left; padding-left: 5px !important; }
        .font-bold { font-weight: 700; }
        .font-mono { font-family: monospace; font-size: 10.5px; }
      </style>
    </head>
    <body>
      <div class="header-title">${cfg.title}</div>
      <div class="header-sub">(รวม ${students.length} คน  |  มีหน้าที่แล้ว ${hasDutyCount} คน  |  ยังไม่มีหน้าที่ ${noDutyCount} คน)</div>
      <table class="roster-table">
        <colgroup>
          <col style="width: 5%;">
          <col style="width: 9%;">
          <col style="width: 6%;">
          <col style="width: 12%;">
          <col style="width: 29%;">
          <col style="width: 6%;">
          <col style="width: 21%;">
          <col style="width: 12%;">
        </colgroup>
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>ชั้น/ห้อง</th>
            <th>เลขที่</th>
            <th>รหัสประจำตัว</th>
            <th style="text-align: left; padding-left: 6px;">ชื่อ - นามสกุล</th>
            <th>เพศ</th>
            <th style="text-align: left; padding-left: 6px;">หน้าที่ / ฝ่ายงานที่ได้รับมอบหมาย</th>
            <th>เบอร์โทรศัพท์</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

async function generatePdfFiles() {
  console.log('📕 กำลังสร้างไฟล์ PDF แยกรายชั้น ม.1 - ม.6 (รูปแบบทางการ)...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const cfg of gradeConfigs) {
    const students = studentsMaster.filter(s => s.grade === cfg.grade);
    students.sort((a, b) => {
      if (a.room !== b.room) return (a.room || 0) - (b.room || 0);
      if (a.classNo !== b.classNo) return (parseInt(a.classNo) || 0) - (parseInt(b.classNo) || 0);
      return (a.id || '').localeCompare(b.id || '');
    });

    const noDutyCount = students.filter(hasNoDuty).length;
    const hasDutyCount = students.length - noDutyCount;

    const html = renderPdfHtml(cfg, students, hasDutyCount, noDutyCount);
    const outPdfPath = path.join(outPdfDir, cfg.pdfFile);

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }
    });

    fs.writeFileSync(outPdfPath, pdfBuf);
    console.log(`  ✅ PDF สร้างสำเร็จ: ${cfg.pdfFile} (ทั้งหมด ${students.length} คน | ไม่มีหน้าที่ ${noDutyCount} คน)`);
  }

  await page.close();
  await browser.close();

  // Merge into Consolidated Booklet
  await mergeGradePDFs();
}

async function mergeGradePDFs() {
  console.log('\n📑 กำลังรวมไฟล์ PDF ม.1 - ม.6 เป็นเล่มรวมเดียว...');

  const mergedDoc = await PDFDocument.create();

  for (const cfg of gradeConfigs) {
    const pdfPath = path.join(outPdfDir, cfg.pdfFile);
    if (!fs.existsSync(pdfPath)) continue;

    const pdfBytes = fs.readFileSync(pdfPath);
    const donorDoc = await PDFDocument.load(pdfBytes);
    const pages = await mergedDoc.copyPages(donorDoc, donorDoc.getPageIndices());
    pages.forEach(p => mergedDoc.addPage(p));
  }

  const mergedBytes = await mergedDoc.save();
  const masterPdfPath = path.join(outPdfDir, '00_ไฟล์รวมเล่ม_รายชื่อนักเรียนม1ถึงม6_ไฮไลต์สถานะหน้าที่_ปี69.pdf');
  fs.writeFileSync(masterPdfPath, mergedBytes);

  // Also copy to root of attendance/grade dir for quick access
  fs.writeFileSync(path.join(outBaseDir, '00_ไฟล์รวมเล่ม_รายชื่อนักเรียนม1ถึงม6_ไฮไลต์สถานะหน้าที่_ปี69.pdf'), mergedBytes);

  console.log(`  🎉 รวมเล่ม PDF สำเร็จทั้งหมด ${mergedDoc.getPageCount()} หน้า: 00_ไฟล์รวมเล่ม_รายชื่อนักเรียนม1ถึงม6_ไฮไลต์สถานะหน้าที่_ปี69.pdf\n`);
}

async function run() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 🌟 เริ่มต้นสร้างเอกสารรายชื่อ ม.1-ม.6 (รูปแบบทางการเหมือนใบเช็คชื่อ) ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  await generateExcelFiles();
  await generatePdfFiles();

  // Sync to public web directory
  const publicGradeDir = path.join(rootDir, 'public', 'grade_duty_status');
  const publicPdfDir = path.join(publicGradeDir, 'pdf');
  const publicExcelDir = path.join(publicGradeDir, 'excel');

  [publicPdfDir, publicExcelDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  fs.readdirSync(outPdfDir).forEach(f => {
    fs.copyFileSync(path.join(outPdfDir, f), path.join(publicPdfDir, f));
  });
  fs.readdirSync(outExcelDir).forEach(f => {
    fs.copyFileSync(path.join(outExcelDir, f), path.join(publicExcelDir, f));
  });

  console.log('✅ ซิงค์ไฟล์ทั้งหมดไปยัง public/grade_duty_status/ เรียบร้อยแล้ว!');
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = { run };
