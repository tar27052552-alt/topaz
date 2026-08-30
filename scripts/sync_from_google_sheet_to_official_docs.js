const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PRIMARY_SHEET_ID = '1QE3K2Y4LiJWsBzmcu0Lm8h54BDr-VULuOGGKT4oVSl8';
const FORM_SHEET_ID = '1jUMyhUFaX_rjY5yKINnkUb-RXbbmTy4Gw1crTJ_f5PI';
const GRADES = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];

function formatPhone(p) {
  if (!p) return '';
  const d = String(p).replace(/[^\d]/g, '');
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  if (d.length === 9) return `0${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5, 9)}`;
  return p;
}

function cleanName(n) {
  if (!n) return '';
  return n.replace(/^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นางสาว|น\.ส\.|นี้\.ส)\s*/, '')
          .replace(/\s+/g, '')
          .trim();
}

function deduplicateDuty(d) {
  if (!d) return '';
  const parts = d.split(',').map(s => s.trim()).filter(Boolean);
  return Array.from(new Set(parts)).join(', ');
}

function parseFormSports(m4Sport, maleSport, femaleSport, allSports) {
  const sportsSet = new Set();
  const rawSports = [m4Sport, maleSport, femaleSport, allSports].filter(Boolean).join(', ');
  const items = rawSports.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  for (const item of items) {
    if (item.includes('ฟุตบอล')) sportsSet.add('ฟุตบอล');
    else if (item.includes('บาส')) sportsSet.add('บาสเกตบอล');
    else if (item.includes('วอลเลย์')) sportsSet.add('วอลเลย์บอล');
    else if (item.includes('ตะกร้อ')) sportsSet.add('ตะกร้อ');
    else if (item.includes('เปตอง')) sportsSet.add('เปตอง');
    else if (item.includes('กรีฑา')) sportsSet.add('กรีฑา');
    else if (item.includes('16 ขา')) sportsSet.add('วิ่ง 16 ขา');
    else if (item.includes('สวัสดิการ')) sportsSet.add('สวัสดิการ');
    else if (item.includes('ดรัมเมเยอร์')) sportsSet.add('ดรัมเมเยอร์');
    else if (item.includes('เชียร์ลีดเดอร์') || item.includes('หลีด')) sportsSet.add('เชียร์ลีดเดอร์');
    else if (item.includes('คัลเลอร์การ์ด')) sportsSet.add('คัลเลอร์การ์ด');
    else if (item.includes('พาเหรด')) sportsSet.add('ขบวนพาเหรด');
    else if (item.includes('พร็อพ')) sportsSet.add('ฝ่ายพร็อพ');
    else if (item.includes('สแตน')) sportsSet.add('สแตนเชียร์');
    else if (item.trim()) sportsSet.add(item.trim());
  }
  return Array.from(sportsSet);
}

