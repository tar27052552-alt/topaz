/**
 * Frontend Logic - All-in-One 4-Step Registration Wizard
 * คณะสีแสด (สีบุษราคัม) ปี 2569
 */

document.addEventListener('DOMContentLoaded', () => {
  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec";
  const isStaticHosting = window.location.protocol === 'file:' || window.location.hostname.endsWith('github.io') || window.location.hostname === 'localhost' && window.location.port !== '3000';

  // Initialize Firebase Firestore if configured
  let db = null;
  if (typeof firebase !== 'undefined' && window.ORANGE_CONFIG && window.ORANGE_CONFIG.isFirebaseConfigured) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.ORANGE_CONFIG.firebaseConfig);
      }
      db = firebase.firestore();
      console.log('⚡ Firebase Cloud Firestore Initialized Successfully!');
    } catch (e) {
      console.warn('Firebase init error:', e);
    }
  }

  // App State
  const state = {
    currentStep: 1,
    student: null,
    phone: '',
    eligibleDepartments: [],
    selectedDepartment: null,
    selectedSports: [], // array of categoryId strings
    existingRegistrations: [],
    systemStatus: { isOpen: true, closeMessage: '', departmentsStatus: {}, sportsStatus: {} },
    cachedStudents: null,
    cachedDepartments: null,
    cachedRegistrations: null
  };

  const systemClosedBanner = document.getElementById('systemClosedBanner');
  const systemClosedText = document.getElementById('systemClosedText');

  // DOM Elements - Stepper
  const stepNodes = [
    document.getElementById('step-node-1'),
    document.getElementById('step-node-2'),
    document.getElementById('step-node-3'),
    document.getElementById('step-node-4')
  ];
  const stepLines = [
    document.getElementById('step-line-1'),
    document.getElementById('step-line-2'),
    document.getElementById('step-line-3')
  ];

  // DOM Elements - Step Views
  const stepViews = {
    1: document.getElementById('step-1'),
    2: document.getElementById('step-2'),
    3: document.getElementById('step-3'),
    4: document.getElementById('step-4'),
    success: document.getElementById('step-success')
  };

  // DOM Elements - Step 1
  const studentIdInput = document.getElementById('studentIdInput');
  const searchStudentBtn = document.getElementById('searchStudentBtn');
  const studentProfileCard = document.getElementById('studentProfileCard');
  const studentNameDisplay = document.getElementById('studentNameDisplay');
  const studentRoomDisplay = document.getElementById('studentRoomDisplay');
  const studentNoDisplay = document.getElementById('studentNoDisplay');
  const studentGenderDisplay = document.getElementById('studentGenderDisplay');
  const studentIdDisplay = document.getElementById('studentIdDisplay');
  const studentDutyDisplay = document.getElementById('studentDutyDisplay');
  
  const alreadyRegisteredCard = document.getElementById('alreadyRegisteredCard');
  const lockedRegList = document.getElementById('lockedRegList');
  const lockedResetBtn = document.getElementById('lockedResetBtn');
  const partialRegAlert = document.getElementById('partialRegAlert');
  const partialRegList = document.getElementById('partialRegList');
  const phoneInputGroup = document.getElementById('phoneInputGroup');
  const phoneInput = document.getElementById('phoneInput');
  const step1Actions = document.getElementById('step1Actions');
  const toStep2Btn = document.getElementById('toStep2Btn');

  // DOM Elements - Step 2
  const departmentsContainer = document.getElementById('departmentsContainer');
  const backToStep1Btn = document.getElementById('backToStep1Btn');
  const toStep3Btn = document.getElementById('toStep3Btn');

  // DOM Elements - Step 3
  const step3Title = document.getElementById('step3Title');
  const step3Subtitle = document.getElementById('step3Subtitle');
  const sportSelectionContainer = document.getElementById('sportSelectionContainer');
  const sportsCountBadge = document.getElementById('sportsCountBadge');
  const sportsListAccordion = document.getElementById('sportsListAccordion');
  const nonSportContainer = document.getElementById('nonSportContainer');
  const summaryDeptIcon = document.getElementById('summaryDeptIcon');
  const summaryDeptName = document.getElementById('summaryDeptName');
  const summaryDeptDesc = document.getElementById('summaryDeptDesc');
  const summaryDeptQuota = document.getElementById('summaryDeptQuota');
  const summaryDeptRole = document.getElementById('summaryDeptRole');
  const backToStep2Btn = document.getElementById('backToStep2Btn');
  const toStep4Btn = document.getElementById('toStep4Btn');

  // DOM Elements - Step 4
  const reviewStudentName = document.getElementById('reviewStudentName');
  const reviewStudentMeta = document.getElementById('reviewStudentMeta');
  const reviewPhone = document.getElementById('reviewPhone');
  const reviewDepartment = document.getElementById('reviewDepartment');
  const reviewActivitiesList = document.getElementById('reviewActivitiesList');
  const backToStep3Btn = document.getElementById('backToStep3Btn');
  const submitRegistrationBtn = document.getElementById('submitRegistrationBtn');

  // DOM Elements - Success
  const successSummaryCard = document.getElementById('successSummaryCard');
  const newRegistrationBtn = document.getElementById('newRegistrationBtn');
  const toast = document.getElementById('toast');

  // =========================================================================
  // 1. Wizard Navigation & Stepper Control
  // =========================================================================
  function goToStep(stepNumber) {
    state.currentStep = stepNumber;

    // Hide all step views
    Object.values(stepViews).forEach(view => {
      if (view) view.classList.remove('active');
    });

    // Show target step view
    if (stepViews[stepNumber]) {
      stepViews[stepNumber].classList.add('active');
    }

    // Update Stepper Visuals (1 to 4)
    if (typeof stepNumber === 'number' && stepNumber >= 1 && stepNumber <= 4) {
      stepNodes.forEach((node, index) => {
        const nodeStep = index + 1;
        node.classList.remove('active', 'completed');
        if (nodeStep === stepNumber) {
          node.classList.add('active');
        } else if (nodeStep < stepNumber) {
          node.classList.add('completed');
        }
      });

      stepLines.forEach((line, index) => {
        const lineStep = index + 1;
        line.classList.remove('completed');
        if (lineStep < stepNumber) {
          line.classList.add('completed');
        }
      });
    }

    // Scroll smoothly to top of card
    document.querySelector('.wizard-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // =========================================================================
  // 2. Step 1: Student Search & Identification
  // =========================================================================
  function resetStudentProfile() {
    state.student = null;
    state.eligibleDepartments = [];
    state.selectedDepartment = null;
    state.selectedSports = [];
    state.existingRegistrations = [];
    state.phone = '';

    if (studentProfileCard) studentProfileCard.classList.add('hidden');
    const dutyBadges = document.getElementById('studentDutyBadgesContainer');
    if (dutyBadges) {
      dutyBadges.innerHTML = '';
      dutyBadges.classList.add('hidden');
    }
    if (alreadyRegisteredCard) alreadyRegisteredCard.classList.add('hidden');
    if (partialRegAlert) partialRegAlert.classList.add('hidden');
    if (phoneInputGroup) phoneInputGroup.classList.add('hidden');
    if (step1Actions) step1Actions.classList.add('hidden');
    if (phoneInput) phoneInput.value = '';
    if (lockedRegList) lockedRegList.innerHTML = '';
  }

  async function searchStudent() {
    const id = studentIdInput.value.trim();
    if (!id || id.length !== 5 || !/^\d+$/.test(id)) {
      showToast('กรุณากรอกรหัสประจำตัวนักเรียน 5 หลักให้ถูกต้อง', 'error');
      studentIdInput.focus();
      return;
    }

    // Reset old view before new search
    resetStudentProfile();

    searchStudentBtn.disabled = true;
    searchStudentBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังค้นหา...';

    try {
      let result = null;

      // 0. ⚡ Ultra-Fast: Query directly from Firebase Firestore (0.05s)
      if (db) {
        try {
          const docSnap = await db.collection('students').doc(id).get();
          if (docSnap.exists) {
            const student = docSnap.data();
            
            if (!state.cachedDepartments) {
              const dRes = await fetch('data/departments_config.json');
              state.cachedDepartments = await dRes.json();
            }

            const studentRegs = [];
            const officialDuties = (student.duty && student.duty.trim() !== '' && student.duty !== '-')
              ? student.duty.split(',').map(s => s.trim()).filter(Boolean)
              : (student.grade === 1 ? ['สแตนเชียร์'] : []);

            officialDuties.forEach(dutyItem => {
              let deptName = 'ฝ่ายกิจกรรม';
              let deptId = 'general';
              if (dutyItem.includes('สแตน')) { deptName = 'ฝ่ายสแตนเชียร์'; deptId = 'stand_cheer'; }
              else if (dutyItem.includes('หลีด') || dutyItem.includes('ลีด') || dutyItem.includes('cheer')) { deptName = 'ฝ่ายเชียร์ลีดเดอร์'; deptId = 'cheerleader'; }
              else if (dutyItem.includes('พร็อพ') || dutyItem.includes('ขบวน') || dutyItem.includes('พาเหรด')) { deptName = 'ฝ่ายพร็อพ & ขบวนพาเหรด'; deptId = 'parade_props'; }
              else if (dutyItem.includes('ดรัม') || dutyItem.includes('คัลเลอร์')) { deptName = 'ฝ่ายดรัมเมเยอร์ & คัลเลอร์การ์ด'; deptId = 'drum_major'; }
              else if (dutyItem.includes('สวัสดิ')) { deptName = 'ฝ่ายสวัสดิการ'; deptId = 'welfare'; }
              else if (dutyItem.includes('สตาฟ') || dutyItem.includes('ประธาน') || dutyItem.includes('เหรัญญิก') || dutyItem.includes('หัวหน้า')) { deptName = 'ฝ่ายสตาฟคณะสี (ม.5)'; deptId = 'staff'; }
              else if (dutyItem.includes('กีฬา') || dutyItem.includes('บอล') || dutyItem.includes('วอลเลย์') || dutyItem.includes('บาส') || dutyItem.includes('กรีฑา') || dutyItem.includes('ตะกร้อ') || dutyItem.includes('เปตอง') || dutyItem.includes('16 ขา')) { deptName = 'ฝ่ายกีฬา'; deptId = 'sports'; }

              studentRegs.push({
                id: `firestore_${student.id}_${deptId}_${dutyItem}`,
                studentId: student.id,
                name: student.name,
                grade: student.grade,
                roomFull: student.roomFull,
                departmentId: deptId,
                departmentName: deptName,
                categoryTitle: dutyItem.includes('สแตน') ? 'สแตนเชียร์ (กองเชียร์บนอัฒจันทร์)' : dutyItem,
                roleName: dutyItem,
                phone: student.phone || '',
                createdAt: new Date().toISOString()
              });
            });

            const eligibleDepartments = (state.cachedDepartments || []).filter(dept => {
              if (dept.allowedGrades && !dept.allowedGrades.includes(student.grade)) return false;
              if (dept.allowedGenders && !dept.allowedGenders.includes(student.gender)) return false;
              return true;
            }).map(dept => {
              if (dept.type === 'sports' && dept.items) {
                const filteredItems = dept.items.map(sport => {
                  const matchingCategories = sport.categories.filter(cat => {
                    const gradeMatch = cat.grades.includes(student.grade);
                    const genderMatch = cat.gender === 'ทั้งหมด' || cat.gender === student.gender;
                    return gradeMatch && genderMatch;
                  }).map(cat => ({ ...cat, currentCount: 0, isFull: false, availableSeats: 9999 }));
                  return { ...sport, categories: matchingCategories };
                }).filter(sport => sport.categories.length > 0);
                return { ...dept, items: filteredItems };
              } else {
                return { ...dept, currentCount: 0, isFull: false, availableSeats: 9999 };
              }
            });

            result = {
              success: true,
              data: student,
              eligibleDepartments: eligibleDepartments,
              existingRegistrations: studentRegs
            };
          }
        } catch (fErr) {
          console.warn('Firestore fetch error, fallback to Sheet Webhook...', fErr);
        }
      }

      // 1. 🌟 Primary Webhook: Fetch LIVE directly from Google Sheets Webhook
      if (!result || !result.success) {
        try {
          const sheetRes = await fetch(`${WEBHOOK_URL}?studentId=${encodeURIComponent(id)}`);
          const sheetData = await sheetRes.json();
          
          if (sheetData && sheetData.status === 'success' && sheetData.data) {
            const d = sheetData.data;
            const gradeNum = parseInt(String(d.gradeName || d.roomFull || '1').replace(/[^\d]/g, '')) || 1;
            
            let student = {
              id: d.id || id,
              name: d.name || '',
              grade: gradeNum,
              room: parseInt(String(d.roomNo || '1')) || 1,
              roomFull: d.roomFull || `ม.${gradeNum}/${d.roomNo || 1}`,
              classNo: d.classNo || '-',
              gender: d.gender || 'ชาย',
              duty: d.duty || '',
              phone: d.phone || '',
              level: gradeNum >= 4 ? 'senior' : 'junior'
            };

            if (!state.cachedDepartments) {
              const dRes = await fetch('data/departments_config.json');
              state.cachedDepartments = await dRes.json();
            }

            // Build existing registrations from Sheet duty
            const studentRegs = [];
            const officialDuties = (student.duty && student.duty.trim() !== '' && student.duty !== '-')
              ? student.duty.split(',').map(s => s.trim()).filter(Boolean)
              : (student.grade === 1 ? ['สแตนเชียร์'] : []);

            officialDuties.forEach(dutyItem => {
              let deptName = 'ฝ่ายกิจกรรม';
              let deptId = 'general';
              if (dutyItem.includes('สแตน')) { deptName = 'ฝ่ายสแตนเชียร์'; deptId = 'stand_cheer'; }
              else if (dutyItem.includes('หลีด') || dutyItem.includes('ลีด') || dutyItem.includes('cheer')) { deptName = 'ฝ่ายเชียร์ลีดเดอร์'; deptId = 'cheerleader'; }
              else if (dutyItem.includes('พร็อพ') || dutyItem.includes('ขบวน') || dutyItem.includes('พาเหรด')) { deptName = 'ฝ่ายพร็อพ & ขบวนพาเหรด'; deptId = 'parade_props'; }
              else if (dutyItem.includes('ดรัม') || dutyItem.includes('คัลเลอร์')) { deptName = 'ฝ่ายดรัมเมเยอร์ & คัลเลอร์การ์ด'; deptId = 'drum_major'; }
              else if (dutyItem.includes('สวัสดิ')) { deptName = 'ฝ่ายสวัสดิการ'; deptId = 'welfare'; }
              else if (dutyItem.includes('สตาฟ') || dutyItem.includes('ประธาน') || dutyItem.includes('เหรัญญิก') || dutyItem.includes('หัวหน้า')) { deptName = 'ฝ่ายสตาฟคณะสี (ม.5)'; deptId = 'staff'; }
              else if (dutyItem.includes('กีฬา') || dutyItem.includes('บอล') || dutyItem.includes('วอลเลย์') || dutyItem.includes('บาส') || dutyItem.includes('กรีฑา') || dutyItem.includes('ตะกร้อ') || dutyItem.includes('เปตอง') || dutyItem.includes('16 ขา')) { deptName = 'ฝ่ายกีฬา'; deptId = 'sports'; }

              studentRegs.push({
                id: `sheet_${student.id}_${deptId}_${dutyItem}`,
                studentId: student.id,
                name: student.name,
                grade: student.grade,
                roomFull: student.roomFull,
                departmentId: deptId,
                departmentName: deptName,
                categoryTitle: dutyItem.includes('สแตน') ? 'สแตนเชียร์ (กองเชียร์บนอัฒจันทร์)' : dutyItem,
                roleName: dutyItem,
                phone: student.phone || '',
                createdAt: new Date().toISOString()
              });
            });

          // Eligible departments calculation
          const eligibleDepartments = (state.cachedDepartments || []).filter(dept => {
            if (dept.allowedGrades && !dept.allowedGrades.includes(student.grade)) return false;
            if (dept.allowedGenders && !dept.allowedGenders.includes(student.gender)) return false;
            return true;
          }).map(dept => {
            if (dept.type === 'sports' && dept.items) {
              const filteredItems = dept.items.map(sport => {
                const matchingCategories = sport.categories.filter(cat => {
                  const gradeMatch = cat.grades.includes(student.grade);
                  const genderMatch = cat.gender === 'ทั้งหมด' || cat.gender === student.gender;
                  return gradeMatch && genderMatch;
                }).map(cat => ({ ...cat, currentCount: 0, isFull: false, availableSeats: 9999 }));
                return { ...sport, categories: matchingCategories };
              }).filter(sport => sport.categories.length > 0);
              return { ...dept, items: filteredItems };
            } else {
              return { ...dept, currentCount: 0, isFull: false, availableSeats: 9999 };
            }
          });

          result = {
            success: true,
            data: student,
            eligibleDepartments: eligibleDepartments,
            existingRegistrations: studentRegs
          };
        }
      } catch (err) {
        console.warn('Live Google Sheet fetch failed, trying local fallback...', err);
      }

      // 2. 🛡️ Secondary Fallback: Try local node API or static master JSON
      if (!result || !result.success) {
        try {
          const response = await fetch(`/api/student/${id}`);
          if (response.ok) {
            result = await response.json();
          }
        } catch (e) {}

        if (!result || !result.success) {
          if (!state.cachedStudents) {
            const sRes = await fetch('data/students_master.json');
            state.cachedStudents = await sRes.json();
          }
          if (!state.cachedDepartments) {
            const dRes = await fetch('data/departments_config.json');
            state.cachedDepartments = await dRes.json();
          }

          let student = state.cachedStudents.find(s => s.id === id);
          if (student) {
            const studentRegs = [];
            const officialDuties = (student.duty && student.duty.trim() !== '' && student.duty !== '-')
              ? student.duty.split(',').map(d => d.trim()).filter(Boolean)
              : (student.grade === 1 ? ['สแตนเชียร์'] : []);

            officialDuties.forEach(d => {
              let deptName = 'ฝ่ายกิจกรรม';
              let deptId = 'general';
              if (d.includes('สแตน')) { deptName = 'ฝ่ายสแตนเชียร์'; deptId = 'stand_cheer'; }
              else if (d.includes('หลีด') || d.includes('ลีด') || d.includes('cheer')) { deptName = 'ฝ่ายเชียร์ลีดเดอร์'; deptId = 'cheerleader'; }
              else if (d.includes('พร็อพ') || d.includes('ขบวน') || d.includes('พาเหรด')) { deptName = 'ฝ่ายพร็อพ & ขบวนพาเหรด'; deptId = 'parade_props'; }
              else if (d.includes('ดรัม') || d.includes('คัลเลอร์')) { deptName = 'ฝ่ายดรัมเมเยอร์ & คัลเลอร์การ์ด'; deptId = 'drum_major'; }
              else if (d.includes('สวัสดิ')) { deptName = 'ฝ่ายสวัสดิการ'; deptId = 'welfare'; }
              else if (d.includes('สตาฟ') || d.includes('ประธาน') || d.includes('เหรัญญิก') || d.includes('หัวหน้า')) { deptName = 'ฝ่ายสตาฟคณะสี (ม.5)'; deptId = 'staff'; }
              else if (d.includes('กีฬา') || d.includes('บอล') || d.includes('วอลเลย์') || d.includes('บาส') || d.includes('กรีฑา') || d.includes('ตะกร้อ') || d.includes('เปตอง') || d.includes('16 ขา')) { deptName = 'ฝ่ายกีฬา'; deptId = 'sports'; }

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
            });

            const eligibleDepartments = (state.cachedDepartments || []).filter(dept => {
              if (dept.allowedGrades && !dept.allowedGrades.includes(student.grade)) return false;
              if (dept.allowedGenders && !dept.allowedGenders.includes(student.gender)) return false;
              return true;
            }).map(dept => {
              if (dept.type === 'sports' && dept.items) {
                const filteredItems = dept.items.map(sport => {
                  const matchingCategories = sport.categories.filter(cat => {
                    const gradeMatch = cat.grades.includes(student.grade);
                    const genderMatch = cat.gender === 'ทั้งหมด' || cat.gender === student.gender;
                    return gradeMatch && genderMatch;
                  }).map(cat => ({ ...cat, currentCount: 0, isFull: false, availableSeats: 9999 }));
                  return { ...sport, categories: matchingCategories };
                }).filter(sport => sport.categories.length > 0);
                return { ...dept, items: filteredItems };
              } else {
                return { ...dept, currentCount: 0, isFull: false, availableSeats: 9999 };
              }
            });

            result = {
              success: true,
              data: student,
              eligibleDepartments: eligibleDepartments,
              existingRegistrations: studentRegs
            };
          }
        }
      }

      if (!result || !result.success || !result.data) {
        showToast((result && result.message) || 'ไม่พบรหัสประจำตัวนี้ในคณะสีแสด', 'error');
        resetStudentProfile();
        return;
      }

      state.student = result.data;
      state.eligibleDepartments = result.eligibleDepartments || [];
      state.existingRegistrations = result.existingRegistrations || [];

      // Render profile
      // Render profile badges
      studentNameDisplay.textContent = state.student.name;
      studentRoomDisplay.textContent = state.student.roomFull || `ม.${state.student.grade}/${state.student.room}`;
      studentNoDisplay.textContent = `เลขที่ ${state.student.classNo || '-'}`;
      studentGenderDisplay.textContent = `เพศ ${state.student.gender || '-'}`;
      studentIdDisplay.textContent = `รหัส: ${state.student.id || id}`;

      // Duty badges (support multiple duties e.g. สแตนเชียร์ + เชียร์ลีดเดอร์)
      const dutyBadgesContainer = document.getElementById('studentDutyBadgesContainer');
      const studentDuty = state.student.duty || (state.student.grade === 1 ? 'สแตนเชียร์' : '');
      
      if (dutyBadgesContainer) {
        if (studentDuty && studentDuty !== '-') {
          const parts = studentDuty.split(',').map(d => d.trim()).filter(Boolean);
          dutyBadgesContainer.innerHTML = parts.map(d => {
            let icon = '🏅';
            let bg = '#ea580c';
            if (d.includes('สแตน')) { icon = '🎪'; bg = '#ea580c'; }
            else if (d.includes('หลีด') || d.includes('ลีด') || d.includes('cheer')) { icon = '📣'; bg = '#ec4899'; }
            else if (d.includes('ดรัม') || d.includes('คัลเลอร์')) { icon = '🥁'; bg = '#8b5cf6'; }
            else if (d.includes('พร็อพ') || d.includes('ขบวน')) { icon = '🎨'; bg = '#3b82f6'; }
            else if (d.includes('สวัสดิ')) { icon = '🍵'; bg = '#10b981'; }
            else if (d.includes('สตาฟ') || d.includes('ประธาน') || d.includes('เหรัญญิก')) { icon = '🧡'; bg = '#f59e0b'; }
            else { icon = '⚽'; bg = '#ef4444'; }

            return `<span class="badge" style="background: ${bg}; color: #ffffff; font-weight: 600; padding: 4px 10px; border-radius: 8px;">${icon} ${d}</span>`;
          }).join(' ');
          dutyBadgesContainer.classList.remove('hidden');
        } else {
          dutyBadgesContainer.innerHTML = '';
          dutyBadgesContainer.classList.add('hidden');
        }
      }

      studentProfileCard.classList.remove('hidden');

      // Check registration status & quota
      const regs = state.existingRegistrations;
      const isM5 = state.student && state.student.grade === 5;
      const hasDuty = state.student && state.student.duty && state.student.duty.trim() !== '' && state.student.duty !== '-';
      
      const isSportActivity = (r) => r.departmentId === 'sports' || r.sportId || (r.categoryTitle && (r.categoryTitle.includes('ทีม') || r.categoryTitle.includes('บอล') || r.categoryTitle.includes('บาส') || r.categoryTitle.includes('วอลเลย์') || r.categoryTitle.includes('เปตอง') || r.categoryTitle.includes('กรีฑา') || r.categoryTitle.includes('ตะกร้อ') || r.categoryTitle.includes('16 ขา')) && !r.categoryTitle.includes('สตาฟ') && !r.categoryTitle.includes('หัวหน้า'));

      const isStaffRole = (r) => !isSportActivity(r) && (r.departmentId === 'staff' || 
        (r.categoryTitle && (r.categoryTitle.includes('สตาฟ') || r.categoryTitle.includes('หัวหน้า') || r.categoryTitle.includes('ประธาน') || r.categoryTitle.includes('เฮด') || r.categoryTitle.includes('เหรัญญิก') || r.categoryTitle.includes('มือกลอง') || r.categoryTitle.includes('ขบวน') || r.categoryTitle.includes('ดรัม') || r.categoryTitle.includes('คัลเลอร์'))) ||
        (r.departmentName && (r.departmentName.includes('สตาฟ') || r.departmentName.includes('คณะสี') || r.departmentName.includes('ดรัม') || r.departmentName.includes('คัลเลอร์') || r.departmentName.includes('หลีด') || r.departmentName.includes('สวัสดิการ') || r.departmentName.includes('พร็อพ'))) ||
        (isM5 && r.departmentId !== 'sports')
      );
      
      const staffReg = regs.find(isStaffRole);
      const sportsCount = regs.filter(isSportActivity).length;
      
      // Identify M5 staff reg more reliably (departmentId = staff, or role is สตาฟ/ประธาน/เหรัญญิก etc.)
      const staffRegFn = (r) => r.departmentId === 'staff' || r.departmentId === 'drum_major' ||
        (r.categoryTitle && (r.categoryTitle.includes('สตาฟ') || r.categoryTitle.includes('ประธาน') || r.categoryTitle.includes('เหรัญญิก') || r.categoryTitle.includes('หัวหน้า')));
      const staffRegM5 = isM5 ? regs.find(staffRegFn) : null;
      
      // Quota policy: 
      // 1. Normal students (M.1-M.4, M.6): If has ANY registration or duty -> FULLY LOCKED!
      // 2. M.5 staff who hasn't picked sport yet -> PARTIAL (can still pick 1 sport)
      // 3. M.5 staff who already picked a sport -> FULLY LOCKED
      // 4. M.5 without staff role but has registration -> LOCKED
      const isPartialM5 = isM5 && staffRegM5 && sportsCount === 0;
      const isQuotaFull = (!isM5 && (regs.length > 0 || hasDuty)) || 
                          (isM5 && staffRegM5 && sportsCount >= 1) || 
                          (isM5 && !staffRegM5 && regs.length > 0) ||
                          (isM5 && !staffRegM5 && hasDuty && sportsCount >= 1);

      if (isQuotaFull && !isPartialM5) {
        // FULLY LOCKED: Student cannot register any more
        renderLockedCard(regs);
        alreadyRegisteredCard.classList.remove('hidden');
        partialRegAlert.classList.add('hidden');
        phoneInputGroup.classList.add('hidden');
        step1Actions.classList.add('hidden');
        showToast('ท่านได้ลงทะเบียนครบสิทธิ์แล้ว (ไม่สามารถสมัครซ้ำได้)', 'info');
      } else if (isPartialM5) {
        const staffReg = staffRegM5;
        // PARTIAL: M.5 Staff who hasn't picked a sport yet -> Can register 1 sport
        alreadyRegisteredCard.classList.add('hidden');
        let regInfo = [];
        if (staffReg) {
          const title = staffReg.categoryTitle || staffReg.roleName || 'ฝ่ายสตาฟ';
          const group = resolveLineGroup(staffReg.departmentId, null, null, title);
          regInfo.push(`
            <div class="partial-item-row" style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; background: rgba(255,255,255,0.7); padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(249,115,22,0.15);">
              <div>• 🧡 <strong>พี่สตาฟคณะสีแสด</strong>: ${title}</div>
              <a href="${group.link}" target="_blank" rel="noopener noreferrer" class="btn btn-line btn-xs" style="padding: 5px 12px; font-size: 0.82rem; border-radius: 8px;">
                <i class="fa-brands fa-line"></i> ${group.name}
              </a>
            </div>
          `);
        }
        const sportRegs = regs.filter(isSportActivity);
        if (sportRegs.length > 0) {
          sportRegs.forEach(r => {
            const title = r.categoryTitle || r.sportName || 'กีฬา';
            let normTitle = title;
            if (normTitle.includes('บอล') || normTitle.includes('ทีม') || normTitle.includes('fb_')) {
              const g = state.student ? state.student.grade : 0;
              const gd = state.student ? state.student.gender : '';
              const levelText = g <= 3 && g > 0 ? 'ม.ต้น' : 'ม.ปลาย';
              normTitle = `ฟุตบอล ทีม${gd || 'ชาย'} ${levelText}`;
            }
            const group = resolveLineGroup('sports', r.sportId, r.categoryId, normTitle);
            regInfo.push(`
              <div class="partial-item-row" style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; background: rgba(255,255,255,0.7); padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(249,115,22,0.15);">
                <div>• ⚽ <strong>ฝ่ายกีฬา</strong>: ${normTitle}</div>
                <a href="${group.link}" target="_blank" rel="noopener noreferrer" class="btn btn-line btn-xs" style="padding: 5px 12px; font-size: 0.82rem; border-radius: 8px;">
                  <i class="fa-brands fa-line"></i> ${group.name}
                </a>
              </div>
            `);
          });
        }
        
        partialRegList.innerHTML = regInfo.join('');
        partialRegAlert.classList.remove('hidden');
        phoneInputGroup.classList.remove('hidden');
        step1Actions.classList.remove('hidden');

        const officialPhone = (state.student && state.student.phone) || (regs[0] && regs[0].phone) || '';
        if (officialPhone) {
          phoneInput.value = officialPhone;
          state.phone = officialPhone;
        }
        validateStep1();
        phoneInput.focus();
        showToast(`พบข้อมูล: ${state.student.name}`, 'success');
      } else {
        // NEW REGISTRATION: No existing registrations
        alreadyRegisteredCard.classList.add('hidden');
        partialRegAlert.classList.add('hidden');
        phoneInputGroup.classList.remove('hidden');
        step1Actions.classList.remove('hidden');
        
        const officialPhone = (state.student && state.student.phone) || '';
        if (officialPhone) {
          phoneInput.value = officialPhone;
          state.phone = officialPhone;
        }
        validateStep1();
        phoneInput.focus();
        showToast(`พบข้อมูล: ${state.student.name}`, 'success');
      }

    } catch (err) {
      console.error('Error searching student:', err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      searchStudentBtn.disabled = false;
      searchStudentBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> ค้นหา';
    }
  }

  const LINE_GROUPS = {
    main: {
      name: '🧡 โอเพนแชทใหญ่ คณะสีแสด (บุษราคัม Topaz 2569)',
      qr: 'images/qr_main.svg',
      link: 'https://line.me/ti/g2/zMDLLEMtlmLQO3BFmlJU3bKuuqPwUSiJP-ultA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default'
    },
    takraw: {
      name: 'กลุ่ม LINE ตะกร้อ คณะสีแสด 69',
      qr: 'images/qr_takraw.svg',
      link: 'https://line.me/ti/g/qGKycLzNaL'
    },
    volleyball: {
      name: 'กลุ่ม LINE วอลเลย์บอล คณะสีแสด 69',
      qr: 'images/qr_volleyball.svg',
      link: 'https://line.me/ti/g/YxS-JRnecn'
    },
    basketball: {
      name: 'กลุ่ม LINE บาสเกตบอล คณะสีแสด 69',
      qr: 'images/qr_basketball.svg',
      link: 'https://line.me/ti/g/Bv_M7LGSzS'
    },
    football_sr_m: {
      name: 'กลุ่ม LINE บอลชาย ม.ปลาย คณะสีแสด',
      qr: 'images/qr_football_sr_m.svg',
      link: 'https://line.me/ti/g/Uu5vQcKSHU'
    },
    football_jr_m: {
      name: 'กลุ่ม LINE บอลชาย ม.ต้น คณะสีแสด',
      qr: 'images/qr_football_jr_m.svg',
      link: 'https://line.me/ti/g/w__kfxvXcf'
    },
    football_f: {
      name: 'กลุ่ม LINE บอลหญิง คณะสีแสด',
      qr: 'images/qr_football_f.svg',
      link: 'https://line.me/ti/g/2tSuPCZUMG'
    },
    running16: {
      name: 'กลุ่ม LINE วิ่ง 16 ขา คณะสีแสด 69',
      qr: 'images/qr_running16.svg',
      link: 'https://line.me/ti/g/rXh8QPWHsH'
    },
    athletics: {
      name: 'กลุ่ม LINE กรีฑา คณะสีแสด 69',
      qr: 'images/qr_athletics.svg',
      link: 'https://line.me/ti/g/yD352A6Aha'
    },
    petanque: {
      name: 'กลุ่ม LINE เปตอง คณะสีแสด 69',
      qr: 'images/qr_petanque.png',
      link: 'https://line.me/R/ti/g/yfDck2bDU2'
    },
    welfare: {
      name: 'กลุ่ม LINE ฝ่ายสวัสดิการ คณะสีแสด 69',
      qr: 'images/qr_welfare.svg',
      link: 'https://line.me'
    },
    cheerleader: {
      name: '🧡 คัดหลีดสีแสด🧡🧡',
      qr: 'images/qr_cheer.png',
      link: 'https://line.me/ti/g2/Aw_XBt-lsIixme57NmkIUu0OdPYAHTwFtT8h6Q?utm_source=invitation&utm_medium=link_copy&utm_campaign=default'
    },
    cheer: {
      name: '🧡 คัดหลีดสีแสด🧡🧡',
      qr: 'images/qr_cheer.png',
      link: 'https://line.me/ti/g2/Aw_XBt-lsIixme57NmkIUu0OdPYAHTwFtT8h6Q?utm_source=invitation&utm_medium=link_copy&utm_campaign=default'
    },
    drum_major: {
      name: 'กลุ่ม LINE ดรัมเมเยอร์ คณะสีแสด 69',
      qr: 'images/qr_drum.svg',
      link: 'https://line.me'
    },
    colorguard: {
      name: 'กลุ่ม LINE คัลเลอร์การ์ด คณะสีแสด 69',
      qr: 'images/qr_drum.svg',
      link: 'https://line.me'
    },
    parade: {
      name: 'พร้อบ ม.4,ม.5 (คณะสีแสด 69)',
      qr: 'images/qr_props.png',
      link: 'https://line.me/ti/g2/b-2h-ADgPThYMhI_-UFmXS-plBlweqx5yj5xTw?utm_source=invitation&utm_medium=link_copy&utm_campaign=default'
    },
    parade_props: {
      name: 'พร้อบ ม.4,ม.5 (คณะสีแสด 69)',
      qr: 'images/qr_props.png',
      link: 'https://line.me/ti/g2/b-2h-ADgPThYMhI_-UFmXS-plBlweqx5yj5xTw?utm_source=invitation&utm_medium=link_copy&utm_campaign=default'
    },
    stand_cheer: {
      name: 'สแตนสีแสด topaz 69🧡',
      qr: 'images/qr_stand.png',
      link: 'https://line.me/ti/g2/Ek0P8BIqQulkFrip7vb1kZxydezo-hstexlc7g?utm_source=invitation&utm_medium=link_copy&utm_campaign=default'
    },
    staff: {
      name: 'กลุ่ม LINE สตาฟคณะสีแสด 69 (ม.5)',
      qr: 'images/qr_staff.png',
      link: 'https://line.me/R/ti/g/SsSYeWdtVP'
    }
  };

  function normalizeSportKey(title, sportId, catId) {
    const t = ((title || '') + ' ' + (sportId || '') + ' ' + (catId || '')).toLowerCase();
    if (t.includes('สแตน') || t.includes('stand')) return 'สแตนเชียร์';
    if (t.includes('สตาฟ') || t.includes('หัวหน้า') || t.includes('ประธาน') || t.includes('เหรัญญิก')) return title || 'สตาฟ';
    if (t.includes('กรีฑา') || t.includes('athletics') || t.includes('at_')) return 'กรีฑา';
    if (t.includes('เปตอง') || t.includes('petanque') || t.includes('pt_') || t.includes('pt')) return 'เปตอง';
    if (t.includes('วอลเลย์') || t.includes('volleyball') || t.includes('vb')) return 'วอลเลย์บอล';
    if (t.includes('บาส') || t.includes('basketball') || t.includes('bb')) return 'บาสเกตบอล';
    if (t.includes('ตะกร้อ') || t.includes('takraw') || t.includes('tk')) return 'ตะกร้อ';
    if (t.includes('16 ขา') || t.includes('running16') || t.includes('r16')) return 'วิ่ง 16 ขา';
    if (t.includes('บอล') || t.includes('ฟุตบอล') || t.includes('football') || t.includes('fb_') || (t.includes('ทีม') && !t.includes('กรีฑา') && !t.includes('เปตอง') && !t.includes('วอลเลย์') && !t.includes('บาส') && !t.includes('16 ขา') && !t.includes('ตะกร้อ'))) return 'ฟุตบอล';
    if (t.includes('หลีด') || t.includes('ลีด') || t.includes('cheerleader')) return 'เชียร์ลีดเดอร์';
    if (t.includes('ขบวน') || t.includes('พร็อพ') || t.includes('parade')) return 'ขบวนพาเหรด';
    if (t.includes('ดรัม')) return 'ดรัมเมเยอร์';
    if (t.includes('คัลเลอร์')) return 'คัลเลอร์การ์ด';
    if (t.includes('สวัสดิการ')) return 'สวัสดิการ';
    return title || 'กิจกรรม';
  }

  function resolveLineGroup(deptId, sportId, catId, title) {
    const text = ((title || '') + ' ' + (sportId || '') + ' ' + (catId || '') + ' ' + (deptId || '')).toLowerCase();
    
    // Check student's grade & gender context
    const grade = (state.student && state.student.grade) || 0;
    const gender = (state.student && state.student.gender) || '';
    const isJunior = grade > 0 && grade <= 3;
    const isFemale = gender === 'หญิง' || text.includes('หญิง') || text.includes('fb_jr_f') || text.includes('fb_sr_f');

    // Stand cheer MUST be checked before cheerleader/cheer
    if (text.includes('สแตน') || text.includes('stand') || deptId === 'stand_cheer') return LINE_GROUPS.stand_cheer;
    if (text.includes('หลีด') || text.includes('ลีด') || text.includes('cheerleader') || deptId === 'cheerleader' || deptId === 'cheer') return LINE_GROUPS.cheerleader;
    if (text.includes('ขบวน') || text.includes('parade') || text.includes('พาเหรด') || text.includes('พร็อพ') || text.includes('props')) return LINE_GROUPS.parade;
    if (text.includes('กรีฑา') || text.includes('athletics') || text.includes('at_')) return LINE_GROUPS.athletics;
    if (text.includes('เปตอง') || text.includes('petanque') || text.includes('pt_') || text.includes('pt')) return LINE_GROUPS.petanque;
    if (text.includes('ตะกร้อ') || text.includes('takraw') || text.includes('tk')) return LINE_GROUPS.takraw;
    if (text.includes('วอลเลย์') || text.includes('volleyball') || text.includes('vb')) return LINE_GROUPS.volleyball;
    if (text.includes('บาส') || text.includes('basketball') || text.includes('bb')) return LINE_GROUPS.basketball;
    if (text.includes('16 ขา') || text.includes('running16') || text.includes('r16')) return LINE_GROUPS.running16;
    
    // Football separate groups (Accurate matching using student profile + title)
    const isFootball = text.includes('football') || text.includes('ฟุตบอล') || text.includes('บอล') || text.includes('fb_') || (text.includes('ทีม') && !text.includes('กรีฑา') && !text.includes('เปตอง') && !text.includes('วอลเลย์') && !text.includes('บาส') && !text.includes('16 ขา') && !text.includes('ตะกร้อ'));
    
    if (isFootball) {
      if (isFemale) return LINE_GROUPS.football_f;
      if (isJunior || text.includes('ม.ต้น') || text.includes('fb_jr_m')) return LINE_GROUPS.football_jr_m;
      return LINE_GROUPS.football_sr_m;
    }

    if (deptId && LINE_GROUPS[deptId]) return LINE_GROUPS[deptId];
    return LINE_GROUPS.main;
  }

  function renderLockedCard(regs) {
    const hasValidPhone = regs.some(r => r.phone && r.phone.replace(/[^\d]/g, '').length >= 9);

    // Deduplicate overlapping registrations cleanly
    const uniqueRegs = [];
    const seenKeys = new Set();
    regs.forEach(r => {
      const actTitle = r.categoryTitle || r.roleName || r.sportName || '-';
      const normKey = normalizeSportKey(actTitle, r.sportId, r.categoryId);
      if (!seenKeys.has(normKey)) {
        seenKeys.add(normKey);
        
        // Enhance title if it is plain "ทีมชาย ม.ต้น" or "ฟุตบอล"
        let displayTitle = actTitle;
        if (normKey === 'ฟุตบอล' && (displayTitle === 'ฟุตบอล' || displayTitle.startsWith('ทีม'))) {
          const g = state.student ? state.student.grade : 0;
          const gd = state.student ? state.student.gender : '';
          const levelText = g <= 3 && g > 0 ? 'ม.ต้น' : 'ม.ปลาย';
          displayTitle = `ฟุตบอล ทีม${gd || 'ชาย'} ${levelText}`;
        }

        uniqueRegs.push({
          ...r,
          displayTitle: displayTitle
        });
      }
    });

    let listHtml = uniqueRegs.map(r => {
      const deptName = r.departmentName || (r.sportName ? 'ฝ่ายกีฬา' : 'ฝ่ายกิจกรรม');
      const actTitle = r.displayTitle || r.categoryTitle || r.roleName || r.sportName || '-';
      const deptId = r.departmentId || (r.sportName ? 'sports' : 'sports');
      const groupInfo = resolveLineGroup(deptId, r.sportId, r.categoryId, actTitle);
      const displayPhone = r.phone && r.phone.replace(/[^\d]/g, '').length >= 9 ? r.phone : '<span class="text-orange font-bold">ยังไม่ระบุเบอร์โทร</span>';

      return `
      <div class="locked-item-row">
        <div class="locked-item-left">
          <i class="fa-solid fa-circle-check"></i>
          <div>
            <div class="locked-item-title">${deptName}: ${actTitle}</div>
            <div class="locked-item-sub">เบอร์โทรศัพท์: <strong>${displayPhone}</strong> • วันที่สมัคร: ${r.createdAt ? new Date(r.createdAt).toLocaleDateString('th-TH') : '-'}</div>
          </div>
        </div>
        <a href="${groupInfo.link}" target="_blank" rel="noopener noreferrer" class="btn btn-line btn-sm">
          <i class="fa-brands fa-line"></i> ${groupInfo.name}
        </a>
      </div>
      `;
    }).join('');

    if (!hasValidPhone) {
      listHtml += `
        <div class="update-phone-box">
          <label for="updatePhoneInput"><i class="fa-solid fa-phone-volume"></i> ท่านมีรายชื่อในระบบแล้ว แต่ยังไม่มีเบอร์โทรศัพท์ กรุณากรอกเบอร์โทรติดต่อ:</label>
          <div class="input-with-action">
            <input type="tel" id="updatePhoneInput" maxlength="12" placeholder="08x-xxx-xxxx หรือ 09xxxxxxxx" autocomplete="tel">
            <button type="button" id="submitPhoneUpdateBtn" class="btn btn-orange">
              <i class="fa-solid fa-floppy-disk"></i> บันทึกเบอร์โทร
            </button>
          </div>
          <small class="form-hint" style="color: #15803d; margin-top: 6px; display: block;">ระบบจะบันทึกเบอร์โทรศัพท์นี้ลงใน Google Sheet ของคณะสีแสดทันที</small>
        </div>
      `;
    }

    lockedRegList.innerHTML = listHtml;

    // Attach handler if phone update box is rendered
    const updatePhoneInput = document.getElementById('updatePhoneInput');
    const submitPhoneUpdateBtn = document.getElementById('submitPhoneUpdateBtn');

    if (updatePhoneInput && submitPhoneUpdateBtn) {
      updatePhoneInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^\d]/g, '');
        if (val.length > 10) val = val.substring(0, 10);
        if (val.length > 6) {
          val = `${val.substring(0, 3)}-${val.substring(3, 6)}-${val.substring(6)}`;
        } else if (val.length > 3) {
          val = `${val.substring(0, 3)}-${val.substring(3)}`;
        }
        e.target.value = val;
      });

      submitPhoneUpdateBtn.addEventListener('click', async () => {
        const rawPhone = updatePhoneInput.value.replace(/[^\d]/g, '');
        if (rawPhone.length !== 10) {
          showToast('กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก (เช่น 08x-xxx-xxxx)', 'error');
          updatePhoneInput.focus();
          return;
        }

        submitPhoneUpdateBtn.disabled = true;
        submitPhoneUpdateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

        try {
          const res = await fetch('/api/student/update-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: state.student.id,
              phone: updatePhoneInput.value.trim()
            })
          });

          const result = await res.json();
          if (result.success) {
            showToast('บันทึกเบอร์โทรศัพท์ของคุณเรียบร้อยแล้ว!', 'success');
            // Update state and re-render
            state.existingRegistrations.forEach(r => r.phone = updatePhoneInput.value.trim());
            renderLockedCard(state.existingRegistrations);
          } else {
            showToast(result.message || 'บันทึกไม่สำเร็จ', 'error');
            submitPhoneUpdateBtn.disabled = false;
            submitPhoneUpdateBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกเบอร์โทร';
          }
        } catch (err) {
          console.error('Error updating phone:', err);
          showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
          submitPhoneUpdateBtn.disabled = false;
          submitPhoneUpdateBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกเบอร์โทร';
        }
      });
    }
  }

  function resetStudentProfile() {
    state.student = null;
    state.existingRegistrations = [];
    studentProfileCard.classList.add('hidden');
    alreadyRegisteredCard.classList.add('hidden');
    partialRegAlert.classList.add('hidden');
    phoneInputGroup.classList.remove('hidden');
    step1Actions.classList.remove('hidden');
    validateStep1();
  }

  const phoneCounterBadge = document.getElementById('phoneCounterBadge');

  function validateStep1() {
    const rawPhone = (phoneInput.value || '').replace(/[^\d]/g, '');
    state.phone = phoneInput.value.trim();
    const isPhoneValid = rawPhone.length === 10;
    const isStudentValid = state.student !== null;

    if (phoneCounterBadge) {
      if (rawPhone.length === 10) {
        phoneCounterBadge.className = 'badge badge-orange';
        phoneCounterBadge.style.backgroundColor = '#16a34a';
        phoneCounterBadge.style.color = '#ffffff';
        phoneCounterBadge.textContent = 'ครบ 10 หลัก ✅';
        phoneInput.style.borderColor = '#16a34a';
      } else if (rawPhone.length > 0) {
        phoneCounterBadge.className = 'badge badge-orange';
        phoneCounterBadge.style.backgroundColor = '#ea580c';
        phoneCounterBadge.style.color = '#ffffff';
        phoneCounterBadge.textContent = `${rawPhone.length}/10 หลัก (ยังไม่ครบ)`;
        phoneInput.style.borderColor = '#ea580c';
      } else {
        phoneCounterBadge.className = 'badge badge-dark';
        phoneCounterBadge.style.backgroundColor = '';
        phoneCounterBadge.style.color = '';
        phoneCounterBadge.textContent = '(0/10 หลัก)';
        phoneInput.style.borderColor = '';
      }
    }

    toStep2Btn.disabled = !(isStudentValid && isPhoneValid);
  }

  // Format phone automatically (08x-xxx-xxxx)
  phoneInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/[^\d]/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    
    if (val.length > 6) {
      val = `${val.substring(0, 3)}-${val.substring(3, 6)}-${val.substring(6)}`;
    } else if (val.length > 3) {
      val = `${val.substring(0, 3)}-${val.substring(3)}`;
    }
    e.target.value = val;
    validateStep1();
  });

  searchStudentBtn.addEventListener('click', searchStudent);
  studentIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchStudent();
  });

  lockedResetBtn.addEventListener('click', () => {
    studentIdInput.value = '';
    phoneInput.value = '';
    resetStudentProfile();
    studentIdInput.focus();
  });

  toStep2Btn.addEventListener('click', () => {
    const rawPhone = (phoneInput.value || '').replace(/[^\d]/g, '');
    if (!state.student) {
      showToast('กรุณาค้นหารหัสนักเรียนก่อน', 'error');
      studentIdInput.focus();
      return;
    }
    if (rawPhone.length !== 10) {
      showToast(`กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก (ขณะนี้กรอก ${rawPhone.length} หลัก)`, 'error');
      phoneInput.focus();
      validateStep1();
      return;
    }
    state.phone = phoneInput.value.trim();
    renderStep2Departments();
    goToStep(2);
  });

  // =========================================================================
  // 3. Step 2: Department Selection
  // =========================================================================
  function renderStep2Departments() {
    departmentsContainer.innerHTML = '';

    if (!state.eligibleDepartments || state.eligibleDepartments.length === 0) {
      departmentsContainer.innerHTML = '<div class="alert alert-info">ไม่พบฝ่ายกิจกรรมที่ตรงกับระดับชั้นของท่าน</div>';
      return;
    }

    const isM5 = state.student && state.student.grade === 5;
    const isStaffRole = (r) => r.departmentId === 'staff' || 
      (r.categoryTitle && (r.categoryTitle.includes('สตาฟ') || r.categoryTitle.includes('หัวหน้า') || r.categoryTitle.includes('ประธาน') || r.categoryTitle.includes('เฮด') || r.categoryTitle.includes('เหรัญญิก') || r.categoryTitle.includes('มือกลอง') || r.categoryTitle.includes('ขบวน') || r.categoryTitle.includes('ดรัม') || r.categoryTitle.includes('คัลเลอร์'))) ||
      (r.departmentName && (r.departmentName.includes('สตาฟ') || r.departmentName.includes('คณะสี') || r.departmentName.includes('หัวหน้า'))) ||
      (isM5 && r.departmentId !== 'sports');
    
    const hasStaff = state.existingRegistrations.some(isStaffRole);
    const existingSports = state.existingRegistrations.filter(r => r.departmentId === 'sports');

    // Rule for M.5: Must register as Staff first before registering for other departments!
    const mustRegisterStaffFirst = isM5 && !hasStaff;

    const deptStatus = (state.systemStatus && state.systemStatus.departmentsStatus) || {};
    let availableDepts = state.eligibleDepartments.filter(d => deptStatus[d.id] !== false);

    if (mustRegisterStaffFirst) {
      // For M.5 who has not registered as staff yet, show only staff department with informative banner
      const m5Alert = document.createElement('div');
      m5Alert.className = 'alert alert-info';
      m5Alert.style.gridColumn = '1 / -1';
      m5Alert.style.marginBottom = '14px';
      m5Alert.innerHTML = `
        <i class="fa-solid fa-user-shield text-orange" style="font-size: 22px;"></i>
        <div>
          <strong>🧡 สำหรับนักเรียนชั้น ม.5 (พี่สตาฟคณะสีแสด):</strong>
          <div>นักเรียนชั้น ม.5 ทุกคนต้องลงทะเบียนเลือก <strong>"ฝ่ายสตาฟคณะสี (ม.5)"</strong> ก่อนเป็นอันดับแรก (เมื่อลงสตาฟเรียบร้อยแล้ว ท่านสามารถลงสมัครแข่งขันกีฬาเพิ่มเติมได้)</div>
        </div>
      `;
      departmentsContainer.appendChild(m5Alert);

      availableDepts = availableDepts.filter(d => d.id === 'staff');
    } else if (isM5 && hasStaff) {
      // For M.5 who already has a staff role, exclude staff and show other departments (sports, etc.)
      availableDepts = availableDepts.filter(d => d.id !== 'staff');
    }

    availableDepts.forEach(dept => {
      // If user already registered 1 sport, they can ONLY pick sports for their 2nd choice
      if (existingSports.length === 1 && dept.id !== 'sports') {
        return; // skip non-sport departments
      }

      const card = document.createElement('div');
      card.className = `dept-card ${state.selectedDepartment && state.selectedDepartment.id === dept.id ? 'selected' : ''}`;
      
      let quotaText = '';
      if (dept.type === 'sports') {
        const totalMatchingSports = dept.items ? dept.items.length : 0;
        quotaText = `กีฬาที่เปิดรับ ${totalMatchingSports} ชนิด (เลือกได้ 1 กีฬา)`;
      } else {
        quotaText = `เปิดรับสมัคร (ไม่จำกัดจำนวน)`;
      }

      card.innerHTML = `
        <div class="dept-card-top">
          <div class="dept-icon">${dept.icon || '📌'}</div>
          <div>
            <div class="dept-title">${dept.name}</div>
            <div class="dept-desc">${dept.description || ''}</div>
          </div>
        </div>
        <div class="dept-card-footer">
          <span class="dept-quota">${quotaText}</span>
          <div class="dept-check"><i class="fa-solid fa-check"></i></div>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.dept-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.selectedDepartment = dept;
        state.selectedSports = []; // reset sports selection if changing department
        toStep3Btn.disabled = false;
      });

      departmentsContainer.appendChild(card);
    });

    toStep3Btn.disabled = state.selectedDepartment === null;
  }

  backToStep1Btn.addEventListener('click', () => goToStep(1));
  toStep3Btn.addEventListener('click', () => {
    if (!state.selectedDepartment) return;
    renderStep3Options();
    goToStep(3);
  });

  // =========================================================================
  // 4. Step 3: Specific Activity / Sports Options
  // =========================================================================
  function renderStep3Options() {
    const dept = state.selectedDepartment;
    const existingSports = state.existingRegistrations.filter(r => r.departmentId === 'sports');
    const maxAllowedNow = Math.max(1 - existingSports.length, 1);

    if (dept.type === 'sports') {
      step3Title.innerHTML = `<i class="fa-solid fa-trophy text-orange"></i> ขั้นตอนที่ 3: เลือกชนิดกีฬา (เลือกได้ 1 กีฬา)`;
      step3Subtitle.textContent = `สำหรับนักเรียนเพศ${state.student.gender} ระดับชั้น ${state.student.roomFull}`;
      
      sportSelectionContainer.classList.remove('hidden');
      nonSportContainer.classList.add('hidden');
      renderSportsList(dept.items, maxAllowedNow);
      updateSportsCounter(maxAllowedNow);
    } else if (dept.type === 'staff' && dept.items && dept.items.length > 0) {
      step3Title.innerHTML = `<i class="fa-solid fa-user-shield text-orange"></i> ขั้นตอนที่ 3: เลือกบทบาทหน้าที่สตาฟ (ม.5)`;
      step3Subtitle.textContent = 'เลือกหน้าที่หลักของท่านในคณะสีแสด (สามารถลงแข่งขันกีฬาเพิ่มได้)';
      
      sportSelectionContainer.classList.remove('hidden');
      nonSportContainer.classList.add('hidden');
      renderStaffRolesList(dept.items);
    } else {
      step3Title.innerHTML = `<i class="fa-solid fa-circle-info text-orange"></i> ขั้นตอนที่ 3: รายละเอียด ${dept.name}`;
      step3Subtitle.textContent = 'ตรวจสอบรายละเอียดหน้าที่ความรับผิดชอบของฝ่ายที่เลือก';
      
      sportSelectionContainer.classList.add('hidden');
      nonSportContainer.classList.remove('hidden');

      summaryDeptIcon.textContent = dept.icon || '📌';
      summaryDeptName.textContent = dept.name;
      summaryDeptDesc.textContent = dept.description || '';
      summaryDeptQuota.textContent = `การเปิดรับ: เปิดรับสมัคร (ไม่จำกัดจำนวน)`;
      summaryDeptRole.textContent = `หน้าที่: ${dept.roleName || dept.name}`;

      toStep4Btn.disabled = false;
    }
  }

  function renderStaffRolesList(items) {
    sportsListAccordion.innerHTML = '';
    state.selectedStaffRole = state.selectedStaffRole || (items[0] ? items[0].id : null);

    items.forEach(role => {
      const isSelected = state.selectedStaffRole === role.id;
      const card = document.createElement('div');
      card.className = `sport-category-card ${isSelected ? 'selected' : ''}`;

      card.innerHTML = `
        <div class="sport-cat-info">
          <div class="sport-cat-icon">${role.icon || '🧡'}</div>
          <div>
            <div class="sport-cat-title">${role.title}</div>
            <div class="sport-cat-sub">บทบาทหน้าที่: ${role.roleName}</div>
          </div>
        </div>
        <div class="sport-cat-right">
          <span class="quota-indicator quota-available">เปิดรับสตาฟ</span>
          <div class="dept-check"><i class="fa-solid fa-check"></i></div>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.sport-category-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.selectedStaffRole = role.id;
        toStep4Btn.disabled = false;
      });

      sportsListAccordion.appendChild(card);
    });

    sportsCountBadge.textContent = 'เลือก 1 หน้าที่';
    toStep4Btn.disabled = !state.selectedStaffRole;
  }

  function renderSportsList(sportsItems, maxAllowedNow) {
    sportsListAccordion.innerHTML = '';

    if (!sportsItems || sportsItems.length === 0) {
      sportsListAccordion.innerHTML = '<div class="alert alert-info">ไม่มีรุ่นกีฬาที่ตรงกับระดับชั้นและเพศของท่าน</div>';
      return;
    }

    sportsItems.forEach(sport => {
      sport.categories.forEach(cat => {
        const isAlreadyRegistered = state.existingRegistrations.some(r => 
          (r.categoryId && r.categoryId === cat.id) || 
          (r.categoryTitle && (r.categoryTitle === cat.title || (r.categoryTitle.includes(sport.name) && !r.categoryTitle.includes('สตาฟ') && !r.categoryTitle.includes('หัวหน้า'))))
        );
        const isSelected = state.selectedSports.includes(cat.id);
        const isDisabled = isAlreadyRegistered;

        const card = document.createElement('div');
        card.className = `sport-category-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;

        let statusText = '';
        if (isAlreadyRegistered) {
          statusText = '<span class="quota-indicator text-orange">✅ สมัครแล้ว</span>';
        } else {
          statusText = '<span class="quota-indicator quota-available">เปิดรับสมัคร</span>';
        }

        card.innerHTML = `
          <div class="sport-cat-info">
            <div class="sport-cat-icon">${sport.icon || '🏅'}</div>
            <div>
              <div class="sport-cat-title">${cat.title}</div>
              <div class="sport-cat-sub">กีฬาฝ่าย${sport.name} • ระดับชั้น ม.${cat.grades.join(', ม.')}</div>
            </div>
          </div>
          <div class="sport-cat-right">
            ${statusText}
            <div class="dept-check"><i class="fa-solid fa-check"></i></div>
          </div>
        `;

        if (!isDisabled) {
          card.addEventListener('click', () => {
            if (state.selectedSports.includes(cat.id)) {
              // Deselect
              state.selectedSports = state.selectedSports.filter(id => id !== cat.id);
              card.classList.remove('selected');
            } else {
              // Check max
              if (state.selectedSports.length >= maxAllowedNow) {
                showToast(`สามารถเลือกสมัครกีฬาเพิ่มได้สูงสุด ${maxAllowedNow} ชนิดกีฬา`, 'info');
                return;
              }
              state.selectedSports.push(cat.id);
              card.classList.add('selected');
            }
            updateSportsCounter(maxAllowedNow);
          });
        }

        sportsListAccordion.appendChild(card);
      });
    });
  }

  function updateSportsCounter(maxAllowedNow) {
    const count = state.selectedSports.length;
    sportsCountBadge.textContent = `${count} / ${maxAllowedNow} กีฬา`;
    toStep4Btn.disabled = count === 0;
  }

  backToStep2Btn.addEventListener('click', () => goToStep(2));
  toStep4Btn.addEventListener('click', () => {
    renderStep4Review();
    goToStep(4);
  });

  // =========================================================================
  // 5. Step 4: Review & Confirmation
  // =========================================================================
  function renderStep4Review() {
    reviewStudentName.textContent = state.student.name;
    reviewStudentMeta.textContent = `${state.student.roomFull || `ม.${state.student.grade}/${state.student.room}`} | เลขที่ ${state.student.classNo || '-'} | เพศ ${state.student.gender} | รหัสประจำตัว: ${state.student.id}`;
    reviewPhone.textContent = state.phone;
    reviewDepartment.textContent = `${state.selectedDepartment.icon || ''} ${state.selectedDepartment.name}`;

    reviewActivitiesList.innerHTML = '';

    if (state.selectedDepartment.type === 'sports') {
      const itemsList = [];
      state.selectedDepartment.items.forEach(s => {
        s.categories.forEach(c => {
          if (state.selectedSports.includes(c.id)) {
            itemsList.push(`• <strong>${c.title}</strong>`);
          }
        });
      });
      reviewActivitiesList.innerHTML = itemsList.join('<br>') || '-';
    } else if (state.selectedDepartment.type === 'staff') {
      const foundRole = state.selectedDepartment.items && state.selectedDepartment.items.find(r => r.id === state.selectedStaffRole);
      const roleTitle = foundRole ? foundRole.title : (state.selectedStaffRole || 'สตาฟทั่วไป');
      reviewActivitiesList.innerHTML = `• บทบาทหน้าที่สตาฟ: <strong>${roleTitle}</strong>`;
    } else {
      reviewActivitiesList.innerHTML = `• บทบาทหน้าที่: <strong>${state.selectedDepartment.roleName || state.selectedDepartment.name}</strong>`;
    }
  }

  backToStep3Btn.addEventListener('click', () => goToStep(3));

  // =========================================================================
  // 6. Submit Registration
  // =========================================================================
  async function submitRegistration() {
    submitRegistrationBtn.disabled = true;
    submitRegistrationBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึกข้อมูล...';

    const payload = {
      studentId: state.student.id,
      phone: state.phone,
      departmentId: state.selectedDepartment.id,
      selectedSports: state.selectedSports,
      selectedStaffRole: state.selectedStaffRole,
      note: ''
    };

    try {
      let result = null;

      // 1. Try local node backend API first
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          result = await response.json();
        }
      } catch (e) {
        console.log('Local backend unavailable for register, using direct Google Apps Script Webhook...');
      }

      // 2. Fallback to Google Apps Script Webhook on GitHub Pages
      if (!result || !result.success) {
        let activityTitle = state.selectedDepartment.name;
        if (state.selectedDepartment.type === 'sports') {
          const names = [];
          state.selectedDepartment.items.forEach(s => {
            s.categories.forEach(c => {
              if (state.selectedSports.includes(c.id)) names.push(s.name || c.title);
            });
          });
          activityTitle = names.join(', ') || state.selectedDepartment.name;
        } else if (state.selectedDepartment.type === 'staff') {
          const found = (state.selectedDepartment.items || []).find(r => r.id === state.selectedStaffRole);
          activityTitle = found ? found.title : (state.selectedStaffRole || 'สตาฟ');
        }

        const webhookPayload = {
          studentId: state.student.id,
          studentName: state.student.name,
          roomFull: state.student.roomFull,
          grade: state.student.grade,
          departmentName: state.selectedDepartment.name,
          roleName: activityTitle,
          categoryTitle: activityTitle,
          phone: state.phone,
          overwrite: false
        };

        // Save to Firestore in real-time if db is connected
        if (db) {
          try {
            await db.collection('students').doc(state.student.id).set({
              duty: activityTitle,
              phone: state.phone
            }, { merge: true });

            await db.collection('registrations').add({
              studentId: state.student.id,
              studentName: state.student.name,
              roomFull: state.student.roomFull,
              grade: state.student.grade,
              departmentName: state.selectedDepartment.name,
              departmentId: state.selectedDepartment.id,
              roleName: activityTitle,
              categoryTitle: activityTitle,
              phone: state.phone,
              createdAt: new Date().toISOString()
            });
          } catch (dbErr) {
            console.warn('Firestore write warning:', dbErr);
          }
        }

        // Sync to Google Sheet Webhook
        try {
          fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
            redirect: 'follow'
          });
        } catch (sErr) {}

        result = {
          success: true,
          registered: [{
            categoryTitle: activityTitle,
            roleName: activityTitle,
            departmentName: state.selectedDepartment.name,
            phone: state.phone
          }]
        };
      }

      if (!result || !result.success) {
        showToast((result && result.message) || 'การสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
        submitRegistrationBtn.disabled = false;
        submitRegistrationBtn.innerHTML = '<i class="fa-solid fa-check"></i> ยืนยันการสมัคร';
        return;
      }

      // Success
      renderSuccessScreen(result);
      goToStep('success');
      showToast('บันทึกการสมัครสำเร็จเรียบร้อยแล้ว!', 'success');

    } catch (err) {
      console.error('Error submitting registration:', err);
      showToast('เกิดข้อผิดพลาดในการส่งข้อมูลไปยังเซิร์ฟเวอร์', 'error');
      submitRegistrationBtn.disabled = false;
      submitRegistrationBtn.innerHTML = '<i class="fa-solid fa-check"></i> ยืนยันการสมัคร';
    }
  }

  submitRegistrationBtn.addEventListener('click', submitRegistration);

  function renderSuccessScreen(result) {
    const regList = result.registered || [];
    let activitiesText = '';

    if (regList.length > 0) {
      activitiesText = regList.map(r => `<div>✅ ${r.categoryTitle || r.roleName || r.sportName}</div>`).join('');
    } else {
      activitiesText = `<div>✅ ${state.selectedDepartment.name}</div>`;
    }

    successSummaryCard.innerHTML = `
      <div class="review-row">
        <span class="review-label">ชื่อ - นามสกุล:</span>
        <span class="review-val font-bold">${state.student.name}</span>
      </div>
      <div class="review-row">
        <span class="review-label">ระดับชั้น / ห้อง:</span>
        <span class="review-val">${state.student.roomFull} (เลขที่ ${state.student.classNo})</span>
      </div>
      <div class="review-row">
        <span class="review-label">เบอร์โทรศัพท์ติดต่อ:</span>
        <span class="review-val text-orange font-bold">${state.phone}</span>
      </div>
      <div class="review-row">
        <span class="review-label">ฝ่ายที่สมัคร:</span>
        <span class="review-val font-bold">${state.selectedDepartment.name}</span>
      </div>
      <div class="review-row align-start">
        <span class="review-label">รายการที่ลงทะเบียน:</span>
        <div class="review-val font-bold text-success">${activitiesText}</div>
      </div>
    `;

    // Dynamic Department/Sport-specific LINE Group
    const dept = state.selectedDepartment;
    let groupInfo = LINE_GROUPS.main;

    if (dept && dept.id === 'sports' && state.selectedSports && state.selectedSports.length > 0) {
      const sportCatId = typeof state.selectedSports[0] === 'string' ? state.selectedSports[0] : state.selectedSports[0].categoryId;
      let catTitle = '';
      let sportId = '';
      if (dept.items) {
        for (const s of dept.items) {
          const c = s.categories ? s.categories.find(cat => cat.id === sportCatId) : null;
          if (c) {
            catTitle = c.title || s.name;
            sportId = s.id;
            break;
          }
        }
      }
      groupInfo = resolveLineGroup('sports', sportId, sportCatId, catTitle);
    } else if (dept && dept.id === 'staff' && state.selectedStaffRole) {
      const staffItem = dept.items && dept.items.find(it => it.id === state.selectedStaffRole || it.roleName === state.selectedStaffRole || it.title === state.selectedStaffRole);
      const roleText = staffItem ? (staffItem.title || staffItem.roleName) : state.selectedStaffRole;
      groupInfo = resolveLineGroup('staff', '', state.selectedStaffRole, roleText);
    } else if (dept) {
      groupInfo = resolveLineGroup(dept.id, '', '', dept.name);
    }

    const titleEl = document.querySelector('.line-invite-title');
    const qrImgEl = document.querySelector('.line-qr-img');
    const btnLineWrapEl = document.querySelector('.line-invite-btn-wrap');

    if (titleEl) titleEl.textContent = groupInfo.name;
    if (qrImgEl) qrImgEl.src = groupInfo.qr;
    if (btnLineWrapEl) {
      btnLineWrapEl.innerHTML = `
        <a href="${groupInfo.link}" target="_blank" rel="noopener noreferrer" class="btn btn-line btn-lg">
          <i class="fa-brands fa-line"></i> เข้าร่วม ${groupInfo.name}
        </a>
      `;
    }
  }

  if (lockedResetBtn) {
    lockedResetBtn.addEventListener('click', () => {
      studentIdInput.value = '';
      resetStudentProfile();
      studentIdInput.focus();
    });
  }

  if (newRegistrationBtn) {
    newRegistrationBtn.addEventListener('click', () => {
      // Reset state and return to Step 1
      state.student = null;
      state.phone = '';
      state.selectedDepartment = null;
      state.selectedSports = [];
      state.existingRegistrations = [];
      studentIdInput.value = '';
      phoneInput.value = '';
      resetStudentProfile();
      goToStep(1);
      studentIdInput.focus();
    });
  }

  // =========================================================================
  // 8. Initial System Status Check
  // =========================================================================
  async function checkSystemStatus() {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (data.success) {
        state.systemStatus = data;
        if (!data.isOpen) {
          if (systemClosedBanner && systemClosedText) {
            systemClosedText.textContent = data.closeMessage || 'ระบบรับสมัครกิจกรรม คณะสีแสด 2569 ปิดรับสมัครชั่วคราวเพื่อประมวลผลข้อมูล';
            systemClosedBanner.classList.remove('hidden');
          }
          if (toStep2Btn) toStep2Btn.disabled = true;
        } else {
          if (systemClosedBanner) systemClosedBanner.classList.add('hidden');
        }
      }
    } catch (e) {
      console.warn('Could not fetch system status:', e);
    }
  }

  checkSystemStatus();
});
