const fs = require('fs');

function formatPhoneNumber(str) {
  if (!str) return "";
  const digits = String(str).replace(/[^\d]/g, "");
  if (digits.length === 10) {
    return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.substring(0, 2)}-${digits.substring(2, 5)}-${digits.substring(5)}`;
  }
  return str.trim();
}

async function standardizeAllPhonesInGoogleSheet() {
  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec";

  // Load all master rosters with phones
  const m5Staff = JSON.parse(fs.readFileSync('d:\\กีฬาสีแสด\\data\\m5_staff_with_phones.json', 'utf8'));
  const studentsMaster = JSON.parse(fs.readFileSync('d:\\กีฬาสีแสด\\data\\students_master.json', 'utf8'));
  const stdMap = new Map(studentsMaster.map(s => [s.id, s]));

  // Props (22)
  const props = [
    { id: "33221", phone: "083-219-5152", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "35532", phone: "095-682-6677", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33323", phone: "082-906-9603", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33617", phone: "096-231-9400", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "34858", phone: "091-049-3472", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33635", phone: "065-963-5206", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33917", phone: "095-358-9547", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33995", phone: "080-137-4426", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "34373", phone: "082-594-4531", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33719", phone: "096-294-5586", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "34019", phone: "098-951-4742", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33965", phone: "065-975-1810", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "34505", phone: "061-314-0692", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "34379", phone: "099-272-6458", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33815", phone: "098-689-7527", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "35589", phone: "065-250-6293", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33809", phone: "063-019-1154", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33755", phone: "082-965-5881", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33761", phone: "083-097-3619", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "34862", phone: "098-738-9760", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33683", phone: "083-097-3532", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" },
    { id: "33695", phone: "099-738-2345", role: "สตาฟพร็อพ", dept: "ฝ่ายพร็อพ" }
  ];

  // Cheer (11)
  const cheer = [
    { id: "34487", phone: "096-757-5287", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "35567", phone: "092-448-7639", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "34535", phone: "096-169-3324", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "33899", phone: "062-812-5918", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "34073", phone: "095-470-1670", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "33869", phone: "091-843-4965", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "33325", phone: "062-514-6471", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "33791", phone: "094-954-0486", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "33749", phone: "", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "35232", phone: "", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" },
    { id: "33929", phone: "091-843-9779", role: "เชียร์ลีดเดอร์", dept: "ฝ่ายเชียร์ลีดเดอร์" }
  ];

  // Welfare (8)
  const welfare = [
    { id: "35490", phone: "091-046-2589", role: "สวัสดิการ", dept: "ฝ่ายสวัสดิการ" },
    { id: "33427", phone: "083-799-7780", role: "สวัสดิการ", dept: "ฝ่ายสวัสดิการ" },
    { id: "33110", phone: "064-326-0371", role: "สวัสดิการ", dept: "ฝ่ายสวัสดิการ" },
    { id: "35469", phone: "062-479-0695", role: "สวัสดิการ", dept: "ฝ่ายสวัสดิการ" },
    { id: "33301", phone: "060-373-1209", role: "สวัสดิการ", dept: "ฝ่ายสวัสดิการ" },
    { id: "33137", phone: "065-837-6263", role: "สวัสดิการ", dept: "ฝ่ายสวัสดิการ" },
    { id: "35436", phone: "098-463-4302", role: "สวัสดิการ", dept: "ฝ่ายสวัสดิการ" },
    { id: "35445", phone: "061-193-3676", role: "สวัสดิการ", dept: "ฝ่ายสวัสดิการ" }
  ];

  // Drum (8)
  const drum = [
    { id: "33130", phone: "098-817-0691", role: "ดรัมเมเยอร์", dept: "ฝ่ายดรัมเมเยอร์" },
    { id: "33803", phone: "085-849-9682", role: "ดรัมเมเยอร์", dept: "ฝ่ายดรัมเมเยอร์" },
    { id: "33419", phone: "096-359-4382", role: "ดรัมเมเยอร์", dept: "ฝ่ายดรัมเมเยอร์" },
    { id: "33845", phone: "080-800-6634", role: "ดรัมเมเยอร์", dept: "ฝ่ายดรัมเมเยอร์" },
    { id: "33641", phone: "099-616-9767", role: "ดรัมเมเยอร์", dept: "ฝ่ายดรัมเมเยอร์" },
    { id: "32631", phone: "080-887-7109", role: "ดรัมเมเยอร์", dept: "ฝ่ายดรัมเมเยอร์" },
    { id: "32510", phone: "061-553-0671", role: "ดรัมเมเยอร์", dept: "ฝ่ายดรัมเมเยอร์" },
    { id: "32653", phone: "099-263-2316", role: "ดรัมเมเยอร์", dept: "ฝ่ายดรัมเมเยอร์" }
  ];

  // Combine all items and format phones strictly as 0xx-xxx-xxxx
  const allFormatted = [];

  [...m5Staff.map(s => ({ id: s.id, role: s.role, phone: s.phone, dept: "ฝ่ายสตาฟ" })), ...props, ...cheer, ...welfare, ...drum].forEach(item => {
    const std = stdMap.get(item.id);
    if (std) {
      allFormatted.push({
        studentId: std.id,
        studentName: std.name,
        roomFull: std.roomFull,
        grade: std.grade,
        classNo: std.classNo,
        gender: std.gender,
        departmentName: item.dept,
        roleName: item.role,
        categoryTitle: item.role,
        phone: formatPhoneNumber(item.phone)
      });
    }
  });

  console.log(`======================================================`);
  console.log(`📐 ปรับรูปแบบเบอร์โทรศัพท์เป็น 0xx-xxx-xxxx ทั้งหมด (${allFormatted.length} รายการ)`);
  console.log(`======================================================`);

  for (let i = 0; i < allFormatted.length; i += 3) {
    const batch = allFormatted.slice(i, i + 3);
    const promises = batch.map(async (payload) => {
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          redirect: "follow"
        });
        const data = await res.json();
        console.log(`✅ [${payload.studentName}] -> ${payload.phone || '(ไม่มีเบอร์)'}`);
      } catch (err) {
        console.error(`❌ [Error ${payload.studentName}]:`, err.message);
      }
    });

    await Promise.all(promises);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`======================================================`);
  console.log(`🎉 ปรับรูปแบบเบอร์โทรศัพท์มาตรฐาน 0xx-xxx-xxxx ให้เหมือนกันทั้งหมดเรียบร้อยแล้ว!`);
  console.log(`======================================================`);
}

standardizeAllPhonesInGoogleSheet();
