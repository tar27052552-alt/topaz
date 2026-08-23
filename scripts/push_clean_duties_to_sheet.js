const fs = require('fs');

async function pushCleanDutiesToGoogleSheet() {
  const sheetId = '1QE3K2Y4LiJWsBzmcu0Lm8h54BDr-VULuOGGKT4oVSl8';
  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec";

  // 1. Load official staff data
  const m5Staff = JSON.parse(fs.readFileSync('d:\\กีฬาสีแสด\\data\\m5_staff_with_phones.json', 'utf8'));
  const m5StaffMap = new Map(m5Staff.map(s => [s.id, s]));

  // Props (22)
  const propsIds = new Set(["33221", "35532", "33323", "33617", "34858", "33635", "33917", "33995", "34373", "33719", "34019", "33965", "34505", "34379", "33815", "35589", "33809", "33755", "33761", "34862", "33683", "33695"]);
  // Cheer (11)
  const cheerIds = new Set(["34487", "35567", "34535", "33899", "34073", "33869", "33325", "33791", "33749", "35232", "33929"]);
  // Welfare (8)
  const welfareIds = new Set(["35490", "33427", "33110", "35469", "33301", "33137", "35436", "35445"]);
  // Drum (8)
  const drumIds = new Set(["33130", "33803", "33419", "33845", "33641", "32631", "32510", "32653"]);

  const allTabs = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
  const updateList = [];

  for (const tab of allTabs) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    const res = await fetch(url);
    const text = await res.text();
    const rows = text.split('\n').filter(r => r.trim().length > 0).map(r => {
      return r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    });

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const studentId = row[5];
      const studentName = row[6];
      const currentDuty = row[8];
      const phone = row[9];
      const roomFull = row[3];

      if (!studentId || !currentDuty || currentDuty === '-' || currentDuty.trim() === '') continue;

      let cleanDuty = currentDuty;

      if (m5StaffMap.has(studentId)) {
        cleanDuty = m5StaffMap.get(studentId).role;
      } else if (propsIds.has(studentId)) {
        cleanDuty = "สตาฟพร็อพ";
      } else if (cheerIds.has(studentId)) {
        cleanDuty = "เชียร์ลีดเดอร์";
      } else if (welfareIds.has(studentId)) {
        cleanDuty = "สวัสดิการ";
      } else if (drumIds.has(studentId)) {
        cleanDuty = "ดรัมเมเยอร์";
      } else if (currentDuty.includes(',')) {
        const parts = currentDuty.split(',').map(s => s.trim()).filter(Boolean);
        const uniqueParts = [];
        for (const p of parts) {
          let norm = p;
          if (norm.includes("สวัสดิ")) norm = "สวัสดิการ";
          if (norm.includes("พร็อพ") || norm.includes("พาเหรด")) norm = "สตาฟพร็อพ";
          if (norm.includes("หลีด")) norm = "เชียร์ลีดเดอร์";
          if (!uniqueParts.includes(norm)) {
            uniqueParts.push(norm);
          }
        }
        cleanDuty = uniqueParts.join(', ');
      }

      if (cleanDuty !== currentDuty) {
        updateList.push({
          studentId,
          studentName,
          roomFull,
          grade: parseInt(tab.replace(/[^\d]/g, '')),
          departmentName: "ฝ่ายสตาฟ",
          roleName: cleanDuty,
          categoryTitle: cleanDuty,
          phone: phone && phone !== '-' ? phone : (m5StaffMap.get(studentId)?.phone || "")
        });
      }
    }
  }

  console.log(`======================================================`);
  console.log(`🧹 ทำความสะอาดหน้าที่ซ้ำซ้อนใน Google Sheet ทั้งหมด (${updateList.length} คน)`);
  console.log(`======================================================`);

  for (let i = 0; i < updateList.length; i += 3) {
    const batch = updateList.slice(i, i + 3);
    const promises = batch.map(async (item) => {
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
          redirect: "follow"
        });
        const data = await res.json();
        console.log(`✅ [${item.studentName}] -> "${item.roleName}"`);
      } catch (e) {
        console.error(`❌ [${item.studentName}]:`, e.message);
      }
    });
    await Promise.all(promises);
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  console.log(`======================================================`);
  console.log(`🎉 ทำความสะอาดหน้าที่ของสตาฟและนักเรียนทุกคนเรียบร้อยแล้ว!`);
  console.log(`======================================================`);
}

pushCleanDutiesToGoogleSheet();
