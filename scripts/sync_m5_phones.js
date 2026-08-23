const fs = require('fs');

async function syncM5StaffPhonesToGoogleSheet() {
  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec";

  const parsed = JSON.parse(fs.readFileSync('d:\\กีฬาสีแสด\\scratch_parsed_m5_phones.json', 'utf8'));
  const studentsMaster = JSON.parse(fs.readFileSync('d:\\กีฬาสีแสด\\data\\students_master.json', 'utf8'));
  const stdMap = new Map(studentsMaster.map(s => [s.id, s]));

  // Manual fix for 3 typo names in sheet
  const manualFixes = {
    "ศุภิสรา ตาเเสงวงษ์": { id: "32510", role: "ดรัมเมเยอร์", phone: "061-553-0691" },
    "นายสุวรรวัฒน์ ก้องเวหา": { id: "32650", role: "เฮดกีฬา", phone: "064-818-3467" },
    "นายโภคิต ศรีสว่างพงศ์": { id: "32484", role: "สตาฟบอลชาย", phone: "099-387-6637" }
  };

  const finalStaff = [];

  for (const item of parsed) {
    let id = item.matchedId;
    let phone = item.phone || "";
    let role = item.role;

    for (const key of Object.keys(manualFixes)) {
      if (item.nameRaw.includes(key)) {
        id = manualFixes[key].id;
        phone = manualFixes[key].phone;
        break;
      }
    }

    if (id && stdMap.has(id)) {
      const std = stdMap.get(id);
      finalStaff.push({
        id: std.id,
        name: std.name,
        roomFull: std.roomFull,
        grade: std.grade,
        classNo: std.classNo,
        gender: std.gender,
        role: role,
        phone: phone
      });
    }
  }

  console.log(`======================================================`);
  console.log(`🚀 กำลังอัปโหลดเบอร์โทรสตาฟ ม.5 ทั้งหมด (${finalStaff.length} คน) ขึ้น Google Sheet`);
  console.log(`======================================================`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < finalStaff.length; i += 3) {
    const batch = finalStaff.slice(i, i + 3);
    const promises = batch.map(async (std) => {
      const payload = {
        studentId: std.id,
        studentName: std.name,
        roomFull: std.roomFull,
        grade: std.grade,
        classNo: std.classNo,
        gender: std.gender,
        departmentName: "ฝ่ายสตาฟ",
        roleName: std.role,
        categoryTitle: std.role,
        phone: std.phone || ""
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
          console.log(`✅ [${successCount}/${finalStaff.length}] ${std.name} (${std.roomFull}) -> ${std.role} ${std.phone ? '📞 ' + std.phone : '(ไม่มีเบอร์)'}`);
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
    await new Promise(resolve => setTimeout(resolve, 600));
  }

  console.log(`======================================================`);
  console.log(`🎉 อัปโหลดเบอร์โทรสตาฟ ม.5 เสร็จสิ้นสมบูรณ์!`);
  console.log(`✅ สำเร็จ: ${successCount} คน | ❌ ไม่สำเร็จ: ${failCount} คน`);
  console.log(`======================================================`);

  // Also update local master scripts
  fs.writeFileSync('d:\\กีฬาสีแสด\\data\\m5_staff_with_phones.json', JSON.stringify(finalStaff, null, 2), 'utf8');
}

syncM5StaffPhonesToGoogleSheet();
