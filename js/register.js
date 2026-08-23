/**
 * ==============================================================================
 * Client Logic สำหรับหน้ารับสมัครนักเรียน คณะสีบุษราคัม (สีแสด)
 * ==============================================================================
 */

let currentVerifiedStudent = null;
let allSportsData = [];
let selectedCategoryIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
  loadSportsData();

  // Auto verify when 5 digits are typed
  const stdInput = document.getElementById('studentIdInput');
  stdInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val.length === 5 && /^\d+$/.test(val)) {
      verifyStudentId();
    } else {
      hideStudentCard();
    }
  });
});

// 1. ดึงข้อมูลชนิดกีฬาและโควตา Real-time
async function loadSportsData() {
  try {
    const res = await fetch('/api/sports');
    const json = await res.json();
    if (json.success) {
      allSportsData = json.data;
      if (currentVerifiedStudent) {
        renderEligibleSports(currentVerifiedStudent);
      }
    }
  } catch (err) {
    console.error('Error loading sports:', err);
  }
}

// 2. ตรวจสอบรหัสประจำตัวนักเรียน
async function verifyStudentId() {
  const input = document.getElementById('studentIdInput');
  const queryId = input.value.trim();

  if (!queryId || queryId.length < 5) {
    alert('กรุณากรอกรหัสประจำตัว 5 หลัก');
    return;
  }

  const btn = document.getElementById('btnVerify');
  btn.disabled = true;
  btn.innerText = 'กำลังค้นหา...';

  try {
    const res = await fetch(`/api/student/${queryId}`);
    const json = await res.json();

    if (!json.success) {
      alert(json.message || 'ไม่พบรหัสประจำตัวนี้ในคณะสีแสด');
      hideStudentCard();
      return;
    }

    currentVerifiedStudent = json.data;
    showStudentCard(currentVerifiedStudent, json.existingRegistrations || []);
    renderEligibleSports(currentVerifiedStudent, json.existingRegistrations || []);

  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    btn.disabled = false;
    btn.innerText = '🔍 ตรวจสอบ';
  }
}

function showStudentCard(student, existingRegs = []) {
  document.getElementById('cardStudentName').innerText = student.name;
  document.getElementById('cardStdId').innerText = student.id;
  document.getElementById('cardRoomFull').innerText = student.roomFull;
  document.getElementById('cardClassNo').innerText = student.classNo || '-';
  document.getElementById('cardGender').innerText = student.gender;

  const warningBox = document.getElementById('existingRegWarning');
  if (existingRegs.length > 0) {
    const sportsList = existingRegs.map(r => `${r.sportName} (${r.categoryTitle})`).join(', ');
    document.getElementById('existingSportsText').innerText = sportsList;
    warningBox.style.display = 'block';
  } else {
    warningBox.style.display = 'none';
  }

  document.getElementById('studentCard').classList.add('active');
}

function hideStudentCard() {
  currentVerifiedStudent = null;
  selectedCategoryIds.clear();
  updateSelectedCounter();
  document.getElementById('studentCard').classList.remove('active');
  document.getElementById('sportsContainer').innerHTML = `
    <div style="text-align: center; padding: 24px; color: var(--text-light);">
      กรุณากรอกและตรวจสอบรหัสประจำตัวนักเรียนก่อนเพื่อแสดงรายการกีฬาที่สามารถสมัครได้
    </div>
  `;
}

// 3. แสดงเฉพาะรายการกีฬาที่นักเรียนมีสิทธิ์สมัคร (คัดกรองตาม ม.ต้น/ม.ปลาย และ เพศ)
function renderEligibleSports(student, existingRegs = []) {
  const container = document.getElementById('sportsContainer');
  container.innerHTML = '';
  selectedCategoryIds.clear();
  updateSelectedCounter();

  const isJunior = student.level === 'junior';
  let eligibleCount = 0;

  allSportsData.forEach(sport => {
    sport.categories.forEach(cat => {
      // ตรวจสอบระดับชั้น
      if (cat.level === 'junior' && !isJunior) return;
      if (cat.level === 'senior' && isJunior) return;

      // ตรวจสอบเพศ
      if (cat.gender === 'ชาย' && student.gender !== 'ชาย') return;
      if (cat.gender === 'หญิง' && student.gender !== 'หญิง') return;

      eligibleCount++;

      // ตรวจสอบว่าเคยสมัครไว้แล้วหรือไม่
      const isAlreadyRegistered = existingRegs.some(r => r.categoryId === cat.id || (r.sportName === sport.name && r.categoryTitle === cat.name));
      const isFull = cat.isFull;
      const isClosed = cat.isOpen === false;
      const isDisabled = isAlreadyRegistered || isFull || isClosed;

      let badgeHtml = '';
      if (isAlreadyRegistered) {
        badgeHtml = `<span class="quota-pill quota-closed">สมัครแล้ว ✓</span>`;
      } else if (isClosed) {
        badgeHtml = `<span class="quota-pill quota-closed">ปิดรับสมัคร</span>`;
      } else if (isFull) {
        badgeHtml = `<span class="quota-pill quota-full">เต็มแล้ว (${cat.currentCount}/${cat.maxQuota})</span>`;
      } else {
        badgeHtml = `<span class="quota-pill quota-available">ว่าง ${cat.availableSeats} ที่ (${cat.currentCount}/${cat.maxQuota})</span>`;
      }

      const card = document.createElement('div');
      card.className = `sport-category-card ${isDisabled ? 'disabled' : ''}`;
      card.id = `cat_card_${cat.id}`;

      card.innerHTML = `
        <div class="card-left">
          <input 
            type="checkbox" 
            class="sport-checkbox" 
            id="chk_${cat.id}" 
            value="${cat.id}"
            ${isDisabled ? 'disabled' : ''}
          >
          <div class="sport-details">
            <h4>${sport.icon} ${sport.name}</h4>
            <p>${cat.name} • ${cat.gender === 'all' ? 'ชาย/หญิง' : cat.gender}</p>
          </div>
        </div>
        <div class="card-right">
          ${badgeHtml}
        </div>
      `;

      if (!isDisabled) {
        card.addEventListener('click', (e) => {
          if (e.target.type !== 'checkbox') {
            const chk = document.getElementById(`chk_${cat.id}`);
            chk.checked = !chk.checked;
            toggleCategory(cat.id, chk.checked);
          }
        });

        const chk = card.querySelector('.sport-checkbox');
        chk.addEventListener('change', (e) => {
          toggleCategory(cat.id, e.target.checked);
        });
      }

      container.appendChild(card);
    });
  });

  if (eligibleCount === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#888;">ไม่พบรายการกีฬาที่เปิดรับสำหรับระดับชั้นและเพศของท่าน</div>`;
  }
}

