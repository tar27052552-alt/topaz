const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const studentsMaster = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'students_master.json'), 'utf8'));

const outBaseDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69', 'ใบเช็คชื่อ');
const outExcelDir = path.join(outBaseDir, 'ไฟล์Excel');

if (!fs.existsSync(outExcelDir)) {
  fs.mkdirSync(outExcelDir, { recursive: true });
}

// 1. Group Definitions
const attendanceGroups = [
  // --- 8 ฝ่ายกิจกรรมหลัก ---
  {
    id: 'dept_01_cheerstand',
    title: 'ใบรายชื่อฝ่ายสแตนเชียร์ คณะสีแสด ปี 2569',
    fileName: '01_ใบเช็คชื่อ_ฝ่ายสแตนเชียร์_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '01_ใบเช็คชื่อ_ฝ่ายสแตนเชียร์_คณะสีแสด_ปี69.pdf',
    shortName: '01.สแตนเชียร์',
    subHeader: 'ฝ่ายสแตนเชียร์ (ม.1)',
    filter: s => (s.duty || '').includes('สแตนเชียร์')
  },
  {
    id: 'dept_02_parade',
    title: 'ใบรายชื่อฝ่ายขบวนพาเหรด คณะสีแสด ปี 2569',
    fileName: '02_ใบเช็คชื่อ_ฝ่ายขบวนพาเหรด_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '02_ใบเช็คชื่อ_ฝ่ายขบวนพาเหรด_คณะสีแสด_ปี69.pdf',
    shortName: '02.พาเหรด',
    subHeader: 'ฝ่ายขบวนพาเหรด',
    filter: s => ((s.duty || '').includes('ขบวน') || (s.duty || '').includes('พาเหรด')) && !(s.duty || '').includes('พร็อพ')
  },
  {
    id: 'dept_03_props',
    title: 'ใบรายชื่อฝ่ายพร็อพและอุปกรณ์ คณะสีแสด ปี 2569',
    fileName: '03_ใบเช็คชื่อ_ฝ่ายพร็อพและอุปกรณ์_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '03_ใบเช็คชื่อ_ฝ่ายพร็อพและอุปกรณ์_คณะสีแสด_ปี69.pdf',
    shortName: '03.พร็อพ',
    subHeader: 'ฝ่ายพร็อพ & อุปกรณ์',
    filter: s => (s.duty || '').includes('พร็อพ') || (s.duty || '').includes('อุปกรณ์')
  },
  {
    id: 'dept_04_cheerleader',
    title: 'ใบรายชื่อฝ่ายเชียร์ลีดเดอร์ คณะสีแสด ปี 2569',
    fileName: '04_ใบเช็คชื่อ_ฝ่ายเชียร์ลีดเดอร์_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '04_ใบเช็คชื่อ_ฝ่ายเชียร์ลีดเดอร์_คณะสีแสด_ปี69.pdf',
    shortName: '04.เชียร์ลีดเดอร์',
    subHeader: 'ฝ่ายเชียร์ลีดเดอร์',
    filter: s => (s.duty || '').includes('เชียร์ลีดเดอร์') || (s.duty || '').includes('หลีด')
  },
  {
    id: 'dept_05_drum',
    title: 'ใบรายชื่อฝ่ายดรัมเมเยอร์ คณะสีแสด ปี 2569',
    fileName: '05_ใบเช็คชื่อ_ฝ่ายดรัมเมเยอร์_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '05_ใบเช็คชื่อ_ฝ่ายดรัมเมเยอร์_คณะสีแสด_ปี69.pdf',
    shortName: '05.ดรัมเมเยอร์',
    subHeader: 'ฝ่ายดรัมเมเยอร์',
    filter: s => (s.duty || '').includes('ดรัม')
  },
  {
    id: 'dept_06_colorcard',
    title: 'ใบรายชื่อฝ่ายคัลเลอร์การ์ด คณะสีแสด ปี 2569',
    fileName: '06_ใบเช็คชื่อ_ฝ่ายคัลเลอร์การ์ด_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '06_ใบเช็คชื่อ_ฝ่ายคัลเลอร์การ์ด_คณะสีแสด_ปี69.pdf',
    shortName: '06.คัลเลอร์การ์ด',
    subHeader: 'ฝ่ายคัลเลอร์การ์ด',
    filter: s => (s.duty || '').includes('คัลเลอร์')
  },
  {
    id: 'dept_07_welfare',
    title: 'ใบรายชื่อฝ่ายสวัสดิการ คณะสีแสด ปี 2569',
    fileName: '07_ใบเช็คชื่อ_ฝ่ายสวัสดิการ_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '07_ใบเช็คชื่อ_ฝ่ายสวัสดิการ_คณะสีแสด_ปี69.pdf',
    shortName: '07.สวัสดิการ',
    subHeader: 'ฝ่ายสวัสดิการ',
    filter: s => (s.duty || '').includes('สวัสดิการ')
  },
  {
    id: 'dept_08_staff',
    title: 'ใบรายชื่อฝ่ายสตาฟและคณะกรรมการ ม.5 คณะสีแสด ปี 2569',
    fileName: '08_ใบเช็คชื่อ_ฝ่ายสตาฟ_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '08_ใบเช็คชื่อ_ฝ่ายสตาฟ_คณะสีแสด_ปี69.pdf',
    shortName: '08.สตาฟ ม.5',
    subHeader: 'ฝ่ายสตาฟและคณะกรรมการ (ม.5)',
    filter: s => (s.duty || '').includes('สตาฟ') || (s.duty || '').includes('ประธาน') || (s.duty || '').includes('หัวหน้า') || (s.duty || '').includes('เหรัญญิก') || (s.duty || '').includes('เฮด')
  },

  // --- 7 ประเภทกีฬา ---
  {
    id: 'sport_09_football',
    title: 'ใบรายชื่อนักกีฬาฟุตบอล คณะสีแสด ปี 2569',
    fileName: '09_ใบเช็คชื่อ_กีฬาฟุตบอล_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '09_ใบเช็คชื่อ_กีฬาฟุตบอล_คณะสีแสด_ปี69.pdf',
    shortName: '09.ฟุตบอล',
    subHeader: 'กีฬาฟุตบอล (ชาย ม.ต้น/ปลาย, หญิง)',
    filter: s => (s.duty || '').includes('ฟุตบอล')
  },
  {
    id: 'sport_10_basketball',
    title: 'ใบรายชื่อนักกีฬาบาสเกตบอล คณะสีแสด ปี 2569',
    fileName: '10_ใบเช็คชื่อ_กีฬาบาสเกตบอล_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '10_ใบเช็คชื่อ_กีฬาบาสเกตบอล_คณะสีแสด_ปี69.pdf',
    shortName: '10.บาสเกตบอล',
    subHeader: 'กีฬาบาสเกตบอล (ชาย/หญิง)',
    filter: s => (s.duty || '').includes('บาสเกตบอล')
  },
  {
    id: 'sport_11_volleyball',
    title: 'ใบรายชื่อนักกีฬาวอลเลย์บอล คณะสีแสด ปี 2569',
    fileName: '11_ใบเช็คชื่อ_กีฬาวอลเลย์บอล_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '11_ใบเช็คชื่อ_กีฬาวอลเลย์บอล_คณะสีแสด_ปี69.pdf',
    shortName: '11.วอลเลย์บอล',
    subHeader: 'กีฬาวอลเลย์บอล (ชาย/หญิง)',
    filter: s => (s.duty || '').includes('วอลเลย์บอล')
  },
  {
    id: 'sport_12_takraw',
    title: 'ใบรายชื่อนักกีฬาเซปักตะกร้อ คณะสีแสด ปี 2569',
    fileName: '12_ใบเช็คชื่อ_กีฬาเซปักตะกร้อ_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '12_ใบเช็คชื่อ_กีฬาเซปักตะกร้อ_คณะสีแสด_ปี69.pdf',
    shortName: '12.ตะกร้อ',
    subHeader: 'กีฬาเซปักตะกร้อ (ทีมชาย)',
    filter: s => (s.duty || '').includes('ตะกร้อ')
  },
  {
    id: 'sport_13_petanque',
    title: 'ใบรายชื่อนักกีฬาเปตอง คณะสีแสด ปี 2569',
    fileName: '13_ใบเช็คชื่อ_กีฬาเปตอง_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '13_ใบเช็คชื่อ_กีฬาเปตอง_คณะสีแสด_ปี69.pdf',
    shortName: '13.เปตอง',
    subHeader: 'กีฬาเปตอง (ม.ต้น / ม.ปลาย)',
    filter: s => (s.duty || '').includes('เปตอง')
  },
  {
    id: 'sport_14_athletics',
    title: 'ใบรายชื่อนักกีฬากรีฑา คณะสีแสด ปี 2569',
    fileName: '14_ใบเช็คชื่อ_กีฬากรีฑา_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '14_ใบเช็คชื่อ_กีฬากรีฑา_คณะสีแสด_ปี69.pdf',
    shortName: '14.กรีฑา',
    subHeader: 'กีฬากรีฑา (ลู่/ลาน)',
    filter: s => (s.duty || '').includes('กรีฑา')
  },
  {
    id: 'sport_15_running16',
    title: 'ใบรายชื่อนักกีฬาวิ่ง 16 ขา คณะสีแสด ปี 2569',
    fileName: '15_ใบเช็คชื่อ_กีฬาวิ่ง16ขา_คณะสีแสด_ปี69.xlsx',
    pdfFileName: '15_ใบเช็คชื่อ_กีฬาวิ่ง16ขา_คณะสีแสด_ปี69.pdf',
    shortName: '15.วิ่ง 16 ขา',
    subHeader: 'กีฬาวิ่ง 16 ขา (ทีมผสม)',
    filter: s => (s.duty || '').includes('16 ขา')
  },

  // --- 6 ระดับชั้น ม.1 - ม.6 ---
  {
    id: 'grade_m1',
    title: 'ใบรายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 1 ปี 2569',
    fileName: '16_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม1_ปี69.xlsx',
    pdfFileName: '16_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม1_ปี69.pdf',
    shortName: '16.สมาชิก ม.1',
    subHeader: 'ระดับชั้นมัธยมศึกษาปีที่ 1 (ม.1)',
    filter: s => s.grade === 1
  },
  {
    id: 'grade_m2',
    title: 'ใบรายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 2 ปี 2569',
    fileName: '17_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม2_ปี69.xlsx',
    pdfFileName: '17_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม2_ปี69.pdf',
    shortName: '17.สมาชิก ม.2',
    subHeader: 'ระดับชั้นมัธยมศึกษาปีที่ 2 (ม.2)',
    filter: s => s.grade === 2
  },
  {
    id: 'grade_m3',
    title: 'ใบรายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 3 ปี 2569',
    fileName: '18_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม3_ปี69.xlsx',
    pdfFileName: '18_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม3_ปี69.pdf',
    shortName: '18.สมาชิก ม.3',
    subHeader: 'ระดับชั้นมัธยมศึกษาปีที่ 3 (ม.3)',
    filter: s => s.grade === 3
  },
  {
    id: 'grade_m4',
    title: 'ใบรายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 4 ปี 2569',
    fileName: '19_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม4_ปี69.xlsx',
    pdfFileName: '19_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม4_ปี69.pdf',
    shortName: '19.สมาชิก ม.4',
    subHeader: 'ระดับชั้นมัธยมศึกษาปีที่ 4 (ม.4)',
    filter: s => s.grade === 4
  },
  {
    id: 'grade_m5',
    title: 'ใบรายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 5 ปี 2569',
    fileName: '20_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม5_ปี69.xlsx',
    pdfFileName: '20_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม5_ปี69.pdf',
    shortName: '20.สมาชิก ม.5',
    subHeader: 'ระดับชั้นมัธยมศึกษาปีที่ 5 (ม.5)',
    filter: s => s.grade === 5
  },
  {
    id: 'grade_m6',
    title: 'ใบรายชื่อสมาชิกคณะสีแสด ระดับชั้นมัธยมศึกษาปีที่ 6 ปี 2569',
    fileName: '21_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม6_ปี69.xlsx',
    pdfFileName: '21_ใบเช็คชื่อ_สมาชิกคณะสีแสด_ม6_ปี69.pdf',
    shortName: '21.สมาชิก ม.6',
    subHeader: 'ระดับชั้นมัธยมศึกษาปีที่ 6 (ม.6)',
    filter: s => s.grade === 6
  },

  // --- 6 กลุ่มพ่อครูแม่ครู / พี่ดูแลน้อง ---
  {
    id: 'mentor_m1',
    title: 'ใบเช็คชื่อกลุ่มพ่อครูแม่ครูและพี่สตาฟดูแลน้อง — ม.1 คณะสีแสด ปี 2569',
    fileName: '22_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม1_ปี69.xlsx',
    pdfFileName: '22_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม1_ปี69.pdf',
    shortName: '22.พ่อครูแม่ครู ม.1',
    subHeader: 'กลุ่มพ่อครูแม่ครู / พี่สตาฟดูแลน้อง ม.1',
    mentorBox: true,
    filter: s => s.grade === 1
  },
  {
    id: 'mentor_m2',
    title: 'ใบเช็คชื่อกลุ่มพ่อครูแม่ครูและพี่สตาฟดูแลน้อง — ม.2 คณะสีแสด ปี 2569',
    fileName: '23_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม2_ปี69.xlsx',
    pdfFileName: '23_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม2_ปี69.pdf',
    shortName: '23.พ่อครูแม่ครู ม.2',
    subHeader: 'กลุ่มพ่อครูแม่ครู / พี่สตาฟดูแลน้อง ม.2',
    mentorBox: true,
    filter: s => s.grade === 2
  },
  {
    id: 'mentor_m3',
    title: 'ใบเช็คชื่อกลุ่มพ่อครูแม่ครูและพี่สตาฟดูแลน้อง — ม.3 คณะสีแสด ปี 2569',
    fileName: '24_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม3_ปี69.xlsx',
    pdfFileName: '24_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม3_ปี69.pdf',
    shortName: '24.พ่อครูแม่ครู ม.3',
    subHeader: 'กลุ่มพ่อครูแม่ครู / พี่สตาฟดูแลน้อง ม.3',
    mentorBox: true,
    filter: s => s.grade === 3
  },
  {
    id: 'mentor_m4',
    title: 'ใบเช็คชื่อกลุ่มพ่อครูแม่ครูและพี่สตาฟดูแลน้อง — ม.4 คณะสีแสด ปี 2569',
    fileName: '25_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม4_ปี69.xlsx',
    pdfFileName: '25_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม4_ปี69.pdf',
    shortName: '25.พ่อครูแม่ครู ม.4',
    subHeader: 'กลุ่มพ่อครูแม่ครู / พี่สตาฟดูแลน้อง ม.4',
    mentorBox: true,
    filter: s => s.grade === 4
  },
  {
    id: 'mentor_m5',
    title: 'ใบเช็คชื่อกลุ่มพ่อครูแม่ครู — ม.5 คณะสีแสด ปี 2569',
    fileName: '26_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม5_ปี69.xlsx',
    pdfFileName: '26_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม5_ปี69.pdf',
    shortName: '26.พ่อครูแม่ครู ม.5',
    subHeader: 'กลุ่มพ่อครูแม่ครู / คณะทำงาน ม.5',
    mentorBox: true,
    filter: s => s.grade === 5
  },
  {
    id: 'mentor_m6',
    title: 'ใบเช็คชื่อกลุ่มพ่อครูแม่ครู — ม.6 คณะสีแสด ปี 2569',
    fileName: '27_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม6_ปี69.xlsx',
    pdfFileName: '27_ใบเช็คชื่อ_กลุ่มพ่อครูแม่ครู_ม6_ปี69.pdf',
    shortName: '27.พ่อครูแม่ครู ม.6',
    subHeader: 'กลุ่มพ่อครูแม่ครู / พี่ใหญ่ ม.6',
    mentorBox: true,
    filter: s => s.grade === 6
  }
];

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

const headerFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F2F2' }
};

function buildSheet(ws, group, students) {
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
  };

  let currentRow = 1;

  // Title Row
  ws.mergeCells(currentRow, 1, currentRow, 11);
  const titleCell = ws.getCell(currentRow, 1);
  titleCell.value = group.title;
  titleCell.font = { name: 'Sarabun', size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(currentRow).height = 32;
  currentRow++;

  // Optional Mentor / Advisor Info Box
  if (group.mentorBox) {
    ws.mergeCells(currentRow, 1, currentRow, 11);
    const mentorCell = ws.getCell(currentRow, 1);
    mentorCell.value = `👨‍🏫 พ่อครู/แม่ครู (ครูที่ปรึกษา): ....................................................   👑 พี่สตาฟผู้ดูแล: ....................................................   (จำนวน ${students.length} คน)`;
    mentorCell.font = { name: 'Sarabun', size: 11, bold: true };
    mentorCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(currentRow).height = 24;
    currentRow++;
  }

  currentRow++;

  // Table Headers
  const headerRow1 = currentRow;
  ws.mergeCells(headerRow1, 1, headerRow1 + 1, 1);
  ws.mergeCells(headerRow1, 2, headerRow1 + 1, 2);
  ws.mergeCells(headerRow1, 3, headerRow1 + 1, 3);
  ws.mergeCells(headerRow1, 4, headerRow1 + 1, 4);
  ws.mergeCells(headerRow1, 5, headerRow1 + 1, 5);
  ws.mergeCells(headerRow1, 6, headerRow1 + 1, 6);
  ws.mergeCells(headerRow1, 7, headerRow1, 11);

  ws.getCell(headerRow1, 1).value = 'ลำดับ';
  ws.getCell(headerRow1, 2).value = 'ชั้น/ห้อง';
  ws.getCell(headerRow1, 3).value = 'รหัสประจำตัว';
  ws.getCell(headerRow1, 4).value = 'ชื่อ - นามสกุล';
  ws.getCell(headerRow1, 5).value = 'เบอร์โทรศัพท์';
  ws.getCell(headerRow1, 6).value = 'ชื่อเล่น';
  ws.getCell(headerRow1, 7).value = 'เช็คชื่อ';

  const headerRow2 = headerRow1 + 1;
  for (let c = 7; c <= 11; c++) {
    ws.getCell(headerRow2, c).value = `${c - 6}`;
  }

  for (let r = headerRow1; r <= headerRow2; r++) {
    ws.getRow(r).height = 22;
    for (let c = 1; c <= 11; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { name: 'Sarabun', size: 11, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
      cell.fill = headerFill;
    }
  }

  currentRow = headerRow2 + 1;

  students.forEach((st, idx) => {
    const row = ws.getRow(currentRow);
    row.height = 24;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = st.roomFull || `ม.${st.grade}/${st.room || '-'}`;
    row.getCell(3).value = st.id || '';
    row.getCell(4).value = st.name || '';
    row.getCell(5).value = st.phone || '';
    row.getCell(6).value = '';
    row.getCell(7).value = '';
    row.getCell(8).value = '';
    row.getCell(9).value = '';
    row.getCell(10).value = '';
    row.getCell(11).value = '';

    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 7; c <= 11; c++) {
      row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    for (let c = 1; c <= 11; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Sarabun', size: 10.5 };
      cell.border = thinBorder;
    }

    currentRow++;
  });

  ws.columns = [
    { width: 7 },  // ลำดับ
    { width: 10 }, // ชั้น/ห้อง
    { width: 14 }, // รหัสประจำตัว
    { width: 32 }, // ชื่อ - นามสกุล
    { width: 16 }, // เบอร์โทรศัพท์
    { width: 12 }, // ชื่อเล่น
    { width: 7 },  // เช็ค 1
    { width: 7 },  // เช็ค 2
    { width: 7 },  // เช็ค 3
    { width: 7 },  // เช็ค 4
    { width: 7 }   // เช็ค 5
  ];
}

async function generateAttendanceExcel() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 📊 เริ่มต้นสร้างไฟล์ Excel ใบเช็คชื่อ ทุกฝ่าย ทุก ม. ทุกกลุ่มพ่อครูแม่ครู ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const masterWb = new ExcelJS.Workbook();
  masterWb.creator = 'คณะสีแสด (สีบุษราคัม)';
  masterWb.created = new Date();

  for (const group of attendanceGroups) {
    let students = studentsMaster.filter(group.filter);

    students.sort((a, b) => {
      if (a.grade !== b.grade) return (a.grade || 0) - (b.grade || 0);
      if (a.room !== b.room) return (a.room || 0) - (b.room || 0);
      if (a.classNo !== b.classNo) return (parseInt(a.classNo) || 0) - (parseInt(b.classNo) || 0);
      return (a.id || '').localeCompare(b.id || '');
    });

    // 1. Individual File
    const singleWb = new ExcelJS.Workbook();
    singleWb.creator = 'คณะสีแสด (สีบุษราคัม)';
    singleWb.created = new Date();
    const singleWs = singleWb.addWorksheet('ใบเช็คชื่อ');
    buildSheet(singleWs, group, students);

    const outPath = path.join(outExcelDir, group.fileName);
    await singleWb.xlsx.writeFile(outPath);
    console.log(`  ✅ สร้างไฟล์ Excel สำเร็จ: ${group.fileName} (${students.length} คน)`);

    // 2. Master Workbook Sheet
    const masterWs = masterWb.addWorksheet(group.shortName);
    buildSheet(masterWs, group, students);
  }

  const masterOutPath = path.join(outExcelDir, '00_ไฟล์รวมเล่ม_ใบเช็คชื่อทุกฝ่ายและทุกระดับชั้น_ปี69.xlsx');
  await masterWb.xlsx.writeFile(masterOutPath);
  console.log(`\n🎉 สร้างไฟล์ Master Excel รวม 27 ชีตสำเร็จ: 00_ไฟล์รวมเล่ม_ใบเช็คชื่อทุกฝ่ายและทุกระดับชั้น_ปี69.xlsx\n`);
}

if (require.main === module) {
  generateAttendanceExcel().catch(console.error);
}

module.exports = { generateAttendanceExcel, attendanceGroups };
