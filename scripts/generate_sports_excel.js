const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { PDFParse } = require('pdf-parse');
const ExcelJS = require('exceljs');

async function main() {
  console.log('--- 1. โหลดข้อมูลนักเรียนและรหัสประจำตัว ---');
  const rootDir = path.resolve(__dirname, '..');
  const sourceDir = path.join(rootDir, 'ข้อมูลต้นฉบับ');
  const deptSportsDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'แยกฝ่าย', 'กีฬา');
  if (!fs.existsSync(deptSportsDir)) fs.mkdirSync(deptSportsDir, { recursive: true });

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
      console.warn(`[NOT FOUND] ID: ${id}`);
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

  console.log('--- 2. จัดหมวดหมู่นักกีฬาตามชนิดกีฬาและรุ่น ---');

  const sportsData = {
    football: {
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
    basketball: {
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
    volleyball: {
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
    takraw: {
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
    petanque: {
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
    athletics: {
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
    running16: {
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
  };

  // 1. Merge live registrations into sportsData
  const regPath = path.join(rootDir, 'data', 'registrations.json');
  if (fs.existsSync(regPath)) {
    const regs = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    regs.forEach(r => {
      const sportKey = Object.keys(sportsData).find(k => sportsData[k].name === r.sportName);
      if (sportKey) {
        let cat = sportsData[sportKey].categories.find(c => c.title.includes(r.categoryTitle) || r.categoryTitle?.includes(c.title.replace('มัธยมศึกษาตอน', 'ม.')));
        if (!cat && sportsData[sportKey].categories.length > 0) {
          if (r.categoryTitle?.includes('ม.ปลาย') || r.grade >= 4) {
            cat = sportsData[sportKey].categories.find(c => c.title.includes('ปลาย') && (r.gender === 'หญิง' ? c.title.includes('หญิง') : c.title.includes('ชาย')));
          } else {
            cat = sportsData[sportKey].categories.find(c => c.title.includes('ต้น') && (r.gender === 'หญิง' ? c.title.includes('หญิง') : c.title.includes('ชาย')));
          }
          if (!cat) cat = sportsData[sportKey].categories[0];
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
          return; // Skip staff duties
        }
        const matchedSportName = PURE_SPORTS.find(p => d === p || d.startsWith(p));
        if (matchedSportName) {
          const sportKey = Object.keys(sportsData).find(k => sportsData[k].name === matchedSportName);
          if (sportKey) {
            let cat = null;
            if (st.grade >= 4) {
              cat = sportsData[sportKey].categories.find(c => c.title.includes('ปลาย') && (st.gender === 'หญิง' ? c.title.includes('หญิง') : c.title.includes('ชาย')));
            } else {
              cat = sportsData[sportKey].categories.find(c => c.title.includes('ต้น') && (st.gender === 'หญิง' ? c.title.includes('หญิง') : c.title.includes('ชาย')));
            }
            if (!cat) cat = sportsData[sportKey].categories[0];
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

  Object.keys(sportsData).forEach(sportKey => {
    const sportName = sportsData[sportKey].name;
    sportsData[sportKey].categories.forEach(cat => {
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

  console.log('--- 3. สร้าง Workbook Excel พร้อมจัดแต่งระดับพรีเมียม ---');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'คณะสีแสด (สีบุษราคัม)';
  workbook.created = new Date();

  const ORANGE_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE65100' } };
  const BANNER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
  const ZEBRA_LIGHT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFAF0' } };
  const CATEGORY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };

  const THIN_BORDER = {
    top: { style: 'thin', color: { argb: 'FFD6D6D6' } },
    left: { style: 'thin', color: { argb: 'FFD6D6D6' } },
    bottom: { style: 'thin', color: { argb: 'FFD6D6D6' } },
    right: { style: 'thin', color: { argb: 'FFD6D6D6' } }
  };
  const HEADER_BORDER = {
    top: { style: 'medium', color: { argb: 'FFBF360C' } },
    left: { style: 'thin', color: { argb: 'FFBF360C' } },
    bottom: { style: 'medium', color: { argb: 'FFBF360C' } },
    right: { style: 'thin', color: { argb: 'FFBF360C' } }
  };

  // Build sheets for each sport
  Object.keys(sportsData).forEach(sportKey => {
    const sport = sportsData[sportKey];
    const ws = workbook.addWorksheet(sport.name, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }]
    });

    const totalInSport = sport.categories.reduce((acc, cat) => acc + cat.students.length, 0);

    ws.mergeCells('A1:G1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `${sport.icon} รายชื่อนักกีฬาฝ่าย${sport.name} — คณะสีแสด (สีบุษราคัม) ปี 2569`;
    titleCell.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = BANNER_FILL;
    ws.getRow(1).height = 36;

    ws.mergeCells('A2:G2');
    const subCell = ws.getCell('A2');
    subCell.value = `จำนวนนักกีฬาทั้งหมด ${totalInSport} คน | การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569`;
    subCell.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = BANNER_FILL;
    ws.getRow(2).height = 22;

    ws.getRow(3).height = 6;

    let currentRow = 4;
    sport.categories.forEach((cat) => {
      const catRow = ws.getRow(currentRow);
      catRow.height = 26;
      ws.mergeCells(`A${currentRow}:G${currentRow}`);
      const catCell = catRow.getCell(1);
      catCell.value = `▶ ${cat.title} (${cat.students.length} คน)`;
      catCell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
      catCell.fill = CATEGORY_FILL;
      catCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      for (let c = 1; c <= 7; c++) catRow.getCell(c).border = HEADER_BORDER;
      currentRow++;

      const headRow = ws.getRow(currentRow);
      headRow.height = 26;
      const headers = ['ลำดับ', 'ชั้น/ห้อง', 'เลขที่', 'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เบอร์โทรศัพท์', 'หมายเหตุ'];
      headers.forEach((h, idx) => {
        const cell = headRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = ORANGE_HEADER_FILL;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = HEADER_BORDER;
      });
      currentRow++;

      cat.students.forEach((s, sIdx) => {
        const r = ws.getRow(currentRow);
        r.height = 22;
        r.getCell(1).value = sIdx + 1;
        r.getCell(2).value = s.roomFull;
        r.getCell(3).value = s.classNo;
        r.getCell(4).value = s.stdId;
        r.getCell(5).value = s.name;
        r.getCell(6).value = s.phone || '-';
        r.getCell(7).value = s.note || '';

        const rowFill = sIdx % 2 === 1 ? ZEBRA_LIGHT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        for (let c = 1; c <= 7; c++) {
          const cell = r.getCell(c);
          cell.font = { name: 'Sarabun', size: 11, color: { argb: 'FF212121' } };
          cell.fill = rowFill;
          cell.border = THIN_BORDER;
          if (c === 5) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }
        currentRow++;
      });

      currentRow++;
    });

    ws.columns = [
      { key: 'no', width: 8 },
      { key: 'room', width: 14 },
      { key: 'classNo', width: 12 },
      { key: 'stdId', width: 16 },
      { key: 'name', width: 34 },
      { key: 'phone', width: 22 },
      { key: 'note', width: 20 }
    ];
  });

  const deptSportsPath = path.join(deptSportsDir, 'รายชื่อนักกีฬาคณะสีแสด_แยกตามประเภทกีฬา_ปี69.xlsx');
  await workbook.xlsx.writeFile(deptSportsPath);
  console.log(`[OK] บันทึกไฟล์ Excel กีฬา: ${deptSportsPath}`);
}

if (require.main === module) {
  main().catch(err => console.error('Error:', err));
}

module.exports = { main };
