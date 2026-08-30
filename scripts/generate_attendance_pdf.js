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
      <td class="center">${idx + 1}</td>
      <td class="center">${st.roomFull || `ม.${st.grade}/${st.room || '-'}`}</td>
      <td class="center">${st.id || ''}</td>
      <td class="left">${st.name || ''}</td>
      <td class="center">${st.phone || ''}</td>
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
          color: #1e293b;
          font-size: 11.5px;
          line-height: 1.2;
          margin: 0;
          padding: 0;
        }
        .header-title {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: ${group.mentorBox ? '6px' : '14px'};
          color: #0f172a;
        }
        .mentor-box {
          display: flex;
          justify-content: space-between;
          border: 0.5px solid #64748b;
          background: #f8fafc;
          border-radius: 4px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 10px;
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
          border: 0.5px solid #475569;
          padding: 4px 2px;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
          background-color: #ffffff;
          color: #0f172a;
          vertical-align: middle;
        }
        .roster-table td {
          border: 0.5px solid #64748b;
          padding: 3.5px 4px;
          font-size: 11px;
          font-weight: 400;
          color: #1e293b;
          vertical-align: middle;
        }
        .center { text-align: center; }
        .left { text-align: left; padding-left: 6px !important; }
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
  console.log('║ 📕 เริ่มต้นสร้างไฟล์ PDF ใบเช็คชื่อ (ฟอนต์ Sarabun เส้นคมบาง 0.5px)   ║');
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
