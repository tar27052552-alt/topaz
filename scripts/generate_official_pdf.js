const puppeteer = require('puppeteer');
const fs = require('fs');

const masterList = JSON.parse(fs.readFileSync('data/students_master.json', 'utf8'));

const totalStudents = masterList.length;
const maleTotal = masterList.filter(s => s.gender === 'ชาย').length;
const femaleTotal = masterList.filter(s => s.gender === 'หญิง').length;
const assignedTotal = masterList.filter(s => s.duty && s.duty.trim() !== '' && s.duty.trim() !== '-').length;

const nowTh = new Date().toLocaleDateString('th-TH', {
  year: 'numeric', month: 'long', day: 'numeric'
});

const gradeRowsSummaryHtml = [1, 2, 3, 4, 5, 6].map(g => {
  const list = masterList.filter(s => s.grade === g);
  const m = list.filter(s => s.gender === 'ชาย').length;
  const f = list.filter(s => s.gender === 'หญิง').length;
  const assigned = list.filter(s => s.duty && s.duty.trim() !== '' && s.duty.trim() !== '-').length;
  return `
    <tr>
      <td style="text-align: left; padding: 6px 12px; font-weight: 500;">มัธยมศึกษาปีที่ ${g}</td>
      <td style="text-align: center; padding: 6px 8px; font-weight: 700;">${list.length}</td>
      <td style="text-align: center; padding: 6px 8px;">${m}</td>
      <td style="text-align: center; padding: 6px 8px;">${f}</td>
      <td style="text-align: center; padding: 6px 8px; font-weight: 700; color: #ea580c;">${assigned}</td>
    </tr>
  `;
}).join('');

let pagesHtml = '';

// Page 1 Cover
pagesHtml += `
  <div class="pdf-page cover-page">
    <div class="pdf-header-card">
      <div class="pdf-badge-tag">ทำเนียบรายชื่อนักเรียน</div>
      <h1 class="pdf-main-title">คณะสีแสด (สีบุษราคัม) ประจำปีการศึกษา 2569</h1>
      <div class="pdf-sub-title">โรงเรียนสรรพวิทยาคม ตาก | การแข่งขันกีฬา-กรีฑาสีภายใน</div>
    </div>
    <div class="pdf-stat-grid">
      <div class="pdf-stat-box">
        <div class="pdf-stat-num">${totalStudents}</div>
        <div class="pdf-stat-lbl">นักเรียนทั้งหมด (คน)</div>
      </div>
      <div class="pdf-stat-box">
        <div class="pdf-stat-num">${maleTotal}</div>
        <div class="pdf-stat-lbl">นักเรียนชาย (คน)</div>
      </div>
      <div class="pdf-stat-box">
        <div class="pdf-stat-num">${femaleTotal}</div>
        <div class="pdf-stat-lbl">นักเรียนหญิง (คน)</div>
      </div>
      <div class="pdf-stat-box">
        <div class="pdf-stat-num text-orange">${assignedTotal}</div>
        <div class="pdf-stat-lbl">ผู้มีหน้าที่ / นักกีฬา / สตาฟ (คน)</div>
      </div>
    </div>
    <div class="pdf-section-title">📊 สรุปยอดจำนวนนักเรียนแยกตามระดับชั้น</div>
    <table class="pdf-summary-table">
      <thead>
        <tr>
          <th style="text-align: left; width: 30%;">ระดับชั้น</th>
          <th style="width: 17%;">จำนวนนักเรียน (คน)</th>
          <th style="width: 17%;">ชาย (คน)</th>
          <th style="width: 17%;">หญิง (คน)</th>
          <th style="width: 19%;">นักกีฬา / สตาฟ / ผู้มีหน้าที่ (คน)</th>
        </tr>
      </thead>
      <tbody>
        ${gradeRowsSummaryHtml}
        <tr class="pdf-summary-total-row">
          <td style="text-align: left; font-weight: 700;">รวมทุกระดับชั้น</td>
          <td style="text-align: center; font-weight: 700;">${totalStudents}</td>
          <td style="text-align: center; font-weight: 700;">${maleTotal}</td>
          <td style="text-align: center; font-weight: 700;">${femaleTotal}</td>
          <td style="text-align: center; font-weight: 700; color: #ea580c;">${assignedTotal}</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top: 40px; text-align: right; color: #94a3b8; font-size: 11px;">
      เอกสารสรุปยอดอย่างเป็นทางการ คณะสีแสด 2569 • พิมพ์เมื่อ ${nowTh}
    </div>
  </div>
`;

