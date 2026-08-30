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
// 1. Generate Excel Files
// -------------------------------------------------------------
async function generateExcelFiles() {
  console.log('📊 กำลังสร้างไฟล์ Excel แยกรายชั้น ม.1 - ม.6 (ไฮไลต์ผู้ไม่มีหน้าที่)...');

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
  ws.mergeCells('A1:I1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `🧡 ${cfg.title}`;
  titleCell.font = { name: 'TH Sarabun New', size: 16, bold: true, color: { argb: 'FFC2410C' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // Stat Row 2
  ws.mergeCells('A2:I2');
  const statCell = ws.getCell('A2');
  statCell.value = `👥 จำนวนสมาชิกทั้งหมด: ${students.length} คน   |   ✅ ได้รับมอบหมายหน้าที่แล้ว: ${hasDutyCount} คน   |   ⚠️ ยังไม่มีหน้าที่: ${noDutyCount} คน (ไฮไลต์แถบสีเหลือง)`;
  statCell.font = { name: 'TH Sarabun New', size: 13, bold: true, color: { argb: 'FF1E293B' } };
  statCell.alignment = { horizontal: 'center', vertical: 'middle' };
  statCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
  ws.getRow(2).height = 22;

  // Blank Row 3
  ws.getRow(3).height = 8;

  // Headers Row 4
  const headers = [
    { header: 'ลำดับ', key: 'no', width: 8 },
    { header: 'ชั้น/ห้อง', key: 'room', width: 12 },
    { header: 'เลขที่', key: 'classNo', width: 9 },
    { header: 'รหัสประจำตัว', key: 'id', width: 15 },
    { header: 'ชื่อ - นามสกุล', key: 'name', width: 28 },
    { header: 'เพศ', key: 'gender', width: 8 },
    { header: 'หน้าที่ / ฝ่ายงานที่ได้รับมอบหมาย', key: 'duty', width: 34 },
    { header: 'สถานะการมีหน้าที่', key: 'status', width: 20 },
    { header: 'เบอร์โทรศัพท์', key: 'phone', width: 18 }
  ];

  const headerRow = ws.getRow(4);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const colNum = idx + 1;
    ws.getColumn(colNum).width = h.width;
    const cell = headerRow.getCell(colNum);
    cell.value = h.header;
    cell.font = { name: 'TH Sarabun New', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  // Data Rows 5+
  students.forEach((st, idx) => {
    const rowNum = 5 + idx;
    const row = ws.getRow(rowNum);
    row.height = 21;

    const isNoDuty = hasNoDuty(st);
    const statusText = isNoDuty ? '⚠️ ยังไม่มีหน้าที่' : '✅ มีหน้าที่แล้ว';
    const dutyText = isNoDuty ? '— (ยังไม่มีหน้าที่) —' : st.duty;

    row.values = [
      idx + 1,
      st.roomFull || `ม.${st.grade}/${st.room || '-'}`,
      st.classNo || '-',
      st.id || '',
      st.name || '',
      st.gender || (st.name && st.name.startsWith('เด็กหญิง') || st.name && st.name.startsWith('นางสาว') ? 'ญ' : 'ช'),
      dutyText,
      statusText,
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
    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

    // Styling & Highlight
    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;

      if (isNoDuty) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } }; // Soft Yellow Highlight
        if (c === 7 || c === 8) {
          cell.font = { name: 'TH Sarabun New', size: 12.5, bold: true, color: { argb: 'FFB45309' } }; // Amber Bold
        } else {
          cell.font = { name: 'TH Sarabun New', size: 12.5, color: { argb: 'FF000000' } };
        }
      } else {
        cell.font = { name: 'TH Sarabun New', size: 12.5, color: { argb: 'FF000000' } };
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
        }
      }
    }
  });

  // Enable AutoFilter
  ws.autoFilter = `A4:I${4 + students.length}`;
}

