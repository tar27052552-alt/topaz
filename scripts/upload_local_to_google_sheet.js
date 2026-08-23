const fs = require('fs');
const path = require('path');

const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec";

// Load students master data
const studentsMaster = JSON.parse(fs.readFileSync('data/students_master.json', 'utf8'));
const stdMap = new Map(studentsMaster.map(s => [s.id, s]));

// 1. Props Staff (22 students)
const propsList = [
  { id: "33221", role: "สตาฟพร็อพ", phone: "083-219-5152", dept: "ฝ่ายพร็อพ" },
  { id: "35532", role: "สตาฟพร็อพ", phone: "095-682-6677", dept: "ฝ่ายพร็อพ" },
  { id: "33323", role: "สตาฟพร็อพ", phone: "082-906-9603", dept: "ฝ่ายพร็อพ" },
  { id: "33617", role: "สตาฟพร็อพ", phone: "096-231-9400", dept: "ฝ่ายพร็อพ" },
  { id: "34858", role: "สตาฟพร็อพ", phone: "091-049-3472", dept: "ฝ่ายพร็อพ" },
  { id: "33635", role: "สตาฟพร็อพ", phone: "065-963-5206", dept: "ฝ่ายพร็อพ" },
  { id: "33917", role: "สตาฟพร็อพ", phone: "095-358-9547", dept: "ฝ่ายพร็อพ" },
  { id: "33995", role: "สตาฟพร็อพ", phone: "080-137-4426", dept: "ฝ่ายพร็อพ" },
  { id: "34373", role: "สตาฟพร็อพ", phone: "082-594-4531", dept: "ฝ่ายพร็อพ" },
  { id: "33719", role: "สตาฟพร็อพ", phone: "096-294-5586", dept: "ฝ่ายพร็อพ" },
  { id: "34019", role: "สตาฟพร็อพ", phone: "098-951-4742", dept: "ฝ่ายพร็อพ" },
  { id: "33965", role: "สตาฟพร็อพ", phone: "065-975-1810", dept: "ฝ่ายพร็อพ" },
  { id: "34505", role: "สตาฟพร็อพ", phone: "061-314-0692", dept: "ฝ่ายพร็อพ" },
  { id: "34379", role: "สตาฟพร็อพ", phone: "099-272-6458", dept: "ฝ่ายพร็อพ" },
  { id: "33815", role: "สตาฟพร็อพ", phone: "098-689-7527", dept: "ฝ่ายพร็อพ" },
  { id: "35589", role: "สตาฟพร็อพ", phone: "065-250-6293", dept: "ฝ่ายพร็อพ" },
  { id: "33809", role: "สตาฟพร็อพ", phone: "063-019-1154", dept: "ฝ่ายพร็อพ" },
  { id: "33755", role: "สตาฟพร็อพ", phone: "082-965-5881", dept: "ฝ่ายพร็อพ" },
  { id: "33761", role: "สตาฟพร็อพ", phone: "083-097-3619", dept: "ฝ่ายพร็อพ" },
  { id: "34862", role: "สตาฟพร็อพ", phone: "098-738-9760", dept: "ฝ่ายพร็อพ" },
  { id: "33683", role: "สตาฟพร็อพ", phone: "083-097-3532", dept: "ฝ่ายพร็อพ" },
  { id: "33695", role: "สตาฟพร็อพ", phone: "099-738-2345", dept: "ฝ่ายพร็อพ" }
];

// 2. Cheerleaders (11 students)
const cheerList = [
  { id: "34487", role: "เชียร์ลีดเดอร์", phone: "096-757-5287", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "35567", role: "เชียร์ลีดเดอร์", phone: "092-448-7639", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "34535", role: "เชียร์ลีดเดอร์", phone: "096-169-3324", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "33899", role: "เชียร์ลีดเดอร์", phone: "062-812-5918", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "34073", role: "เชียร์ลีดเดอร์", phone: "095-470-1670", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "33869", role: "เชียร์ลีดเดอร์", phone: "091-843-4965", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "33325", role: "เชียร์ลีดเดอร์", phone: "062-514-6471", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "33791", role: "เชียร์ลีดเดอร์", phone: "094-954-0486", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "33749", role: "เชียร์ลีดเดอร์", phone: "", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "35232", role: "เชียร์ลีดเดอร์", phone: "", dept: "ฝ่ายเชียร์ลีดเดอร์" },
  { id: "33929", role: "เชียร์ลีดเดอร์", phone: "091-843-9779", dept: "ฝ่ายเชียร์ลีดเดอร์" }
];

