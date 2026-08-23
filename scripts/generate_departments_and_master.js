const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const cheerio = require('cheerio');
const { PDFParse } = require('pdf-parse');
const ExcelJS = require('exceljs');

async function main() {
  console.log('=== [1/4] รวบรวมข้อมูลนักเรียนทั้งโรงเรียนและคณะสีแสด ===');
  const rootDir = path.resolve(__dirname, '..');
  const sourceDir = path.join(rootDir, 'ข้อมูลต้นฉบับ');
  const masterDir = path.join(rootDir, 'เอกสารและรายชื่อคณะสีแสด_ปี69');
  if (!fs.existsSync(masterDir)) fs.mkdirSync(masterDir, { recursive: true });

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
  const gradeStudents = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
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

      const student = {
        stdId: id,
        pdfNo: parseInt(num),
        name: finalName,
        grade: grade,
        room: room,
        roomFull: `ม.${grade}/${room}`,
        classNo: xls ? xls.classNo : '-',
        gender: gender,
        roles: [],
        phone: '',
        remark: remark ? remark.trim() : ''
      };

      studentMap.set(id, student);
      if (gradeStudents[grade]) {
        gradeStudents[grade].push(student);
      }
    }
  });

  function addRole(id, role, phone = '') {
    const s = studentMap.get(id);
    if (!s) {
      console.warn(`[NOT FOUND] ID: ${id} for ${role}`);
      return;
    }
    if (!s.roles.includes(role)) {
      s.roles.push(role);
    }
    if (phone) {
      s.phone = phone;
    }
  }

  // 1. วิ่ง 16 ขา
  addRole('34227', 'วิ่ง 16 ขา', '063-861-0700');
  addRole('33261', 'วิ่ง 16 ขา', '099 303 8547');
  addRole('35461', 'วิ่ง 16 ขา', '0924150997');
  addRole('33214', 'วิ่ง 16 ขา', '091 046 7584');
  addRole('35521', 'วิ่ง 16 ขา', '065-003-4526');
  addRole('35537', 'วิ่ง 16 ขา', '093 952 7843');
  addRole('33369', 'วิ่ง 16 ขา', '096 663 3965');
  addRole('33399', 'วิ่ง 16 ขา', '093-329-6478');

  // 2. ฟุตบอล ชาย ม.ปลาย
  addRole('33340', 'ฟุตบอล');
  addRole('33005', 'ฟุตบอล');
  addRole('32996', 'ฟุตบอล');
  addRole('35413', 'ฟุตบอล');
  addRole('33404', 'ฟุตบอล');
  addRole('33353', 'ฟุตบอล');
  addRole('33349', 'ฟุตบอล');
  addRole('35523', 'ฟุตบอล', '096-651-9248');
  addRole('32972', 'ฟุตบอล');

  // 3. ฟุตบอล ชาย ม.ต้น
  addRole('34361', 'ฟุตบอล');
  addRole('34625', 'ฟุตบอล');
  addRole('34607', 'ฟุตบอล');
  addRole('34631', 'ฟุตบอล');
  addRole('34547', 'ฟุตบอล');
  addRole('34277', 'ฟุตบอล');
  addRole('33701', 'ฟุตบอล');
  addRole('33707', 'ฟุตบอล');
  addRole('33659', 'ฟุตบอล');
  addRole('33677', 'ฟุตบอล');
  addRole('33971', 'ฟุตบอล');
  addRole('33671', 'ฟุตบอล');
  addRole('33791', 'ฟุตบอล');
  addRole('34481', 'ฟุตบอล');
  addRole('34475', 'ฟุตบอล');

  // 4. บาสเกตบอล
  addRole('33785', 'บาสเกตบอล');
  addRole('34283', 'บาสเกตบอล');
  addRole('33623', 'บาสเกตบอล');
  addRole('33683', 'บาสเกตบอล');
  addRole('33737', 'บาสเกตบอล');
  addRole('33941', 'บาสเกตบอล', '090-324-8827');
  addRole('34061', 'บาสเกตบอล');
  addRole('34031', 'บาสเกตบอล');
  addRole('34067', 'บาสเกตบอล');
  addRole('35512', 'บาสเกตบอล');
  addRole('33000', 'บาสเกตบอล');
  addRole('34445', 'บาสเกตบอล');
  addRole('34451', 'บาสเกตบอล');
  addRole('34529', 'บาสเกตบอล');

  // 5. ตะกร้อ
  addRole('34475', 'ตะกร้อ', '061-913-7083');
  addRole('34481', 'ตะกร้อ', '093-196-2875');
  addRole('32651', 'ตะกร้อ', '085-2676036');
  addRole('35506', 'ตะกร้อ', '095-935-5206');
  addRole('32558', 'ตะกร้อ');

  // 6. กรีฑา
  addRole('33439', 'กรีฑา', '099 462 8457');
  addRole('34355', 'กรีฑา', '093 572 8163');
  addRole('34397', 'กรีฑา', '063 350 1784');
  addRole('34271', 'กรีฑา', '065 982 2715');
  addRole('33887', 'กรีฑา', '080 985 5938');
  addRole('34643', 'กรีฑา', '093 319 7162');
  addRole('33923', 'กรีฑา', '064 496 1183');
  addRole('33935', 'กรีฑา', '082 307 8878');
  addRole('33863', 'กรีฑา', '061-651-2422');
  addRole('35521', 'กรีฑา', '065-003-4526');

  // 7. เปตอง
  addRole('34553', 'เปตอง');
  addRole('33947', 'เปตอง');
  addRole('33821', 'เปตอง');
  addRole('34349', 'เปตอง');
  addRole('33959', 'เปตอง');
  addRole('33731', 'เปตอง');
  addRole('33875', 'เปตอง');
  addRole('34493', 'เปตอง');
  addRole('33160', 'เปตอง');
  addRole('33982', 'เปตอง');

  // 8. วอลเลย์บอล
  addRole('34391', 'วอลเลย์บอล');
  addRole('34397', 'วอลเลย์บอล');
  addRole('34307', 'วอลเลย์บอล');
  addRole('34319', 'วอลเลย์บอล');
  addRole('35574', 'วอลเลย์บอล');
  addRole('33863', 'วอลเลย์บอล', '061-651-2422');
  addRole('33773', 'วอลเลย์บอล');
  addRole('34331', 'วอลเลย์บอล');
  addRole('34343', 'วอลเลย์บอล');
  addRole('34337', 'วอลเลย์บอล');
  addRole('34385', 'วอลเลย์บอล');
  addRole('34637', 'วอลเลย์บอล');
  addRole('34367', 'วอลเลย์บอล');
  addRole('35088', 'วอลเลย์บอล');
  addRole('35407', 'วอลเลย์บอล');
  addRole('35506', 'วอลเลย์บอล');
  addRole('35512', 'วอลเลย์บอล');
  addRole('35440', 'วอลเลย์บอล', '099-920-7966');
  addRole('35521', 'วอลเลย์บอล', '065-003-4526');
  addRole('35490', 'วอลเลย์บอล');

  // 9. ฟุตบอลหญิง
  addRole('33725', 'ฟุตบอล', '061 983 7797');
  addRole('34079', 'ฟุตบอล', '090 285 1181');
  addRole('34673', 'ฟุตบอล', '062-320-5140');
  addRole('33797', 'ฟุตบอล', '098-539 1599');
  addRole('34385', 'ฟุตบอล', '082-804-2534');
  addRole('34367', 'ฟุตบอล', '092-837-2250');
  addRole('34637', 'ฟุตบอล', '065-065-7095');
  addRole('34643', 'ฟุตบอล', '093-3197162');
  addRole('34968', 'ฟุตบอล', '0852266457');
  addRole('33839', 'ฟุตบอล', '093-1318 108');
  addRole('32631', 'ฟุตบอล', '080-887-7109');
  addRole('32510', 'ฟุตบอล', '061-553-0671');
  addRole('32495', 'ฟุตบอล', '088 293 2414');
  addRole('33845', 'ฟุตบอล', '080 800 6634');
  addRole('32757', 'ฟุตบอล', '084-989-0044');

  // 10. สวัสดิการ (เฉพาะ ม.4)
  addRole('35490', 'สวัสดิการ', '091-046-2589');
  addRole('33427', 'สวัสดิการ', '083-799-7780');
  addRole('33110', 'สวัสดิการ', '064-326-0371');
  addRole('35469', 'สวัสดิการ', '062-479-0695');
  addRole('33301', 'สวัสดิการ', '060-373-1209');
  addRole('33137', 'สวัสดิการ', '065-837-6263');
  addRole('35436', 'สวัสดิการ', '098-463-4302');
  addRole('35445', 'สวัสดิการ', '061-193-3676');

  // 11. ดรัมเมเยอร์
  addRole('33130', 'ดรัมเมเยอร์', '098-817-0691');
  addRole('33803', 'ดรัมเมเยอร์', '085-849-9682');
  addRole('33419', 'ดรัมเมเยอร์', '096-359-4382');
  addRole('33845', 'ดรัมเมเยอร์', '080-800-6634');
  addRole('33641', 'ดรัมเมเยอร์', '099-616-9767');
  addRole('32631', 'ดรัมเมเยอร์', '080-887-7109');
  addRole('32510', 'ดรัมเมเยอร์', '061-553-0671');
  addRole('32653', 'ดรัมเมเยอร์');

  // 12. สแตนเชียร์ (นักเรียน ม.1 ทุกคน)
  gradeStudents[1].forEach(s => {
    addRole(s.stdId, 'สแตนเชียร์');
  });

  // 13. ฝ่ายเชียร์ลีดเดอร์ (จากใบรับสมัคร)
  const cheerData = [
    { id: "34487", role: "เชียร์ลีดเดอร์", phone: "096-757-5287" },
    { id: "35567", role: "เชียร์ลีดเดอร์", phone: "092-448-7639" },
    { id: "34535", role: "เชียร์ลีดเดอร์", phone: "096-169-3324" },
    { id: "33899", role: "เชียร์ลีดเดอร์", phone: "062-812-5918" },
    { id: "34073", role: "เชียร์ลีดเดอร์", phone: "095-470-1670" },
    { id: "33869", role: "เชียร์ลีดเดอร์", phone: "091-843-4965" },
    { id: "33325", role: "เชียร์ลีดเดอร์", phone: "062-514-6471" },
    { id: "33791", role: "เชียร์ลีดเดอร์", phone: "094-954-0486" },
    { id: "33749", role: "เชียร์ลีดเดอร์", phone: "" },
    { id: "35232", role: "เชียร์ลีดเดอร์", phone: "" },
    { id: "33929", role: "เชียร์ลีดเดอร์", phone: "091-843-9779" }
  ];
  cheerData.forEach(c => addRole(c.id, c.role, c.phone));

  // 14. ฝ่ายพร็อพ (จากใบรับสมัคร 22 คน)
  const propsData = [
    { id: "33221", role: "สตาฟพร็อพ", phone: "083-219-5152" },
    { id: "35532", role: "สตาฟพร็อพ", phone: "095-682-6677" },
    { id: "33323", role: "สตาฟพร็อพ", phone: "082-906-9603" },
    { id: "33617", role: "สตาฟพร็อพ", phone: "096-231-9400" },
    { id: "34858", role: "สตาฟพร็อพ", phone: "091-049-3472" },
    { id: "33635", role: "สตาฟพร็อพ", phone: "065-963-5206" },
    { id: "33917", role: "สตาฟพร็อพ", phone: "095-358-9547" },
    { id: "33995", role: "สตาฟพร็อพ", phone: "080-137-4426" },
    { id: "34373", role: "สตาฟพร็อพ", phone: "082-594-4531" },
    { id: "33719", role: "สตาฟพร็อพ", phone: "096-294-5586" },
    { id: "34019", role: "สตาฟพร็อพ", phone: "098-951-4742" },
    { id: "33965", role: "สตาฟพร็อพ", phone: "065-975-1810" },
    { id: "34505", role: "สตาฟพร็อพ", phone: "061-314-0692" },
    { id: "34379", role: "สตาฟพร็อพ", phone: "099-272-6458" },
    { id: "33815", role: "สตาฟพร็อพ", phone: "098-689-7527" },
    { id: "35589", role: "สตาฟพร็อพ", phone: "065-250-6293" },
    { id: "33809", role: "สตาฟพร็อพ", phone: "063-019-1154" },
    { id: "33755", role: "สตาฟพร็อพ", phone: "082-965-5881" },
    { id: "33761", role: "สตาฟพร็อพ", phone: "083-097-3619" },
    { id: "34862", role: "สตาฟพร็อพ", phone: "098-738-9760" },
    { id: "33683", role: "สตาฟพร็อพ", phone: "083-097-3532" },
    { id: "33695", role: "สตาฟพร็อพ", phone: "099-738-2345" }
  ];
  propsData.forEach(p => addRole(p.id, p.role, p.phone));

  // 15. คณะกรรมการและสตาฟ ม.5 (Google Sheets)
  const m5StaffData = [
    {
        "id": "32792",
        "role": "ประธาน",
        "phone": "091-934-4386"
    },
    {
        "id": "34734",
        "role": "รองประธาน",
        "phone": "081-119-8898"
    },
    {
        "id": "32839",
        "role": "รองประธาน",
        "phone": "061-267-2452"
    },
    {
        "id": "32495",
        "role": "รองประธาน",
        "phone": "088-293-2417"
    },
    {
        "id": "32742",
        "role": "เหรัญญิก",
        "phone": "095-636-9229"
    },
    {
        "id": "32550",
        "role": "เฮดเชียร์",
        "phone": "065-493-0315"
    },
    {
        "id": "34781",
        "role": "เฮดเชียร์",
        "phone": "083-884-2697"
    },
    {
        "id": "32764",
        "role": "สตาฟเชียร์",
        "phone": "083-025-2578"
    },
    {
        "id": "32429",
        "role": "เฮดเชียร์",
        "phone": "065-687-9600"
    },
    {
        "id": "32428",
        "role": "เฮดเชียร์",
        "phone": "062-220-7959"
    },
    {
        "id": "32587",
        "role": "เฮดเชียร์",
        "phone": "063-546-8896"
    },
    {
        "id": "32722",
        "role": "เฮดขบวน",
        "phone": ""
    },
    {
        "id": "32733",
        "role": "เฮดขบวน",
        "phone": "061-342-4449"
    },
    {
        "id": "32653",
        "role": "ดรัม",
        "phone": "099-263-2316"
    },
    {
        "id": "32631",
        "role": "เฮดขบวน",
        "phone": "080-887-7109"
    },
    {
        "id": "32510",
        "role": "เฮดขบวน",
        "phone": "061-553-0691"
    },
    {
        "id": "32850",
        "role": "คัลเลอร์การ์ด",
        "phone": "063-786-4656"
    },
    {
        "id": "32855",
        "role": "เฮดขบวน",
        "phone": ""
    },
    {
        "id": "32845",
        "role": "เฮดขบวน",
        "phone": ""
    },
    {
        "id": "32553",
        "role": "สตาฟขบวน",
        "phone": "097-219-3314"
    },
    {
        "id": "32699",
        "role": "เฮดขบวน",
        "phone": ""
    },
    {
        "id": "32512",
        "role": "เฮดหลีด",
        "phone": "065-224-7704"
    },
    {
        "id": "32505",
        "role": "เฮดหลีด",
        "phone": "093-976-7913"
    },
    {
        "id": "32454",
        "role": "สตาฟหลีด",
        "phone": "080-736-1039"
    },
    {
        "id": "32464",
        "role": "เฮดหลีด",
        "phone": "064-560-7577"
    },
    {
        "id": "32431",
        "role": "เฮดกีฬา",
        "phone": "064-569-8078"
    },
    {
        "id": "32650",
        "role": "เฮดกีฬา",
        "phone": "064-818-3467"
    },
    {
        "id": "32484",
        "role": "สตาฟบอลชาย",
        "phone": "099-387-6637"
    },
    {
        "id": "32481",
        "role": "เฮดกีฬา",
        "phone": "098-767-6896"
    },
    {
        "id": "34834",
        "role": "เฮดกีฬา",
        "phone": "061-195-0831"
    },
    {
        "id": "32748",
        "role": "สตาฟบอลหญิง",
        "phone": "094-442-9118"
    },
    {
        "id": "32972",
        "role": "เฮดกีฬา",
        "phone": "061-693-0665"
    },
    {
        "id": "32449",
        "role": "สตาฟบาส",
        "phone": "097-287-1024"
    },
    {
        "id": "32642",
        "role": "เฮดกีฬา",
        "phone": ""
    },
    {
        "id": "32448",
        "role": "เฮดกีฬา",
        "phone": "061-553-9116"
    },
    {
        "id": "32781",
        "role": "เฮดกีฬา",
        "phone": "063-209-6200"
    },
    {
        "id": "32453",
        "role": "สตาฟเปตอง",
        "phone": "063-656-8384"
    },
    {
        "id": "34743",
        "role": "เฮดกีฬา",
        "phone": "063-736-3156"
    },
    {
        "id": "32975",
        "role": "เฮดกีฬา",
        "phone": "063-889-3537"
    },
    {
        "id": "32828",
        "role": "สตาฟวอลเลย์",
        "phone": "081-339-5526"
    },
    {
        "id": "34744",
        "role": "เฮดกีฬา",
        "phone": "098-002-0611"
    },
    {
        "id": "32458",
        "role": "สตาฟกรีฑา",
        "phone": ""
    },
    {
        "id": "34844",
        "role": "เฮดกีฬา",
        "phone": "065-854-3845"
    },
    {
        "id": "32802",
        "role": "เฮดกีฬา",
        "phone": "061-331-7597"
    },
    {
        "id": "32646",
        "role": "สตาฟตะกร้อ",
        "phone": "095-935-5206"
    },
    {
        "id": "32651",
        "role": "เฮดกีฬา",
        "phone": "085-267-6036"
    },
    {
        "id": "32558",
        "role": "เฮดกีฬา",
        "phone": ""
    },
    {
        "id": "32654",
        "role": "สตาฟ 16 ขา",
        "phone": ""
    },
    {
        "id": "32796",
        "role": "เฮดกีฬา",
        "phone": "096-145-5296"
    },
    {
        "id": "32795",
        "role": "เฮดกีฬา",
        "phone": "091-838-9691"
    },
    {
        "id": "32568",
        "role": "เฮดสวัสดิการ",
        "phone": "083-917-0383"
    },
    {
        "id": "32750",
        "role": "เฮดสวัสดิการ",
        "phone": "081-058-1376"
    },
    {
        "id": "32843",
        "role": "สตาฟสวัส",
        "phone": "091-969-6155"
    },
    {
        "id": "32719",
        "role": "เฮดสวัสดิการ",
        "phone": "082-035-6213"
    },
    {
        "id": "32577",
        "role": "เฮดสวัสดิการ",
        "phone": "065-291-7532"
    },
    {
        "id": "33584",
        "role": "เฮดสวัสดิการ",
        "phone": "081-160-6764"
    },
    {
        "id": "34776",
        "role": "เฮดสวัสดิการ",
        "phone": "099-237-8944"
    },
    {
        "id": "34795",
        "role": "เฮดสวัสดิการ",
        "phone": "065-678-3202"
    },
    {
        "id": "35601",
        "role": "เฮดสวัสดิการ",
        "phone": "095-658-9660"
    },
    {
        "id": "32752",
        "role": "เฮดสวัสดิการ",
        "phone": "080-825-7625"
    },
    {
        "id": "34819",
        "role": "เฮดสวัสดิการ",
        "phone": "064-869-4386"
    },
    {
        "id": "32652",
        "role": "เฮดพร็อพ",
        "phone": "097-920-5669"
    },
    {
        "id": "32643",
        "role": "เฮดพร็อพ",
        "phone": ""
    },
    {
        "id": "34750",
        "role": "สตาฟพร็อพ",
        "phone": "061-283-2615"
    },
    {
        "id": "32641",
        "role": "เฮดพร็อพ",
        "phone": "063-891-3857"
    },
    {
        "id": "34789",
        "role": "มือกลอง",
        "phone": "064-861-6942"
    },
    {
        "id": "34770",
        "role": "มือกลอง",
        "phone": "063-113-6053"
    }
];

  m5StaffData.forEach(item => {
    addRole(item.id, item.role, item.phone || '');
  });

  // Find Edge path
  let edgePath = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
  if (!fs.existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")) {
    if (fs.existsSync("C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe")) {
      edgePath = '"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"';
    }
  }

  const deptDir = path.join(masterDir, 'แยกฝ่าย');
  if (!fs.existsSync(deptDir)) fs.mkdirSync(deptDir, { recursive: true });

  const welfareDir = path.join(deptDir, 'สวัสดิการ');
  if (!fs.existsSync(welfareDir)) fs.mkdirSync(welfareDir, { recursive: true });

  const drumDir = path.join(deptDir, 'ดรัมเมเยอร์');
  if (!fs.existsSync(drumDir)) fs.mkdirSync(drumDir, { recursive: true });

  const cheerDir = path.join(deptDir, 'สแตนเชียร์');
  if (!fs.existsSync(cheerDir)) fs.mkdirSync(cheerDir, { recursive: true });

  const staffDir = path.join(deptDir, 'สตาฟ');
  if (!fs.existsSync(staffDir)) fs.mkdirSync(staffDir, { recursive: true });

  const cheerleaderDir = path.join(deptDir, 'เชียร์ลีดเดอร์');
  if (!fs.existsSync(cheerleaderDir)) fs.mkdirSync(cheerleaderDir, { recursive: true });

  const propsDir = path.join(deptDir, 'พร็อพ');
  if (!fs.existsSync(propsDir)) fs.mkdirSync(propsDir, { recursive: true });

  // Styles
  const ORANGE_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE65100' } };
  const BANNER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
  const ZEBRA_LIGHT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFAF0' } };
  const SUMMARY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
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

  // Load updated duties and phones from data/students_master.json (Live Google Sheet Sync)
  const liveMasterPath = path.join(rootDir, 'data', 'students_master.json');
  if (fs.existsSync(liveMasterPath)) {
    const liveMaster = JSON.parse(fs.readFileSync(liveMasterPath, 'utf8'));
    const liveMap = new Map(liveMaster.map(st => [st.id, st]));

    for (let g = 1; g <= 6; g++) {
      gradeStudents[g].forEach(s => {
        if (liveMap.has(s.stdId)) {
          const liveInfo = liveMap.get(s.stdId);
          if (liveInfo.duty) {
            s.roles = liveInfo.duty.split(',').map(d => d.trim()).filter(Boolean);
          }
          if (liveInfo.phone && liveInfo.phone !== '-') {
            s.phone = liveInfo.phone;
          }
        }
      });
    }
  }

  // =========================================================================
  // 1. สร้างไฟล์ Excel รายชื่อรวมหลัก
  // =========================================================================
  console.log('\n=== [2/4] สร้างไฟล์ Excel รายชื่อรวมหลัก ม.1 - ม.6 ===');
  const wbMaster = new ExcelJS.Workbook();
  wbMaster.creator = 'คณะสีแสด (สีบุษราคัม)';
  wbMaster.created = new Date();

  for (let g = 1; g <= 6; g++) {
    const ws = wbMaster.addWorksheet(`ม.${g}`, {
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
    const assignedCount = students.filter(s => s.roles.length > 0).length;

    ws.mergeCells('A1:K1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `รายชื่อนักเรียน คณะสีแสด (สีบุษราคัม) - ระดับชั้นมัธยมศึกษาปีที่ ${g}`;
    titleCell.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = BANNER_FILL;
    ws.getRow(1).height = 36;

    ws.mergeCells('A2:K2');
    const subCell = ws.getCell('A2');
    subCell.value = `จำนวนนักเรียน: ${totalCount} คน | ชาย: ${maleCount} คน | หญิง: ${femaleCount} คน | ผู้มีหน้าที่/นักกีฬา/สตาฟ: ${assignedCount} คน (เรียงตาม: ห้องเรียน -> รหัสประจำตัว)`;
    subCell.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = BANNER_FILL;
    ws.getRow(2).height = 22;

    ws.getRow(3).height = 8;

    const headers = [
      'ลำดับ', 'ระดับชั้น', 'ห้อง', 'ชั้น/ห้อง', 'เลขที่ในห้อง',
      'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เพศ', 'ฝ่าย/หน้าที่', 'เบอร์โทรศัพท์', 'หมายเหตุ'
    ];

    const headerRow = ws.getRow(4);
    headerRow.height = 28;
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = ORANGE_HEADER_FILL;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = HEADER_BORDER;
    });

    students.forEach((s, idx) => {
      const rowIdx = idx + 5;
      const row = ws.getRow(rowIdx);
      row.height = 22;

      row.getCell(1).value = idx + 1;
      row.getCell(2).value = `ม.${s.grade}`;
      row.getCell(3).value = s.room;
      row.getCell(4).value = s.roomFull;
      row.getCell(5).value = s.classNo;
      row.getCell(6).value = s.stdId;
      row.getCell(7).value = s.name;
      row.getCell(8).value = s.gender;
      row.getCell(9).value = s.roles.length > 0 ? s.roles.join(', ') : '';
      row.getCell(10).value = s.phone || '';
      row.getCell(11).value = s.remark || '';

      const isEven = idx % 2 === 1;
      const rowFill = isEven ? ZEBRA_LIGHT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

      for (let c = 1; c <= 11; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Sarabun', size: 11, color: { argb: 'FF212121' } };
        cell.border = THIN_BORDER;
        cell.fill = rowFill;

        if (c === 7) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        } else if (c === 9 || c === 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else if (c === 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      }
    });

    const sumIdx = students.length + 5;
    const sumRow = ws.getRow(sumIdx);
    sumRow.height = 26;
    ws.mergeCells(`A${sumIdx}:F${sumIdx}`);
    const sumLabel = sumRow.getCell(1);
    sumLabel.value = `รวมทั้งสิ้น ระดับชั้น ม.${g}`;
    sumLabel.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
    sumLabel.alignment = { vertical: 'middle', horizontal: 'center' };

    for (let c = 1; c <= 6; c++) {
      sumRow.getCell(c).border = HEADER_BORDER;
      sumRow.getCell(c).fill = SUMMARY_FILL;
    }

    const sumVal = sumRow.getCell(7);
    sumVal.value = `${totalCount} คน (ชาย ${maleCount} / หญิง ${femaleCount} | ผู้มีหน้าที่ ${assignedCount} คน)`;
    sumVal.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
    sumVal.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sumVal.fill = SUMMARY_FILL;
    sumVal.border = HEADER_BORDER;

    for (let c = 8; c <= 11; c++) {
      const cell = sumRow.getCell(c);
      cell.value = '';
      cell.fill = SUMMARY_FILL;
      cell.border = HEADER_BORDER;
    }

    ws.columns = [
      { key: 'no', width: 8 },
      { key: 'grade', width: 12 },
      { key: 'room', width: 8 },
      { key: 'roomFull', width: 12 },
      { key: 'classNo', width: 14 },
      { key: 'stdId', width: 15 },
      { key: 'name', width: 32 },
      { key: 'gender', width: 10 },
      { key: 'role', width: 32 },
      { key: 'phone', width: 18 },
      { key: 'remark', width: 20 }
    ];
  }

  const masterExcelPath = path.join(masterDir, 'รายชื่อคณะสีแสด_ปี69.xlsx');
  try {
    await wbMaster.xlsx.writeFile(masterExcelPath);
    console.log(`[OK] บันทึกไฟล์ Excel รายชื่อรวมหลัก: ${masterExcelPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`[WARN] ไฟล์ ${masterExcelPath} กำลังถูกเปิดใช้งานอยู่`);
    } else {
      throw err;
    }
  }

  // =========================================================================
  // 2. สร้างไฟล์ PDF รายชื่อรวมหลัก
  // =========================================================================
  console.log('\n=== [3/4] สร้างไฟล์ PDF รายชื่อรวมหลัก ม.1 - ม.6 ===');
  let masterPdfPagesHtml = '';

  let grandTotal = 0, grandMale = 0, grandFemale = 0, grandAssigned = 0;
  for (let g = 1; g <= 6; g++) {
    const students = gradeStudents[g];
    grandTotal += students.length;
    grandMale += students.filter(s => s.gender === 'ชาย').length;
    grandFemale += students.filter(s => s.gender === 'หญิง').length;
    grandAssigned += students.filter(s => s.roles.length > 0).length;
  }

  // Cover / Summary Section
  masterPdfPagesHtml += `
    <div class="page cover-page">
      <div class="header-card">
        <div class="header-badge">📋 ทำเนียบรายชื่อนักเรียน</div>
        <h1>คณะสีแสด (สีบุษราคัม) ประจำปีการศึกษา 2569</h1>
        <div class="subtitle">โรงเรียนสรรพวิทยาคม ตาก | การแข่งขันกีฬา-กรีฑาสีภายใน</div>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-num">${grandTotal}</div>
          <div class="stat-label">นักเรียนทั้งหมด (คน)</div>
        </div>
        <div class="stat-box">
          <div class="stat-num">${grandMale}</div>
          <div class="stat-label">นักเรียนชาย (คน)</div>
        </div>
        <div class="stat-box">
          <div class="stat-num">${grandFemale}</div>
          <div class="stat-label">นักเรียนหญิง (คน)</div>
        </div>
        <div class="stat-box highlight">
          <div class="stat-num">${grandAssigned}</div>
          <div class="stat-label">ผู้มีหน้าที่ / นักกีฬา / สตาฟ (คน)</div>
        </div>
      </div>

      <div class="summary-table-container">
        <h3>📊 สรุปยอดจำนวนนักเรียนแยกตามระดับชั้น</h3>
        <table class="roster-table">
          <thead>
            <tr>
              <th>ระดับชั้น</th>
              <th>จำนวนนักเรียน (คน)</th>
              <th>ชาย (คน)</th>
              <th>หญิง (คน)</th>
              <th>นักกีฬา / สตาฟ / ผู้มีหน้าที่ (คน)</th>
            </tr>
          </thead>
          <tbody>
            ${[1,2,3,4,5,6].map(g => {
              const sts = gradeStudents[g];
              const t = sts.length;
              const m = sts.filter(s => s.gender === 'ชาย').length;
              const f = sts.filter(s => s.gender === 'หญิง').length;
              const a = sts.filter(s => s.roles.length > 0).length;
              return `
                <tr>
                  <td class="center font-bold">มัธยมศึกษาปีที่ ${g}</td>
                  <td class="center font-bold">${t}</td>
                  <td class="center">${m}</td>
                  <td class="center">${f}</td>
                  <td class="center font-bold text-orange">${a}</td>
                </tr>
              `;
            }).join('')}
            <tr class="summary-row">
              <td class="center font-bold">รวมทุกระดับชั้น</td>
              <td class="center font-bold">${grandTotal}</td>
              <td class="center font-bold">${grandMale}</td>
              <td class="center font-bold">${grandFemale}</td>
              <td class="center font-bold text-orange">${grandAssigned}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Grade Roster Pages
  for (let g = 1; g <= 6; g++) {
    const students = gradeStudents[g];
    const totalCount = students.length;
    const maleCount = students.filter(s => s.gender === 'ชาย').length;
    const femaleCount = students.filter(s => s.gender === 'หญิง').length;
    const assignedCount = students.filter(s => s.roles.length > 0).length;

    let rowsHtml = '';
    students.forEach((s, idx) => {
      rowsHtml += `
        <tr class="${idx % 2 === 1 ? 'even' : 'odd'}">
          <td class="center font-bold">${idx + 1}</td>
          <td class="center font-bold text-orange">${s.roomFull}</td>
          <td class="center">${s.classNo}</td>
          <td class="center font-mono">${s.stdId}</td>
          <td class="left font-name">${s.name}</td>
          <td class="center">${s.gender}</td>
          <td class="left ${s.roles.length > 0 ? 'font-bold text-orange' : 'text-muted'}">${s.roles.length > 0 ? s.roles.join(', ') : '-'}</td>
          <td class="center font-mono">${s.phone || '-'}</td>
        </tr>
      `;
    });

    masterPdfPagesHtml += `
      <div class="page roster-page">
        <div class="header-card compact">
          <div class="header-left">
            <h2>รายชื่อนักเรียน คณะสีแสด — ระดับชั้นมัธยมศึกษาปีที่ ${g}</h2>
            <div class="subtitle">จำนวนนักเรียน: ${totalCount} คน | ชาย ${maleCount} คน | หญิง ${femaleCount} คน | ผู้มีหน้าที่ ${assignedCount} คน</div>
          </div>
          <div class="header-right">
            <span class="badge">ม.${g}</span>
          </div>
        </div>

        <table class="roster-table">
          <thead>
            <tr>
              <th style="width: 5%;">ลำดับ</th>
              <th style="width: 8%;">ห้อง</th>
              <th style="width: 7%;">เลขที่</th>
              <th style="width: 11%;">รหัสประจำตัว</th>
              <th style="width: 27%;">ชื่อ - นามสกุล</th>
              <th style="width: 7%;">เพศ</th>
              <th style="width: 21%;">ฝ่าย / หน้าที่</th>
              <th style="width: 14%;">เบอร์โทรศัพท์</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  const masterHtmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>ทำเนียบรายชื่อนักเรียน คณะสีแสด ปี 2569</title>
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
      font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif;
      margin: 0;
      padding: 0;
      color: #212121;
      background: #ffffff;
    }

    .page {
      page-break-after: always;
      padding-bottom: 5mm;
    }
    .page:last-child {
      page-break-after: auto;
    }

    .header-card {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-left: 6px solid #e65100;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 12px;
    }
    .header-card.compact {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      margin-bottom: 10px;
    }

    .header-badge {
      display: inline-block;
      background: #e65100;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 12px;
      margin-bottom: 6px;
    }

    h1 {
      margin: 0 0 4px 0;
      color: #bf360c;
      font-size: 20px;
      font-weight: 800;
    }
    h2 {
      margin: 0 0 2px 0;
      color: #bf360c;
      font-size: 16px;
      font-weight: 700;
    }
    h3 {
      color: #bf360c;
      margin: 16px 0 8px 0;
      font-size: 14px;
    }

    .subtitle {
      font-size: 11.5px;
      color: #5d4037;
    }

    .badge {
      background: #e65100;
      color: white;
      font-size: 14px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 12px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .stat-box {
      background: #fff8e1;
      border: 1px solid #ffe082;
      border-radius: 8px;
      padding: 12px 8px;
      text-align: center;
    }
    .stat-box.highlight {
      background: #fff3e0;
      border-color: #ffb74d;
    }
    .stat-num {
      font-size: 22px;
      font-weight: 800;
      color: #e65100;
    }
    .stat-label {
      font-size: 11px;
      font-weight: 600;
      color: #5d4037;
      margin-top: 2px;
    }

    .roster-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      border: 1px solid #d6d6d6;
    }
    .roster-table th {
      background: #e65100;
      color: #ffffff;
      font-weight: 700;
      padding: 5px 3px;
      border: 1px solid #bf360c;
      text-align: center;
      font-size: 10.5px;
    }
    .roster-table td {
      padding: 3px 4px;
      border: 1px solid #e0e0e0;
      vertical-align: middle;
    }
    .roster-table tr.even { background: #fffdfa; }
    .roster-table tr.odd { background: #ffffff; }
    .roster-table tr.summary-row {
      background: #ffe0b2;
      font-weight: bold;
    }
    .roster-table tr.summary-row td {
      border-top: 2px solid #bf360c;
    }

    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-name { font-size: 10px; }
    .font-mono { font-family: monospace; font-size: 9.5px; }
    .text-orange { color: #e65100; }
    .text-muted { color: #888888; }
  </style>
</head>
<body>
  ${masterPdfPagesHtml}
</body>
</html>
  `;

  const tempMasterHtml = path.join(masterDir, 'temp_master_roster.html');
  const masterPdfPath = path.join(masterDir, 'รายชื่อคณะสีแสด_ปี69.pdf');
  fs.writeFileSync(tempMasterHtml, masterHtmlContent, 'utf-8');

  try {
    execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${masterPdfPath}" --no-pdf-header-footer "${tempMasterHtml}"`, {
      stdio: 'pipe'
    });
    console.log(`[OK] บันทึกไฟล์ PDF รายชื่อรวมหลัก: ${masterPdfPath} (${fs.statSync(masterPdfPath).size.toLocaleString()} bytes)`);
  } catch (err) {
    console.error(`[ERROR] สร้าง PDF รวมหลักไม่สำเร็จ:`, err.message);
  } finally {
    if (fs.existsSync(tempMasterHtml)) fs.unlinkSync(tempMasterHtml);
  }

  // =========================================================================
  // 3. สร้างไฟล์ Excel & PDF ฝ่ายสวัสดิการ
  // =========================================================================
  console.log('\n=== [4/4] สร้างไฟล์เอกสารแยกฝ่าย (สวัสดิการ, ดรัมเมเยอร์, สแตนเชียร์, สตาฟ) ===');
  const welfareStudents = [
    studentMap.get('35490'),
    studentMap.get('33427'),
    studentMap.get('33110'),
    studentMap.get('35469'),
    studentMap.get('33301'),
    studentMap.get('33137'),
    studentMap.get('35436'),
    studentMap.get('35445')
  ].filter(Boolean);

  const wbWelfare = new ExcelJS.Workbook();
  wbWelfare.creator = 'ฝ่ายสวัสดิการ คณะสีแสด';
  wbWelfare.created = new Date();
  const wsWelfare = wbWelfare.addWorksheet('ฝ่ายสวัสดิการ', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }]
  });

  wsWelfare.mergeCells('A1:G1');
  const wTitle = wsWelfare.getCell('A1');
  wTitle.value = '🍵 รายชื่อสมาชิกฝ่ายสวัสดิการ — คณะสีแสด (สีบุษราคัม) ปี 2569';
  wTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
  wTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wTitle.fill = BANNER_FILL;
  wsWelfare.getRow(1).height = 36;

  wsWelfare.mergeCells('A2:G2');
  const wSub = wsWelfare.getCell('A2');
  wSub.value = `จำนวนสมาชิกทั้งหมด ${welfareStudents.length} คน (ระดับชั้น ม.4) | การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569`;
  wSub.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
  wSub.alignment = { vertical: 'middle', horizontal: 'center' };
  wSub.fill = BANNER_FILL;
  wsWelfare.getRow(2).height = 22;

  const wHeaders = ['ลำดับ', 'ชั้น/ห้อง', 'เลขที่ในห้อง', 'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เพศ', 'เบอร์โทรศัพท์'];
  const wHeaderRow = wsWelfare.getRow(3);
  wHeaderRow.height = 26;
  wHeaders.forEach((h, idx) => {
    const cell = wHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = ORANGE_HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = HEADER_BORDER;
  });

  welfareStudents.forEach((s, idx) => {
    const r = wsWelfare.getRow(idx + 4);
    r.height = 24;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = s.roomFull;
    r.getCell(3).value = s.classNo;
    r.getCell(4).value = s.stdId;
    r.getCell(5).value = s.name;
    r.getCell(6).value = s.gender;
    r.getCell(7).value = s.phone;

    const rowFill = idx % 2 === 1 ? ZEBRA_LIGHT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
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
  });

  wsWelfare.columns = [
    { key: 'no', width: 8 },
    { key: 'room', width: 14 },
    { key: 'classNo', width: 14 },
    { key: 'stdId', width: 16 },
    { key: 'name', width: 34 },
    { key: 'gender', width: 10 },
    { key: 'phone', width: 22 }
  ];

  const welfareExcelPath = path.join(welfareDir, 'รายชื่อฝ่ายสวัสดิการ_คณะสีแสด_ปี69.xlsx');
  try {
    await wbWelfare.xlsx.writeFile(welfareExcelPath);
    console.log(`[OK] บันทึกไฟล์ Excel ฝ่ายสวัสดิการ: ${welfareExcelPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`[WARN] ไฟล์ ${welfareExcelPath} กำลังถูกเปิดใช้งานอยู่`);
    } else {
      throw err;
    }
  }

  const welfareHtml = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>รายชื่อฝ่ายสวัสดิการ - คณะสีแสด</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; color: #212121; }
    .header-card {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-left: 6px solid #e65100;
      border-radius: 8px;
      padding: 18px 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { margin: 0 0 6px 0; color: #bf360c; font-size: 22px; font-weight: 800; }
    .subtitle { font-size: 13px; color: #5d4037; }
    .badge { background: #e65100; color: white; font-size: 15px; font-weight: 700; padding: 6px 16px; border-radius: 20px; }
    .roster-table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #d6d6d6; }
    .roster-table th { background: #e65100; color: #ffffff; font-weight: 700; padding: 10px 8px; border: 1px solid #bf360c; text-align: center; }
    .roster-table td { padding: 9px 10px; border: 1px solid #e0e0e0; vertical-align: middle; }
    .roster-table tr.even { background: #fffdfa; }
    .roster-table tr.odd { background: #ffffff; }
    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 13px; }
    .text-orange { color: #e65100; }
  </style>
</head>
<body>
  <div class="header-card">
    <div>
      <h1>🍵 รายชื่อสมาชิกฝ่ายสวัสดิการ — คณะสีแสด</h1>
      <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | เฉพาะระดับชั้นมัธยมศึกษาปีที่ 4</div>
    </div>
    <div><span class="badge">รวม ${welfareStudents.length} คน</span></div>
  </div>

  <table class="roster-table">
    <thead>
      <tr>
        <th style="width: 8%;">ลำดับ</th>
        <th style="width: 14%;">ชั้น/ห้อง</th>
        <th style="width: 10%;">เลขที่</th>
        <th style="width: 16%;">รหัสประจำตัว</th>
        <th style="width: 32%;">ชื่อ - นามสกุล</th>
        <th style="width: 10%;">เพศ</th>
        <th style="width: 20%;">เบอร์โทรศัพท์</th>
      </tr>
    </thead>
    <tbody>
      ${welfareStudents.map((s, idx) => `
        <tr class="${idx % 2 === 1 ? 'even' : 'odd'}">
          <td class="center font-bold">${idx + 1}</td>
          <td class="center font-bold text-orange">${s.roomFull}</td>
          <td class="center">${s.classNo}</td>
          <td class="center font-mono">${s.stdId}</td>
          <td class="left font-bold">${s.name}</td>
          <td class="center">${s.gender}</td>
          <td class="center font-mono">${s.phone}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  const tempWelfareHtml = path.join(welfareDir, 'temp_welfare.html');
  const welfarePdfPath = path.join(welfareDir, 'รายชื่อฝ่ายสวัสดิการ_คณะสีแสด_ปี69.pdf');
  fs.writeFileSync(tempWelfareHtml, welfareHtml, 'utf-8');

  try {
    execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${welfarePdfPath}" --no-pdf-header-footer "${tempWelfareHtml}"`, {
      stdio: 'pipe'
    });
    console.log(`[OK] บันทึกไฟล์ PDF ฝ่ายสวัสดิการ: ${welfarePdfPath} (${fs.statSync(welfarePdfPath).size.toLocaleString()} bytes)`);
  } catch (err) {
    console.error(`[ERROR] สร้าง PDF ฝ่ายสวัสดิการไม่สำเร็จ:`, err.message);
  } finally {
    if (fs.existsSync(tempWelfareHtml)) fs.unlinkSync(tempWelfareHtml);
  }

  // =========================================================================
  // 4. สร้างไฟล์ Excel & PDF ฝ่ายดรัมเมเยอร์
  // =========================================================================
  const drumStudents = [
    studentMap.get('33130'),
    studentMap.get('33803'),
    studentMap.get('33419'),
    studentMap.get('33845'),
    studentMap.get('33641'),
    studentMap.get('32631'),
    studentMap.get('32510'),
    studentMap.get('32653')
  ].filter(Boolean);

  const wbDrum = new ExcelJS.Workbook();
  wbDrum.creator = 'ฝ่ายดรัมเมเยอร์ คณะสีแสด';
  wbDrum.created = new Date();
  const wsDrum = wbDrum.addWorksheet('ฝ่ายดรัมเมเยอร์', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }]
  });

  wsDrum.mergeCells('A1:G1');
  const dTitle = wsDrum.getCell('A1');
  dTitle.value = '🥁 รายชื่อสมาชิกฝ่ายดรัมเมเยอร์ — คณะสีแสด (สีบุษราคัม) ปี 2569';
  dTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
  dTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  dTitle.fill = BANNER_FILL;
  wsDrum.getRow(1).height = 36;

  wsDrum.mergeCells('A2:G2');
  const dSub = wsDrum.getCell('A2');
  dSub.value = `จำนวนสมาชิกทั้งหมด ${drumStudents.length} คน (ม.3 - ม.5) | การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569`;
  dSub.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
  dSub.alignment = { vertical: 'middle', horizontal: 'center' };
  dSub.fill = BANNER_FILL;
  wsDrum.getRow(2).height = 22;

  const dHeaders = ['ลำดับ', 'ชั้น/ห้อง', 'เลขที่ในห้อง', 'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เพศ', 'เบอร์โทรศัพท์'];
  const dHeaderRow = wsDrum.getRow(3);
  dHeaderRow.height = 26;
  dHeaders.forEach((h, idx) => {
    const cell = dHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = ORANGE_HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = HEADER_BORDER;
  });

  drumStudents.forEach((s, idx) => {
    const r = wsDrum.getRow(idx + 4);
    r.height = 24;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = s.roomFull;
    r.getCell(3).value = s.classNo;
    r.getCell(4).value = s.stdId;
    r.getCell(5).value = s.name;
    r.getCell(6).value = s.gender;
    r.getCell(7).value = s.phone || '-';

    const rowFill = idx % 2 === 1 ? ZEBRA_LIGHT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
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
  });

  wsDrum.columns = [
    { key: 'no', width: 8 },
    { key: 'room', width: 14 },
    { key: 'classNo', width: 14 },
    { key: 'stdId', width: 16 },
    { key: 'name', width: 34 },
    { key: 'gender', width: 10 },
    { key: 'phone', width: 22 }
  ];

  const drumExcelPath = path.join(drumDir, 'รายชื่อดรัมเมเยอร์_คณะสีแสด_ปี69.xlsx');
  try {
    await wbDrum.xlsx.writeFile(drumExcelPath);
    console.log(`[OK] บันทึกไฟล์ Excel ฝ่ายดรัมเมเยอร์: ${drumExcelPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`[WARN] ไฟล์ ${drumExcelPath} กำลังถูกเปิดใช้งานอยู่`);
    } else {
      throw err;
    }
  }

  const drumHtml = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>รายชื่อดรัมเมเยอร์ - คณะสีแสด</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; color: #212121; }
    .header-card {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-left: 6px solid #e65100;
      border-radius: 8px;
      padding: 18px 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { margin: 0 0 6px 0; color: #bf360c; font-size: 22px; font-weight: 800; }
    .subtitle { font-size: 13px; color: #5d4037; }
    .badge { background: #e65100; color: white; font-size: 15px; font-weight: 700; padding: 6px 16px; border-radius: 20px; }
    .roster-table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #d6d6d6; }
    .roster-table th { background: #e65100; color: #ffffff; font-weight: 700; padding: 10px 8px; border: 1px solid #bf360c; text-align: center; }
    .roster-table td { padding: 9px 10px; border: 1px solid #e0e0e0; vertical-align: middle; }
    .roster-table tr.even { background: #fffdfa; }
    .roster-table tr.odd { background: #ffffff; }
    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 13px; }
    .text-orange { color: #e65100; }
  </style>
</head>
<body>
  <div class="header-card">
    <div>
      <h1>🥁 รายชื่อสมาชิกฝ่ายดรัมเมเยอร์ — คณะสีแสด</h1>
      <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | ระดับชั้น ม.3 - ม.5</div>
    </div>
    <div><span class="badge">รวม ${drumStudents.length} คน</span></div>
  </div>

  <table class="roster-table">
    <thead>
      <tr>
        <th style="width: 8%;">ลำดับ</th>
        <th style="width: 14%;">ชั้น/ห้อง</th>
        <th style="width: 10%;">เลขที่</th>
        <th style="width: 16%;">รหัสประจำตัว</th>
        <th style="width: 32%;">ชื่อ - นามสกุล</th>
        <th style="width: 10%;">เพศ</th>
        <th style="width: 20%;">เบอร์โทรศัพท์</th>
      </tr>
    </thead>
    <tbody>
      ${drumStudents.map((s, idx) => `
        <tr class="${idx % 2 === 1 ? 'even' : 'odd'}">
          <td class="center font-bold">${idx + 1}</td>
          <td class="center font-bold text-orange">${s.roomFull}</td>
          <td class="center">${s.classNo}</td>
          <td class="center font-mono">${s.stdId}</td>
          <td class="left font-bold">${s.name}</td>
          <td class="center">${s.gender}</td>
          <td class="center font-mono">${s.phone || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  const tempDrumHtml = path.join(drumDir, 'temp_drum.html');
  const drumPdfPath = path.join(drumDir, 'รายชื่อดรัมเมเยอร์_คณะสีแสด_ปี69.pdf');
  fs.writeFileSync(tempDrumHtml, drumHtml, 'utf-8');

  try {
    execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${drumPdfPath}" --no-pdf-header-footer "${tempDrumHtml}"`, {
      stdio: 'pipe'
    });
    console.log(`[OK] บันทึกไฟล์ PDF ฝ่ายดรัมเมเยอร์: ${drumPdfPath} (${fs.statSync(drumPdfPath).size.toLocaleString()} bytes)`);
  } catch (err) {
    console.error(`[ERROR] สร้าง PDF ฝ่ายดรัมเมเยอร์ไม่สำเร็จ:`, err.message);
  } finally {
    if (fs.existsSync(tempDrumHtml)) fs.unlinkSync(tempDrumHtml);
  }

  // =========================================================================
  // 5. สร้างไฟล์ Excel & PDF ฝ่ายสแตนเชียร์
  // =========================================================================
  const cheerStudents = [...gradeStudents[1]];
  cheerStudents.sort((a, b) => {
    if (a.room !== b.room) return a.room - b.room;
    return a.stdId.localeCompare(b.stdId, undefined, { numeric: true });
  });

  const wbCheer = new ExcelJS.Workbook();
  wbCheer.creator = 'ฝ่ายสแตนเชียร์ คณะสีแสด';
  wbCheer.created = new Date();
  const wsCheer = wbCheer.addWorksheet('ฝ่ายสแตนเชียร์', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }]
  });

  wsCheer.mergeCells('A1:H1');
  const cTitle = wsCheer.getCell('A1');
  cTitle.value = '📣 รายชื่อสมาชิกฝ่ายสแตนเชียร์ — คณะสีแสด (สีบุษราคัม) ปี 2569';
  cTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
  cTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  cTitle.fill = BANNER_FILL;
  wsCheer.getRow(1).height = 36;

  const maleCheer = cheerStudents.filter(s => s.gender === 'ชาย').length;
  const femaleCheer = cheerStudents.filter(s => s.gender === 'หญิง').length;

  wsCheer.mergeCells('A2:H2');
  const cSub = wsCheer.getCell('A2');
  cSub.value = `จำนวนสมาชิกทั้งหมด ${cheerStudents.length} คน (ชาย ${maleCheer} / หญิง ${femaleCheer} | ระดับชั้น ม.1) | การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569`;
  cSub.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
  cSub.alignment = { vertical: 'middle', horizontal: 'center' };
  cSub.fill = BANNER_FILL;
  wsCheer.getRow(2).height = 22;

  const cHeaders = ['ลำดับ', 'ชั้น/ห้อง', 'เลขที่ในห้อง', 'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เพศ', 'ฝ่าย/หน้าที่', 'เบอร์โทรศัพท์'];
  const cHeaderRow = wsCheer.getRow(3);
  cHeaderRow.height = 26;
  cHeaders.forEach((h, idx) => {
    const cell = cHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = ORANGE_HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = HEADER_BORDER;
  });

  cheerStudents.forEach((s, idx) => {
    const r = wsCheer.getRow(idx + 4);
    r.height = 22;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = s.roomFull;
    r.getCell(3).value = s.classNo;
    r.getCell(4).value = s.stdId;
    r.getCell(5).value = s.name;
    r.getCell(6).value = s.gender;
    r.getCell(7).value = s.roles.join(', ');
    r.getCell(8).value = s.phone || '-';

    const rowFill = idx % 2 === 1 ? ZEBRA_LIGHT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    for (let c = 1; c <= 8; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Sarabun', size: 11, color: { argb: 'FF212121' } };
      cell.fill = rowFill;
      cell.border = THIN_BORDER;
      if (c === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      } else if (c === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }
  });

  const cheerSumIdx = cheerStudents.length + 4;
  const cheerSumRow = wsCheer.getRow(cheerSumIdx);
  cheerSumRow.height = 26;
  wsCheer.mergeCells(`A${cheerSumIdx}:D${cheerSumIdx}`);
  const cheerSumLabel = cheerSumRow.getCell(1);
  cheerSumLabel.value = 'รวมสมาชิกฝ่ายสแตนเชียร์ทั้งหมด';
  cheerSumLabel.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
  cheerSumLabel.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 1; c <= 4; c++) {
    cheerSumRow.getCell(c).border = HEADER_BORDER;
    cheerSumRow.getCell(c).fill = SUMMARY_FILL;
  }

  const cheerSumVal = cheerSumRow.getCell(5);
  cheerSumVal.value = `${cheerStudents.length} คน (ชาย ${maleCheer} / หญิง ${femaleCheer})`;
  cheerSumVal.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
  cheerSumVal.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cheerSumVal.fill = SUMMARY_FILL;
  cheerSumVal.border = HEADER_BORDER;

  for (let c = 6; c <= 8; c++) {
    const cell = cheerSumRow.getCell(c);
    cell.value = '';
    cell.fill = SUMMARY_FILL;
    cell.border = HEADER_BORDER;
  }

  wsCheer.columns = [
    { key: 'no', width: 8 },
    { key: 'room', width: 14 },
    { key: 'classNo', width: 14 },
    { key: 'stdId', width: 16 },
    { key: 'name', width: 34 },
    { key: 'gender', width: 10 },
    { key: 'role', width: 26 },
    { key: 'phone', width: 20 }
  ];

  const cheerExcelPath = path.join(cheerDir, 'รายชื่อฝ่ายสแตนเชียร์_คณะสีแสด_ปี69.xlsx');
  try {
    await wbCheer.xlsx.writeFile(cheerExcelPath);
    console.log(`[OK] บันทึกไฟล์ Excel ฝ่ายสแตนเชียร์: ${cheerExcelPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`[WARN] ไฟล์ ${cheerExcelPath} กำลังถูกเปิดใช้งานอยู่`);
    } else {
      throw err;
    }
  }

  const cheerHtml = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>รายชื่อฝ่ายสแตนเชียร์ - คณะสีแสด</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 12mm 12mm 12mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; color: #212121; font-size: 11px; }
    .header-card {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-left: 6px solid #e65100;
      border-radius: 8px;
      padding: 14px 20px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { margin: 0 0 4px 0; color: #bf360c; font-size: 20px; font-weight: 800; }
    .subtitle { font-size: 12px; color: #5d4037; }
    .badge { background: #e65100; color: white; font-size: 14px; font-weight: 700; padding: 6px 14px; border-radius: 20px; }
    .roster-table { width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #d6d6d6; }
    .roster-table th { background: #e65100; color: #ffffff; font-weight: 700; padding: 6px 4px; border: 1px solid #bf360c; text-align: center; }
    .roster-table td { padding: 4.5px 6px; border: 1px solid #e0e0e0; vertical-align: middle; }
    .roster-table tr.even { background: #fffdfa; }
    .roster-table tr.odd { background: #ffffff; }
    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 10px; }
    .text-orange { color: #e65100; }
  </style>
</head>
<body>
  <div class="header-card">
    <div>
      <h1>📣 รายชื่อสมาชิกฝ่ายสแตนเชียร์ — คณะสีแสด</h1>
      <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | ระดับชั้นมัธยมศึกษาปีที่ 1</div>
    </div>
    <div><span class="badge">รวม ${cheerStudents.length} คน (ชาย ${maleCheer} / หญิง ${femaleCheer})</span></div>
  </div>

  <table class="roster-table">
    <thead>
      <tr>
        <th style="width: 6%;">ลำดับ</th>
        <th style="width: 10%;">ชั้น/ห้อง</th>
        <th style="width: 8%;">เลขที่</th>
        <th style="width: 13%;">รหัสประจำตัว</th>
        <th style="width: 29%;">ชื่อ - นามสกุล</th>
        <th style="width: 8%;">เพศ</th>
        <th style="width: 26%;">หน้าที่</th>
      </tr>
    </thead>
    <tbody>
      ${cheerStudents.map((s, idx) => `
        <tr class="${idx % 2 === 1 ? 'even' : 'odd'}">
          <td class="center font-bold">${idx + 1}</td>
          <td class="center font-bold text-orange">${s.roomFull}</td>
          <td class="center">${s.classNo}</td>
          <td class="center font-mono">${s.stdId}</td>
          <td class="left font-bold">${s.name}</td>
          <td class="center">${s.gender}</td>
          <td class="left text-orange font-bold">${s.roles.join(', ')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  const tempCheerHtml = path.join(cheerDir, 'temp_cheer.html');
  const cheerPdfPath = path.join(cheerDir, 'รายชื่อฝ่ายสแตนเชียร์_คณะสีแสด_ปี69.pdf');
  fs.writeFileSync(tempCheerHtml, cheerHtml, 'utf-8');

  try {
    execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${cheerPdfPath}" --no-pdf-header-footer "${tempCheerHtml}"`, {
      stdio: 'pipe'
    });
    console.log(`[OK] บันทึกไฟล์ PDF ฝ่ายสแตนเชียร์: ${cheerPdfPath} (${fs.statSync(cheerPdfPath).size.toLocaleString()} bytes)`);
  } catch (err) {
    console.error(`[ERROR] สร้าง PDF ฝ่ายสแตนเชียร์ไม่สำเร็จ:`, err.message);
  } finally {
    if (fs.existsSync(tempCheerHtml)) fs.unlinkSync(tempCheerHtml);
  }

  // =========================================================================
  // 6. สร้างไฟล์ Excel & PDF ฝ่ายสตาฟและคณะกรรมการ ม.5
  // =========================================================================
  const staffStudents = gradeStudents[5].filter(s => s.roles.length > 0);
  staffStudents.sort((a, b) => {
    if (a.room !== b.room) return a.room - b.room;
    return a.stdId.localeCompare(b.stdId, undefined, { numeric: true });
  });

  const wbStaff = new ExcelJS.Workbook();
  wbStaff.creator = 'ฝ่ายสตาฟและคณะกรรมการ คณะสีแสด';
  wbStaff.created = new Date();
  const wsStaff = wbStaff.addWorksheet('คณะกรรมการและสตาฟ', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }]
  });

  wsStaff.mergeCells('A1:H1');
  const sTitle = wsStaff.getCell('A1');
  sTitle.value = '👑 รายชื่อคณะกรรมการและทีมงานสตาฟ — คณะสีแสด (สีบุษราคัม) ปี 2569';
  sTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
  sTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  sTitle.fill = BANNER_FILL;
  wsStaff.getRow(1).height = 36;

  const maleStaff = staffStudents.filter(s => s.gender === 'ชาย').length;
  const femaleStaff = staffStudents.filter(s => s.gender === 'หญิง').length;

  wsStaff.mergeCells('A2:H2');
  const sSub = wsStaff.getCell('A2');
  sSub.value = `จำนวนคณะกรรมการและสตาฟทั้งหมด ${staffStudents.length} คน (ชาย ${maleStaff} / หญิง ${femaleStaff} | ระดับชั้น ม.5) | การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569`;
  sSub.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
  sSub.alignment = { vertical: 'middle', horizontal: 'center' };
  sSub.fill = BANNER_FILL;
  wsStaff.getRow(2).height = 22;

  const sHeaders = ['ลำดับ', 'ชั้น/ห้อง', 'เลขที่ในห้อง', 'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เพศ', 'ตำแหน่ง / หน้าที่', 'เบอร์โทรศัพท์'];
  const sHeaderRow = wsStaff.getRow(3);
  sHeaderRow.height = 26;
  sHeaders.forEach((h, idx) => {
    const cell = sHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = ORANGE_HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = HEADER_BORDER;
  });

  staffStudents.forEach((s, idx) => {
    const r = wsStaff.getRow(idx + 4);
    r.height = 24;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = s.roomFull;
    r.getCell(3).value = s.classNo;
    r.getCell(4).value = s.stdId;
    r.getCell(5).value = s.name;
    r.getCell(6).value = s.gender;
    r.getCell(7).value = s.roles.join(', ');
    r.getCell(8).value = s.phone || '-';

    const rowFill = idx % 2 === 1 ? ZEBRA_LIGHT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    for (let c = 1; c <= 8; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Sarabun', size: 11, color: { argb: 'FF212121' } };
      cell.fill = rowFill;
      cell.border = THIN_BORDER;
      if (c === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      } else if (c === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }
  });

  const staffSumIdx = staffStudents.length + 4;
  const staffSumRow = wsStaff.getRow(staffSumIdx);
  staffSumRow.height = 26;
  wsStaff.mergeCells(`A${staffSumIdx}:D${staffSumIdx}`);
  const staffSumLabel = staffSumRow.getCell(1);
  staffSumLabel.value = 'รวมคณะกรรมการและสตาฟทั้งหมด';
  staffSumLabel.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
  staffSumLabel.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 1; c <= 4; c++) {
    staffSumRow.getCell(c).border = HEADER_BORDER;
    staffSumRow.getCell(c).fill = SUMMARY_FILL;
  }

  const staffSumVal = staffSumRow.getCell(5);
  staffSumVal.value = `${staffStudents.length} คน (ชาย ${maleStaff} / หญิง ${femaleStaff})`;
  staffSumVal.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFBF360C' } };
  staffSumVal.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  staffSumVal.fill = SUMMARY_FILL;
  staffSumVal.border = HEADER_BORDER;

  for (let c = 6; c <= 8; c++) {
    const cell = staffSumRow.getCell(c);
    cell.value = '';
    cell.fill = SUMMARY_FILL;
    cell.border = HEADER_BORDER;
  }

  wsStaff.columns = [
    { key: 'no', width: 8 },
    { key: 'room', width: 14 },
    { key: 'classNo', width: 14 },
    { key: 'stdId', width: 16 },
    { key: 'name', width: 34 },
    { key: 'gender', width: 10 },
    { key: 'role', width: 30 },
    { key: 'phone', width: 20 }
  ];

  const staffExcelPath = path.join(staffDir, 'รายชื่อคณะกรรมการและสตาฟ_คณะสีแสด_ปี69.xlsx');
  try {
    await wbStaff.xlsx.writeFile(staffExcelPath);
    console.log(`[OK] บันทึกไฟล์ Excel ฝ่ายสตาฟ: ${staffExcelPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`[WARN] ไฟล์ ${staffExcelPath} กำลังถูกเปิดใช้งานอยู่`);
    } else {
      throw err;
    }
  }

  const staffHtml = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>รายชื่อคณะกรรมการและสตาฟ - คณะสีแสด</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 12mm 12mm 12mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; color: #212121; font-size: 11px; }
    .header-card {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-left: 6px solid #e65100;
      border-radius: 8px;
      padding: 14px 20px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { margin: 0 0 4px 0; color: #bf360c; font-size: 20px; font-weight: 800; }
    .subtitle { font-size: 12px; color: #5d4037; }
    .badge { background: #e65100; color: white; font-size: 14px; font-weight: 700; padding: 6px 14px; border-radius: 20px; }
    .roster-table { width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #d6d6d6; }
    .roster-table th { background: #e65100; color: #ffffff; font-weight: 700; padding: 6px 4px; border: 1px solid #bf360c; text-align: center; }
    .roster-table td { padding: 4.5px 6px; border: 1px solid #e0e0e0; vertical-align: middle; }
    .roster-table tr.even { background: #fffdfa; }
    .roster-table tr.odd { background: #ffffff; }
    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 10px; }
    .text-orange { color: #e65100; }
  </style>
</head>
<body>
  <div class="header-card">
    <div>
      <h1>👑 รายชื่อคณะกรรมการและทีมงานสตาฟ — คณะสีแสด</h1>
      <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | ระดับชั้นมัธยมศึกษาปีที่ 5</div>
    </div>
    <div><span class="badge">รวม ${staffStudents.length} คน (ชาย ${maleStaff} / หญิง ${femaleStaff})</span></div>
  </div>

  <table class="roster-table">
    <thead>
      <tr>
        <th style="width: 6%;">ลำดับ</th>
        <th style="width: 10%;">ชั้น/ห้อง</th>
        <th style="width: 8%;">เลขที่</th>
        <th style="width: 13%;">รหัสประจำตัว</th>
        <th style="width: 29%;">ชื่อ - นามสกุล</th>
        <th style="width: 8%;">เพศ</th>
        <th style="width: 26%;">ตำแหน่ง / หน้าที่</th>
      </tr>
    </thead>
    <tbody>
      ${staffStudents.map((s, idx) => `
        <tr class="${idx % 2 === 1 ? 'even' : 'odd'}">
          <td class="center font-bold">${idx + 1}</td>
          <td class="center font-bold text-orange">${s.roomFull}</td>
          <td class="center">${s.classNo}</td>
          <td class="center font-mono">${s.stdId}</td>
          <td class="left font-bold">${s.name}</td>
          <td class="center">${s.gender}</td>
          <td class="left text-orange font-bold">${s.roles.join(', ')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  const tempStaffHtml = path.join(staffDir, 'temp_staff.html');
  const staffPdfPath = path.join(staffDir, 'รายชื่อคณะกรรมการและสตาฟ_คณะสีแสด_ปี69.pdf');
  fs.writeFileSync(tempStaffHtml, staffHtml, 'utf-8');

  try {
    execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${staffPdfPath}" --no-pdf-header-footer "${tempStaffHtml}"`, {
      stdio: 'pipe'
    });
    console.log(`[OK] บันทึกไฟล์ PDF ฝ่ายสตาฟ: ${staffPdfPath} (${fs.statSync(staffPdfPath).size.toLocaleString()} bytes)`);
  } catch (err) {
    console.error(`[ERROR] สร้าง PDF ฝ่ายสตาฟไม่สำเร็จ:`, err.message);
  } finally {
    if (fs.existsSync(tempStaffHtml)) fs.unlinkSync(tempStaffHtml);
  }

  // =========================================================================
  // 6. สร้างไฟล์ Excel & PDF ฝ่ายเชียร์ลีดเดอร์
  // =========================================================================
  const cheerleaderStudents = cheerData.map(c => {
    const s = studentMap.get(c.id);
    return s ? { ...s, phone: c.phone || s.phone } : null;
  }).filter(Boolean);

  const wbCheerleaders = new ExcelJS.Workbook();
  wbCheerleaders.creator = 'ฝ่ายเชียร์ลีดเดอร์ คณะสีแสด';
  wbCheerleaders.created = new Date();
  const wsCheerleaders = wbCheerleaders.addWorksheet('ฝ่ายเชียร์ลีดเดอร์', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }]
  });

  wsCheerleaders.mergeCells('A1:G1');
  const chTitle = wsCheerleaders.getCell('A1');
  chTitle.value = '📣 รายชื่อสมาชิกฝ่ายเชียร์ลีดเดอร์ — คณะสีแสด (สีบุษราคัม) ปี 2569';
  chTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
  chTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  chTitle.fill = BANNER_FILL;
  wsCheerleaders.getRow(1).height = 36;

  wsCheerleaders.mergeCells('A2:G2');
  const chSub = wsCheerleaders.getCell('A2');
  chSub.value = `จำนวนสมาชิกทั้งหมด ${cheerleaderStudents.length} คน (ม.1 - ม.4) | การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569`;
  chSub.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
  chSub.alignment = { vertical: 'middle', horizontal: 'center' };
  chSub.fill = BANNER_FILL;
  wsCheerleaders.getRow(2).height = 22;

  const chHeaders = ['ลำดับ', 'ชั้น/ห้อง', 'เลขที่ในห้อง', 'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เพศ', 'เบอร์โทรศัพท์'];
  const chHeaderRow = wsCheerleaders.getRow(3);
  chHeaderRow.height = 26;
  chHeaders.forEach((h, idx) => {
    const cell = chHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = ORANGE_HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = HEADER_BORDER;
  });

  cheerleaderStudents.forEach((s, idx) => {
    const r = wsCheerleaders.getRow(idx + 4);
    r.height = 24;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = s.roomFull;
    r.getCell(3).value = s.classNo;
    r.getCell(4).value = s.stdId;
    r.getCell(5).value = s.name;
    r.getCell(6).value = s.gender;
    r.getCell(7).value = s.phone || '-';

    const rowFill = idx % 2 === 1 ? ZEBRA_LIGHT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
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
  });

  wsCheerleaders.columns = [
    { key: 'no', width: 8 },
    { key: 'room', width: 14 },
    { key: 'classNo', width: 14 },
    { key: 'stdId', width: 16 },
    { key: 'name', width: 34 },
    { key: 'gender', width: 10 },
    { key: 'phone', width: 22 }
  ];

  const cheerleaderExcelPath = path.join(cheerleaderDir, 'รายชื่อฝ่ายเชียร์ลีดเดอร์_คณะสีแสด_ปี69.xlsx');
  try {
    await wbCheerleaders.xlsx.writeFile(cheerleaderExcelPath);
    console.log(`[OK] บันทึกไฟล์ Excel ฝ่ายเชียร์ลีดเดอร์: ${cheerleaderExcelPath}`);
  } catch (err) {
    if (err.code !== 'EBUSY') throw err;
  }

  const cheerleaderHtml = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>รายชื่อฝ่ายเชียร์ลีดเดอร์ - คณะสีแสด</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; color: #212121; }
    .header-card {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-left: 6px solid #e65100;
      border-radius: 8px;
      padding: 18px 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { margin: 0 0 6px 0; color: #bf360c; font-size: 22px; font-weight: 800; }
    .subtitle { font-size: 13px; color: #5d4037; }
    .badge { background: #e65100; color: white; font-size: 15px; font-weight: 700; padding: 6px 16px; border-radius: 20px; }
    .roster-table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #d6d6d6; }
    .roster-table th { background: #e65100; color: #ffffff; font-weight: 700; padding: 10px 8px; border: 1px solid #bf360c; text-align: center; }
    .roster-table td { padding: 9px 10px; border: 1px solid #e0e0e0; vertical-align: middle; }
    .roster-table tr.even { background: #fffdfa; }
    .roster-table tr.odd { background: #ffffff; }
    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 13px; }
    .text-orange { color: #e65100; }
  </style>
</head>
<body>
  <div class="header-card">
    <div>
      <h1>📣 รายชื่อสมาชิกฝ่ายเชียร์ลีดเดอร์ — คณะสีแสด</h1>
      <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | โรงเรียนสรรพวิทยาคม</div>
    </div>
    <div><span class="badge">รวม ${cheerleaderStudents.length} คน</span></div>
  </div>

  <table class="roster-table">
    <thead>
      <tr>
        <th style="width: 8%;">ลำดับ</th>
        <th style="width: 14%;">ชั้น/ห้อง</th>
        <th style="width: 10%;">เลขที่</th>
        <th style="width: 16%;">รหัสประจำตัว</th>
        <th style="width: 32%;">ชื่อ - นามสกุล</th>
        <th style="width: 10%;">เพศ</th>
        <th style="width: 20%;">เบอร์โทรศัพท์</th>
      </tr>
    </thead>
    <tbody>
      ${cheerleaderStudents.map((s, idx) => `
        <tr class="${idx % 2 === 1 ? 'even' : 'odd'}">
          <td class="center font-bold">${idx + 1}</td>
          <td class="center font-bold text-orange">${s.roomFull}</td>
          <td class="center">${s.classNo}</td>
          <td class="center font-mono">${s.stdId}</td>
          <td class="left font-bold">${s.name}</td>
          <td class="center">${s.gender}</td>
          <td class="center font-mono">${s.phone || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  const tempCheerleaderHtml = path.join(cheerleaderDir, 'temp_cheerleader.html');
  const cheerleaderPdfPath = path.join(cheerleaderDir, 'รายชื่อฝ่ายเชียร์ลีดเดอร์_คณะสีแสด_ปี69.pdf');
  fs.writeFileSync(tempCheerleaderHtml, cheerleaderHtml, 'utf-8');

  try {
    execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${cheerleaderPdfPath}" --no-pdf-header-footer "${tempCheerleaderHtml}"`, { stdio: 'pipe' });
    console.log(`[OK] บันทึกไฟล์ PDF ฝ่ายเชียร์ลีดเดอร์: ${cheerleaderPdfPath}`);
  } catch (err) {
    console.error(`[ERROR] สร้าง PDF ฝ่ายเชียร์ลีดเดอร์ไม่สำเร็จ:`, err.message);
  } finally {
    if (fs.existsSync(tempCheerleaderHtml)) fs.unlinkSync(tempCheerleaderHtml);
  }

  // =========================================================================
  // 7. สร้างไฟล์ Excel & PDF ฝ่ายพร็อพ
  // =========================================================================
  const propsStudents = propsData.map(p => {
    const s = studentMap.get(p.id);
    return s ? { ...s, phone: p.phone || s.phone } : null;
  }).filter(Boolean);

  const wbProps = new ExcelJS.Workbook();
  wbProps.creator = 'ฝ่ายพร็อพ คณะสีแสด';
  wbProps.created = new Date();
  const wsProps = wbProps.addWorksheet('ฝ่ายพร็อพ', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }]
  });

  wsProps.mergeCells('A1:G1');
  const prTitle = wsProps.getCell('A1');
  prTitle.value = '🎨 รายชื่อสมาชิกฝ่ายพร็อพ — คณะสีแสด (สีบุษราคัม) ปี 2569';
  prTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFBF360C' } };
  prTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  prTitle.fill = BANNER_FILL;
  wsProps.getRow(1).height = 36;

  wsProps.mergeCells('A2:G2');
  const prSub = wsProps.getCell('A2');
  prSub.value = `จำนวนสมาชิกทั้งหมด ${propsStudents.length} คน (ม.2 - ม.4) | การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569`;
  prSub.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF5D4037' } };
  prSub.alignment = { vertical: 'middle', horizontal: 'center' };
  prSub.fill = BANNER_FILL;
  wsProps.getRow(2).height = 22;

  const prHeaders = ['ลำดับ', 'ชั้น/ห้อง', 'เลขที่ในห้อง', 'รหัสประจำตัว', 'ชื่อ - นามสกุล', 'เพศ', 'เบอร์โทรศัพท์'];
  const prHeaderRow = wsProps.getRow(3);
  prHeaderRow.height = 26;
  prHeaders.forEach((h, idx) => {
    const cell = prHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Sarabun', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = ORANGE_HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = HEADER_BORDER;
  });

  propsStudents.forEach((s, idx) => {
    const r = wsProps.getRow(idx + 4);
    r.height = 24;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = s.roomFull;
    r.getCell(3).value = s.classNo;
    r.getCell(4).value = s.stdId;
    r.getCell(5).value = s.name;
    r.getCell(6).value = s.gender;
    r.getCell(7).value = s.phone || '-';

    const rowFill = idx % 2 === 1 ? ZEBRA_LIGHT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
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
  });

  wsProps.columns = [
    { key: 'no', width: 8 },
    { key: 'room', width: 14 },
    { key: 'classNo', width: 14 },
    { key: 'stdId', width: 16 },
    { key: 'name', width: 34 },
    { key: 'gender', width: 10 },
    { key: 'phone', width: 22 }
  ];

  const propsExcelPath = path.join(propsDir, 'รายชื่อฝ่ายพร็อพ_คณะสีแสด_ปี69.xlsx');
  try {
    await wbProps.xlsx.writeFile(propsExcelPath);
    console.log(`[OK] บันทึกไฟล์ Excel ฝ่ายพร็อพ: ${propsExcelPath}`);
  } catch (err) {
    if (err.code !== 'EBUSY') throw err;
  }

  const propsHtml = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>รายชื่อฝ่ายพร็อพ - คณะสีแสด</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; color: #212121; }
    .header-card {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-left: 6px solid #e65100;
      border-radius: 8px;
      padding: 18px 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { margin: 0 0 6px 0; color: #bf360c; font-size: 22px; font-weight: 800; }
    .subtitle { font-size: 13px; color: #5d4037; }
    .badge { background: #e65100; color: white; font-size: 15px; font-weight: 700; padding: 6px 16px; border-radius: 20px; }
    .roster-table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #d6d6d6; }
    .roster-table th { background: #e65100; color: #ffffff; font-weight: 700; padding: 10px 8px; border: 1px solid #bf360c; text-align: center; }
    .roster-table td { padding: 9px 10px; border: 1px solid #e0e0e0; vertical-align: middle; }
    .roster-table tr.even { background: #fffdfa; }
    .roster-table tr.odd { background: #ffffff; }
    .center { text-align: center; }
    .left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; font-size: 13px; }
    .text-orange { color: #e65100; }
  </style>
</head>
<body>
  <div class="header-card">
    <div>
      <h1>🎨 รายชื่อสมาชิกฝ่ายพร็อพ — คณะสีแสด</h1>
      <div class="subtitle">การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | โรงเรียนสรรพวิทยาคม</div>
    </div>
    <div><span class="badge">รวม ${propsStudents.length} คน</span></div>
  </div>

  <table class="roster-table">
    <thead>
      <tr>
        <th style="width: 8%;">ลำดับ</th>
        <th style="width: 14%;">ชั้น/ห้อง</th>
        <th style="width: 10%;">เลขที่</th>
        <th style="width: 16%;">รหัสประจำตัว</th>
        <th style="width: 32%;">ชื่อ - นามสกุล</th>
        <th style="width: 10%;">เพศ</th>
        <th style="width: 20%;">เบอร์โทรศัพท์</th>
      </tr>
    </thead>
    <tbody>
      ${propsStudents.map((s, idx) => `
        <tr class="${idx % 2 === 1 ? 'even' : 'odd'}">
          <td class="center font-bold">${idx + 1}</td>
          <td class="center font-bold text-orange">${s.roomFull}</td>
          <td class="center">${s.classNo}</td>
          <td class="center font-mono">${s.stdId}</td>
          <td class="left font-bold">${s.name}</td>
          <td class="center">${s.gender}</td>
          <td class="center font-mono">${s.phone || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  const tempPropsHtml = path.join(propsDir, 'temp_props.html');
  const propsPdfPath = path.join(propsDir, 'รายชื่อฝ่ายพร็อพ_คณะสีแสด_ปี69.pdf');
  fs.writeFileSync(tempPropsHtml, propsHtml, 'utf-8');

  try {
    execSync(`${edgePath} --headless --disable-gpu --print-to-pdf="${propsPdfPath}" --no-pdf-header-footer "${tempPropsHtml}"`, { stdio: 'pipe' });
    console.log(`[OK] บันทึกไฟล์ PDF ฝ่ายพร็อพ: ${propsPdfPath}`);
  } catch (err) {
    console.error(`[ERROR] สร้าง PDF ฝ่ายพร็อพไม่สำเร็จ:`, err.message);
  } finally {
    if (fs.existsSync(tempPropsHtml)) fs.unlinkSync(tempPropsHtml);
  }
}

if (require.main === module) {
  main().catch(err => console.error('Error:', err));
}

module.exports = { main };