// -------------------------------------------------------------
// 2. Generate PDF Files
// -------------------------------------------------------------
function renderPdfHtml(cfg, students, hasDutyCount, noDutyCount) {
  const rows = students.map((st, idx) => {
    const isNoDuty = hasNoDuty(st);
    const gender = st.gender || (st.name && st.name.startsWith('เด็กหญิง') || st.name && st.name.startsWith('นางสาว') ? 'ญ' : 'ช');
    const dutyText = isNoDuty ? '<span class="text-noduty font-bold">⚠️ ยังไม่มีหน้าที่</span>' : (st.duty || '-');
    const statusBadge = isNoDuty
      ? '<span class="badge-noduty">ยังไม่มีหน้าที่</span>'
      : '<span class="badge-hasduty">มีหน้าที่แล้ว</span>';

    return `
      <tr class="${isNoDuty ? 'row-noduty' : (idx % 2 === 1 ? 'row-even' : '')}">
        <td class="center font-mono">${idx + 1}</td>
        <td class="center font-bold">${st.roomFull || `ม.${st.grade}/${st.room || '-'}`}</td>
        <td class="center font-mono">${st.classNo || '-'}</td>
        <td class="center font-mono font-bold">${st.id || ''}</td>
        <td class="left">${st.name || ''}</td>
        <td class="center">${gender}</td>
        <td class="left">${dutyText}</td>
        <td class="center">${statusBadge}</td>
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
          font-size: 10.5px;
          line-height: 1.2;
          margin: 0;
          padding: 0;
        }
        .header-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.4;
          padding-top: 2px;
          margin-bottom: 6px;
          color: #c2410c;
        }
        .kpi-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 6px;
          padding: 6px 12px;
          margin-bottom: 10px;
          font-size: 11px;
          font-weight: 600;
          color: #1e293b;
        }
        .kpi-tag {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
        }
        .tag-total { background: #e0f2fe; color: #0369a1; }
        .tag-duty { background: #dcfce7; color: #15803d; }
        .tag-noduty { background: #fef08a; color: #b45309; border: 1px solid #facc15; }

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
          font-size: 10.5px;
          color: #000000;
        }
        .roster-table th {
          font-weight: 700;
          text-align: center;
          background-color: #ea580c !important;
          color: #ffffff !important;
          padding-top: 4px;
          padding-bottom: 4px;
          font-size: 11px;
        }
        .row-even td {
          background-color: #fafafa;
        }
        .row-noduty td {
          background-color: #fef08a !important; /* Soft Yellow Highlight */
        }
        .text-noduty {
          color: #b45309;
        }
        .badge-noduty {
          display: inline-block;
          background: #f59e0b;
          color: #ffffff;
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 9.5px;
          font-weight: 700;
        }
        .badge-hasduty {
          display: inline-block;
          background: #10b981;
          color: #ffffff;
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 9.5px;
          font-weight: 600;
        }
        .center { text-align: center; }
        .left { text-align: left; padding-left: 5px !important; }
        .font-bold { font-weight: 700; }
        .font-mono { font-family: monospace; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header-title">${cfg.title}</div>
      <div class="kpi-banner">
        <div>👥 รวมทั้งหมด: <span class="kpi-tag tag-total">${students.length} คน</span></div>
        <div>✅ มีหน้าที่แล้ว: <span class="kpi-tag tag-duty">${hasDutyCount} คน</span></div>
        <div>⚠️ ยังไม่มีหน้าที่: <span class="kpi-tag tag-noduty">${noDutyCount} คน</span></div>
      </div>
      <table class="roster-table">
        <colgroup>
          <col style="width: 5%;">
          <col style="width: 8.5%;">
          <col style="width: 6%;">
          <col style="width: 12%;">
          <col style="width: 25%;">
          <col style="width: 5.5%;">
          <col style="width: 23%;">
          <col style="width: 15%;">
        </colgroup>
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>ชั้น/ห้อง</th>
            <th>เลขที่</th>
            <th>รหัสประจำตัว</th>
            <th style="text-align: left; padding-left: 6px;">ชื่อ - นามสกุล</th>
            <th>เพศ</th>
            <th style="text-align: left; padding-left: 6px;">หน้าที่ / ฝ่ายที่ได้รับมอบหมาย</th>
            <th>สถานะ</th>
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
  console.log('📕 กำลังสร้างไฟล์ PDF แยกรายชั้น ม.1 - ม.6 (ไฮไลต์ผู้ไม่มีหน้าที่)...');

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
  console.log('║ 🌟 เริ่มต้นสร้างเอกสารรายชื่อ ม.1-ม.6 ไฮไลต์ผู้ที่ยังไม่มีหน้าที่    ║');
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
