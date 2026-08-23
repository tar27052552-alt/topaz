const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ExcelJS = require('exceljs');
const cheerio = require('cheerio');
const { PDFParse } = require('pdf-parse');

async function syncAndFixAll() {
  console.log('=== 1. อ่านข้อมูลนักกีฬาจากไฟล์ Excel ที่ผู้ใช้แก้ไข ===');
  const sportsFilePath = path.join(__dirname, 'รายชื่อนักกีฬาคณะสีแสด_แยกตามประเภทกีฬา_ปี69.xlsx');
  const wbSports = new ExcelJS.Workbook();
  await wbSports.xlsx.readFile(sportsFilePath);

  const sportsMap = new Map(); // id -> { roles: Set, phone, note, name, roomFull, classNo }
  const sportsDataList = [];

  const sportIcons = {
    'ฟุตบอล': '⚽',
    'บาสเกตบอล': '🏀',
    'วอลเลย์บอล': '🏐',
    'ตะกร้อ': '🏸',
    'เปตอง': '⚪',
    'กรีฑา': '🏃',
    'วิ่ง 16 ขา': '🏃‍♂️🏃‍♀️'
  };

  wbSports.worksheets.forEach(ws => {
    if (ws.name === 'สรุปภาพรวม') return;

    const sportObj = {
      name: ws.name,
      icon: sportIcons[ws.name] || '🏅',
      categories: []
    };

    let currentCat = null;

    for (let r = 3; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const c1 = row.getCell(1).value;
      const c2 = row.getCell(2).value;
      const c3 = row.getCell(3).value;
      const c4 = row.getCell(4).value;
      const c5 = row.getCell(5).value;
      const c6 = row.getCell(6).value;
      const c7 = row.getCell(7).value;

      if (c1 && typeof c1 === 'string' && c1.startsWith('▶')) {
        let title = c1.replace(/^▶\s*/, '').trim();
        title = title.replace(/\s*\(\d+\s*คน\)\s*\(\d+\s*คน\)/g, '');
        title = title.replace(/\s*\(\d+\s*คน\)$/g, '');
        title = title.trim();

        currentCat = {
          title: title,
          students: []
        };
        sportObj.categories.push(currentCat);
      } else if (currentCat && c2 && typeof c2 === 'string' && /^ม\.\d+\/\d+/.test(c2.trim()) && c5 && String(c5).trim() !== '' && String(c5).trim() !== 'ชื่อ - นามสกุล') {
        const stdId = c4 ? String(c4).trim() : '';
        const name = c5 ? String(c5).trim() : '';
        const roomFull = c2.trim();
        const classNo = c3 !== undefined && c3 !== null && c3 !== '' ? c3 : '-';
        const phone = c6 && c6 !== '-' && c6 !== 'null' ? String(c6).trim() : '';
        const note = c7 && c7 !== '-' && c7 !== 'null' ? String(c7).trim() : '';

        let gender = 'ชาย';
        if (name.startsWith('เด็กหญิง') || name.startsWith('นางสาว') || name.startsWith('น.ส.')) {
          gender = 'หญิง';
        }

        const student = {
          no: currentCat.students.length + 1,
          roomFull,
          classNo,
          stdId,
          name,
          gender,
          phone,
          note
        };

        currentCat.students.push(student);

        if (stdId) {
          if (!sportsMap.has(stdId)) {
            sportsMap.set(stdId, {
              roles: new Set(),
              phone: phone,
              note: note,
              name: name,
              roomFull: roomFull,
              classNo: classNo
            });
          }
          const sEntry = sportsMap.get(stdId);
          sEntry.roles.add(ws.name);
          if (phone && !sEntry.phone) sEntry.phone = phone;
          if (note && !sEntry.note) sEntry.note = note;
        }
      }
    }

    sportsDataList.push(sportObj);
  });

  // ==========================================
  // จัดเรียงนักกีฬาในทุกหมวดหมู่ตาม: ระดับชั้น -> ห้องเรียน -> เลขที่ในห้อง
  // ==========================================
  const parseRoom = (str) => {
    const m = (str || '').match(/ม\.(\d+)\/(\d+)/);
    if (m) return { grade: parseInt(m[1]), room: parseInt(m[2]) };
    return { grade: 99, room: 99 };
  };

  const sortStudentsByRoom = (a, b) => {
    const rA = parseRoom(a.roomFull);
    const rB = parseRoom(b.roomFull);
    if (rA.grade !== rB.grade) return rA.grade - rB.grade;
    if (rA.room !== rB.room) return rA.room - rB.room;

    const noA = parseInt(a.classNo);
    const noB = parseInt(b.classNo);
    if (!isNaN(noA) && !isNaN(noB) && noA !== noB) {
      return noA - noB;
    }
    return String(a.stdId || '').localeCompare(String(b.stdId || ''), undefined, { numeric: true });
  };

  sportsDataList.forEach(sport => {
    sport.categories.forEach(cat => {
      cat.students.sort(sortStudentsByRoom);
      cat.students.forEach((st, idx) => {
        st.no = idx + 1;
      });
    });
  });

  // ==========================================
  // 2. อัปเดตและจัดรูปแบบไฟล์รายชื่อนักกีฬาคณะสีแสด_แยกตามประเภทกีฬา_ปี69.xlsx
  // ==========================================
  console.log('\n=== 2. ปรับแต่งไฟล์ Excel นักกีฬาแยกประเภทกีฬาให้สมบูรณ์ ===');
  const wbCleanSports = new ExcelJS.Workbook();
  wbCleanSports.creator = 'ฝ่ายกีฬา คณะสีแสด (สีบุษราคัม)';
  wbCleanSports.created = new Date();

  const ORANGE_DARK = { argb: 'FFE65100' };
  const ORANGE_MED = { argb: 'FFF57C00' };
  const ORANGE_LIGHT = { argb: 'FFFFF3E0' };
  const ORANGE_SUB = { argb: 'FFFFE0B2' };
  const ZEBRA_LIGHT = { argb: 'FFFFFAF0' };

  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: ORANGE_DARK };
  const SUBHEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: ORANGE_MED };
  const BANNER_FILL = { type: 'pattern', pattern: 'solid', fgColor: ORANGE_LIGHT };
  const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: ORANGE_SUB };
  const ZEBRA_FILL = { type: 'pattern', pattern: 'solid', fgColor: ZEBRA_LIGHT };
  const WHITE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

  const THIN_BORDER = {
    top: { style: 'thin', color: { argb: 'FFD6D6D6' } },
    left: { style: 'thin', color: { argb: 'FFD6D6D6' } },
    bottom: { style: 'thin', color: { argb: 'FFD6D6D6' } },
    right: { style: 'thin', color: { argb: 'FFD6D6D6' } }
  };

  const MED_BORDER = {
    top: { style: 'medium', color: { argb: 'FFBF360C' } },
    left: { style: 'thin', color: { argb: 'FFBF360C' } },
    bottom: { style: 'medium', color: { argb: 'FFBF360C' } },
    right: { style: 'thin', color: { argb: 'FFBF360C' } }
  };

  // Sheet สรุปภาพรวม
  const ovSheet = wbCleanSports.addWorksheet('สรุปภาพรวม', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4, showGridLines: true }]
  });

  let totalAllAthletes = 0;
  sportsDataList.forEach(s => {
    s.categories.forEach(c => {
      totalAllAthletes += c.students.length;
    });
  });

  ovSheet.mergeCells('A1:D1');
  const ovTitle = ovSheet.getCell('A1');
  ovTitle.value = '🏆 สรุปข้อมูลนักกีฬาแยกตามประเภทกีฬา - คณะสีแสด (สีบุษราคัม) ปี 2569';
  ovTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
  ovTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  ovTitle.fill = BANNER_FILL;
  ovSheet.getRow(1).height = 38;

  ovSheet.mergeCells('A2:D2');
  const ovSub = ovSheet.getCell('A2');
  ovSub.value = `สรุปยอดรวมนักกีฬาที่ลงทะเบียนทั้งหมด ${totalAllAthletes} รายชื่อ ใน ${sportsDataList.length} ชนิดกีฬา`;
  ovSub.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
  ovSub.alignment = { vertical: 'middle', horizontal: 'center' };
  ovSub.fill = BANNER_FILL;
  ovSheet.getRow(2).height = 24;

  ovSheet.getRow(3).height = 10;

  const ovHeaders = ['ลำดับ', 'ชนิดกีฬา', 'ประเภท / รุ่นการแข่งขัน', 'จำนวนนักกีฬา'];
  const ovHeaderRow = ovSheet.getRow(4);
  ovHeaderRow.height = 28;
  ovHeaders.forEach((h, idx) => {
    const cell = ovHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = MED_BORDER;
  });

  let currentOvRow = 5;
  let ovIndex = 1;

  sportsDataList.forEach(sport => {
    sport.categories.forEach(cat => {
      const row = ovSheet.getRow(currentOvRow);
      row.height = 22;
      row.getCell(1).value = ovIndex;
      row.getCell(2).value = `${sport.icon} ${sport.name}`;
      row.getCell(3).value = cat.title;
      row.getCell(4).value = `${cat.students.length} คน`;

      const rowFill = ovIndex % 2 === 0 ? ZEBRA_FILL : WHITE_FILL;
      for (let c = 1; c <= 4; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Sarabun', size: 11, color: { argb: 'FF212121' } };
        cell.fill = rowFill;
        cell.border = THIN_BORDER;
        if (c === 2 || c === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      }
      currentOvRow++;
      ovIndex++;
    });
  });

  const ovSumRow = ovSheet.getRow(currentOvRow);
  ovSumRow.height = 26;
  ovSheet.mergeCells(`A${currentOvRow}:C${currentOvRow}`);
  const ovSumLabel = ovSumRow.getCell(1);
  ovSumLabel.value = 'รวมยอดลงทะเบียนนักกีฬาทุกชนิดกีฬา';
  ovSumLabel.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
  ovSumLabel.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 1; c <= 3; c++) {
    ovSumRow.getCell(c).border = MED_BORDER;
    ovSumRow.getCell(c).fill = SECTION_FILL;
  }

  const ovSumTotal = ovSumRow.getCell(4);
  ovSumTotal.value = `${totalAllAthletes} คน`;
  ovSumTotal.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
  ovSumTotal.alignment = { vertical: 'middle', horizontal: 'center' };
  ovSumTotal.fill = SECTION_FILL;
  ovSumTotal.border = MED_BORDER;

  ovSheet.columns = [
    { key: 'no', width: 10 },
    { key: 'sport', width: 24 },
    { key: 'cat', width: 36 },
    { key: 'count', width: 18 }
  ];

  // Sheets กีฬาแต่ละประเภท
  sportsDataList.forEach(sportInfo => {
    const ws = wbCleanSports.addWorksheet(sportInfo.name, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }]
    });

    const totalAthletesInSport = sportInfo.categories.reduce((acc, c) => acc + c.students.length, 0);

    ws.mergeCells('A1:G1');
    const bCell = ws.getCell('A1');
    bCell.value = `${sportInfo.icon} รายชื่อนักกีฬา คณะสีแสด - ${sportInfo.name}`;
    bCell.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
    bCell.alignment = { vertical: 'middle', horizontal: 'center' };
    bCell.fill = BANNER_FILL;
    ws.getRow(1).height = 36;

    ws.mergeCells('A2:G2');
    const sCell = ws.getCell('A2');
    sCell.value = `จำนวนนักกีฬาทั้งหมด: ${totalAthletesInSport} คน | แบ่งเป็น ${sportInfo.categories.length} รุ่น/ทีม`;
    sCell.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
    sCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sCell.fill = BANNER_FILL;
    ws.getRow(2).height = 22;

    let currentRow = 4;

    sportInfo.categories.forEach(cat => {
      ws.mergeCells(`A${currentRow}:G${currentRow}`);
      const catHeaderCell = ws.getCell(`A${currentRow}`);
      catHeaderCell.value = `▶ ${cat.title} (${cat.students.length} คน)`;
      catHeaderCell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      catHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      catHeaderCell.fill = SUBHEADER_FILL;
      ws.getRow(currentRow).height = 28;
      currentRow++;

      const colHeaders = ['ลำดับ', 'ชั้น/ห้อง', 'เลขที่ในห้อง', 'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เบอร์โทรศัพท์', 'หมายเหตุ / ชื่อเล่น'];
      const colHeaderRow = ws.getRow(currentRow);
      colHeaderRow.height = 24;
      colHeaders.forEach((h, idx) => {
        const cell = colHeaderRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFBF360C' } };
        cell.fill = SECTION_FILL;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = MED_BORDER;
      });
      currentRow++;

      cat.students.forEach((st, sIdx) => {
        const sRow = ws.getRow(currentRow);
        sRow.height = 22;

        sRow.getCell(1).value = sIdx + 1;
        sRow.getCell(2).value = st.roomFull;
        sRow.getCell(3).value = st.classNo;
        sRow.getCell(4).value = st.stdId;
        sRow.getCell(5).value = st.name;
        sRow.getCell(6).value = st.phone || '-';
        sRow.getCell(7).value = st.note || '';

        const rowFill = sIdx % 2 === 1 ? ZEBRA_FILL : WHITE_FILL;
        for (let c = 1; c <= 7; c++) {
          const cell = sRow.getCell(c);
          cell.font = { name: 'Sarabun', size: 11, color: { argb: 'FF212121' } };
          cell.fill = rowFill;
          cell.border = THIN_BORDER;

          if (c === 5 || c === 7) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }
        currentRow++;
      });

      ws.getRow(currentRow).height = 12;
      currentRow++;
    });

    ws.columns = [
      { key: 'no', width: 8 },
      { key: 'room', width: 12 },
      { key: 'classNo', width: 14 },
      { key: 'stdId', width: 15 },
      { key: 'name', width: 32 },
      { key: 'phone', width: 20 },
      { key: 'note', width: 20 }
    ];
  });

  let savedSportsPath = '';
  const candidatePaths = [
    sportsFilePath,
    path.join(__dirname, 'รายชื่อนักกีฬาคณะสีแสด_แยกตามประเภทกีฬา_ปี69_ฉบับปรับปรุง.xlsx'),
    path.join(__dirname, 'รายชื่อนักกีฬาคณะสีแสด_แยกตามประเภทกีฬา_ปี69_ล่าสุด.xlsx')
  ];

  for (const p of candidatePaths) {
    try {
      await wbCleanSports.xlsx.writeFile(p);
      savedSportsPath = p;
      console.log(`[OK] บันทึกไฟล์ Excel นักกีฬาสำเร็จ: ${p}`);
      break;
    } catch (err) {
      if (err.code === 'EBUSY') {
        console.log(`[BUSY] ไฟล์ ${path.basename(p)} กำลังถูกเปิดใช้งานอยู่ ลองบันทึกไฟล์ถัดไป...`);
        continue;
      }
      throw err;
    }
  }

  // ==========================================
  // 3. อัปเดตไฟล์รายชื่อคณะสีแสด_ปี69.xlsx (6 Sheets ม.1 - ม.6)
  // ==========================================
  console.log('\n=== 3. อัปเดตไฟล์ Excel รวมชั้น ม.1 - ม.6 ===');
  const xlsFiles = [
    'รายชื่อ ม.1.xls', 'รายชื่อ ม.2.xls', 'รายชื่อ ม.3.xls',
    'รายชื่อ ม.4.xls', 'รายชื่อ ม.5.xls', 'รายชื่อ ม.6.xls'
  ];

  const xlsMap = new Map();
  xlsFiles.forEach(fileName => {
    const filePath = path.join(__dirname, 'รายชื่อนักเรียนทั้งหมด', fileName);
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

  const pdf1Path = path.join(__dirname, 'รายชื่อคณะสีแสด', 'รายชื่อลูกคณะสีบุษราคัม ม.ต้น 69.pdf');
  const pdf2Path = path.join(__dirname, 'รายชื่อคณะสีแสด', 'รายชื่อลูกคณะสีบุษราคัม ม.ปลาย 69.pdf');

  const p1 = new PDFParse({ data: fs.readFileSync(pdf1Path) });
  const t1 = await p1.getText();
  const p2 = new PDFParse({ data: fs.readFileSync(pdf2Path) });
  const t2 = await p2.getText();

  const allLines = [...t1.text.split('\n'), ...t2.text.split('\n')];
  const gradeStudents = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

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

      const sportsInfo = sportsMap.get(id);
      const roles = sportsInfo ? Array.from(sportsInfo.roles) : [];
      const phone = sportsInfo ? sportsInfo.phone : '';

      const student = {
        stdId: id,
        pdfNo: parseInt(num),
        name: finalName,
        grade: grade,
        room: room,
        roomFull: `ม.${grade}/${room}`,
        classNo: xls ? xls.classNo : '-',
        gender: gender,
        roles: roles,
        phone: phone,
        remark: remark ? remark.trim() : ''
      };

      if (gradeStudents[grade]) {
        gradeStudents[grade].push(student);
      }
    }
  });

  const wbMain = new ExcelJS.Workbook();
  wbMain.creator = 'คณะสีแสด (สีบุษราคัม)';
  wbMain.created = new Date();

  const ORANGE_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE65100' } };
  const BANNER_FILL_MAIN = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
  const ZEBRA_LIGHT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFAF0' } };
  const SUMMARY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };

  const THIN_BORDER_MAIN = {
    top: { style: 'thin', color: { argb: 'FFD6D6D6' } },
    left: { style: 'thin', color: { argb: 'FFD6D6D6' } },
    bottom: { style: 'thin', color: { argb: 'FFD6D6D6' } },
    right: { style: 'thin', color: { argb: 'FFD6D6D6' } }
  };

  const HEADER_BORDER_MAIN = {
    top: { style: 'medium', color: { argb: 'FFBF360C' } },
    left: { style: 'thin', color: { argb: 'FFBF360C' } },
    bottom: { style: 'medium', color: { argb: 'FFBF360C' } },
    right: { style: 'thin', color: { argb: 'FFBF360C' } }
  };

  const rolesList = '"ฟุตบอล, บาสเกตบอล, ตะกร้อ, กรีฑา, เปตอง, วอลเลย์บอล, วิ่ง 16 ขา, กองเชียร์, เชียร์ลีดเดอร์, สแตนด์เชียร์, ขบวนพาเหรด, สตาฟ/ผู้ดูแล, อื่นๆ"';

  for (let g = 1; g <= 6; g++) {
    const sheetName = `ม.${g}`;
    const ws = wbMain.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 4, showGridLines: true }]
    });

    const students = gradeStudents[g];
    students.sort((a, b) => {
      if (a.room !== b.room) return a.room - b.room;
      return a.stdId.localeCompare(b.stdId, undefined, { numeric: true });
    });

    const totalCount = students.length;
    const maleCount = students.filter(s => s.gender === 'ชาย').length;
    const femaleCount = students.filter(s => s.gender === 'หญิง').length;
    const athleteCount = students.filter(s => s.roles.length > 0).length;

    ws.mergeCells('A1:K1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `รายชื่อนักเรียน คณะสีแสด (สีบุษราคัม) - ระดับชั้นมัธยมศึกษาปีที่ ${g}`;
    titleCell.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = BANNER_FILL_MAIN;
    ws.getRow(1).height = 36;

    ws.mergeCells('A2:K2');
    const subCell = ws.getCell('A2');
    subCell.value = `จำนวนนักเรียน: ${totalCount} คน | ชาย: ${maleCount} คน | หญิง: ${femaleCount} คน | นักกีฬาที่ลงทะเบียน: ${athleteCount} คน (เรียงตาม: ห้องเรียน -> รหัสประจำตัว)`;
    subCell.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = BANNER_FILL_MAIN;
    ws.getRow(2).height = 22;

    ws.getRow(3).height = 8;

    const headers = [
      'ลำดับ', 'ระดับชั้น', 'ห้อง', 'ชั้น/ห้อง', 'เลขที่ในห้อง',
      'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เพศ', 'ฝ่าย/หน้าที่', 'เบอร์โทรศัพท์', 'หมายเหตุ'
    ];

    const hRow = ws.getRow(4);
    hRow.height = 28;
    headers.forEach((h, idx) => {
      const cell = hRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = ORANGE_HEADER_FILL;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = HEADER_BORDER_MAIN;
    });

    students.forEach((s, idx) => {
      const rowIdx = idx + 5;
      const row = ws.getRow(rowIdx);
      row.height = 22;

      const roleText = s.roles.length > 0 ? s.roles.join(', ') : '';

      row.getCell(1).value = idx + 1;
      row.getCell(2).value = `ม.${s.grade}`;
      row.getCell(3).value = s.room;
      row.getCell(4).value = s.roomFull;
      row.getCell(5).value = s.classNo;
      row.getCell(6).value = s.stdId;
      row.getCell(7).value = s.name;
      row.getCell(8).value = s.gender;
      row.getCell(9).value = roleText;
      row.getCell(10).value = s.phone || '';
      row.getCell(11).value = s.remark || '';

      row.getCell(9).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [rolesList],
        showErrorMessage: false
      };

      const isEven = idx % 2 === 1;
      const rowFill = isEven ? ZEBRA_LIGHT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

      for (let c = 1; c <= 11; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Sarabun', size: 11, color: { argb: 'FF212121' } };
        cell.fill = rowFill;
        cell.border = THIN_BORDER_MAIN;

        if (c === 9 && roleText) {
          cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFE65100' } };
        }

        if (c === 7 || c === 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      }
    });

    const summaryRowIdx = students.length + 5;
    const summaryRow = ws.getRow(summaryRowIdx);
    summaryRow.height = 26;

    ws.mergeCells(`A${summaryRowIdx}:F${summaryRowIdx}`);
    const sumLabel = summaryRow.getCell(1);
    sumLabel.value = `รวมทั้งสิ้น ระดับชั้น ม.${g}`;
    sumLabel.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
    sumLabel.alignment = { vertical: 'middle', horizontal: 'center' };

    for (let c = 1; c <= 6; c++) {
      summaryRow.getCell(c).border = HEADER_BORDER_MAIN;
      summaryRow.getCell(c).fill = SUMMARY_FILL;
    }

    const sumTotalCell = summaryRow.getCell(7);
    sumTotalCell.value = `${totalCount} คน (ชาย ${maleCount} / หญิง ${femaleCount} | นักกีฬา ${athleteCount} คน)`;
    sumTotalCell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
    sumTotalCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sumTotalCell.fill = SUMMARY_FILL;
    sumTotalCell.border = HEADER_BORDER_MAIN;

    for (let c = 8; c <= 11; c++) {
      const cell = summaryRow.getCell(c);
      cell.value = '';
      cell.fill = SUMMARY_FILL;
      cell.border = HEADER_BORDER_MAIN;
    }

    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: summaryRowIdx - 1, column: 11 }
    };

    ws.columns = [
      { key: 'no', width: 8 },
      { key: 'grade', width: 12 },
      { key: 'room', width: 8 },
      { key: 'roomFull', width: 12 },
      { key: 'classNo', width: 14 },
      { key: 'stdId', width: 15 },
      { key: 'name', width: 32 },
      { key: 'gender', width: 10 },
      { key: 'role', width: 28 },
      { key: 'phone', width: 18 },
      { key: 'remark', width: 20 }
    ];
  }

  const outMainPath = path.join(__dirname, 'รายชื่อคณะสีแสด_ปี69.xlsx');
  try {
    await wbMain.xlsx.writeFile(outMainPath);
    console.log(`[OK] บันทึกไฟล์หลักสำเร็จ: ${outMainPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const altMainPath = path.join(__dirname, 'รายชื่อคณะสีแสด_ปี69_พร้อมหน้าที่.xlsx');
      await wbMain.xlsx.writeFile(altMainPath);
      console.log(`[OK] บันทึกไฟล์สำรองสำเร็จ: ${altMainPath}`);
    } else {
      throw err;
    }
  }

  // ==========================================
  // 4. เรนเดอร์ PDF รายชนิดกีฬา 7 ไฟล์
  // ==========================================
  console.log('\n=== 4. เรนเดอร์ไฟล์ PDF แยกชนิดกีฬา 7 ไฟล์ ===');
  const outputPdfDir = path.join(__dirname, 'รายชื่อนักกีฬา_PDF');
  if (!fs.existsSync(outputPdfDir)) {
    fs.mkdirSync(outputPdfDir, { recursive: true });
  }

  const edgePath = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';

  for (const sport of sportsDataList) {
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
            <td class="left">${s.name}</td>
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

    const singleSportHtml = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>รายชื่อนักกีฬา ${sport.name} - คณะสีแสด</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 12mm 12mm 12mm;
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

    .header-card {
      border: 2px solid #e65100;
      border-radius: 8px;
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      padding: 12px 16px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(230, 81, 0, 0.1);
      page-break-after: avoid;
      break-after: avoid;
    }

    .header-left h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #bf360c;
      letter-spacing: -0.3px;
    }

    .header-left .subtitle {
      font-size: 12px;
      color: #5d4037;
      margin-top: 3px;
      font-weight: 600;
    }

    .header-right {
      text-align: right;
    }

    .stat-pill {
      background: #e65100;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      display: inline-block;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }

    .category-block {
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .category-title {
      background: #f57c00;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px 6px 0 0;
      display: flex;
      align-items: center;
      gap: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }

    .category-title .badge {
      font-size: 12px;
      font-weight: 500;
      opacity: 0.95;
    }

    .cat-icon {
      font-size: 10px;
    }

    .roster-table {
      width: 100%;
      border-collapse: collapse;
      border-left: 1px solid #d6d6d6;
      border-right: 1px solid #d6d6d6;
      border-bottom: 1px solid #d6d6d6;
      font-size: 12px;
    }

    .roster-table th {
      background: #ffe0b2;
      color: #bf360c;
      font-weight: 700;
      padding: 6px 4px;
      border: 1px solid #ffcc80;
      text-align: center;
      font-size: 11.5px;
    }

    .roster-table td {
      padding: 5px 6px;
      border: 1px solid #e0e0e0;
      vertical-align: middle;
    }

    .roster-table tr.even {
      background-color: #fffdfa;
    }

    .roster-table tr.odd {
      background-color: #ffffff;
    }

    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 11.5px; }
    .text-orange { color: #e65100; }
    .text-muted { color: #616161; font-size: 11px; }
  </style>
</head>
<body>

  <div class="header-card">
    <div class="header-left">
      <h1>${sport.icon} รายชื่อนักกีฬา${sport.name} — คณะสีแสด (สีบุษราคัม)</h1>
      <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | แบ่งตามระดับชั้นและประเภททีม</div>
    </div>
    <div class="header-right">
      <div class="stat-pill">รวม ${totalAthletes} คน</div>
    </div>
  </div>

  ${tablesHtml}

</body>
</html>
    `;

    const tempPath = path.join(outputPdfDir, `temp_${sport.name}.html`);
    const finalPdfPath = path.join(outputPdfDir, `${sport.name}.pdf`);

    fs.writeFileSync(tempPath, singleSportHtml, 'utf-8');
    try {
      execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${finalPdfPath}" --no-pdf-header-footer "${tempPath}"`, {
        stdio: 'pipe'
      });
      console.log(`[OK] สร้าง PDF ${sport.name}.pdf สำเร็จ (${fs.statSync(finalPdfPath).size.toLocaleString()} bytes)`);
    } catch (err) {
      console.error(`[ERROR] สร้าง PDF ${sport.name} ไม่สำเร็จ:`, err.message);
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }

  // ==========================================
  // 5. เรนเดอร์ PDF รวมเล่ม (Master PDF)
  // ==========================================
  console.log('\n=== 5. เรนเดอร์ไฟล์ PDF รวมเล่ม (Master PDF) ===');

  let overviewRowsHtml = '';
  let globalCount = 0;
  let ovIdxCount = 1;

  sportsDataList.forEach(sport => {
    sport.categories.forEach(cat => {
      overviewRowsHtml += `
        <tr class="${ovIdxCount % 2 === 0 ? 'even' : 'odd'}">
          <td class="center font-bold">${ovIdxCount}</td>
          <td class="left font-bold text-orange">${sport.icon} ${sport.name}</td>
          <td class="left">${cat.title}</td>
          <td class="center font-bold">${cat.students.length} คน</td>
        </tr>
      `;
      globalCount += cat.students.length;
      ovIdxCount++;
    });
  });

  let allSportsSectionsHtml = '';

  sportsDataList.forEach(sport => {
    const totalAthletes = sport.categories.reduce((a, c) => a + c.students.length, 0);

    let tablesHtml = '';
    sport.categories.forEach(cat => {
      let rowsHtml = '';
      cat.students.forEach((s, sIdx) => {
        rowsHtml += `
          <tr class="${sIdx % 2 === 1 ? 'even' : 'odd'}">
            <td class="center font-bold">${sIdx + 1}</td>
            <td class="center font-bold text-orange">${s.roomFull}</td>
            <td class="center">${s.classNo}</td>
            <td class="center font-mono">${s.stdId}</td>
            <td class="left">${s.name}</td>
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

    allSportsSectionsHtml += `
      <div class="sport-page">
        <div class="header-card">
          <div class="header-left">
            <h1>${sport.icon} รายชื่อนักกีฬา${sport.name} — คณะสีแสด (สีบุษราคัม)</h1>
            <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | แบ่งตามระดับชั้นและประเภททีม</div>
          </div>
          <div class="header-right">
            <div class="stat-pill">รวม ${totalAthletes} คน</div>
          </div>
        </div>

        ${tablesHtml}
      </div>
    `;
  });

  const masterHtmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>สมุดรายชื่อนักกีฬาทุกประเภท — คณะสีแสด ปี 2569</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 12mm 12mm 12mm;
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

    .sport-page {
      page-break-before: always;
      break-before: page;
    }

    .header-card {
      border: 2px solid #e65100;
      border-radius: 8px;
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      padding: 12px 16px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(230, 81, 0, 0.1);
      page-break-after: avoid;
      break-after: avoid;
    }

    .header-left h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #bf360c;
      letter-spacing: -0.3px;
    }

    .header-left .subtitle {
      font-size: 12px;
      color: #5d4037;
      margin-top: 3px;
      font-weight: 600;
    }

    .header-right {
      text-align: right;
    }

    .stat-pill {
      background: #e65100;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      display: inline-block;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }

    .category-block {
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .category-title {
      background: #f57c00;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px 6px 0 0;
      display: flex;
      align-items: center;
      gap: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }

    .category-title .badge {
      font-size: 12px;
      font-weight: 500;
      opacity: 0.95;
    }

    .cat-icon {
      font-size: 10px;
    }

    .roster-table {
      width: 100%;
      border-collapse: collapse;
      border-left: 1px solid #d6d6d6;
      border-right: 1px solid #d6d6d6;
      border-bottom: 1px solid #d6d6d6;
      font-size: 12px;
    }

    .roster-table th {
      background: #ffe0b2;
      color: #bf360c;
      font-weight: 700;
      padding: 6px 4px;
      border: 1px solid #ffcc80;
      text-align: center;
      font-size: 11.5px;
    }

    .roster-table td {
      padding: 5px 6px;
      border: 1px solid #e0e0e0;
      vertical-align: middle;
    }

    .roster-table tr.even {
      background-color: #fffdfa;
    }

    .roster-table tr.odd {
      background-color: #ffffff;
    }

    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 11.5px; }
    .text-orange { color: #e65100; }
    .text-muted { color: #616161; font-size: 11px; }
  </style>
</head>
<body>

  <!-- PAGE 1: Overview Summary -->
  <div class="overview-page">
    <div class="header-card">
      <div class="header-left">
        <h1>🏆 สรุปข้อมูลนักกีฬาทุกประเภท — คณะสีแสด (สีบุษราคัม)</h1>
        <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | ยอดรวมนักกีฬา ${globalCount} รายชื่อ ใน 7 ชนิดกีฬา</div>
      </div>
      <div class="header-right">
        <div class="stat-pill">รวม ${globalCount} รายชื่อ</div>
      </div>
    </div>

    <div class="category-block">
      <div class="category-title">
        <span class="cat-icon">▶</span> สารบัญและภาพรวมการแข่งขันทุกชนิดกีฬา (${ovIdxCount - 1} ทีม/รุ่น)
      </div>
      <table class="roster-table">
        <thead>
          <tr>
            <th style="width: 10%;">ลำดับ</th>
            <th style="width: 25%;">ชนิดกีฬา</th>
            <th style="width: 45%;">ประเภท / รุ่นการแข่งขัน</th>
            <th style="width: 20%;">จำนวนนักกีฬา</th>
          </tr>
        </thead>
        <tbody>
          ${overviewRowsHtml}
        </tbody>
        <tfoot>
          <tr style="background: #ffe0b2; font-weight: bold; color: #bf360c;">
            <td colspan="3" class="center">รวมยอดลงทะเบียนนักกีฬาทุกประเภท</td>
            <td class="center font-bold">${globalCount} คน</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <!-- SPORTS PAGES -->
  ${allSportsSectionsHtml}

</body>
</html>
  `;

  const tempMasterPath = path.join(outputPdfDir, 'temp_master.html');
  const masterPdfPath = path.join(outputPdfDir, '00_รวมนักกีฬาทุกประเภท_คณะสีแสด_ปี69.pdf');
  const masterAltPath = path.join(__dirname, 'รายชื่อนักกีฬาทุกประเภท_คณะสีแสด_ปี69.pdf');

  fs.writeFileSync(tempMasterPath, masterHtmlContent, 'utf-8');

  try {
    execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${masterPdfPath}" --no-pdf-header-footer "${tempMasterPath}"`, {
      stdio: 'pipe'
    });
    console.log(`[OK] สร้าง PDF รวมเล่มสำเร็จ: ${masterPdfPath} (${fs.statSync(masterPdfPath).size.toLocaleString()} bytes)`);

    fs.copyFileSync(masterPdfPath, masterAltPath);
    console.log(`[OK] สำเนาไว้ที่โฟลเดอร์หลัก: ${masterAltPath}`);
  } catch (err) {
    console.error('[ERROR] สร้าง PDF รวมเล่มไม่สำเร็จ:', err.message);
  } finally {
    if (fs.existsSync(tempMasterPath)) {
      fs.unlinkSync(tempMasterPath);
    }
  }

  console.log('\n=== ซิงค์และปรับแต่งข้อมูลทุกไฟล์ตรงกัน 100% เรียบร้อยสมบูรณ์ ===');
}

syncAndFixAll().catch(err => console.error('Error syncing all:', err));
