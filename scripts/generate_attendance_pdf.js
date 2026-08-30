const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const studentsMaster = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'students_master.json'), 'utf8'));

const outBaseDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'ใบเช็คชื่อ');
const outPdfDir = path.join(outBaseDir, 'ไฟล์PDF');

if (!fs.existsSync(outPdfDir)) {
  fs.mkdirSync(outPdfDir, { recursive: true });
}

const { attendanceGroups } = require('./generate_attendance_excel');

function renderHTML(group, students) {
  const rows = students.map((st, idx) => `
    <tr>
      <td class="center font-mono">${idx + 1}</td>
      <td class="center font-bold">${st.roomFull || `ม.${st.grade}/${st.room || '-'}`}</td>
      <td class="center font-mono">${st.id || ''}</td>
      <td class="left">${st.name || ''}</td>
      <td class="center font-mono">${st.phone || ''}</td>
      <td class="center"></td>
      <td class="center"></td>
      <td class="center"></td>
      <td class="center"></td>
      <td class="center"></td>
      <td class="center"></td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>${group.title}</title>
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
          font-size: 17px;
          font-weight: 700;
          line-height: 1.5;
          padding-top: 4px;
          margin-bottom: 12px;
          color: #000000;
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
          padding-top: 4px;
          padding-bottom: 4px;
        }
        .roster-table td {
          font-weight: 400;
        }
        .center { text-align: center; }
        .left { text-align: left; padding-left: 5px !important; }
        .font-bold { font-weight: 700; }
        .font-mono { font-family: monospace; font-size: 10.5px; }
      </style>
    </head>
    <body>
      <div class="header-title">${group.title}</div>
      <table class="roster-table">
        <colgroup>
          <col style="width: 5%;">
          <col style="width: 9%;">
          <col style="width: 12%;">
          <col style="width: 29%;">
          <col style="width: 15%;">
          <col style="width: 10%;">
          <col style="width: 4%;">
          <col style="width: 4%;">
          <col style="width: 4%;">
          <col style="width: 4%;">
          <col style="width: 4%;">
        </colgroup>
        <thead>
          <tr>
            <th rowspan="2">ลำดับ</th>
            <th rowspan="2">ชั้น/ห้อง</th>
            <th rowspan="2">รหัสประจำตัว</th>
            <th style="text-align: left; padding-left: 6px;" rowspan="2">ชื่อ - นามสกุล</th>
            <th rowspan="2">เบอร์โทรศัพท์</th>
            <th rowspan="2">ชื่อเล่น</th>
            <th colspan="5">เช็คชื่อ</th>
          </tr>
          <tr>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
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

async function generateAttendancePDFs() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 📕 เริ่มต้นสร้างไฟล์ PDF ใบเช็คชื่อ (เส้นคมชัดสม่ำเสมอเท่ากัน 100%)    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  for (const group of attendanceGroups) {
    let students = studentsMaster.filter(group.filter);

    students.sort((a, b) => {
      if (a.grade !== b.grade) return (a.grade || 0) - (b.grade || 0);
      if (a.room !== b.room) return (a.room || 0) - (b.room || 0);
      if (a.classNo !== b.classNo) return (parseInt(a.classNo) || 0) - (parseInt(b.classNo) || 0);
      return (a.id || '').localeCompare(b.id || '');
    });

    const html = renderHTML(group, students);
    const outPdfPath = path.join(outPdfDir, group.pdfFileName);

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }
    });

    fs.writeFileSync(outPdfPath, pdfBuf);
    console.log(`  ✅ สร้างไฟล์ PDF สำเร็จ: ${group.pdfFileName} (${students.length} คน)`);
  }

  await page.close();
  await browser.close();

  // Merge into single booklet
  const { mergeAttendancePDFs } = require('./merge_attendance_pdfs');
  await mergeAttendancePDFs();
}

if (require.main === module) {
  generateAttendancePDFs().catch(console.error);
}

module.exports = { generateAttendancePDFs };