// 4. จัดการการเลือกชนิดกีฬา (จำกัดไม่เกิน 2 กีฬา)
function toggleCategory(catId, isChecked) {
  if (isChecked) {
    if (selectedCategoryIds.size >= 2) {
      alert('ท่านสามารถเลือกสมัครได้สูงสุดไม่เกิน 1 ชนิดกีฬา');
      document.getElementById(`chk_${catId}`).checked = false;
      return;
    }
    selectedCategoryIds.add(catId);
    document.getElementById(`cat_card_${catId}`).classList.add('selected');
  } else {
    selectedCategoryIds.delete(catId);
    document.getElementById(`cat_card_${catId}`).classList.remove('selected');
  }
  updateSelectedCounter();
}

function updateSelectedCounter() {
  const counter = document.getElementById('selectedCount');
  if (counter) {
    counter.innerText = selectedCategoryIds.size;
  }
}

// 5. ส่งฟอร์มการสมัคร
async function handleRegisterSubmit() {
  if (!currentVerifiedStudent) {
    alert('กรุณากรอกและตรวจสอบรหัสประจำตัวนักเรียนก่อน');
    return;
  }

  const phone = document.getElementById('phoneInput').value.trim();
  if (!phone) {
    alert('กรุณากรอกเบอร์โทรศัพท์สำหรับติดต่อ');
    return;
  }

  if (selectedCategoryIds.size === 0) {
    alert('กรุณาเลือกชนิดกีฬาที่ต้องการสมัครอย่างน้อย 1 ชนิด');
    return;
  }

  const note = document.getElementById('noteInput').value.trim();
  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.innerText = 'กำลังบันทึกข้อมูล...';

  const webhookUrl = window.ORANGE_CONFIG?.googleSheetWebhookUrl || localStorage.getItem('orange_sheet_webhook') || "";

  try {
    const payload = {
      studentId: currentVerifiedStudent.id,
      phone: phone,
      note: note,
      selectedCategories: Array.from(selectedCategoryIds),
      googleSheetUrl: webhookUrl
    };

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!json.success) {
      alert(json.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
      return;
    }

    // Show confirmation modal
    showSuccessModal(json);

  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    btn.disabled = false;
    btn.innerText = '✨ ยืนยันการสมัครนักกีฬา';
  }
}

function showSuccessModal(response) {
  const student = response.student;
  const registered = response.registered || [];

  const sportsListHtml = registered.map(r => `
    <li style="margin-bottom: 4px; font-weight: 700; color: #e65100;">
      ${r.sportName} — <span style="color: #333; font-weight: 500;">${r.categoryTitle}</span>
    </li>
  `).join('');

  document.getElementById('modalSummaryContent').innerHTML = `
    <p><strong>ชื่อผู้สมัคร:</strong> ${student.name}</p>
    <p><strong>ระดับชั้น:</strong> ${student.roomFull} (เลขที่ ${student.classNo})</p>
    <p><strong>รหัสประจำตัว:</strong> ${student.id}</p>
    <p><strong>เบอร์โทรศัพท์:</strong> ${registered[0]?.phone || '-'}</p>
    <div style="margin-top: 10px; border-top: 1px dashed #ffd54f; padding-top: 8px;">
      <strong>ชนิดกีฬาที่สมัครสำเร็จ (${registered.length} รายการ):</strong>
      <ul style="margin: 6px 0 0 18px; text-align: left;">
        ${sportsListHtml}
      </ul>
    </div>
  `;

  document.getElementById('successModal').classList.add('active');
}

function closeModalAndReset() {
  document.getElementById('successModal').classList.remove('active');
  document.getElementById('regForm').reset();
  hideStudentCard();
  loadSportsData();
}
