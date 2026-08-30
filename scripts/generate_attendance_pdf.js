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
      <td class="center font-bold">${idx + 1}</td>
      <td class="center font-bold">${st.roomFull || `ม.${st.grade}/${st.room || '-'}`}</td>
      <td class="center font-mono">${st.id || ''}</td>
      <td class="left font-name">${st.name || ''}</td>
      <td class="center font-mono font-phone">${st.phone || ''}</td>
      <td class="center"></td>
      <td class="check-col"></td>
      <td class="check-col"></td>
      <td class="check-col"></td>
      <td class="check-col"></td>
      <td class="check-col"></td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>${group.title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@600;700;800&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 10mm 12mm 10mm;
        }
        * {
          box-sizing: border-box;
          font-family: 'Sarabun', sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          background: #ffffff;
          color: #000000;
          font-size: 11px;
          line-height: 1.25;
          margin: 0;
          padding: 0;
        }
        .header-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: ${group.mentorBox ? '6px' : '14px'};
          color: #000000;
        }
        .mentor-box {
          display: flex;
          justify-content: space-between;
          border: 1px dashed #64748b;
          background: #f8fafc;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 10.5px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .roster-table {
          width: 100%;
          border-collapse: collapse;
          page-break-inside: auto;
        }
        .roster-table thead {
          display: table-header-group;
        }
        .roster-table tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        .roster-table th {
          border: 1px solid #000000;
          padding: 4px 2px;
          font-size: 10.5px;
          font-weight: 700;
          text-align: center;
          background-color: #ffffff;
          vertical-align: middle;
        }
        .roster-table td {
          border: 1px solid #000000;
          padding: 4px 4px;
          font-size: 10.5px;
          vertical-align: middle;
        }
        .center { text-align: center; }
        .left { text-align: left; padding-left: 6px !important; }
        .font-bold { font-weight: 700; }
        .font-name { font-weight: 500; }
        .font-mono { font-family: monospace; font-size: 10.5px; }
        .font-phone { font-size: 10px; }
        .check-col { width: 4.8%; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header-title">${group.title}</div>
      ${group.mentorBox ? `
        <div class="mentor-box">
          <div>👨‍🏫 พ่อครู/แม่ครู (ครูที่ปรึกษา): ................................................................</div>
          <div>👑 พี่สตาฟผู้ดูแล: ................................................................</div>
          <div>👥 รวม ${students.length} คน</div>
        </div>
      ` : ''}
      <table class="roster-table">
        <thead>
          <tr>
            <th style="width: 5.5%;" rowspan="2">ลำดับ</th>
            <th style="width: 8.5%;" rowspan="2">ชั้น/ห้อง</th>
            <th style="width: 12.5%;" rowspan="2">รหัสประจำตัว</th>
            <th style="width: 31%; text-align: left; padding-left: 8px;" rowspan="2">ชื่อ - นามสกุล</th>
            <th style="width: 14.5%;" rowspan="2">เบอร์โทรศัพท์</th>
            <th style="width: 9%;" rowspan="2">ชื่อเล่น</th>
            <th style="width: 24%;" colspan="5">เช็คชื่อ</th>
          </tr>
          <tr>
            <th class="check-col">1</th>
            <th class="check-col">2</th>
            <th class="check-col">3</th>
            <th class="check-col">4</th>
            <th class="check-col">5</th>
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
  console.log('║ 📕 เริ่มต้นสร้างไฟล์ PDF ใบเช็คชื่อ ทุกฝ่าย ทุก ม. ทุกกลุ่มพ่อครูแม่ครู ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

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

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }
    });
    await page.close();

    fs.writeFileSync(outPdfPath, pdfBuf);
    console.log(`  ✅ สร้างไฟล์ PDF สำเร็จ: ${group.pdfFileName} (${students.length} คน) -> ${(pdfBuf.length / 1024).toFixed(1)} KB`);
  }

  await browser.close();

  // Merge into single booklet
  const { mergeAttendancePDFs } = require('./merge_attendance_pdfs');
  await mergeAttendancePDFs();
}

if (require.main === module) {
  generateAttendancePDFs().catch(console.error);
}

module.exports = { generateAttendancePDFs };
