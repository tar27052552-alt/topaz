const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const cheerio = require('cheerio');
const { PDFParse } = require('pdf-parse');

async function main() {
  console.log('--- 1. รวบรวมข้อมูลนักเรียนจาก XLS และ PDF ---');
  const rootDir = path.resolve(__dirname, '..');
  const sourceDir = path.join(rootDir, 'ข้อมูลต้นฉบับ');
  const deptSportsDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'กีฬา');
  const outputDir = path.join(deptSportsDir, 'รายชื่อนักกีฬา_PDF');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const xlsFiles = [
    'รายชื่อ ม.1.xls', 'รายชื่อ ม.2.xls', 'รายชื่อ ม.3.xls',
    'รายชื่อ ม.4.xls', 'รายชื่อ ม.5.xls', 'รายชื่อ ม.6.xls'
  ];

  const xlsMap = new Map();
  xlsFiles.forEach(fileName => {
    const filePath = path.join(sourceDir, 'รายชื่อนักเรียนทั้งหมด', fileName);
    if (!fs.existsSync(filePath)) return;
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);

    $('table').each((i, table) => {
      const prevDesc = $(table).prevAll('.description').first().text();
      const match = prevDesc.match(/มัธยมศึกษาปีที่\s*(\d+)\s*ห้อง\s*(\d+)/);
      const grade = match ? parseInt(match[1]) : 0;
      const room = match ? parseInt(match[2]) : 0;

      $(table).find('tbody tr').each((j, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 3) {
          const noInClass = $(tds.get(0)).text().trim();
          const stdId = $(tds.get(1)).text().trim();
          const name = $(tds.get(2)).text().trim();
          if (stdId && /^\d+$/.test(stdId)) {
            xlsMap.set(stdId, {
              grade,
              room,
              classNo: parseInt(noInClass),
              stdId,
              name
            });
          }
        }
      });
    });
  });

  const pdf1Path = path.join(sourceDir, 'รายชื่อคณะสีแสด', 'รายชื่อลูกคณะสีบุษราคัม ม.ต้น 69.pdf');
  const pdf2Path = path.join(sourceDir, 'รายชื่อคณะสีแสด', 'รายชื่อลูกคณะสีบุษราคัม ม.ปลาย 69.pdf');

  const p1 = new PDFParse({ data: fs.readFileSync(pdf1Path) });
  const t1 = await p1.getText();
  const p2 = new PDFParse({ data: fs.readFileSync(pdf2Path) });
  const t2 = await p2.getText();

  const allLines = [...t1.text.split('\n'), ...t2.text.split('\n')];
  const studentMap = new Map();

  allLines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;
    const m = line.match(/^(\d+)\s+(\d{5})\s+(.*?)\s+(ม\.(\d+)\/(\d+))(.*)$/);
    if (m) {
      const [_, num, id, pdfName, roomFull, gStr, rStr, remark] = m;
      const grade = parseInt(gStr);
      const room = parseInt(rStr);
      const xls = xlsMap.get(id);

      let finalName = xls ? xls.name : pdfName.trim();
      finalName = finalName.replace(/\s*-\s*$/, '').trim();

      let gender = '-';
      if (finalName.startsWith('เด็กชาย') || finalName.startsWith('นาย')) {
        gender = 'ชาย';
      } else if (finalName.startsWith('เด็กหญิง') || finalName.startsWith('นางสาว') || finalName.startsWith('น.ส.')) {
        gender = 'หญิง';
      }

      studentMap.set(id, {
        stdId: id,
        pdfNo: parseInt(num),
        name: finalName,
        grade: grade,
        room: room,
        roomFull: `ม.${grade}/${room}`,
        classNo: xls ? xls.classNo : '-',
        gender: gender
      });
    }
  });

  function getStd(id, phone = '', note = '') {
    const s = studentMap.get(id);
    if (!s) {
      return {
        stdId: id,
        name: '-',
        roomFull: '-',
        classNo: '-',
        gender: '-',
        phone: phone,
        note: note
      };
    }
    return {
      stdId: s.stdId,
      name: s.name,
      roomFull: s.roomFull,
      classNo: s.classNo,
      gender: s.gender,
      phone: phone,
      note: note
    };
  }

  const sportsList = [
    {
      key: 'football',
      name: 'ฟุตบอล',
      icon: '⚽',
      categories: [
        {
          title: 'ทีมชาย มัธยมศึกษาตอนต้น',
          students: [
            getStd('34361', '', ''),
            getStd('34625', '', ''),
            getStd('34607', '', ''),
            getStd('34631', '', ''),
            getStd('34547', '', ''),
            getStd('34277', '', ''),
            getStd('33701', '', ''),
            getStd('33707', '', ''),
            getStd('33659', '', ''),
            getStd('33677', '', ''),
            getStd('33971', '', ''),
            getStd('33671', '', ''),
            getStd('33791', '', ''),
            getStd('34481', '', ''),
            getStd('34475', '', '')
          ]
        },
        {
          title: 'ทีมชาย มัธยมศึกษาตอนปลาย',
          students: [
            getStd('33340', '', ''),
            getStd('33005', '', ''),
            getStd('32996', '', ''),
            getStd('35413', '', ''),
            getStd('33404', '', ''),
            getStd('33353', '', ''),
            getStd('33349', '', ''),
            getStd('35523', '096-651-9248', ''),
            getStd('32972', '', '')
          ]
        },
        {
          title: 'ทีมหญิง มัธยมศึกษาตอนต้น',
          students: [
            getStd('33725', '061 983 7797', ''),
            getStd('34079', '090 285 1181', ''),
            getStd('34673', '062-320-5140', ''),
            getStd('33797', '098-539 1599', ''),
            getStd('34385', '082-804-2534', ''),
            getStd('34367', '092-837-2250', ''),
            getStd('34637', '065-065-7095', ''),
            getStd('34643', '093-3197162', ''),
            getStd('34968', '0852266457', ''),
            getStd('33839', '093-1318 108', ''),
            getStd('33845', '080 800 6634', '')
          ]
        },
        {
          title: 'ทีมหญิง มัธยมศึกษาตอนปลาย',
          students: [
            getStd('32631', '080-887-7109', ''),
            getStd('32510', '061-553-0671', ''),
            getStd('32495', '088 293 2414', ''),
            getStd('32757', '084-989-0044', '')
          ]
        }
      ]
    },
    {
      key: 'basketball',
      name: 'บาสเกตบอล',
      icon: '🏀',
      categories: [
        {
          title: 'ทีมชาย มัธยมศึกษาตอนต้น',
          students: [
            getStd('33785', '', ''),
            getStd('34283', '', ''),
            getStd('33623', '', ''),
            getStd('33683', '', ''),
            getStd('33737', '', ''),
            getStd('33941', '090-324-8827', ''),
            getStd('34061', '', ''),
            getStd('34031', '', ''),
            getStd('34067', '', '')
          ]
        },
        {
          title: 'ทีมชาย มัธยมศึกษาตอนปลาย',
          students: [
            getStd('35512', '', ''),
            getStd('33000', '', '')
          ]
        },
        {
          title: 'ทีมหญิง (ม.ต้น)',
          students: [
            getStd('34445', '', ''),
            getStd('34451', '', ''),
            getStd('34529', '', '')
          ]
        }
      ]
    },
    {
      key: 'volleyball',
      name: 'วอลเลย์บอล',
      icon: '🏐',
      categories: [
        {
          title: 'ทีมชาย มัธยมศึกษาตอนต้น',
          students: [
            getStd('34391', '', ''),
            getStd('34397', '', ''),
            getStd('34307', '', ''),
            getStd('34319', '', ''),
            getStd('35574', '', ''),
            getStd('33863', '061-651-2422', '')
          ]
        },
        {
          title: 'ทีมหญิง มัธยมศึกษาตอนต้น',
          students: [
            getStd('35088', '', ''),
            getStd('34331', '', ''),
            getStd('34337', '', ''),
            getStd('34343', '', ''),
            getStd('34385', '', ''),
            getStd('34367', '', ''),
            getStd('34637', '', ''),
            getStd('33773', '', '')
          ]
        },
        {
          title: 'ทีมชาย มัธยมศึกษาตอนปลาย',
          students: [
            getStd('35407', '', ''),
            getStd('35506', '', ''),
            getStd('35512', '', ''),
            getStd('35440', '099-920-7966', '')
          ]
        },
        {
          title: 'ทีมหญิง มัธยมศึกษาตอนปลาย',
          students: [
            getStd('35490', '', ''),
            getStd('35521', '065-003-4526', '')
          ]
        }
      ]
    },
    {
      key: 'takraw',
      name: 'ตะกร้อ',
      icon: '🏸',
      categories: [
        {
          title: 'ทีมชาย มัธยมศึกษาตอนต้น',
          students: [
            getStd('34475', '061-913-7083', ''),
            getStd('34481', '093-196-2875', '')
          ]
        },
        {
          title: 'ทีมชาย มัธยมศึกษาตอนปลาย',
          students: [
            getStd('35506', '095-935-5206', ''),
            getStd('32651', '085-2676036', ''),
            getStd('32558', '', '')
          ]
        }
      ]
    },
    {
      key: 'petanque',
      name: 'เปตอง',
      icon: '⚪',
      categories: [
        {
          title: 'ทีม มัธยมศึกษาตอนต้น (ชาย/หญิง)',
          students: [
            getStd('34349', '', ''),
            getStd('34493', '', ''),
            getStd('34553', '', ''),
            getStd('33731', '', ''),
            getStd('33821', '', ''),
            getStd('33875', '', ''),
            getStd('33947', '', ''),
            getStd('33959', '', ''),
            getStd('33982', '', '')
          ]
        },
        {
          title: 'ทีม มัธยมศึกษาตอนปลาย',
          students: [
            getStd('33160', '', '')
          ]
        }
      ]
    },
    {
      key: 'athletics',
      name: 'กรีฑา',
      icon: '🏃',
      categories: [
        {
          title: 'ทีม มัธยมศึกษาตอนต้น (ชาย/หญิง)',
          students: [
            getStd('34271', '065 982 2715', ''),
            getStd('34355', '093 572 8163', ''),
            getStd('34397', '063 350 1784', ''),
            getStd('34643', '093 319 7162', ''),
            getStd('33863', '061-651-2422', ''),
            getStd('33887', '080 985 5938', ''),
            getStd('33923', '064 496 1183', ''),
            getStd('33935', '082 307 8878', '')
          ]
        },
        {
          title: 'ทีม มัธยมศึกษาตอนปลาย (ชาย/หญิง)',
          students: [
            getStd('35521', '065-003-4526', ''),
            getStd('33439', '099 462 8457', '')
          ]
        }
      ]
    },
    {
      key: 'running16',
      name: 'วิ่ง 16 ขา',
      icon: '🏃‍♂️🏃‍♀️',
      categories: [
        {
          title: 'ทีมชาย มัธยมศึกษาตอนปลาย',
          students: [
            getStd('35461', '0924150997', ''),
            getStd('33369', '096 663 3965', ''),
            getStd('35537', '093 952 7843', ''),
            getStd('33399', '093-329-6478', '')
          ]
        },
        {
          title: 'ทีมหญิง มัธยมศึกษาตอนปลาย',
          students: [
            getStd('33261', '099 303 8547', ''),
            getStd('33214', '091 046 7584', ''),
            getStd('35521', '065-003-4526', ''),
            getStd('34227', '063-861-0700', '')
          ]
        }
      ]
    }
  ];

  // 1. Merge live registrations into sportsList
  const regPath = path.join(rootDir, 'data', 'registrations.json');
  if (fs.existsSync(regPath)) {
    const regs = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    regs.forEach(r => {
      const sport = sportsList.find(s => s.name === r.sportName);
      if (sport) {
        let cat = sport.categories.find(c => c.title.includes(r.categoryTitle) || r.categoryTitle?.includes(c.title.replace('มัธยมศึกษาตอน', 'ม.')));
        if (!cat && sport.categories.length > 0) {
          if (r.categoryTitle?.includes('ม.ปลาย') || r.grade >= 4) {
            cat = sport.categories.find(c => c.title.includes('ปลาย') && (r.gender === 'หญิง' ? c.title.includes('หญิง') : c.title.includes('ชาย')));
          } else {
            cat = sport.categories.find(c => c.title.includes('ต้น') && (r.gender === 'หญิง' ? c.title.includes('หญิง') : c.title.includes('ชาย')));
          }
          if (!cat) cat = sport.categories[0];
        }
        if (cat) {
          if (!cat.students.some(s => s.stdId === r.studentId)) {
            cat.students.push(getStd(r.studentId, r.phone || '', r.note || ''));
          } else {
            const existing = cat.students.find(s => s.stdId === r.studentId);
            if (r.phone && !existing.phone) existing.phone = r.phone;
          }
        }
      }
    });
  }

  // 2. Merge pure sport duties from students_master.json (excluding staff titles)
  const masterPath = path.join(rootDir, 'data', 'students_master.json');
  const masterList = fs.existsSync(masterPath) ? JSON.parse(fs.readFileSync(masterPath, 'utf8')) : [];
  const masterMap = new Map(masterList.map(s => [s.id, s]));
  const PURE_SPORTS = ['ฟุตบอล', 'บาสเกตบอล', 'วอลเลย์บอล', 'ตะกร้อ', 'เปตอง', 'กรีฑา', 'วิ่ง 16 ขา'];

  masterList.forEach(st => {
    if (st.duty) {
      const duties = st.duty.split(',').map(s => s.trim());
      duties.forEach(d => {
        if (d.includes('สตาฟ') || d.includes('เฮด') || d.includes('หัวหน้า') || d.includes('ประธาน') || d.includes('กรรมการ')) {
          return;
        }
        const matchedSportName = PURE_SPORTS.find(p => d === p || d.startsWith(p));
        if (matchedSportName) {
          const sport = sportsList.find(s => s.name === matchedSportName);
          if (sport) {
            let cat = null;
            if (st.grade >= 4) {
              cat = sport.categories.find(c => c.title.includes('ปลาย') && (st.gender === 'หญิง' ? c.title.includes('หญิง') : c.title.includes('ชาย')));
            } else {
              cat = sport.categories.find(c => c.title.includes('ต้น') && (st.gender === 'หญิง' ? c.title.includes('หญิง') : c.title.includes('ชาย')));
            }
            if (!cat) cat = sport.categories[0];
            if (cat && !cat.students.some(s => s.stdId === st.id)) {
              cat.students.push(getStd(st.id, st.phone || '', ''));
            }
          }
        }
      });
    }
  });

  // 3. Filter all categories to ensure pure staff members (without sport) are excluded
  const regStdIds = new Set((fs.existsSync(regPath) ? JSON.parse(fs.readFileSync(regPath, 'utf8')) : []).map(r => r.studentId));

  sportsList.forEach(sport => {
    const sportName = sport.name;
    sport.categories.forEach(cat => {
      cat.students = cat.students.filter(s => {
        if (regStdIds.has(s.stdId)) return true;
        const st = masterMap.get(s.stdId);
        if (st && st.duty) {
          const parts = st.duty.split(',').map(p => p.trim());
          const hasPureSport = parts.some(p => p === sportName || (p.startsWith(sportName) && !p.includes('สตาฟ') && !p.includes('เฮด') && !p.includes('หัวหน้า')));
          if (hasPureSport) return true;
          if (parts.every(p => p.includes('สตาฟ') || p.includes('เฮด') || p.includes('หัวหน้า'))) return false;
        }
        return true;
      });
    });
  });

  let edgePath = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
  if (!fs.existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")) {
    if (fs.existsSync("C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe")) {
      edgePath = '"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"';
    }
  }

  console.log('--- 2. สร้าง PDF รวมเล่มนักกีฬาทุกประเภท ---');

  let pagesHtml = '';

  const grandTotal = sportsList.reduce((acc, s) => {
    return acc + s.categories.reduce((cAcc, c) => cAcc + c.students.length, 0);
  }, 0);

  // Cover Page
  pagesHtml += `
    <div class="page cover-page">
      <div class="cover-box">
        <div class="badge-main">สมุดรวมรายชื่อนักกีฬาประจำปี 2569</div>
        <h1>ทำเนียบรายชื่อนักกีฬาทุกประเภท</h1>
        <h2>คณะสีแสด (สีบุษราคัม)</h2>
        <p class="subtitle">การแข่งขันกีฬา-กรีฑาสีภายใน ประจำปีการศึกษา 2569<br>โรงเรียนสรรพวิทยาคม ตาก</p>
        
        <div class="summary-card">
          <div class="summary-title">สรุปยอดนักกีฬาคณะสีแสด ทั้ง 7 ชนิดกีฬา</div>
          <table class="summary-table">
            <thead>
              <tr>
                <th>ชนิดกีฬา</th>
                <th>จำนวนรุ่น/ประเภท</th>
                <th>จำนวนนักกีฬา (คน)</th>
              </tr>
            </thead>
            <tbody>
              ${sportsList.map(s => {
                const count = s.categories.reduce((a, c) => a + c.students.length, 0);
                return `
                  <tr>
                    <td class="left font-bold">${s.icon} ${s.name}</td>
                    <td class="center">${s.categories.length} รุ่น</td>
                    <td class="center font-bold text-orange">${count}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="summary-total-row">
                <td class="left font-bold">รวมยอดนักกีฬาทุกชนิดกีฬา</td>
                <td class="center font-bold">${sportsList.reduce((a, s) => a + s.categories.length, 0)} รุ่น</td>
                <td class="center font-bold text-orange font-large">${grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Sport Pages
  for (const sport of sportsList) {
    const totalAthletes = sport.categories.reduce((a, c) => a + c.students.length, 0);

    let tablesHtml = '';
    sport.categories.forEach((cat) => {
      let rowsHtml = '';
      cat.students.forEach((s, sIdx) => {
        rowsHtml += `
          <tr class="${sIdx % 2 === 1 ? 'even' : 'odd'}">
            <td class="center font-bold">${sIdx + 1}</td>
            <td class="center font-bold text-orange">${s.roomFull}</td>
            <td class="center">${s.classNo}</td>
            <td class="center font-mono">${s.stdId}</td>
            <td class="left font-bold">${s.name}</td>
            <td class="center">${s.gender}</td>
            <td class="center font-mono">${s.phone || '-'}</td>
            <td class="left text-muted">${s.note || '-'}</td>
          </tr>
        `;
      });

      tablesHtml += `
        <div class="category-block">
          <div class="category-title">
            <span class="cat-icon">▶</span> ${cat.title} 
            <span class="badge">(${cat.students.length} คน)</span>
          </div>
          <table class="roster-table">
            <thead>
              <tr>
                <th style="width: 6%;">ลำดับ</th>
                <th style="width: 10%;">ชั้น/ห้อง</th>
                <th style="width: 8%;">เลขที่</th>
                <th style="width: 12%;">รหัสประจำตัว</th>
                <th style="width: 28%;">ชื่อ - นามสกุล</th>
                <th style="width: 8%;">เพศ</th>
                <th style="width: 15%;">เบอร์โทรศัพท์</th>
                <th style="width: 13%;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

    pagesHtml += `
      <div class="page sport-page">
        <div class="header-card">
          <div class="header-left">
            <h1>${sport.icon} รายชื่อนักกีฬาฝ่าย${sport.name} — คณะสีแสด</h1>
            <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | โรงเรียนสรรพวิทยาคม ตาก</div>
          </div>
          <div class="header-right">
            <div class="total-badge">รวม ${totalAthletes} คน</div>
          </div>
        </div>
        ${tablesHtml}
      </div>
    `;
  }

  const masterHtmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>ทำเนียบรายชื่อนักกีฬาทุกประเภท - คณะสีแสด</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 10mm 10mm 10mm 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
      margin: 0;
      padding: 0;
      color: #212121;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.35;
    }

    .page {
      page-break-after: always;
      padding-bottom: 5mm;
    }
    .page:last-child {
      page-break-after: auto;
    }

    .cover-box {
      border: 3px solid #e65100;
      border-radius: 12px;
      padding: 30px 24px;
      text-align: center;
      background: linear-gradient(180deg, #fff8f0 0%, #ffffff 100%);
      box-shadow: 0 4px 12px rgba(230, 81, 0, 0.1);
    }
    .badge-main {
      display: inline-block;
      background: #e65100;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      padding: 6px 18px;
      border-radius: 20px;
      margin-bottom: 14px;
      letter-spacing: 0.5px;
    }
    .cover-box h1 {
      color: #bf360c;
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 6px 0;
    }
    .cover-box h2 {
      color: #e65100;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 10px 0;
    }
    .cover-box .subtitle {
      color: #5d4037;
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .summary-card {
      background: #ffffff;
      border: 1px solid #ffe0b2;
      border-radius: 8px;
      padding: 16px;
      text-align: left;
      margin-top: 10px;
    }
    .summary-title {
      font-size: 16px;
      font-weight: 700;
      color: #e65100;
      margin-bottom: 12px;
      text-align: center;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .summary-table th {
      background: #e65100;
      color: #ffffff;
      padding: 8px 10px;
      text-align: center;
      border: 1px solid #bf360c;
    }
    .summary-table td {
      padding: 8px 10px;
      border: 1px solid #ffe0b2;
    }
    .summary-total-row td {
      background: #ffe0b2;
      border-top: 2px solid #e65100;
    }

    .header-card {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-left: 6px solid #e65100;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left h1 {
      margin: 0 0 4px 0;
      color: #bf360c;
      font-size: 20px;
      font-weight: 800;
    }
    .header-left .subtitle {
      color: #5d4037;
      font-size: 12px;
      font-weight: 500;
    }
    .header-right .total-badge {
      background: #e65100;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 13px;
    }

    .category-block {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .category-title {
      background: #fff8e1;
      border-left: 4px solid #ff9800;
      padding: 6px 10px;
      font-size: 13px;
      font-weight: 700;
      color: #e65100;
      margin-bottom: 6px;
      border-radius: 0 6px 6px 0;
    }
    .badge {
      font-size: 11px;
      color: #795548;
      font-weight: normal;
    }

    .roster-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 11px;
      border: 1px solid #d6d6d6;
    }
    .roster-table th {
      background: #e65100;
      color: #ffffff;
      font-weight: 700;
      padding: 5px 3px;
      border: 1px solid #bf360c;
      text-align: center;
      font-size: 11.5px;
    }
    .roster-table td {
      padding: 4px 5px;
      border: 1px solid #e0e0e0;
      vertical-align: middle;
    }
    .roster-table tr.even { background: #fffdfa; }
    .roster-table tr.odd { background: #ffffff; }

    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 11px; }
    .text-orange { color: #e65100; }
    .text-muted { color: #757575; font-size: 10px; }
    .font-large { font-size: 15px; }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>
  `;

  const tempHtmlPath = path.join(deptSportsDir, 'temp_master.html');
  const masterPdfPath = path.join(deptSportsDir, 'รายชื่อนักกีฬาทุกประเภท_คณะสีแสด_ปี69.pdf');
  const masterPdfCopy = path.join(outputDir, '00_รวมนักกีฬาทุกประเภท_คณะสีแสด_ปี69.pdf');

  fs.writeFileSync(tempHtmlPath, masterHtmlContent, 'utf-8');

  try {
    execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${masterPdfPath}" --no-pdf-header-footer "${tempHtmlPath}"`, {
      stdio: 'pipe'
    });
    console.log(`[OK] บันทึก PDF รวมนักกีฬาทุกประเภท: ${masterPdfPath} (${fs.statSync(masterPdfPath).size.toLocaleString()} bytes)`);

    fs.copyFileSync(masterPdfPath, masterPdfCopy);
  } catch (err) {
    console.error('[ERROR] สร้าง PDF รวมเล่มไม่สำเร็จ:', err.message);
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }

  console.log('\n--- เสร็จสิ้นการสร้างไฟล์ PDF รวมเล่มสมบูรณ์ ---');
}

if (require.main === module) {
  main().catch(err => console.error('Error in master pdf:', err));
}

module.exports = { main };
