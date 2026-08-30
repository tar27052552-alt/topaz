const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function getThaiDateString() {
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const now = new Date();
  const d = now.getDate();
  const m = thaiMonths[now.getMonth()];
  const y = now.getFullYear() + 543;
  return `${d} ${m} ${y}`;
}

async function generateCoverSummaryPDF() {
  const rootDir = path.resolve(__dirname, '..');
  const masterPath = path.join(rootDir, 'data', 'students_master.json');
  const students = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

  const totalStudents = students.length;
  const withDuty = students.filter(s => s.duty && s.duty !== '-' && s.duty !== 'ไม่มีหน้าที่').length;

  const deptCounts = [
    { no: '01', icon: '🎪', name: 'ฝ่ายสแตนเชียร์ (ม.1)', count: students.filter(s => (s.duty || '').includes('สแตนเชียร์')).length, page: '2-3' },
    { no: '02', icon: '🚩', name: 'ฝ่ายขบวนพาเหรด', count: students.filter(s => ((s.duty || '').includes('ขบวน') || (s.duty || '').includes('พาเหรด')) && !(s.duty || '').includes('พร็อพ')).length, page: '4-5' },
    { no: '03', icon: '🎨', name: 'ฝ่ายพร็อพ & อุปกรณ์', count: students.filter(s => (s.duty || '').includes('พร็อพ') || (s.duty || '').includes('อุปกรณ์')).length, page: '6' },
    { no: '04', icon: '📣', name: 'ฝ่ายเชียร์ลีดเดอร์', count: students.filter(s => (s.duty || '').includes('เชียร์ลีดเดอร์') || (s.duty || '').includes('หลีด')).length, page: '7' },
    { no: '05', icon: '🥁', name: 'ฝ่ายดรัมเมเยอร์', count: students.filter(s => (s.duty || '').includes('ดรัม')).length, page: '8' },
    { no: '06', icon: '🚩', name: 'ฝ่ายคัลเลอร์การ์ด', count: students.filter(s => (s.duty || '').includes('คัลเลอร์')).length, page: '9' },
    { no: '07', icon: '🍵', name: 'ฝ่ายสวัสดิการ', count: students.filter(s => (s.duty || '').includes('สวัสดิการ')).length, page: '10' },
    { no: '08', icon: '👑', name: 'ฝ่ายสตาฟและคณะกรรมการ (ม.5)', count: students.filter(s => (s.duty || '').includes('สตาฟ') || (s.duty || '').includes('ประธาน') || (s.duty || '').includes('หัวหน้า') || (s.duty || '').includes('เหรัญญิก') || (s.duty || '').includes('เฮด')).length, page: '11-12' }
  ];

  const sportCounts = [
    { no: '09', icon: '⚽', name: 'ฟุตบอล (ชาย ม.ต้น/ปลาย, หญิง)', count: students.filter(s => (s.duty || '').includes('ฟุตบอล')).length, page: '13-15' },
    { no: '10', icon: '🏀', name: 'บาสเกตบอล (ชาย/หญิง)', count: students.filter(s => (s.duty || '').includes('บาสเกตบอล')).length, page: '16-17' },
    { no: '11', icon: '🏐', name: 'วอลเลย์บอล (ชาย/หญิง)', count: students.filter(s => (s.duty || '').includes('วอลเลย์บอล')).length, page: '18-19' },
    { no: '12', icon: '🏸', name: 'ตะกร้อ (ทีมชาย)', count: students.filter(s => (s.duty || '').includes('ตะกร้อ')).length, page: '20' },
    { no: '13', icon: '⚪', name: 'เปตอง (ม.ต้น / ม.ปลาย)', count: students.filter(s => (s.duty || '').includes('เปตอง')).length, page: '21' },
    { no: '14', icon: '🏃', name: 'กรีฑา (ลู่/ลาน)', count: students.filter(s => (s.duty || '').includes('กรีฑา')).length, page: '22' },
    { no: '15', icon: '🏃‍♂️', name: 'วิ่ง 16 ขา (ทีมผสม)', count: students.filter(s => (s.duty || '').includes('16 ขา')).length, page: '23' }
  ];

  const totalSportsPersons = sportCounts.reduce((sum, item) => sum + item.count, 0);
  const thaiDate = getThaiDateString();

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>หน้าสรุปภาพรวมคณะสีแสด 2569</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=Prompt:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 8mm 8mm; }
        * { box-sizing: border-box; font-family: 'Sarabun', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { background: #fff; color: #0f172a; font-size: 10px; margin: 0; padding: 0; line-height: 1.25; }
        .cover-container { width: 100%; height: 100%; border: 2px solid #fdba74; border-radius: 12px; padding: 14px 18px; position: relative; background: #ffffff; }
        
        .header-box { text-align: center; border-bottom: 2.5px solid #ea580c; padding-bottom: 10px; margin-bottom: 12px; }
        .badge-pill { display: inline-block; background: #fff7ed; color: #c2410c; border: 1.5px solid #fb923c; font-family: 'Prompt', sans-serif; font-size: 11px; font-weight: 800; padding: 3px 14px; border-radius: 20px; margin-bottom: 4px; }
        .main-title { font-family: 'Prompt', sans-serif; font-size: 20px; font-weight: 900; color: #c2410c; margin: 2px 0; letter-spacing: -0.3px; }
        .sub-title { font-size: 12px; color: #475569; font-weight: 600; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
        .stat-card { background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 8px; padding: 8px 10px; text-align: center; }
        .stat-num { font-family: 'Prompt', sans-serif; font-size: 18px; font-weight: 900; color: #ea580c; line-height: 1; }
        .stat-label { font-size: 10px; font-weight: 700; color: #475569; margin-top: 3px; }
        
        .content-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
        .section-header { font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 800; color: #ffffff; background: #ea580c; padding: 5px 10px; border-radius: 6px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
        
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .data-table th { background: #ffedd5; color: #9a3412; font-family: 'Prompt', sans-serif; font-size: 9.5px; font-weight: 800; padding: 4px 6px; border: 1px solid #fed7aa; text-align: center; }
        .data-table td { padding: 3.8px 6px; border: 1px solid #f1f5f9; font-size: 9.5px; vertical-align: middle; }
        .data-table tr:nth-child(even) td { background: #fafaf9; }
        .data-table td.name { font-weight: 700; color: #1e293b; }
        .data-table td.count { text-align: center; font-family: 'Prompt', sans-serif; font-weight: 800; color: #ea580c; }
        .data-table td.page { text-align: center; color: #64748b; font-family: monospace; font-size: 9.5px; }

        .footer-banner { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; margin-top: 6px; }
        .footer-bold { font-weight: 700; color: #0f172a; }
      </style>
    </head>
    <body>
      <div class="cover-container">
        
        <!-- Header -->
        <div class="header-box">
          <div class="badge-pill">🧡 คณะสีแสด • สีบุษราคัม (Topaz 69) โรงเรียนสรรพวิทยาคม</div>
          <h1 class="main-title">เอกสารสรุปยอดและรายชื่อแยกฝ่าย — กีฬาสี ประจำปี 2569</h1>
          <div class="sub-title">สรุปจำนวนผู้เข้าร่วมกิจกรรมทุกฝ่ายและประเภทกีฬา พร้อมสารบัญเอกสารรวมเล่ม</div>
        </div>

        <!-- KPI Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-num">${totalStudents} คน</div>
            <div class="stat-label">สมาชิกคณะสีแสด ม.1-ม.6</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">${withDuty} คน</div>
            <div class="stat-label">ลงทะเบียนปฏิบัติหน้าที่/กีฬา</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">8 ฝ่าย</div>
            <div class="stat-label">ฝ่ายกิจกรรมและงานขบวน</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">7 ชนิด</div>
            <div class="stat-label">ประเภทกีฬาและกรีฑา</div>
          </div>
        </div>

        <!-- Content Grid (2 Columns) -->
        <div class="content-columns">
          
          <!-- Column 1: Departments -->
          <div>
            <div class="section-header">
              <span>🎪 ฝ่ายกิจกรรมหลัก (8 ฝ่าย)</span>
              <span>สารบัญหน้า</span>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 10%;">ที่</th>
                  <th style="width: 60%; text-align: left; padding-left: 8px;">ฝ่าย / กิจกรรม</th>
                  <th style="width: 15%;">จำนวน</th>
                  <th style="width: 15%;">หน้า</th>
                </tr>
              </thead>
              <tbody>
                ${deptCounts.map(d => `
                  <tr>
                    <td style="text-align: center; color: #64748b; font-weight: bold;">${d.no}</td>
                    <td class="name">${d.icon} ${d.name}</td>
                    <td class="count">${d.count}</td>
                    <td class="page">น. ${d.page}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Column 2: Sports -->
          <div>
            <div class="section-header">
              <span>⚽ ฝ่ายกีฬา & กรีฑา (7 ชนิดกีฬา)</span>
              <span>สารบัญหน้า</span>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 10%;">ที่</th>
                  <th style="width: 60%; text-align: left; padding-left: 8px;">ประเภทกีฬา</th>
                  <th style="width: 15%;">จำนวน</th>
                  <th style="width: 15%;">หน้า</th>
                </tr>
              </thead>
              <tbody>
                ${sportCounts.map(s => `
                  <tr>
                    <td style="text-align: center; color: #64748b; font-weight: bold;">${s.no}</td>
                    <td class="name">${s.icon} ${s.name}</td>
                    <td class="count">${s.count}</td>
                    <td class="page">น. ${s.page}</td>
                  </tr>
                `).join('')}
                <tr style="background: #fff7ed; font-weight: bold;">
                  <td colspan="2" style="text-align: right; padding-right: 8px; color: #c2410c;">รวมนักกีฬาทุกประเภท:</td>
                  <td class="count" style="color: #c2410c;">${totalSportsPersons}</td>
                  <td class="page">น. 13-23</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        <!-- Footer -->
        <div class="footer-banner">
          <div>📌 <span class="footer-bold">ระบบรับสมัครและจัดการรายชื่อออนไลน์ คณะสีแสด 69</span> | โรงเรียนสรรพวิทยาคม</div>
          <div>อัปเดตข้อมูลล่าสุด: <span class="footer-bold">${thaiDate}</span> • เอกสารรวมทั้งหมด 23 หน้า</div>
        </div>

      </div>
    </body>
    </html>
  `;

  const coverOutPath = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'รวมไฟล์PDF_พร้อมส่ง', '00_หน้าปกสรุปยอดแยกฝ่าย_คณะสีแสด_ปี69.pdf');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const pdfBuf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' }
  });
  await page.close();
  await browser.close();

  fs.writeFileSync(coverOutPath, pdfBuf);
  console.log(`✅ [หน้าปกสรุป] สร้างสำเร็จ: ${coverOutPath}`);
  return coverOutPath;
}

if (require.main === module) {
  generateCoverSummaryPDF().catch(console.error);
}

module.exports = { generateCoverSummaryPDF };
