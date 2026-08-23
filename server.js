const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students_master.json');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments_config.json');
const SPORTS_FILE = path.join(DATA_DIR, 'sports_config.json');
const REGS_FILE = path.join(DATA_DIR, 'registrations.json');

// Helper to read/write JSON safely
function readJSON(filePath, defaultVal = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return defaultVal;
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. ค้นหาข้อมูลนักเรียนด้วยรหัสประจำตัว 5 หลัก (ดึงข้อมูลตรงจาก Google Sheet แบบ 2-Way Sync)
app.get('/api/student/:id', async (req, res) => {
  const queryId = req.params.id.trim();
  const students = readJSON(STUDENTS_FILE, []);
  let student = students.find(s => s.id === queryId || s.stdId === queryId);
  const registrations = readJSON(REGS_FILE, []);
  let studentRegs = registrations.filter(r => r.studentId === (student ? student.id : queryId) || r.studentId === queryId);

  // Normalize departmentId/departmentName for sport registrations from registrations.json (they may not have these fields)
  function normalizeDept(r) {
    if (r.departmentId) return r; // already has dept
    const t = ((r.sportName || '') + ' ' + (r.categoryTitle || '') + ' ' + (r.categoryId || '')).toLowerCase();
    let deptId = 'general';
    let deptName = 'ฝ่ายกิจกรรม';
    if (t.includes('กรีฑา') || t.includes('athletics') || t.includes('at_')) { deptId = 'athletics'; deptName = 'ฝ่ายกรีฑา'; }
    else if (t.includes('เปตอง') || t.includes('petanque') || t.includes('pt_')) { deptId = 'petanque'; deptName = 'ฝ่ายเปตอง'; }
    else if (t.includes('วอลเลย์') || t.includes('volleyball') || t.includes('vb')) { deptId = 'volleyball'; deptName = 'ฝ่ายวอลเลย์บอล'; }
    else if (t.includes('บาส') || t.includes('basketball') || t.includes('bb')) { deptId = 'basketball'; deptName = 'ฝ่ายบาสเกตบอล'; }
    else if (t.includes('ตะกร้อ') || t.includes('takraw') || t.includes('tk')) { deptId = 'takraw'; deptName = 'ฝ่ายเซปักตะกร้อ'; }
    else if (t.includes('16 ขา') || t.includes('running16') || t.includes('r16')) { deptId = 'running16'; deptName = 'ฝ่ายวิ่ง 16 ขา'; }
    else if (t.includes('ฟุตบอล') || t.includes('football') || t.includes('fb') || t.includes('บอล')) { deptId = 'sports'; deptName = 'ฝ่ายกีฬา'; }
    else if (t.includes('สแตน') || t.includes('stand')) { deptId = 'stand_cheer'; deptName = 'ฝ่ายสแตนเชียร์'; }
    else if (t.includes('หลีด') || t.includes('ลีด') || t.includes('cheer')) { deptId = 'cheerleader'; deptName = 'ฝ่ายเชียร์ลีดเดอร์'; }
    else if (t.includes('พร็อพ') || t.includes('ขบวน')) { deptId = 'parade_props'; deptName = 'ฝ่ายพร็อพ & ขบวนพาเหรด'; }
    else if (t.includes('ดรัม') || t.includes('คัลเลอร์')) { deptId = 'drum_major'; deptName = 'ฝ่ายดรัมเมเยอร์'; }
    else if (r.sportId || r.sportName) { deptId = 'sports'; deptName = 'ฝ่ายกีฬา'; }
    return { ...r, departmentId: deptId, departmentName: r.departmentName || deptName };
  }
  studentRegs = studentRegs.map(normalizeDept);

  // ลองดึงข้อมูลสดๆ จาก Google Sheet (ถ้ามีการตั้งค่า Webhook)
  const cloudConfig = readJSON(path.join(DATA_DIR, 'cloud_config.json'), {});
  const webhookUrl = cloudConfig.googleSheetWebhookUrl;

  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      const sheetSearchUrl = `${webhookUrl}?studentId=${encodeURIComponent(queryId)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const sheetRes = await fetch(sheetSearchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      const sheetJson = await sheetRes.json();
      if (sheetJson && sheetJson.success && sheetJson.data) {
        const d = sheetJson.data;
        const m5StaffList = readJSON(path.join(DATA_DIR, 'm5_staff_with_phones.json'), []);
        const staffMember = m5StaffList.find(s => s.id === queryId);
        const resolvedPhone = (d.phone && d.phone !== '-') ? d.phone : (staffMember && staffMember.phone && staffMember.phone !== '-' ? staffMember.phone : '');

        student = {
          id: d.id || queryId,
          name: d.name || (student ? student.name : ''),
          grade: d.grade || (student ? student.grade : 1),
          room: d.room || (student ? student.room : 1),
          roomFull: d.roomFull || (student ? student.roomFull : `ม.${d.grade}/${d.room}`),
          classNo: d.classNo || (student ? student.classNo : '-'),
          gender: d.gender || (student ? student.gender : 'ชาย'),
          phone: resolvedPhone,
          level: (d.grade >= 4) ? 'senior' : 'junior',
          source: 'google_sheet'
        };

        // ถ้าใน Google Sheet มีการกรอกหน้าที่ (Col I) หรือเบอร์โทร (Col J) ไว้แล้ว
        if (d.currentDuty && d.currentDuty !== '-' && d.currentDuty.trim() !== '') {
          const dutyNames = d.currentDuty.split(',').map(s => s.trim());
          dutyNames.forEach(duty => {
            let roleTitle = duty;
            if (student.grade === 5 && (duty === 'สตาฟ' || duty.includes('เฮด') || duty.includes('กีฬา')) && staffMember) {
              roleTitle = staffMember.role || duty;
            }
            const alreadyExists = studentRegs.some(r => r.categoryTitle === roleTitle || r.categoryTitle === duty || (r.roleName && r.roleName === roleTitle));
            if (!alreadyExists) {
              studentRegs.push({
                id: `sheet_${queryId}_${roleTitle}`,
                studentId: queryId,
                name: student.name,
                grade: student.grade,
                roomFull: student.roomFull,
                departmentName: roleTitle.includes('สตาฟ') || roleTitle.includes('ประธาน') || roleTitle.includes('เหรัญญิก') ? 'ฝ่ายสตาฟคณะสี (ม.5)' : (roleTitle.includes('กีฬา') || roleTitle.includes('บอล') || roleTitle.includes('กรีฑา') || roleTitle.includes('ตะกร้อ') || roleTitle.includes('เปตอง') ? 'ฝ่ายกีฬา' : `ฝ่าย${roleTitle}`),
                categoryTitle: roleTitle,
                phone: resolvedPhone,
                createdAt: new Date().toISOString()
              });
            }
          });
        }
      }
    } catch (err) {
      console.log('[Google Sheet Live Query Fallback to Local]:', err.message);
    }
  }

  if (student && student.grade === 5) {
    const m5StaffList = readJSON(path.join(DATA_DIR, 'm5_staff_with_phones.json'), []);
    const staffMember = m5StaffList.find(s => s.id === student.id);
    if (staffMember) {
      if (!student.phone && staffMember.phone && staffMember.phone !== '-') {
        student.phone = staffMember.phone;
      }
      const hasStaffEntry = studentRegs.some(r => r.categoryTitle === staffMember.role || (r.categoryTitle && (r.categoryTitle.includes('ดรัม') || r.categoryTitle.includes('สตาฟ') || r.categoryTitle.includes('ประธาน') || r.categoryTitle.includes('หัวหน้า') || r.categoryTitle.includes('เหรัญญิก'))));
      if (!hasStaffEntry && staffMember.role) {
        const roleText = staffMember.role.toLowerCase();
        let staffDeptId = 'staff';
        let staffDeptName = 'ฝ่ายสตาฟคณะสี (ม.5)';
        if (roleText.includes('ดรัม')) { staffDeptId = 'drum_major'; staffDeptName = 'ฝ่ายดรัมเมเยอร์'; }
        else if (roleText.includes('คัลเลอร์')) { staffDeptId = 'drum_major'; staffDeptName = 'ฝ่ายคัลเลอร์การ์ด'; }
        else if (roleText.includes('สแตน')) { staffDeptId = 'stand_cheer'; staffDeptName = 'ฝ่ายสแตนเชียร์'; }
        else if (roleText.includes('หลีด') || roleText.includes('ลีด')) { staffDeptId = 'cheerleader'; staffDeptName = 'ฝ่ายเชียร์ลีดเดอร์'; }
        studentRegs.unshift({
          id: `staff_${student.id}`,
          studentId: student.id,
          name: student.name,
          grade: student.grade,
          roomFull: student.roomFull,
          departmentId: staffDeptId,
          departmentName: staffDeptName,
          categoryTitle: staffMember.role,
          roleName: staffMember.role,
          phone: student.phone || staffMember.phone || '',
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // แนบหน้าที่จากฐานข้อมูล master (รวมทั้งกรณี ม.1 ที่มีมากกว่า 1 หน้าที่ เช่น สแตนเชียร์, เชียร์ลีดเดอร์)
  const officialDuties = (student && student.duty && student.duty.trim() !== '' && student.duty !== '-')
    ? student.duty.split(',').map(d => d.trim()).filter(Boolean)
    : (student && student.grade === 1 ? ['สแตนเชียร์'] : []);

  if (student) {
    student.duty = officialDuties.join(', ');
  }

  officialDuties.forEach(d => {
    let deptName = 'ฝ่ายกิจกรรม';
    let deptId = 'general';

    if (d.includes('สแตน')) {
      deptName = 'ฝ่ายสแตนเชียร์';
      deptId = 'stand_cheer';
    } else if (d.includes('หลีด') || d.includes('ลีด') || d.includes('cheer')) {
      deptName = 'ฝ่ายเชียร์ลีดเดอร์';
      deptId = 'cheerleader';
    } else if (d.includes('พร็อพ') || d.includes('ขบวน') || d.includes('พาเหรด')) {
      deptName = 'ฝ่ายพร็อพ & ขบวนพาเหรด';
      deptId = 'parade_props';
    } else if (d.includes('ดรัม') || d.includes('คัลเลอร์')) {
      deptName = 'ฝ่ายดรัมเมเยอร์ & คัลเลอร์การ์ด';
      deptId = 'drum_major';
    } else if (d.includes('สวัสดิ')) {
      deptName = 'ฝ่ายสวัสดิการ';
      deptId = 'welfare';
    } else if (d.includes('สตาฟ') || d.includes('ประธาน') || d.includes('เหรัญญิก') || d.includes('หัวหน้า')) {
      deptName = 'ฝ่ายสตาฟคณะสี (ม.5)';
      deptId = 'staff';
    } else if (d.includes('กีฬา') || d.includes('บอล') || d.includes('วอลเลย์') || d.includes('บาส') || d.includes('กรีฑา') || d.includes('ตะกร้อ') || d.includes('เปตอง') || d.includes('16 ขา')) {
      deptName = 'ฝ่ายกีฬา';
      deptId = 'sports';
    }

    const alreadyHas = studentRegs.some(r => {
      const regText = ((r.categoryTitle || '') + ' ' + (r.roleName || '') + ' ' + (r.sportName || '') + ' ' + (r.categoryId || '') + ' ' + (r.departmentName || '')).toLowerCase();
      const dutyNorm = d.toLowerCase();
      if (dutyNorm.includes('กรีฑา')) return regText.includes('กรีฑา') || regText.includes('athletics') || regText.includes('at_');
      if (dutyNorm.includes('เปตอง')) return regText.includes('เปตอง') || regText.includes('petanque') || regText.includes('pt_');
      if (dutyNorm.includes('ฟุตบอล') || dutyNorm === 'บอล') return regText.includes('ฟุตบอล') || regText.includes('football') || regText.includes('fb_');
      if (dutyNorm.includes('วอลเลย์')) return regText.includes('วอลเลย์') || regText.includes('volleyball') || regText.includes('vb_');
      if (dutyNorm.includes('บาส')) return regText.includes('บาส') || regText.includes('basketball') || regText.includes('bb_');
      if (dutyNorm.includes('ตะกร้อ')) return regText.includes('ตะกร้อ') || regText.includes('takraw') || regText.includes('tk_');
      if (dutyNorm.includes('16 ขา')) return regText.includes('16 ขา') || regText.includes('running16');
      if (dutyNorm.includes('สแตน')) return regText.includes('สแตน') || regText.includes('stand');
      if (dutyNorm.includes('หลีด') || dutyNorm.includes('ลีด')) return regText.includes('หลีด') || regText.includes('ลีด') || regText.includes('cheer');
      if (dutyNorm.includes('พร็อพ') || dutyNorm.includes('ขบวน')) return regText.includes('พร็อพ') || regText.includes('ขบวน') || regText.includes('parade');
      if (dutyNorm.includes('ดรัม') || dutyNorm.includes('คัลเลอร์')) return regText.includes('ดรัม') || regText.includes('คัลเลอร์');
      if (dutyNorm.includes('สวัสดิ')) return regText.includes('สวัสดิ');
      return r.categoryTitle === d || r.roleName === d || (r.departmentId === deptId && !r.sportId);
    });
    if (!alreadyHas) {
      studentRegs.push({
        id: `master_${student.id}_${deptId}_${d}`,
        studentId: student.id,
        name: student.name,
        grade: student.grade,
        roomFull: student.roomFull,
        departmentId: deptId,
        departmentName: deptName,
        categoryTitle: d.includes('สแตน') ? 'สแตนเชียร์ (กองเชียร์บนอัฒจันทร์)' : d,
        roleName: d,
        phone: student.phone || '',
        createdAt: new Date().toISOString()
      });
    }
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      message: `ไม่พบรหัสประจำตัว ${queryId} ในฐานข้อมูลคณะสีแสด (สีบุษราคัม)`
    });
  }

  // คำนวณฝ่ายและกิจกรรมที่นักเรียนคนนี้มีสิทธิ์สมัคร
  const departments = readJSON(DEPARTMENTS_FILE, []);
  const eligibleDepartments = departments.filter(dept => {
    // Check grade
    if (dept.allowedGrades && !dept.allowedGrades.includes(student.grade)) {
      return false;
    }
    // Check gender
    if (dept.allowedGenders && !dept.allowedGenders.includes(student.gender)) {
      return false;
    }
    return true;
  }).map(dept => {
    if (dept.type === 'sports' && dept.items) {
      const filteredItems = dept.items.map(sport => {
        const matchingCategories = sport.categories.filter(cat => {
          const gradeMatch = cat.grades.includes(student.grade);
          const genderMatch = cat.gender === 'ทั้งหมด' || cat.gender === student.gender;
          return gradeMatch && genderMatch;
        }).map(cat => {
          const regCount = registrations.filter(r => r.categoryId === cat.id).length;
          return {
            ...cat,
            currentCount: regCount,
            isFull: false,
            availableSeats: 9999
          };
        });

        return {
          ...sport,
          categories: matchingCategories
        };
      }).filter(sport => sport.categories.length > 0);

      return {
        ...dept,
        items: filteredItems
      };
    } else {
      const regCount = registrations.filter(r => r.departmentId === dept.id).length;
      return {
        ...dept,
        currentCount: regCount,
        isFull: false,
        availableSeats: 9999
      };
    }
  });

  res.json({
    success: true,
    data: student,
    existingRegistrations: studentRegs,
    eligibleDepartments: eligibleDepartments
  });
});

// 2. ดึงข้อมูลฝ่ายทั้งหมด โควตา และสถานะแบบ Real-time
app.get('/api/departments', (req, res) => {
  const departments = readJSON(DEPARTMENTS_FILE, []);
  const registrations = readJSON(REGS_FILE, []);

  const enrichedDepartments = departments.map(dept => {
    if (dept.type === 'sports' && dept.items) {
      const enrichedItems = dept.items.map(sport => {
        const enrichedCategories = sport.categories.map(cat => {
          const regCount = registrations.filter(r => r.categoryId === cat.id).length;
          return {
            ...cat,
            currentCount: regCount,
            isFull: regCount >= cat.maxQuota,
            availableSeats: Math.max(0, cat.maxQuota - regCount)
          };
        });
        return {
          ...sport,
          categories: enrichedCategories
        };
      });
      return {
        ...dept,
        items: enrichedItems
      };
    } else {
      const regCount = registrations.filter(r => r.departmentId === dept.id).length;
      return {
        ...dept,
        currentCount: regCount,
        isFull: regCount >= (dept.maxQuota || 999),
        availableSeats: Math.max(0, (dept.maxQuota || 999) - regCount)
      };
    }
  });

  res.json({
    success: true,
    data: enrichedDepartments,
    totalRegistrations: registrations.length,
    uniqueStudents: new Set(registrations.map(r => r.studentId)).size
  });
});

// 2.1 ดึงข้อมูลชนิดกีฬาทั้งหมด
app.get('/api/sports', (req, res) => {
  const sports = readJSON(SPORTS_FILE, []);
  res.json({
    success: true,
    data: sports
  });
});

// 3. รับสมัครกิจกรรมออนไลน์ (All-in-One Registration)
app.post('/api/register', (req, res) => {
  const settings = getSettings();
  if (settings.isRegistrationOpen === false) {
    return res.status(403).json({
      success: false,
      message: settings.closeMessage || 'ระบบปิดรับสมัครชั่วคราวเพื่อประมวลผลข้อมูล'
    });
  }

  const { studentId, phone, departmentId, selectedSports, note } = req.body;

  if (!studentId || !phone || !departmentId) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอกรหัสประจำตัว, เบอร์โทรศัพท์ และเลือกฝ่ายกิจกรรมให้ครบถ้วน'
    });
  }

  // Validate phone format (10 digits)
  const cleanPhone = String(phone).replace(/[^\d]/g, '');
  if (cleanPhone.length !== 10) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก (เช่น 08x-xxx-xxxx)'
    });
  }

  const students = readJSON(STUDENTS_FILE, []);
  const student = students.find(s => s.id === String(studentId).trim() || s.stdId === String(studentId).trim());

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'ไม่พบรหัสนักเรียนในฐานข้อมูลคณะสีแสด'
    });
  }

  const departments = readJSON(DEPARTMENTS_FILE, []);
  const department = departments.find(d => d.id === departmentId);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'ไม่พบฝ่ายกิจกรรมที่ระบุ'
    });
  }

  // Check grade eligibility
  if (department.allowedGrades && !department.allowedGrades.includes(student.grade)) {
    return res.status(400).json({
      success: false,
      message: `ฝ่าย${department.name} เปิดรับเฉพาะระดับชั้น ม.${department.allowedGrades.join(', ม.')} เท่านั้น`
    });
  }

  // Check gender eligibility
  if (department.allowedGenders && !department.allowedGenders.includes(student.gender)) {
    return res.status(400).json({
      success: false,
      message: `ฝ่าย${department.name} เปิดรับเฉพาะนักเรียนเพศ ${department.allowedGenders.join('/')} เท่านั้น`
    });
  }

  const registrations = readJSON(REGS_FILE, []);
  
  // Rule for M.5: Must register as Staff first before registering for other departments!
  const isM5 = student.grade === 5;
  const isStaffRole = (r) => r.departmentId === 'staff' || 
    (r.categoryTitle && (r.categoryTitle.includes('สตาฟ') || r.categoryTitle.includes('หัวหน้า') || r.categoryTitle.includes('ประธาน') || r.categoryTitle.includes('เฮด') || r.categoryTitle.includes('เหรัญญิก') || r.categoryTitle.includes('มือกลอง') || r.categoryTitle.includes('ขบวน') || r.categoryTitle.includes('ดรัม') || r.categoryTitle.includes('คัลเลอร์'))) ||
    (r.departmentName && (r.departmentName.includes('สตาฟ') || r.departmentName.includes('คณะสี') || r.departmentName.includes('หัวหน้า'))) ||
    (isM5 && r.departmentId !== 'sports');
  
  const m5StaffList = readJSON(path.join(DATA_DIR, 'm5_staff_with_phones.json'), []);
  const staffMember = m5StaffList.find(s => s.id === student.id);
  const hasStaff = registrations.some(r => (r.studentId === student.id || r.id === student.id) && isStaffRole(r)) || (staffMember && !!staffMember.role);

  if (isM5 && department.id !== 'staff' && !hasStaff) {
    return res.status(400).json({
      success: false,
      message: 'นักเรียนชั้น ม.5 ต้องลงทะเบียน "ฝ่ายสตาฟคณะสี (ม.5)" ก่อน จึงจะสามารถลงกิจกรรมอื่นได้'
    });
  }

  const existingForStudent = registrations.filter(r => r.studentId === student.id);
  const existingSportsCount = existingForStudent.filter(r => r.departmentId === 'sports' || r.sportId).length;

  if (!isM5 && existingForStudent.length >= 1) {
    return res.status(400).json({
      success: false,
      message: 'นักเรียนได้ลงทะเบียนกิจกรรมครบตามสิทธิ์ (1 กิจกรรม/กีฬา) เรียบร้อยแล้ว'
    });
  }

  if (isM5 && department.type === 'sports' && existingSportsCount >= 1) {
    return res.status(400).json({
      success: false,
      message: 'นักเรียน ม.5 ได้ลงทะเบียนสตาฟและแข่งขันกีฬาครบตามสิทธิ์ (1 ชนิดกีฬา) เรียบร้อยแล้ว'
    });
  }

  const newlyAdded = [];

  if (department.type === 'sports') {
    // Sport validation: 1 sport only for all students
    const maxAllowedForStudent = 1;
    if (!selectedSports || !Array.isArray(selectedSports) || selectedSports.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกชนิดกีฬา 1 ชนิด'
      });
    }

    if (selectedSports.length > maxAllowedForStudent) {
      return res.status(400).json({
        success: false,
        message: 'สามารถเลือกสมัครกีฬาได้สูงสุด 1 ชนิดกีฬาเท่านั้น'
      });
    }

    for (const sportSelection of selectedSports) {
      const catId = typeof sportSelection === 'string' ? sportSelection : sportSelection.categoryId;
      
      // Find category
      let foundSport = null;
      let foundCat = null;
      for (const s of department.items) {
        const c = s.categories.find(cat => cat.id === catId);
        if (c) {
          foundSport = s;
          foundCat = c;
          break;
        }
      }

      if (!foundSport || !foundCat) {
        continue;
      }

      // Check category eligibility
      if (!foundCat.grades.includes(student.grade)) {
        return res.status(400).json({
          success: false,
          message: `รุ่น ${foundCat.title} ไม่เปิดรับระดับชั้น ม.${student.grade}`
        });
      }
      if (foundCat.gender !== 'ทั้งหมด' && foundCat.gender !== student.gender) {
        return res.status(400).json({
          success: false,
          message: `รุ่น ${foundCat.title} เปิดรับเฉพาะนักเรียนเพศ${foundCat.gender}`
        });
      }

      // Check duplicate
      const isDuplicate = registrations.some(r => r.studentId === student.id && r.categoryId === catId);
      if (isDuplicate) {
        continue;
      }

      const regItem = {
        id: `reg_${student.id}_${foundCat.id}_${Date.now()}`,
        studentId: student.id,
        name: student.name,
        grade: student.grade,
        room: student.room,
        roomFull: student.roomFull || `ม.${student.grade}/${student.room}`,
        classNo: student.classNo || '-',
        gender: student.gender,
        departmentId: 'sports',
        departmentName: 'ฝ่ายกีฬา',
        sportId: foundSport.id,
        sportName: foundSport.name,
        categoryTitle: foundCat.title,
        categoryId: foundCat.id,
        phone: cleanPhone,
        note: note ? String(note).trim() : '',
        createdAt: new Date().toISOString()
      };

      registrations.push(regItem);
      newlyAdded.push(regItem);
    }
  } else {
    // Non-sport single department / staff department
    const isDuplicate = registrations.some(r => r.studentId === student.id && r.departmentId === department.id);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: `ท่านได้สมัครฝ่าย${department.name}ไว้เรียบร้อยแล้ว`
      });
    }

    let staffRoleTitle = department.roleName || department.name;
    if (department.type === 'staff' && req.body.selectedStaffRole) {
      const foundItem = department.items && department.items.find(it => it.id === req.body.selectedStaffRole || it.roleName === req.body.selectedStaffRole || it.title === req.body.selectedStaffRole);
      if (foundItem) {
        staffRoleTitle = foundItem.roleName || foundItem.title;
      } else {
        staffRoleTitle = req.body.selectedStaffRole;
      }
    }

    const regItem = {
      id: `reg_${student.id}_${department.id}_${Date.now()}`,
      studentId: student.id,
      name: student.name,
      grade: student.grade,
      room: student.room,
      roomFull: student.roomFull || `ม.${student.grade}/${student.room}`,
      classNo: student.classNo || '-',
      gender: student.gender,
      departmentId: department.id,
      departmentName: department.name,
      roleName: staffRoleTitle,
      categoryTitle: staffRoleTitle,
      phone: cleanPhone,
      note: note ? String(note).trim() : '',
      createdAt: new Date().toISOString()
    };

    registrations.push(regItem);
    newlyAdded.push(regItem);
  }

  writeJSON(REGS_FILE, registrations);

  // Sync to Google Sheet Cloud if Webhook URL is configured
  const cloudConfig = readJSON(path.join(DATA_DIR, 'cloud_config.json'), {});
  const webhookUrl = cloudConfig.googleSheetWebhookUrl;
  if (webhookUrl && webhookUrl.startsWith('http')) {
    newlyAdded.forEach(regItem => {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
            studentId: regItem.studentId,
            name: regItem.name,
            grade: regItem.grade,
            roomFull: regItem.roomFull,
            classNo: regItem.classNo,
            gender: regItem.gender,
            departmentName: regItem.departmentName,
            categoryTitle: regItem.categoryTitle || regItem.roleName || regItem.sportName,
            phone: regItem.phone,
            note: regItem.note || ''
          })
        }).catch(e => console.error('[Google Sheet Sync Error]:', e.message));
      } catch (err) {
        console.error('[Google Sheet Error]:', err.message);
      }
    });
  }

  res.json({
    success: true,
    message: `สมัครเข้าร่วม${department.name} สำเร็จเรียบร้อย!`,
    registered: newlyAdded,
    student: student
  });
});

// 3.1 อัปเดตเฉพาะเบอร์โทรศัพท์สำหรับผู้ที่มีหน้าที่ในระบบแล้ว
app.post('/api/student/update-phone', async (req, res) => {
  const { studentId, phone } = req.body;
  const cleanPhone = String(phone || '').replace(/[^\d]/g, '');

  if (!cleanPhone || cleanPhone.length !== 10) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก (เช่น 08x-xxx-xxxx)'
    });
  }

  const students = readJSON(STUDENTS_FILE, []);
  const student = students.find(s => s.id === studentId);

  // อัปเดตลง local registrations
  const registrations = readJSON(REGS_FILE, []);
  let foundLocal = false;
  registrations.forEach(r => {
    if (r.studentId === studentId) {
      r.phone = cleanPhone;
      foundLocal = true;
    }
  });

  if (foundLocal) {
    writeJSON(REGS_FILE, registrations);
  }

  // ส่งอัปเดตขึ้น Google Sheet (คอลัมน์ J)
  const cloudConfig = readJSON(path.join(DATA_DIR, 'cloud_config.json'), {});
  const webhookUrl = cloudConfig.googleSheetWebhookUrl;

  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
          studentId: studentId,
          name: student ? student.name : '',
          grade: student ? student.grade : 1,
          roomFull: student ? student.roomFull : '',
          phone: cleanPhone,
          note: 'อัปเดตเบอร์โทรศัพท์ผ่านหน้าเว็บ'
        })
      });
    } catch (err) {
      console.error('[Google Sheet Update Phone Error]:', err.message);
    }
  }

  res.json({
    success: true,
    message: 'บันทึกเบอร์โทรศัพท์ของคุณเข้าสู่ระบบเรียบร้อยแล้ว!',
    phone: cleanPhone
  });
});

// 4. แอดมิน: ดึงข้อมูลการสมัครทั้งหมด
app.get('/api/admin/registrations', (req, res) => {
  const registrations = readJSON(REGS_FILE, []);
  res.json({
    success: true,
    data: registrations
  });
});

// 5. แอดมิน: แก้ไขข้อมูลผู้สมัคร (เบอร์โทร, หมายเหตุ)
app.put('/api/admin/registration/:id', (req, res) => {
  const regId = req.params.id;
  const { phone, note } = req.body;
  const registrations = readJSON(REGS_FILE, []);

  const regIndex = registrations.findIndex(r => r.id === regId);
  if (regIndex === -1) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการแก้ไข' });
  }

  if (phone) registrations[regIndex].phone = String(phone).trim();
  if (note !== undefined) registrations[regIndex].note = String(note).trim();

  writeJSON(REGS_FILE, registrations);
  res.json({ success: true, message: 'อัปเดตข้อมูลผู้สมัครเรียบร้อยแล้ว', data: registrations[regIndex] });
});

// -------------------------------------------------------------
// System Settings Endpoints
// -------------------------------------------------------------
const SETTINGS_FILE = path.join(DATA_DIR, 'system_settings.json');

function getSettings() {
  return readJSON(SETTINGS_FILE, {
    isRegistrationOpen: true,
    adminPassword: 'topaz69',
    closeMessage: 'ระบบรับสมัครกิจกรรม คณะสีแสด 2569 ปิดรับสมัครชั่วคราวเพื่อประมวลผลข้อมูล',
    departmentsStatus: {
      sports: true,
      welfare: true,
      cheerleader: true,
      drum_major: true,
      colorguard: true,
      parade_props: true,
      stand_cheer: true,
      staff: true
    },
    sportsStatus: {
      football: true,
      basketball: true,
      volleyball: true,
      takraw: true,
      petanque: true,
      athletics: true,
      running16: true
    }
  });
}

// 0. สถานะระบบรับสมัคร (Public)
app.get(['/api/system/status', '/api/system-status'], (req, res) => {
  const settings = getSettings();
  res.json({
    success: true,
    isOpen: settings.isRegistrationOpen !== false,
    closeMessage: settings.closeMessage || 'ระบบปิดรับสมัครชั่วคราว',
    departmentsStatus: settings.departmentsStatus || {},
    sportsStatus: settings.sportsStatus || {}
  });
});

// -------------------------------------------------------------
// Admin Auth & Management Endpoints
// -------------------------------------------------------------

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const settings = getSettings();
  if (password === settings.adminPassword || password === 'topaz69') {
    res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', token: 'adm_topaz69_' + Date.now() });
  } else {
    res.status(401).json({ success: false, message: 'รหัสผ่านแอดมินไม่ถูกต้อง' });
  }
});

// Admin Get Settings
app.get('/api/admin/settings', (req, res) => {
  const settings = getSettings();
  const safeSettings = { ...settings };
  delete safeSettings.adminPassword; // hide password in basic response
  res.json({ success: true, data: safeSettings });
});

// Admin Update Settings (Open/Close System, Change Password)
app.post('/api/admin/settings', (req, res) => {
  const current = getSettings();
  const { isRegistrationOpen, closeMessage, departmentsStatus, sportsStatus, newPassword } = req.body;

  if (typeof isRegistrationOpen === 'boolean') current.isRegistrationOpen = isRegistrationOpen;
  if (closeMessage) current.closeMessage = closeMessage;
  if (departmentsStatus) current.departmentsStatus = { ...current.departmentsStatus, ...departmentsStatus };
  if (sportsStatus) current.sportsStatus = { ...current.sportsStatus, ...sportsStatus };
  if (newPassword && String(newPassword).trim().length >= 4) {
    current.adminPassword = String(newPassword).trim();
  }
  current.updatedAt = new Date().toISOString();

  writeJSON(SETTINGS_FILE, current);
  res.json({ success: true, message: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว' });
});

// Admin Search All Students (by ID, Name, Grade, Room, Duty)
app.get('/api/admin/students/search', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  const grade = req.query.grade ? parseInt(req.query.grade) : null;
  const students = readJSON(STUDENTS_FILE, []);
  const registrations = readJSON(REGS_FILE, []);

  let filtered = students;
  if (grade) {
    filtered = filtered.filter(s => s.grade === grade);
  }
  if (query) {
    filtered = filtered.filter(s => 
      s.id.includes(query) || 
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.roomFull && s.roomFull.toLowerCase().includes(query)) ||
      (s.duty && s.duty.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query))
    );
  }

  // Attach online registrations info to student
  const results = filtered.slice(0, 100).map(st => {
    const studentRegs = registrations.filter(r => r.studentId === st.id);
    return {
      ...st,
      registrations: studentRegs
    };
  });

  res.json({ success: true, total: filtered.length, data: results });
});

// Admin Update Student Duty & Phone directly & Sync to Google Sheets
app.post('/api/admin/student/update', async (req, res) => {
  const { studentId, duty, phone, note, resetRegistration } = req.body;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสนักเรียน' });
  }

  const students = readJSON(STUDENTS_FILE, []);
  const stIndex = students.findIndex(s => s.id === String(studentId).trim());
  if (stIndex === -1) {
    return res.status(404).json({ success: false, message: 'ไม่พบนักเรียนในฐานข้อมูล' });
  }

  const targetStudent = students[stIndex];
  if (duty !== undefined) targetStudent.duty = String(duty).trim();
  if (phone !== undefined) targetStudent.phone = String(phone).trim();
  if (note !== undefined) targetStudent.note = String(note).trim();

  writeJSON(STUDENTS_FILE, students);

  // If reset registration requested, clear from registrations.json
  if (resetRegistration) {
    let registrations = readJSON(REGS_FILE, []);
    registrations = registrations.filter(r => r.studentId !== String(studentId).trim());
    writeJSON(REGS_FILE, registrations);
  }

  // Sync to Google Sheet live if webhook configured
  const cloudConfig = readJSON(path.join(DATA_DIR, 'cloud_config.json'), {});
  const webhookUrl = cloudConfig.googleSheetWebhookUrl;
  let sheetSyncSuccess = false;

  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      const https = require('https');
      const payload = JSON.stringify({
        action: 'batchSync',
        items: [{
          studentId: targetStudent.id,
          grade: targetStudent.grade,
          roomFull: targetStudent.roomFull,
          activityTitle: targetStudent.duty || '',
          phone: targetStudent.phone || '',
          note: targetStudent.note || ''
        }]
      });

      await new Promise((resolve) => {
        function sendPost(targetUrlStr) {
          const url = new URL(targetUrlStr);
          const reqSheet = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
              'Content-Length': Buffer.byteLength(payload)
            }
          }, (resSheet) => {
            if (resSheet.statusCode >= 300 && resSheet.statusCode < 400 && resSheet.headers.location) {
              https.get(resSheet.headers.location, () => resolve(true));
              return;
            }
            resolve(true);
          });
          reqSheet.on('error', () => resolve(false));
          reqSheet.write(payload);
          reqSheet.end();
        }
        sendPost(webhookUrl);
      });
      sheetSyncSuccess = true;
    } catch (e) {
      console.error('Error syncing to sheet:', e.message);
    }
  }

  res.json({
    success: true,
    message: `อัปเดตข้อมูลของ ${targetStudent.name} (${targetStudent.id}) สำเร็จ!`,
    sheetSynced: sheetSyncSuccess,
    data: targetStudent
  });
});

// 6. แอดมิน: ลบรายการสมัคร
app.delete('/api/admin/registration/:id', (req, res) => {
  const regId = req.params.id;
  let registrations = readJSON(REGS_FILE, []);
  const initialLength = registrations.length;
  registrations = registrations.filter(r => r.id !== regId);

  if (registrations.length === initialLength) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการลบ' });
  }

  writeJSON(REGS_FILE, registrations);
  res.json({ success: true, message: 'ลบรายการสมัครเรียบร้อยแล้ว' });
});

// 7. แอดมิน: สั่งรัน Sync & Build เอกสารทางการทั้งหมด
app.post('/api/admin/sync-build', (req, res) => {
  try {
    console.log('[API] Triggering npm run sync-sheet...');
    execSync('node scripts/sync_from_google_sheet_to_official_docs.js', { cwd: __dirname, stdio: 'pipe' });
    res.json({
      success: true,
      message: 'ซิงค์ข้อมูลจาก Google Sheets และสร้างไฟล์ Excel / PDF ทั้งหมดเรียบร้อยแล้ว 100%'
    });
  } catch (err) {
    console.error('Build execution failed:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. แอดมิน: สถิติรวม
app.get('/api/admin/stats', (req, res) => {
  const registrations = readJSON(REGS_FILE, []);
  const students = readJSON(STUDENTS_FILE, []);
  const settings = getSettings();

  const stats = {
    isOpen: settings.isRegistrationOpen !== false,
    totalRegistrations: registrations.length,
    uniqueStudents: new Set(registrations.map(r => r.studentId)).size,
    totalStudentsInColor: students.length,
    assignedStudentsCount: students.filter(s => s.duty && s.duty.trim() !== '' && s.duty !== '-').length,
    byDepartment: {},
    byGrade: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    masterByGrade: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    masterTotalByGrade: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    byDutySummary: {}
  };

  // 1. นับสถิติจาก Master Database (รายชื่อนักเรียนที่มีหน้าที่จริง เช่น ม.1 ลงสแตนเชียร์ 85 คน)
  students.forEach(s => {
    if (s.grade && stats.masterTotalByGrade[s.grade] !== undefined) {
      stats.masterTotalByGrade[s.grade]++;
    }

    if (s.duty && s.duty.trim() !== '' && s.duty !== '-') {
      if (s.grade && stats.masterByGrade[s.grade] !== undefined) {
        stats.masterByGrade[s.grade]++;
      }

      const dutyParts = s.duty.split(',').map(d => d.trim()).filter(Boolean);
      dutyParts.forEach(d => {
        // Grouping department names nicely
        let deptGroup = 'ฝ่ายอื่นๆ';
        if (d.includes('สแตน')) deptGroup = 'ฝ่ายสแตนเชียร์';
        else if (d.includes('ลีด') || d.includes('หลีด')) deptGroup = 'ฝ่ายเชียร์ลีดเดอร์';
        else if (d.includes('ดรัม') || d.includes('คัลเลอร์')) deptGroup = 'ฝ่ายดรัมเมเยอร์ & คัลเลอร์การ์ด';
        else if (d.includes('พร็อพ') || d.includes('ขบวน') || d.includes('พาเหรด')) deptGroup = 'ฝ่ายอุปกรณ์และขบวนพาเหรด';
        else if (d.includes('สวัสดิ')) deptGroup = 'ฝ่ายสวัสดิการ';
        else if (d.includes('สตาฟ') || d.includes('ประธาน') || d.includes('เหรัญญิก') || d.includes('หัวหน้า')) deptGroup = 'ฝ่ายสตาฟคณะสี (ม.5)';
        else deptGroup = 'ฝ่ายกีฬา';

        stats.byDepartment[deptGroup] = (stats.byDepartment[deptGroup] || 0) + 1;
        stats.byDutySummary[d] = (stats.byDutySummary[d] || 0) + 1;
      });
    }
  });

  // 2. สถิติการสมัครออนไลน์ (registrations.json)
  registrations.forEach(r => {
    if (r.grade && stats.byGrade[r.grade] !== undefined) {
      stats.byGrade[r.grade]++;
    }
  });

  res.json({ success: true, data: stats });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🏆 ระบบรับสมัครกิจกรรมออนไลน์ คณะสีแสด (สีบุษราคัม) ปี 2569`);
  console.log(`🌐 หน้ารับสมัครนักเรียน: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