// 3. Welfare (8 students)
const welfareList = [
  { id: "35490", role: "สวัสดิการ", phone: "091-046-2589", dept: "ฝ่ายสวัสดิการ" },
  { id: "33427", role: "สวัสดิการ", phone: "083-799-7780", dept: "ฝ่ายสวัสดิการ" },
  { id: "33110", role: "สวัสดิการ", phone: "064-326-0371", dept: "ฝ่ายสวัสดิการ" },
  { id: "35469", role: "สวัสดิการ", phone: "062-479-0695", dept: "ฝ่ายสวัสดิการ" },
  { id: "33301", role: "สวัสดิการ", phone: "060-373-1209", dept: "ฝ่ายสวัสดิการ" },
  { id: "33137", role: "สวัสดิการ", phone: "065-837-6263", dept: "ฝ่ายสวัสดิการ" },
  { id: "35436", role: "สวัสดิการ", phone: "098-463-4302", dept: "ฝ่ายสวัสดิการ" },
  { id: "35445", role: "สวัสดิการ", phone: "061-193-3676", dept: "ฝ่ายสวัสดิการ" }
];

// 4. Drum (8 students)
const drumList = [
  { id: "33130", role: "ดรัมเมเยอร์", phone: "098-817-0691", dept: "ฝ่ายดรัมเมเยอร์" },
  { id: "33803", role: "ดรัมเมเยอร์", phone: "085-849-9682", dept: "ฝ่ายดรัมเมเยอร์" },
  { id: "33419", role: "ดรัมเมเยอร์", phone: "096-359-4382", dept: "ฝ่ายดรัมเมเยอร์" },
  { id: "33845", role: "ดรัมเมเยอร์", phone: "080-800-6634", dept: "ฝ่ายดรัมเมเยอร์" },
  { id: "33641", role: "ดรัมเมเยอร์", phone: "099-616-9767", dept: "ฝ่ายดรัมเมเยอร์" },
  { id: "32631", role: "ดรัมเมเยอร์", phone: "080-887-7109", dept: "ฝ่ายดรัมเมเยอร์" },
  { id: "32510", role: "ดรัมเมเยอร์", phone: "061-553-0671", dept: "ฝ่ายดรัมเมเยอร์" },
  { id: "32653", role: "ดรัมเมเยอร์", phone: "", dept: "ฝ่ายดรัมเมเยอร์" }
];

// 5. M.5 Staff from Google Sheet (66 students)
const m5Staff = JSON.parse(fs.readFileSync('d:\\กีฬาสีแสด\\scratch_m5_staff.json', 'utf8')).map(s => ({
  id: s.id,
  role: s.role,
  phone: "",
  dept: "ฝ่ายสตาฟ"
}));

// Combine all non-empty items
const allItems = [...propsList, ...cheerList, ...welfareList, ...drumList, ...m5Staff];

async function uploadAll() {
  console.log(`======================================================`);
  console.log(`🚀 เริ่มต้นอัปโหลดข้อมูลจากเครื่องขึ้น Google Sheet (${allItems.length} รายการ)`);
  console.log(`======================================================`);

  let successCount = 0;
  let failCount = 0;

  // Process in small batches of 3 parallel requests with delay
  const concurrency = 3;
  for (let i = 0; i < allItems.length; i += concurrency) {
    const batch = allItems.slice(i, i + concurrency);
    const promises = batch.map(async (item) => {
      const std = stdMap.get(item.id);
      if (!std) {
        console.warn(`[Skip] ไม่พบรหัสประจำตัว: ${item.id}`);
        return;
      }

      const payload = {
        studentId: std.id,
        studentName: std.name,
        roomFull: std.roomFull,
        grade: std.grade,
        classNo: std.classNo,
        gender: std.gender,
        departmentName: item.dept,
        roleName: item.role,
        categoryTitle: item.role,
        phone: item.phone || ""
      };

      try {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          redirect: "follow"
        });
        const data = await res.json();
        if (data && data.status === "success") {
          successCount++;
          console.log(`✅ [${successCount}/${allItems.length}] ${std.name} (${std.roomFull}) -> ${item.role} ${item.phone ? '📞 ' + item.phone : ''}`);
        } else {
          failCount++;
          console.warn(`⚠️ [Warning ${std.name}]:`, data);
        }
      } catch (err) {
        failCount++;
        console.error(`❌ [Error ${std.name}]:`, err.message);
      }
    });

    await Promise.all(promises);
    // Short pause to be gentle on Google Apps Script execution rate
    await new Promise(resolve => setTimeout(resolve, 600));
  }

  console.log(`======================================================`);
  console.log(`🎉 อัปโหลดขึ้น Google Sheet เสร็จสิ้นสมบูรณ์!`);
  console.log(`✅ สำเร็จ: ${successCount} รายการ | ❌ ไม่สำเร็จ: ${failCount} รายการ`);
  console.log(`======================================================`);
}

uploadAll();