// Pages 2+: Grade by Grade
[1, 2, 3, 4, 5, 6].forEach(g => {
  const gradeStudents = masterList.filter(s => s.grade === g);
  gradeStudents.sort((a, b) => {
    if (a.room !== b.room) return (a.room || 0) - (b.room || 0);
    return (parseInt(a.classNo) || 0) - (parseInt(b.classNo) || 0);
  });

  const gMale = gradeStudents.filter(s => s.gender === 'ชาย').length;
  const gFemale = gradeStudents.filter(s => s.gender === 'หญิง').length;
  const gAssigned = gradeStudents.filter(s => s.duty && s.duty.trim() !== '' && s.duty.trim() !== '-').length;

  const pageSize = 42;
  const totalPages = Math.ceil(gradeStudents.length / pageSize);

  for (let p = 0; p < totalPages; p++) {
    const chunk = gradeStudents.slice(p * pageSize, (p + 1) * pageSize);
    const rows = chunk.map((s, idx) => `
      <tr>
        <td class="center font-bold">${p * pageSize + idx + 1}</td>
        <td class="center font-bold text-orange">${s.roomFull || `ม.${s.grade}/${s.room || '-'}`}</td>
        <td class="center">${s.classNo || '-'}</td>
        <td class="center font-mono">${s.id}</td>
        <td class="left font-bold">${s.name}</td>
        <td class="center">${s.gender || '-'}</td>
        <td class="left text-orange font-bold">${s.duty || '<span style="color:#cbd5e1; font-weight:normal;">-</span>'}</td>
        <td class="center font-mono">${s.phone || '-'}</td>
      </tr>
    `).join('');

    const pageSubtitle = totalPages > 1 ? ` (หน้า ${p + 1}/${totalPages})` : '';

    pagesHtml += `
      <div class="pdf-page">
        <div class="pdf-grade-header">
          <div>
            <h2 class="pdf-grade-title">รายชื่อนักเรียน คณะสีแสด — ระดับชั้นมัธยมศึกษาปีที่ ${g}${pageSubtitle}</h2>
            <div class="pdf-grade-sub">จำนวนนักเรียน: ${gradeStudents.length} คน | ชาย ${gMale} คน | หญิง ${gFemale} คน | ผู้มีหน้าที่ ${gAssigned} คน</div>
          </div>
          <div class="pdf-grade-badge">ม.${g}</div>
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
    `;
  }
});

const fullHtml = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>รายชื่อคณะสีแสด_ปี69</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Prompt:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 10mm 8mm 10mm 8mm; }
    * { box-sizing: border-box; font-family: 'Sarabun', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #ffffff; color: #0f172a; font-size: 10.5px; line-height: 1.25; margin: 0; padding: 0; }
    .pdf-page { background: #ffffff; width: 100%; box-sizing: border-box; page-break-after: always; break-after: page; }
    .pdf-page:last-child { page-break-after: auto; break-after: auto; }
    .pdf-header-card { background-color: #fff3e0 !important; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px; border-left: 6px solid #ea580c; }
    .pdf-badge-tag { display: inline-block; background-color: #ea580c !important; color: #ffffff !important; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 6px; margin-bottom: 6px; }
    .pdf-main-title { font-family: 'Prompt', sans-serif; font-size: 20px; font-weight: 800; color: #c2410c; margin: 0 0 2px 0; }
    .pdf-sub-title { font-size: 12px; color: #78716c; }
    .pdf-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .pdf-stat-box { background-color: #ffffff !important; border: 1.5px solid #fed7aa; border-radius: 10px; padding: 12px 8px; text-align: center; }
    .pdf-stat-num { font-family: 'Prompt', sans-serif; font-size: 24px; font-weight: 800; color: #ea580c; line-height: 1; margin-bottom: 4px; }
    .pdf-stat-lbl { font-size: 11px; color: #57534e; font-weight: 600; }
    .pdf-section-title { font-family: 'Prompt', sans-serif; font-size: 14px; font-weight: 700; color: #292524; margin-bottom: 8px; }
    .pdf-summary-table { width: 100%; border-collapse: collapse; }
    .pdf-summary-table th { background-color: #ea580c !important; color: #ffffff !important; font-family: 'Prompt', sans-serif; font-size: 11px; font-weight: 700; padding: 6px 8px; border: 1px solid #c2410c; text-align: center; }
    .pdf-summary-table td { border: 1px solid #e7e5e4; padding: 5px 8px; font-size: 11px; }
    .pdf-summary-table tbody tr:nth-child(even) td { background-color: #fafaf9 !important; }
    .pdf-summary-total-row td { background-color: #ffedd5 !important; border-top: 2px solid #ea580c; }
    .pdf-grade-header { display: flex; justify-content: space-between; align-items: center; background-color: #fff3e0 !important; padding: 8px 14px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #ea580c; }
    .pdf-grade-title { font-family: 'Prompt', sans-serif; font-size: 14px; font-weight: 800; color: #c2410c; margin: 0; }
    .pdf-grade-sub { font-size: 11px; color: #78716c; margin-top: 1px; }
    .pdf-grade-badge { background-color: #ea580c !important; color: #ffffff !important; font-family: 'Prompt', sans-serif; font-weight: 800; font-size: 14px; padding: 4px 12px; border-radius: 6px; }
    .pdf-roster-table { width: 100%; border-collapse: collapse; }
    .pdf-roster-table th { background-color: #ea580c !important; color: #ffffff !important; font-family: 'Prompt', sans-serif; font-size: 10.5px; font-weight: 700; padding: 5px 4px; border: 1px solid #c2410c; text-align: center; }
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
  ${pagesHtml}
</body>
</html>
`;

async function generate() {
  console.log('🚀 Launching Puppeteer to render High-Resolution Official PDF...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  const pdfPath = 'เอกสารและรายชื่อคณะสีแสด_ปี69/รายชื่อคณะสีแสด_ปี69.pdf';
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' }
  });

  await browser.close();
  console.log('🎉 Successfully generated high-resolution PDF at:', pdfPath);
}

generate().catch(console.error);