async function fetchPrimaryGradeSheet(gradeName) {
  const url = `https://docs.google.com/spreadsheets/d/${PRIMARY_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(gradeName)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split('\n');
    const students = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split('","').map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length < 8) continue;

      let studentId = cols[5] ? cols[5].replace(/[^\d]/g, '') : '';
      if (!studentId || studentId.length !== 5) continue;

      let studentName = cols[6] || '';
      let roomFull = cols[3] || `${gradeName}/-`;
      let classNo = cols[4] || '-';

      // Fix known ID typo in PDF/Sheet: ม.2/7 เลขที่ 11 is เด็กชายวชิรวิชญ์ เงินงามมีสุข (34517)
      if (studentId === '34317' && (roomFull.includes('2/7') || roomFull === 'ม.2/7')) {
        studentId = '34517';
        studentName = 'เด็กชายวชิรวิชญ์ เงินงามมีสุข';
      }

      students.push({
        id: studentId,
        name: studentName,
        gender: cols[7] || '',
        roomFull: roomFull,
        classNo: classNo,
        duty: deduplicateDuty(cols[8] || ''),
        phone: formatPhone(cols[9] || ''),
        note: cols[10] || ''
      });
    }
    return students;
  } catch (err) {
    console.error(`Error fetching primary ${gradeName}:`, err.message);
    return [];
  }
}

async function fetchFormResponseSheet() {
  const url = `https://docs.google.com/spreadsheets/d/${FORM_SHEET_ID}/gviz/tq?tqx=out:csv`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split('\n');
    const formResponses = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split('","').map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length < 5) continue;

      const timestamp = cols[0] || '';
      const rawName = cols[1] || '';
      const grade = cols[2] ? cols[2].replace(/[^\d]/g, '') : '';
      const room = cols[3] ? cols[3].replace(/[^\d]/g, '') : '';
      const phone = formatPhone(cols[4] || '');
      const m4Sport = cols[5] || '';
      const maleSport = cols[6] || '';
      const femaleSport = cols[7] || '';
      const allSports = cols[8] || '';

      const parsedSports = parseFormSports(m4Sport, maleSport, femaleSport, allSports);

      formResponses.push({
        timestamp,
        rawName,
        cleanName: cleanName(rawName),
        grade,
        room,
        roomFull: grade && room ? `ม.${grade}/${room}` : '',
        phone,
        sports: parsedSports,
        dutyStr: parsedSports.join(', ')
      });
    }
    return formResponses;
  } catch (err) {
    console.error(`Error fetching form response sheet:`, err.message);
    return [];
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 🔄 ดึงข้อมูลสดจาก Google Sheets ทุกชุด -> อัปเดตลงในเครื่อง ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // 1. Download Primary Master Sheets (ม.1 - ม.6)
  console.log('>>> [1/4] กำลังดาวน์โหลดข้อมูลจาก Google Sheet รวมระดับชั้น (ม.1 - ม.6)...');
  let primarySheetStudents = [];
  for (const g of GRADES) {
    const list = await fetchPrimaryGradeSheet(g);
    console.log(`  ✅ แท็บ ${g}: โหลดสำเร็จ ${list.length} คน`);
    primarySheetStudents = primarySheetStudents.concat(list);
  }

  // 2. Download Form Responses Sheet (แบบฟอร์มลงทะเบียนออนไลน์)
  console.log('\n>>> [2/4] กำลังดาวน์โหลดข้อมูลจาก Google Sheet แบบฟอร์มลงทะเบียนออนไลน์...');
  const formResponses = await fetchFormResponseSheet();
  console.log(`  ✅ ดึงข้อมูลใบสมัครออนไลน์สำเร็จ ${formResponses.length} รายการ`);

  // 3. Update Master Data
  console.log('\n>>> [3/4] กำลังอัปเดตฐานข้อมูลกลาง (Master Data)...');
  const masterFile = path.join(__dirname, '..', 'data', 'students_master.json');
  const pubMasterFile = path.join(__dirname, '..', 'public', 'data', 'students_master.json');
  
  let masterData = [];
  if (fs.existsSync(masterFile)) {
    masterData = JSON.parse(fs.readFileSync(masterFile, 'utf8'));
  }

  // Apply Primary Sheet updates
  const primaryMap = new Map(primarySheetStudents.map(s => [s.id, s]));
  masterData.forEach(st => {
    if (primaryMap.has(st.id)) {
      const live = primaryMap.get(st.id);
      if (live.duty) st.duty = live.duty;
      if (live.phone && live.phone !== '-') st.phone = live.phone;
      if (live.note) st.note = live.note;
    }
  });

  // Apply Form Response Sheet updates
  let formUpdatedCount = 0;
  formResponses.forEach(resp => {
    let matched = masterData.filter(m => cleanName(m.name) === resp.cleanName);
    if (matched.length === 0 && resp.cleanName) {
      matched = masterData.filter(m => m.name.includes(resp.cleanName) || resp.cleanName.includes(cleanName(m.name)));
    }
    if (matched.length > 1 && resp.grade && resp.room) {
      const exactRoom = matched.filter(m => String(m.grade) === String(resp.grade) && String(m.room) === String(resp.room));
      if (exactRoom.length === 1) matched = exactRoom;
    }

    if (matched.length >= 1) {
      const st = matched[0];
      formUpdatedCount++;
      if (resp.phone) st.phone = resp.phone;

      // Determine duty update
      const isM5Staff = st.grade === 5 && st.duty && (
        st.duty.includes('ประธาน') || st.duty.includes('กรรมการ') || st.duty.includes('สตาฟ') ||
        st.duty.includes('หัวหน้า') || st.duty.includes('ฝ่าย')
      );

      if (resp.dutyStr) {
        if (isM5Staff) {
          // Keep staff duty, but if they specifically added sports, append them
          const existingParts = (st.duty || '').split(',').map(s => s.trim()).filter(Boolean);
          const combined = Array.from(new Set([...existingParts, ...resp.sports])).join(', ');
          st.duty = deduplicateDuty(combined);
        } else {
          const existingParts = (st.duty || '').split(',').map(s => s.trim()).filter(Boolean);
          const combined = Array.from(new Set([...existingParts, ...resp.sports])).join(', ');
          st.duty = deduplicateDuty(combined);
        }
      }
      console.log(`  🔗 ซิงค์ใบสมัคร [${st.id}] ${st.name} (${st.roomFull}) -> เบอร์: ${st.phone || '-'} | หน้าที่: ${st.duty}`);
    } else {
      console.log(`  ⚠️ ไม่พบรหัสนักเรียนในระบบสำหรับ: ${resp.rawName} (${resp.roomFull})`);
    }
  });

  fs.writeFileSync(masterFile, JSON.stringify(masterData, null, 2), 'utf8');
  if (fs.existsSync(path.dirname(pubMasterFile))) {
    fs.writeFileSync(pubMasterFile, JSON.stringify(masterData, null, 2), 'utf8');
  }

  // Update M.5 staff list with live phones & roles
  const m5StaffPath = path.join(__dirname, '..', 'data', 'm5_staff_with_phones.json');
  const pubM5StaffPath = path.join(__dirname, '..', 'public', 'data', 'm5_staff_with_phones.json');
  if (fs.existsSync(m5StaffPath)) {
    const m5List = JSON.parse(fs.readFileSync(m5StaffPath, 'utf8'));
    m5List.forEach(st => {
      const liveMaster = masterData.find(m => m.id === st.id);
      if (liveMaster) {
        if (liveMaster.phone && liveMaster.phone !== '-') st.phone = liveMaster.phone;
        if (liveMaster.duty) {
          const parts = liveMaster.duty.split(',').map(s => s.trim());
          const staffRole = parts.find(p => !p.includes('บอล') && !p.includes('บาส') && !p.includes('วอลเลย์') && !p.includes('ตะกร้อ') && !p.includes('เปตอง') && !p.includes('กรีฑา') && !p.includes('16 ขา'));
          if (staffRole) st.role = staffRole;
        }
      }
    });
    fs.writeFileSync(m5StaffPath, JSON.stringify(m5List, null, 2), 'utf8');
    if (fs.existsSync(path.dirname(pubM5StaffPath))) {
      fs.writeFileSync(pubM5StaffPath, JSON.stringify(m5List, null, 2), 'utf8');
    }
  }

  // Update cloud_config.json
  const cloudConfigPath = path.join(__dirname, '..', 'data', 'cloud_config.json');
  const pubCloudConfigPath = path.join(__dirname, '..', 'public', 'data', 'cloud_config.json');
  const cloudConfig = {
    googleSheetWebhookUrl: "https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec",
    sheetUrl: `https://docs.google.com/spreadsheets/d/${PRIMARY_SHEET_ID}/edit?usp=sharing`,
    formResponsesSheetUrl: `https://docs.google.com/spreadsheets/d/${FORM_SHEET_ID}/edit?usp=sharing`,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(cloudConfigPath, JSON.stringify(cloudConfig, null, 2), 'utf8');
  if (fs.existsSync(path.dirname(pubCloudConfigPath))) {
    fs.writeFileSync(pubCloudConfigPath, JSON.stringify(cloudConfig, null, 2), 'utf8');
  }

  // Update registrations.json with online registrations
  const regsPath = path.join(__dirname, '..', 'data', 'registrations.json');
  const pubRegsPath = path.join(__dirname, '..', 'public', 'data', 'registrations.json');
  let registrations = [];
  if (fs.existsSync(regsPath)) {
    registrations = JSON.parse(fs.readFileSync(regsPath, 'utf8'));
  }

  formResponses.forEach(resp => {
    let matched = masterData.filter(m => cleanName(m.name) === resp.cleanName);
    if (matched.length === 0 && resp.cleanName) {
      matched = masterData.filter(m => m.name.includes(resp.cleanName) || resp.cleanName.includes(cleanName(m.name)));
    }
    if (matched.length > 1 && resp.grade && resp.room) {
      const exactRoom = matched.filter(m => String(m.grade) === String(resp.grade) && String(m.room) === String(resp.room));
      if (exactRoom.length === 1) matched = exactRoom;
    }

    if (matched.length >= 1) {
      const st = matched[0];
      resp.sports.forEach(sport => {
        const alreadyReg = registrations.some(r => r.studentId === st.id && (r.roleName === sport || r.sportName === sport || r.categoryTitle === sport));
        if (!alreadyReg) {
          registrations.push({
            id: `reg_${st.id}_form_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            studentId: st.id,
            name: st.name,
            grade: st.grade,
            room: st.room,
            roomFull: st.roomFull,
            classNo: st.classNo,
            departmentName: sport.includes('สวัสดิการ') ? 'ฝ่ายสวัสดิการ' : (sport.includes('ดรัม') ? 'ฝ่ายดรัมเมเยอร์' : 'ฝ่ายกีฬา'),
            roleName: sport,
            categoryTitle: sport,
            phone: resp.phone || st.phone || '-',
            createdAt: resp.timestamp || new Date().toISOString()
          });
        }
      });
    }
  });

  fs.writeFileSync(regsPath, JSON.stringify(registrations, null, 2), 'utf8');
  if (fs.existsSync(path.dirname(pubRegsPath))) {
    fs.writeFileSync(pubRegsPath, JSON.stringify(registrations, null, 2), 'utf8');
  }

  console.log('  ✅ อัปเดตข้อมูลและสถิติทั้งหมดเรียบร้อยแล้ว');

  // 4. Run Build All
  console.log('\n>>> [4/4] รันระบบสร้างไฟล์ Excel และ PDF ทั้งหมดลงในโฟลเดอร์:');
  console.log('    📁 d:\\กีฬาสีแสด\\เอกสารและรายชื่อคณะสีแสด_ปี69\\');
  
  const buildAll = require('./build_all');
  await buildAll.buildAll();

  console.log('\n✨ ซิงค์ข้อมูลสดจาก Google Sheets และสร้างไฟล์เอกสารทั้งหมดสำเร็จ 100%!');
}

if (require.main === module) {
  main();
}

module.exports = { main };
