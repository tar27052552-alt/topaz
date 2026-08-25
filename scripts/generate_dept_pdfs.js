const puppeteer = require('puppeteer');
const fs = require('fs');

const masterList = JSON.parse(fs.readFileSync('data/students_master.json', 'utf8'));

const depts = [
  { name: 'ฝ่ายสแตนเชียร์', filter: 'สแตนเชียร์', folder: 'เอกสารและรายชื่อคณะสีแสด_ปี69/แยกฝ่าย/สแตนเชียร์', file: 'รายชื่อฝ่ายสแตนเชียร์_คณะสีแสด_ปี69.pdf' },
  { name: 'ฝ่ายขบวนพาเหรด', filter: 'ขบวนพาเหรด', folder: 'เอกสารและรายชื่อคณะสีแสด_ปี69/แยกฝ่าย/พร็อพ', file: 'รายชื่อฝ่ายขบวนพาเหรด_คณะสีแสด_ปี69.pdf' },
  { name: 'ฝ่ายอุปกรณ์และพร็อพ', filter: 'พร็อพ', folder: 'เอกสารและรายชื่อคณะสีแสด_ปี69/แยกฝ่าย/พร็อพ', file: 'รายชื่อฝ่ายอุปกรณ์และพร็อพ_คณะสีแสด_ปี69.pdf' },
  { name: 'ฝ่ายเชียร์ลีดเดอร์', filter: 'เชียร์ลีดเดอร์', folder: 'เอกสารและรายชื่อคณะสีแสด_ปี69/แยกฝ่าย/เชียร์ลีดเดอร์', file: 'รายชื่อฝ่ายเชียร์ลีดเดอร์_คณะสีแสด_ปี69.pdf' },
  { name: 'ฝ่ายดรัมเมเยอร์', filter: 'ดรัมเมเยอร์', folder: 'เอกสารและรายชื่อคณะสีแสด_ปี69/แยกฝ่าย/ดรัมเมเยอร์', file: 'รายชื่อฝ่ายดรัมเมเยอร์_คณะสีแสด_ปี69.pdf' },
  { name: 'ฝ่ายคัลเลอร์การ์ด', filter: 'คัลเลอร์การ์ด', folder: 'เอกสารและรายชื่อคณะสีแสด_ปี69/แยกฝ่าย/ดรัมเมเยอร์', file: 'รายชื่อฝ่ายคัลเลอร์การ์ด_คณะสีแสด_ปี69.pdf' },
  { name: 'ฝ่ายสวัสดิการ', filter: 'สวัสดิการ', folder: 'เอกสารและรายชื่อคณะสีแสด_ปี69/แยกฝ่าย/สวัสดิการ', file: 'รายชื่อฝ่ายสวัสดิการ_คณะสีแสด_ปี69.pdf' },
  { name: 'ฝ่ายสตาฟ (ม.5)', filter: 'สตาฟ', folder: 'เอกสารและรายชื่อคณะสีแสด_ปี69/แยกฝ่าย/สตาฟ', file: 'รายชื่อฝ่ายสตาฟ_คณะสีแสด_ปี69.pdf' },
  { name: 'รายชื่อนักกีฬาทุกประเภท', filter: 'กีฬา_ALL', folder: 'เอกสารและรายชื่อคณะสีแสด_ปี69/แยกฝ่าย/กีฬา', file: 'รายชื่อนักกีฬาทุกประเภท_คณะสีแสด_ปี69.pdf' }
];

async function generateAllDeptPDFs() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  for (const dept of depts) {
    let students = [];
    if (dept.filter === 'กีฬา_ALL') {
      const sportsKeywords = ['ฟุตบอล', 'บาสเกตบอล', 'วอลเลย์บอล', 'ตะกร้อ', 'เปตอง', 'กรีฑา', '16 ขา'];
      students = masterList.filter(s => sportsKeywords.some(k => (s.duty || '').includes(k)));
    } else {
      students = masterList.filter(s => (s.duty || '').includes(dept.filter));
    }

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
          body { background: #fff; color: #0f172a; font-size: 10.5px; line-height: 1.25; margin: 0; padding: 0; }
          .pdf-page { width: 100%; box-sizing: border-box; }
          .pdf-grade-header { display: flex; justify-content: space-between; align-items: center; background-color: #fff3e0 !important; padding: 10px 16px; border-radius: 10px; margin-bottom: 12px; border-left: 5px solid #ea580c; }
          .pdf-grade-title { font-family: 'Prompt', sans-serif; font-size: 16px; font-weight: 800; color: #c2410c; margin: 0; }
          .pdf-grade-sub { font-size: 11.5px; color: #78716c; margin-top: 2px; }
          .pdf-grade-badge { background-color: #ea580c !important; color: #fff !important; font-family: 'Prompt', sans-serif; font-weight: 800; font-size: 13px; padding: 4px 12px; border-radius: 6px; }
          .pdf-roster-table { width: 100%; border-collapse: collapse; }
          .pdf-roster-table th { background-color: #ea580c !important; color: #fff !important; font-family: 'Prompt', sans-serif; font-size: 10.5px; font-weight: 700; padding: 5px 4px; border: 1px solid #c2410c; text-align: center; }
          .pdf-roster-table td { border: 1px solid #e7e5e4; padding: 3.8px 4px; font-size: 10px; vertical-align: middle; }
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
    const fullOutPath = dept.folder + '/' + dept.file;

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: fullOutPath, format: 'A4', printBackground: true, margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' } });
    await page.close();
    console.log(`✅ Generated PDF: ${fullOutPath} (${students.length} students)`);
  }

  await browser.close();
  console.log('🎉 All department PDFs generated successfully!');
}

generateAllDeptPDFs().catch(console.error);
