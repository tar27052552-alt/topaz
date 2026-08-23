/**
 * Admin Control Panel Logic
 * คณะสีแสด (สีบุษราคัม) ปี 2569
 */

document.addEventListener('DOMContentLoaded', () => {
  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec";

  // Initialize Firebase Firestore if configured
  let db = null;
  if (typeof firebase !== 'undefined' && window.ORANGE_CONFIG && window.ORANGE_CONFIG.isFirebaseConfigured) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.ORANGE_CONFIG.firebaseConfig);
      }
      db = firebase.firestore();
    } catch (e) {
      console.warn('Firebase init error in admin:', e);
    }
  }

  // State
  let authToken = sessionStorage.getItem('admin_token') || null;
  let currentSettings = null;
  let currentGradeFilter = '';
  let studentSearchTimeout = null;

  // DOM Elements - Auth
  const authOverlay = document.getElementById('authOverlay');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const btnLogout = document.getElementById('btnLogout');

  // DOM Elements - Stats
  const statSystemStatus = document.getElementById('statSystemStatus');
  const statTotalStudents = document.getElementById('statTotalStudents');
  const statOnlineRegs = document.getElementById('statOnlineRegs');
  const statUniqueRegs = document.getElementById('statUniqueRegs');

  // DOM Elements - Tabs
  const tabButtons = document.querySelectorAll('.admin-tab-btn');
  const tabContents = {
    students: document.getElementById('tab-students'),
    pdf: document.getElementById('tab-pdf'),
    control: document.getElementById('tab-control'),
    registrations: document.getElementById('tab-registrations'),
    analytics: document.getElementById('tab-analytics')
  };

  // Toast
  const toast = document.getElementById('toast');

  function showToast(message, type = 'info') {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3500);
  }

  function checkAuth() {
    if (authToken) {
      if (authOverlay) authOverlay.classList.add('hidden');
      initDashboard();
    } else {
      if (authOverlay) authOverlay.classList.remove('hidden');
      if (adminPasswordInput) adminPasswordInput.focus();
    }
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwd = adminPasswordInput.value.trim();
      if (!pwd) return;

      // Allow 'topaz69' or 'toapz69'
      if (pwd === 'topaz69' || pwd === 'toapz69') {
        authToken = 'adm_topaz69_' + Date.now();
        sessionStorage.setItem('admin_token', authToken);
        if (authOverlay) authOverlay.classList.add('hidden');
        showToast('เข้าสู่ระบบแอดมินสำเร็จ! 🎉', 'success');
        initDashboard();
      } else {
        showToast('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง (กรุณากรอก: topaz69)', 'error');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      authToken = null;
      sessionStorage.removeItem('admin_token');
      if (authOverlay) authOverlay.classList.remove('hidden');
      if (adminPasswordInput) adminPasswordInput.value = '';
      showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    });
  }

  // Tabs Switcher
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');

      Object.keys(tabContents).forEach(key => {
        if (tabContents[key]) {
          if (key === targetTab) {
            tabContents[key].classList.remove('hidden');
          } else {
            tabContents[key].classList.add('hidden');
          }
        }
      });

      if (targetTab === 'students') loadStudents();
      if (targetTab === 'control') loadSettings();
      if (targetTab === 'registrations') loadRegistrations();
      if (targetTab === 'analytics') loadAnalytics();
    });
  });

  async function initDashboard() {
    loadStats();
    loadStudents();
    loadSettings();
  }

  async function loadStats() {
    try {
      const [sRes, rRes] = await Promise.all([
        fetch('data/students_master.json'),
        fetch('data/registrations.json')
      ]);
      const sData = await sRes.json();
      const rData = await rRes.json();
      if (statSystemStatus) statSystemStatus.innerHTML = '<span style="color: #16a34a;">🟢 เปิดรับสมัคร</span>';
      if (statTotalStudents) statTotalStudents.textContent = sData.length || 492;
      if (statOnlineRegs) statOnlineRegs.textContent = rData.length || 0;
      if (statUniqueRegs) statUniqueRegs.textContent = new Set(rData.map(r => r.studentId)).size || 0;
    } catch (e) {
      if (statSystemStatus) statSystemStatus.innerHTML = '<span style="color: #16a34a;">🟢 เปิดรับสมัคร</span>';
      if (statTotalStudents) statTotalStudents.textContent = '492';
    }
  }

  // DOM Elements - Students Tab
  const gradeFilterContainer = document.getElementById('gradeFilterContainer');
  const studentSearchQuery = document.getElementById('studentSearchQuery');
  const filterDepartment = document.getElementById('filterDepartment');
  const filterGender = document.getElementById('filterGender');
  const filterRegStatus = document.getElementById('filterRegStatus');
  const studentFilterCount = document.getElementById('studentFilterCount');
  const btnQuickExportCSV = document.getElementById('btnQuickExportCSV');
  const btnRefreshStudents = document.getElementById('btnRefreshStudents');
  const studentsTableBody = document.getElementById('studentsTableBody');

  let cachedAllStudents = [];
  let cachedAllRegistrations = [];
  let firestoreUnsubscribe = null;

  // =========================================================================
  // 4. Students Tab: Search & Advanced Filtering
  // =========================================================================
  function setupFilters() {
    if (gradeFilterContainer) {
      gradeFilterContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('grade-pill')) {
          document.querySelectorAll('.grade-pill').forEach(p => p.classList.remove('active'));
          e.target.classList.add('active');
          currentGradeFilter = e.target.getAttribute('data-grade');
          applyStudentFilters();
        }
      });
    }

    if (studentSearchQuery) {
      studentSearchQuery.addEventListener('input', () => {
        clearTimeout(studentSearchTimeout);
        studentSearchTimeout = setTimeout(applyStudentFilters, 250);
      });
    }

    if (filterDepartment) filterDepartment.addEventListener('change', applyStudentFilters);
    if (filterGender) filterGender.addEventListener('change', applyStudentFilters);
    if (filterRegStatus) filterRegStatus.addEventListener('change', applyStudentFilters);
    if (btnRefreshStudents) btnRefreshStudents.addEventListener('click', loadStudents);

    if (btnQuickExportCSV) {
      btnQuickExportCSV.addEventListener('click', () => {
        exportTableToCSV('topaz_students_filtered.csv');
      });
    }
  }

  setupFilters();

  async function loadStudents() {
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 28px; color: #64748b;">
          <i class="fa-solid fa-spinner fa-spin text-orange" style="font-size: 1.4rem; margin-bottom: 8px; display: block;"></i>
          กำลังดึงข้อมูลนักเรียนล่าสุด (Real-time Cloud Sync)...
        </td>
      </tr>
    `;

    try {
      // 1. Fetch Master & Regs base
      const [sRes, rRes] = await Promise.all([
        fetch('data/students_master.json'),
        fetch('data/registrations.json')
      ]);
      cachedAllStudents = await sRes.json();
      cachedAllRegistrations = await rRes.json();

      // 2. ⚡ Live Firestore Real-Time Listener (if connected)
      if (db) {
        try {
          if (firestoreUnsubscribe) firestoreUnsubscribe();
          
          firestoreUnsubscribe = db.collection('students').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
              const data = change.doc.data();
              const id = change.doc.id;
              const idx = cachedAllStudents.findIndex(s => s.id === id);
              if (idx !== -1) {
                cachedAllStudents[idx] = { ...cachedAllStudents[idx], ...data };
              } else if (change.type === 'added') {
                cachedAllStudents.push({ id, ...data });
              }
            });
            applyStudentFilters();
            loadStats();
          }, fErr => {
            console.warn('Firestore snapshot warning:', fErr);
          });
        } catch (e) {
          console.warn('Firestore realtime init error:', e);
        }
      }

      applyStudentFilters();
    } catch (err) {
      studentsTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #ef4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
  }

  function applyStudentFilters() {
    const q = (studentSearchQuery ? studentSearchQuery.value.trim().toLowerCase() : '');
    const deptFilter = (filterDepartment ? filterDepartment.value : '');
    const genderFilter = (filterGender ? filterGender.value : '');
    const regStatusFilter = (filterRegStatus ? filterRegStatus.value : '');

    let filtered = cachedAllStudents.filter(s => {
      // 1. Grade
      if (currentGradeFilter && String(s.grade) !== String(currentGradeFilter)) return false;

      // 2. Gender
      if (genderFilter && s.gender !== genderFilter) return false;

      // 3. Department / Duty
      const duty = (s.duty || '').trim();
      if (deptFilter === 'none') {
        if (duty && duty !== '-') return false;
      } else if (deptFilter === 'has_duty') {
        if (!duty || duty === '-') return false;
      } else if (deptFilter) {
        if (!duty.includes(deptFilter)) return false;
      }

      // 4. Online Reg Status
      const hasReg = cachedAllRegistrations.some(r => r.studentId === s.id);
      if (regStatusFilter === 'registered' && !hasReg) return false;
      if (regStatusFilter === 'not_registered' && hasReg) return false;

      // 5. Query Search (ID, Name, Room, Duty, Phone)
      if (q) {
        const text = `${s.id} ${s.name} ${s.roomFull || ''} ${s.duty || ''} ${s.phone || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });

    if (studentFilterCount) {
      studentFilterCount.textContent = filtered.length;
    }

    renderStudentsTable(filtered);
  }

  function renderStudentsTable(students) {
    if (!students || students.length === 0) {
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 36px; color: #94a3b8;">
            <i class="fa-solid fa-folder-open" style="font-size: 1.8rem; margin-bottom: 8px; display: block; color: #cbd5e1;"></i>
            ไม่พบรายชื่อนักเรียนที่ตรงกับเงื่อนไขการค้นหา
          </td>
        </tr>
      `;
      return;
    }

    studentsTableBody.innerHTML = students.map(st => {
      const duties = st.duty ? st.duty.split(',').map(d => d.trim()).filter(Boolean) : [];
      let dutyBadges = '<span style="color: #94a3b8;">- (ว่าง)</span>';
      if (duties.length > 0 && duties[0] !== '-') {
        dutyBadges = duties.map(d => {
          let bg = '#ea580c';
          if (d.includes('สแตน')) bg = '#ea580c';
          else if (d.includes('หลีด') || d.includes('ลีด')) bg = '#ec4899';
          else if (d.includes('ดรัม') || d.includes('คัลเลอร์')) bg = '#8b5cf6';
          else if (d.includes('ขบวน')) bg = '#3b82f6';
          else if (d.includes('สวัสดิ')) bg = '#10b981';
          else if (d.includes('สตาฟ') || d.includes('ประธาน')) bg = '#f59e0b';
          else bg = '#ef4444';
          return `<span class="badge" style="background: ${bg}; color: white; padding: 3px 8px; border-radius: 6px; font-size: 0.78rem; margin: 2px;">${d}</span>`;
        }).join(' ');
      }

      const hasOnlineReg = cachedAllRegistrations.some(r => r.studentId === st.id);
      const regStatus = hasOnlineReg 
        ? `<span style="color: #16a34a; font-weight: 600; font-size: 0.84rem;"><i class="fa-solid fa-circle-check"></i> สมัครแล้ว</span>` 
        : `<span style="color: #94a3b8; font-size: 0.84rem;">-</span>`;

      const safePhone = st.phone && st.phone !== '-' ? `<a href="tel:${st.phone}" style="color: #0284c7; text-decoration: none;"><i class="fa-solid fa-phone"></i> ${st.phone}</a>` : '<span style="color: #cbd5e1;">-</span>';

      return `
        <tr>
          <td><strong style="color: #ea580c; font-family: monospace; font-size: 1rem;">${st.id}</strong></td>
          <td><span class="badge badge-dark">${st.roomFull || `ม.${st.grade}/${st.room}`}</span></td>
          <td>${st.classNo || '-'}</td>
          <td><strong>${st.name}</strong></td>
          <td>${st.gender === 'ชาย' ? '👨 ชาย' : '👩 หญิง'}</td>
          <td>${dutyBadges}</td>
          <td>${safePhone}</td>
          <td>${regStatus}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn btn-secondary btn-xs btn-edit-student" data-id="${st.id}" title="แก้ไขหน้าที่และเบอร์โทร">
                <i class="fa-solid fa-pen-to-square text-orange"></i> แก้ไข
              </button>
              <button type="button" class="btn btn-danger btn-xs btn-unlock-student" data-id="${st.id}" data-name="${st.name}" title="ปลดล็อค/ล้างหน้าที่">
                <i class="fa-solid fa-unlock"></i> ปลดล็อค
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach Edit button events
    document.querySelectorAll('.btn-edit-student').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEditModal(id);
      });
    });

    // Attach Direct Unlock button events
    document.querySelectorAll('.btn-unlock-student').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (!confirm(`ต้องการ "ปลดล็อค & ล้างหน้าที่" ของ [${id}] ${name} หรือไม่?`)) return;

        showToast(`กำลังปลดล็อค [${id}] ${name}...`, 'info');

        // 1. Clear Firestore
        if (db) {
          try {
            await db.collection('students').doc(id).set({
              duty: '',
              phone: '',
              note: '',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e) {}
        }

        // 2. Clear Google Sheet Webhook
        try {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
              studentId: id,
              name: name,
              roleName: '',
              categoryTitle: '',
              phone: '',
              note: '',
              overwrite: true
            })
          });
        } catch (e) {}

        // 3. Update local cache
        const std = cachedAllStudents.find(s => s.id === id);
        if (std) {
          std.duty = '';
          std.phone = '';
          std.note = '';
        }
        cachedAllRegistrations = cachedAllRegistrations.filter(r => r.studentId !== id);

        applyStudentFilters();
        loadStats();
        showToast(`ปลดล็อค [${id}] ${name} เรียบร้อยแล้ว! ✅`, 'success');
      });
    });
  }

  // Export Filtered Table to CSV Function
  function exportTableToCSV(filename) {
    const q = (studentSearchQuery ? studentSearchQuery.value.trim().toLowerCase() : '');
    const deptFilter = (filterDepartment ? filterDepartment.value : '');
    const genderFilter = (filterGender ? filterGender.value : '');
    const regStatusFilter = (filterRegStatus ? filterRegStatus.value : '');

    let filtered = cachedAllStudents.filter(s => {
      if (currentGradeFilter && String(s.grade) !== String(currentGradeFilter)) return false;
      if (genderFilter && s.gender !== genderFilter) return false;
      const duty = (s.duty || '').trim();
      if (deptFilter === 'none') {
        if (duty && duty !== '-') return false;
      } else if (deptFilter === 'has_duty') {
        if (!duty || duty === '-') return false;
      } else if (deptFilter) {
        if (!duty.includes(deptFilter)) return false;
      }
      const hasReg = cachedAllRegistrations.some(r => r.studentId === s.id);
      if (regStatusFilter === 'registered' && !hasReg) return false;
      if (regStatusFilter === 'not_registered' && hasReg) return false;
      if (q) {
        const text = `${s.id} ${s.name} ${s.roomFull || ''} ${s.duty || ''} ${s.phone || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += 'รหัสนักเรียน,ระดับชั้น,เลขที่,ชื่อ-นามสกุล,เพศ,หน้าที่,เบอร์โทรศัพท์\n';

    filtered.forEach(s => {
      const cleanDuty = (s.duty || '-').replace(/"/g, '""');
      const cleanName = (s.name || '').replace(/"/g, '""');
      csvContent += `"${s.id}","${s.roomFull || ''}","${s.classNo || ''}","${cleanName}","${s.gender || ''}","${cleanDuty}","${s.phone || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function renderStudentsTable(students) {
    if (!students || students.length === 0) {
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 30px; color: #94a3b8;">
            <i class="fa-solid fa-folder-open" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
            ไม่พบรายชื่อนักเรียนที่ตรงกับเงื่อนไขค้นหา
          </td>
        </tr>
      `;
      return;
    }

    studentsTableBody.innerHTML = students.map(st => {
      const duties = st.duty ? st.duty.split(',').map(d => d.trim()).filter(Boolean) : [];
      let dutyBadges = '-';
      if (duties.length > 0) {
        dutyBadges = duties.map(d => `<span class="badge ${d.includes('สตาฟ') || d.includes('หัวหน้า') ? 'badge-dark' : 'badge-orange'}" style="margin: 2px;">${d}</span>`).join(' ');
      }

      const hasOnlineReg = st.registrations && st.registrations.length > 0;
      const regStatus = hasOnlineReg 
        ? `<span style="color: #4ade80; font-size: 0.85rem;"><i class="fa-solid fa-circle-check"></i> สมัครแล้ว (${st.registrations.length})</span>` 
        : `<span style="color: #64748b; font-size: 0.85rem;">ยังไม่สมัคร</span>`;

      const safePhone = st.phone || '-';

      return `
        <tr>
          <td><strong style="color: #fed7aa;">${st.id}</strong></td>
          <td>${st.roomFull || `ม.${st.grade}/${st.room || '-'}`}</td>
          <td>${st.classNo || '-'}</td>
          <td><strong>${st.name}</strong></td>
          <td>${st.gender}</td>
          <td>${dutyBadges}</td>
          <td>${safePhone}</td>
          <td>${regStatus}</td>
          <td>
            <button type="button" class="btn btn-orange btn-xs btn-edit-student" data-id="${st.id}" data-name="${st.name}" data-meta="${st.roomFull || `ม.${st.grade}`} เลขที่ ${st.classNo || '-'} (${st.gender})" data-duty="${st.duty || ''}" data-phone="${st.phone || ''}" data-note="${st.note || ''}">
              <i class="fa-solid fa-pen-to-square"></i> แก้ไข
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click event for edit buttons
    document.querySelectorAll('.btn-edit-student').forEach(btn => {
      btn.addEventListener('click', () => {
        openEditModal({
          id: btn.getAttribute('data-id'),
          name: btn.getAttribute('data-name'),
          meta: btn.getAttribute('data-meta'),
          duty: btn.getAttribute('data-duty'),
          phone: btn.getAttribute('data-phone'),
          note: btn.getAttribute('data-note')
        });
      });
    });
  }

  // =========================================================================
  // 5. Edit Student Modal & Duty Assignment (Multi-Select Checkboxes)
  // =========================================================================
  const activeDutiesContainer = document.getElementById('activeDutiesContainer');
  const btnClearAllDuties = document.getElementById('btnClearAllDuties');
  const dutyCheckboxes = document.querySelectorAll('.duty-checkbox');

  function renderActiveDuties(duties) {
    if (!activeDutiesContainer) return;
    if (duties.length === 0) {
      activeDutiesContainer.innerHTML = '<span style="color: #a8a29e; font-size: 0.85rem; font-style: italic;">ยังไม่มีหน้าที่ (เลือกติ๊กจากรายการด้านล่าง)</span>';
      editDutyInput.value = '';
      return;
    }

    activeDutiesContainer.innerHTML = duties.map(d => `
      <span class="active-duty-pill">
        <span>${d}</span>
        <button type="button" class="btn-remove-duty" data-duty="${d}" title="ลบหน้าที่นี้">&times;</button>
      </span>
    `).join('');

    editDutyInput.value = duties.join(', ');

    // Attach remove listeners
    document.querySelectorAll('.btn-remove-duty').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const toRemove = btn.getAttribute('data-duty');
        const current = getSelectedDuties();
        const updated = current.filter(item => item !== toRemove);
        syncCheckboxesFromDuties(updated);
        renderActiveDuties(updated);
      });
    });
  }

  function getSelectedDuties() {
    const raw = editDutyInput.value.trim();
    if (!raw || raw === '-') return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  function syncCheckboxesFromDuties(duties) {
    dutyCheckboxes.forEach(cb => {
      const val = cb.value;
      const isChecked = duties.some(d => d.includes(val) || val.includes(d));
      cb.checked = isChecked;
      if (isChecked) {
        cb.closest('.duty-checkbox-card').classList.add('checked');
      } else {
        cb.closest('.duty-checkbox-card').classList.remove('checked');
      }
    });
  }

  // Checkbox change listener
  dutyCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const val = cb.value;
      let current = getSelectedDuties();
      if (cb.checked) {
        if (!current.includes(val)) current.push(val);
      } else {
        current = current.filter(item => item !== val);
      }
      syncCheckboxesFromDuties(current);
      renderActiveDuties(current);
    });
  });

  // Clear all button
  if (btnClearAllDuties) {
    btnClearAllDuties.addEventListener('click', () => {
      syncCheckboxesFromDuties([]);
      renderActiveDuties([]);
      showToast('ล้างหน้าที่ทั้งหมดแล้ว', 'info');
    });
  }

  function openEditModal(data) {
    editStudentId.value = data.id;
    editModalStudentName.textContent = `${data.name} (รหัส ${data.id})`;
    editModalStudentMeta.textContent = data.meta;
    editDutyInput.value = data.duty && data.duty !== '-' ? data.duty : '';
    editPhoneInput.value = data.phone && data.phone !== '-' ? data.phone : '';
    editNoteInput.value = data.note;
    editResetRegCheckbox.checked = false;

    const initialDuties = getSelectedDuties();
    syncCheckboxesFromDuties(initialDuties);
    renderActiveDuties(initialDuties);

    editStudentModal.classList.remove('hidden');
  }

  function closeEditModal() {
    editStudentModal.classList.add('hidden');
  }

  closeEditModalBtn.addEventListener('click', closeEditModal);
  btnCancelEdit.addEventListener('click', closeEditModal);

  // Auto format phone in modal
  editPhoneInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/[^\d]/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    if (val.length > 6) {
      val = `${val.substring(0, 3)}-${val.substring(3, 6)}-${val.substring(6)}`;
    } else if (val.length > 3) {
      val = `${val.substring(0, 3)}-${val.substring(3)}`;
    }
    e.target.value = val;
  });

  editStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = editStudentId.value;
    const duty = editDutyInput.value.trim();
    const phone = editPhoneInput.value.trim();
    const note = editNoteInput.value.trim();
    const resetRegistration = editResetRegCheckbox.checked;

    btnSaveStudentEdit.disabled = true;
    btnSaveStudentEdit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก & ซิงค์...';

    // 1. Dual-Write to Firebase Cloud Firestore
    if (db) {
      try {
        await db.collection('students').doc(studentId).set({
          duty: duty,
          phone: phone,
          note: note,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fErr) {
        console.warn('Firestore update warning:', fErr);
      }
    }

    // 2. Direct Sync to Google Sheet Webhook
    let sheetSynced = false;
    try {
      const payload = {
        timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
        studentId: studentId,
        duty: duty,
        roleName: duty,
        categoryTitle: duty,
        phone: phone,
        note: note,
        overwrite: true
      };

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      sheetSynced = true;
    } catch (sErr) {
      console.warn('Google Sheet Webhook sync warning:', sErr);
    }

    // Update local cache
    if (typeof cachedAllStudents !== 'undefined' && Array.isArray(cachedAllStudents)) {
      const target = cachedAllStudents.find(s => s.id === studentId);
      if (target) {
        target.duty = duty;
        target.phone = phone;
        target.note = note;
      }
    }

    showToast(`บันทึกข้อมูลสำเร็จ! ${sheetSynced ? ' (ซิงค์ Google Sheets แล้ว ✅)' : ''}`, 'success');
    closeEditModal();
    applyStudentFilters();
    loadStats();

    btnSaveStudentEdit.disabled = false;
    btnSaveStudentEdit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึก & ซิงค์ Google Sheet';
  });

  // =========================================================================
  // 6. Settings & Control Tab (Cloud Firestore Sync)
  // =========================================================================
  const DEPARTMENTS = [
    { id: 'stand_cheer', name: 'ฝ่ายสแตนเชียร์' },
    { id: 'parade', name: 'ฝ่ายขบวนพาเหรด' },
    { id: 'props', name: 'ฝ่ายพร็อพ' },
    { id: 'cheerleader', name: 'ฝ่ายเชียร์ลีดเดอร์' },
    { id: 'drum_major', name: 'ฝ่ายดรัมเมเยอร์' },
    { id: 'colorguard', name: 'ฝ่ายคัลเลอร์การ์ด' },
    { id: 'welfare', name: 'ฝ่ายสวัสดิการ' },
    { id: 'staff', name: 'ฝ่ายสตาฟ (ม.5)' },
    { id: 'sports', name: 'ฝ่ายกีฬา' }
  ];

  const SPORTS = [
    { id: 'football', name: 'ฟุตบอล' },
    { id: 'basketball', name: 'บาสเกตบอล' },
    { id: 'volleyball', name: 'วอลเลย์บอล' },
    { id: 'takraw', name: 'เซปักตะกร้อ' },
    { id: 'petanque', name: 'เปตอง' },
    { id: 'athletics', name: 'กรีฑา' },
    { id: 'running16', name: 'วิ่ง 16 ขา' }
  ];

  async function loadSettings() {
    // 1. Try Firebase Firestore
    if (db) {
      try {
        const docSnap = await db.collection('settings').doc('system').get();
        if (docSnap.exists) {
          currentSettings = docSnap.data();
          renderSettings();
          return;
        }
      } catch (e) {
        console.warn('Firestore settings load error:', e);
      }
    }

    // 2. Fallback to localStorage or default
    const saved = localStorage.getItem('topaz_system_settings');
    if (saved) {
      try {
        currentSettings = JSON.parse(saved);
        renderSettings();
        return;
      } catch (e) {}
    }

    currentSettings = {
      isRegistrationOpen: true,
      closeMessage: 'ระบบรับสมัครกิจกรรม คณะสีแสด 2569 ปิดรับสมัครชั่วคราวเพื่อประมวลผลข้อมูล',
      departmentsStatus: {
        sports: true, welfare: true, cheerleader: true, drum_major: true,
        parade_props: true, stand_cheer: true, staff: true
      },
      sportsStatus: {
        football: true, basketball: true, volleyball: true, takraw: true,
        petanque: true, athletics: true, running16: true
      }
    };
    renderSettings();
  }

  function renderSettings() {
    if (!currentSettings) return;

    if (toggleMasterSystem) toggleMasterSystem.checked = currentSettings.isRegistrationOpen !== false;
    if (inputCloseMessage) inputCloseMessage.value = currentSettings.closeMessage || 'ระบบรับสมัครกิจกรรม คณะสีแสด 2569 ปิดรับสมัครชั่วคราวเพื่อประมวลผลข้อมูล';

    const deptStatus = currentSettings.departmentsStatus || {};
    if (deptTogglesContainer) {
      deptTogglesContainer.innerHTML = DEPARTMENTS.map(d => {
        const isOpen = deptStatus[d.id] !== false;
        return `
          <div class="switch-container">
            <div class="switch-label">${d.name}</div>
            <label class="switch">
              <input type="checkbox" class="dept-toggle" data-id="${d.id}" ${isOpen ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        `;
      }).join('');
    }

    const sportStatus = currentSettings.sportsStatus || {};
    if (sportTogglesContainer) {
      sportTogglesContainer.innerHTML = SPORTS.map(s => {
        const isOpen = sportStatus[s.id] !== false;
        return `
          <div class="switch-container">
            <div class="switch-label">กีฬา${s.name}</div>
            <label class="switch">
              <input type="checkbox" class="sport-toggle" data-id="${s.id}" ${isOpen ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        `;
      }).join('');
    }
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      const isRegistrationOpen = toggleMasterSystem ? toggleMasterSystem.checked : true;
      const closeMessage = inputCloseMessage ? inputCloseMessage.value.trim() : '';

      const departmentsStatus = {};
      document.querySelectorAll('.dept-toggle').forEach(t => {
        departmentsStatus[t.getAttribute('data-id')] = t.checked;
      });

      const sportsStatus = {};
      document.querySelectorAll('.sport-toggle').forEach(t => {
        sportsStatus[t.getAttribute('data-id')] = t.checked;
      });

      const settingsData = {
        isRegistrationOpen,
        closeMessage,
        departmentsStatus,
        sportsStatus,
        updatedAt: new Date().toISOString()
      };

      btnSaveSettings.disabled = true;
      btnSaveSettings.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

      // 1. Save to Cloud Firestore
      if (db) {
        try {
          await db.collection('settings').doc('system').set(settingsData, { merge: true });
        } catch (fErr) {
          console.warn('Firestore save settings warning:', fErr);
        }
      }

      // 2. Save to localStorage
      localStorage.setItem('topaz_system_settings', JSON.stringify(settingsData));
      currentSettings = settingsData;

      showToast('บันทึกการตั้งค่าระบบเปิด/ปิดรับสมัครเรียบร้อยแล้ว! ⚙️✅', 'success');
      loadStats();

      btnSaveSettings.disabled = false;
      btnSaveSettings.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกการตั้งค่า';
    });
  }

  if (btnChangePassword) {
    btnChangePassword.addEventListener('click', async () => {
      const newPassword = inputNewAdminPassword ? inputNewAdminPassword.value.trim() : '';
      if (newPassword.length < 4) {
        showToast('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
        return;
      }

      // Save admin password to Firestore & localStorage
      if (db) {
        try {
          await db.collection('settings').doc('auth').set({
            adminPassword: newPassword,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {}
      }
      localStorage.setItem('topaz_admin_pwd', newPassword);

      showToast('เปลี่ยนรหัสผ่านแอดมินสำเร็จ!', 'success');
      if (inputNewAdminPassword) inputNewAdminPassword.value = '';
    });
  }



  // =========================================================================
  // 7. Registrations Explorer Tab
  // =========================================================================
  btnRefreshRegs.addEventListener('click', loadRegistrations);

  async function loadRegistrations() {
    registrationsTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 24px; color: #94a3b8;">
          <i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดรายการสมัคร...
        </td>
      </tr>
    `;

    // 1. Try Node backend API
    try {
      const res = await fetch('/api/admin/students/search');
      const json = await res.json();
      if (json.success) {
        const allRegs = [];
        json.data.forEach(st => {
          if (st.registrations && st.registrations.length > 0) {
            st.registrations.forEach(r => allRegs.push(r));
          }
        });
        renderRegistrationsTable(allRegs);
        return;
      }
    } catch (err) {}

    // 2. Static Fallback (GitHub Pages)
    try {
      const rRes = await fetch('data/registrations.json');
      const rData = await rRes.json();
      renderRegistrationsTable(rData);
    } catch (e) {
      registrationsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #f87171;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
  }

  function renderRegistrationsTable(regs) {
    if (!regs || regs.length === 0) {
      registrationsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">
            ยังไม่มีรายการสมัครผ่านเว็บ
          </td>
        </tr>
      `;
      return;
    }

    registrationsTableBody.innerHTML = regs.map(r => {
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString('th-TH') : '-';
      const itemTitle = r.categoryTitle || r.roleName || r.sportName || '-';

      return `
        <tr>
          <td style="font-size: 0.85rem; color: #64748b;">${dateStr}</td>
          <td><strong style="color: #ea580c;">${r.studentId}</strong></td>
          <td><strong>${r.name}</strong></td>
          <td>${r.roomFull || `ม.${r.grade}`}</td>
          <td><span class="badge badge-orange">${r.departmentName || 'ฝ่ายกิจกรรม'}</span></td>
          <td>${itemTitle}</td>
          <td>${r.phone || '-'}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-xs" style="color: #64748b;" onclick="alert('รหัสประจำตัว: ${r.studentId}\\nชื่อ: ${r.name}\\nกิจกรรม: ${itemTitle}\\nเบอร์: ${r.phone || '-'}')">
              <i class="fa-solid fa-eye"></i> ดูข้อมูล
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // 8. Analytics Tab
  // =========================================================================
  async function loadAnalytics() {
    const container = document.getElementById('analyticsSummaryContainer');
    container.innerHTML = '<div style="color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดสถิติ...</div>';

    let d = null;

    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (json.success) d = json.data;
    } catch (e) {}

    // Static fallback for Analytics
    if (!d) {
      try {
        const [sRes, rRes] = await Promise.all([
          fetch('data/students_master.json'),
          fetch('data/registrations.json')
        ]);
        const sData = await sRes.json();
        const rData = await rRes.json();

        const byDept = {};
        sData.forEach(s => {
          if (s.duty && s.duty !== '-') {
            const duties = s.duty.split(',').map(x => x.trim()).filter(Boolean);
            duties.forEach(duty => {
              byDept[duty] = (byDept[duty] || 0) + 1;
            });
          }
        });

        const masterByGrade = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const masterTotalByGrade = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        sData.forEach(s => {
          masterTotalByGrade[s.grade] = (masterTotalByGrade[s.grade] || 0) + 1;
          if (s.duty && s.duty !== '-') {
            masterByGrade[s.grade] = (masterByGrade[s.grade] || 0) + 1;
          }
        });

        d = {
          byDepartment: byDept,
          masterByGrade: masterByGrade,
          masterTotalByGrade: masterTotalByGrade,
          totalRegistrations: rData.length,
          totalStudentsInColor: sData.length
        };
        let deptCardsHtml = Object.keys(d.byDepartment || {}).map(deptName => {
          const count = d.byDepartment[deptName];
          return `
            <div style="background: #ffffff; padding: 20px; border-radius: 16px; border: 1.5px solid #fed7aa; box-shadow: 0 4px 15px -3px rgba(0,0,0,0.04);">
              <div style="font-weight: 600; color: #1e293b; margin-bottom: 6px; font-size: 0.95rem;">${deptName}</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: #ea580c;">${count} <span style="font-size: 0.95rem; color: #64748b; font-weight: normal;">คน</span></div>
            </div>
          `;
        }).join('');

        let gradeCardsHtml = [1, 2, 3, 4, 5, 6].map(g => {
          const assignedCount = (d.masterByGrade && d.masterByGrade[g]) || 0;
          const totalGradeCount = (d.masterTotalByGrade && d.masterTotalByGrade[g]) || 0;
          const noteText = (g === 1) ? '<span style="color: #ea580c; font-weight: 600;">(สแตนเชียร์ 100%)</span>' : (g === 5 ? '<span style="color: #ea580c; font-weight: 600;">(สตาฟ ม.5)</span>' : '');

          return `
            <div style="background: #ffffff; padding: 18px; border-radius: 16px; border: 1.5px solid #e2e8f0; box-shadow: 0 4px 15px -3px rgba(0,0,0,0.04);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 700; color: #0f172a; font-size: 1rem;">ชั้นมัธยมศึกษาปีที่ ${g}</div>
                <div style="font-size: 0.82rem;">${noteText}</div>
              </div>
              <div style="font-size: 1.7rem; font-weight: 700; color: #ea580c;">
                ${assignedCount} <span style="font-size: 0.95rem; color: #64748b; font-weight: 500;">/ ${totalGradeCount} คน</span>
              </div>
              <div style="background: #e2e8f0; border-radius: 6px; height: 6px; margin-top: 8px; overflow: hidden;">
                <div style="background: #ea580c; height: 100%; width: ${Math.min(100, Math.round((assignedCount/totalGradeCount)*100 || 0))}%;"></div>
              </div>
            </div>
          `;
        }).join('');

        container.innerHTML = `
          <div style="grid-column: 1 / -1; margin-bottom: 8px;">
            <h4 style="color: #ea580c; font-family: 'Prompt', sans-serif; font-size: 1.15rem; margin-bottom: 14px;">
              <i class="fa-solid fa-users text-orange"></i> สรุปจำนวนนักเรียนที่มีหน้าที่แยกตามฝ่าย:
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
              ${deptCardsHtml || '<div style="color: #64748b;">ยังไม่มีข้อมูล</div>'}
            </div>
          </div>
          <div style="grid-column: 1 / -1; margin-top: 20px;">
            <h4 style="color: #ea580c; font-family: 'Prompt', sans-serif; font-size: 1.15rem; margin-bottom: 14px;">
              <i class="fa-solid fa-graduation-cap text-orange"></i> ความคืบหน้าการจัดสรรหน้าที่แยกตามระดับชั้น (ม.1 - ม.6):
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
                ${gradeCardsHtml}
            </div>
          </div>
        `;
      } catch (err) {
        container.innerHTML = '<div style="color: #ef4444;">เกิดข้อผิดพลาดในการโหลดสถิติ</div>';
      }
    }
  }

  // =========================================================================
  // 9. PDF Generation & Print Engine (Client-Side matching Official Folder Format)
  // =========================================================================
  const pdfSelectDept = document.getElementById('pdfSelectDept');
  const pdfSelectSport = document.getElementById('pdfSelectSport');
  const pdfSelectGrade = document.getElementById('pdfSelectGrade');

  document.querySelectorAll('.btn-generate-pdf').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      generateOfficialPDF(type);
    });
  });

  function generateOfficialPDF(type) {
    if (!cachedAllStudents || cachedAllStudents.length === 0) {
      showToast('กำลังเตรียมข้อมูลนักเรียน กรุณารอสักครู่...', 'info');
      return;
    }

    let title = '';
    let subtitle = '';
    let studentsToPrint = [];
    const isMaster = (type === 'master');

    if (isMaster) {
      title = 'ทำเนียบรายชื่อนักเรียน';
      subtitle = 'คณะสีแสด (สีบุษราคัม) ประจำปีการศึกษา 2569';
      studentsToPrint = [...cachedAllStudents];
    } else if (type === 'dept') {
      const dept = pdfSelectDept.value;
      title = `รายชื่อฝ่าย${dept} — คณะสีแสด`;
      subtitle = `การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | โรงเรียนสรรพวิทยาคม`;
      studentsToPrint = cachedAllStudents.filter(s => (s.duty || '').includes(dept));
    } else if (type === 'sport') {
      const sport = pdfSelectSport.value;
      title = `รายชื่อนักกีฬา ฝ่าย${sport} — คณะสีแสด`;
      subtitle = `การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | โรงเรียนสรรพวิทยาคม`;
      studentsToPrint = cachedAllStudents.filter(s => (s.duty || '').includes(sport));
    } else if (type === 'grade') {
      const g = pdfSelectGrade.value;
      title = `รายชื่อนักเรียน คณะสีแสด — ระดับชั้นมัธยมศึกษาปีที่ ${g}`;
      subtitle = `การแข่งขันกีฬาสีภายใน ประจำปีการศึกษา 2569 | โรงเรียนสรรพวิทยาคม`;
      studentsToPrint = cachedAllStudents.filter(s => String(s.grade) === String(g));
    } else if (type === 'unassigned') {
      title = 'บัญชีรายชื่อนักเรียนที่ "ยังไม่มีหน้าที่" — คณะสีแสด';
      subtitle = 'สำหรับคณะกรรมการใช้ติดตามตัวมาจัดสรรหน้าที่ ประจำปีการศึกษา 2569';
      studentsToPrint = cachedAllStudents.filter(s => !s.duty || s.duty.trim() === '-' || s.duty.trim() === '');
    }

    // Sort by grade, room, classNo
    studentsToPrint.sort((a, b) => {
      if (a.grade !== b.grade) return (a.grade || 0) - (b.grade || 0);
      if (a.room !== b.room) return (a.room || 0) - (b.room || 0);
      return (parseInt(a.classNo) || 0) - (parseInt(a.classNo) || 0);
    });

    const nowTh = new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const totalStudents = cachedAllStudents.length;
    const maleTotal = cachedAllStudents.filter(s => s.gender === 'ชาย').length;
    const femaleTotal = cachedAllStudents.filter(s => s.gender === 'หญิง').length;
    const assignedTotal = cachedAllStudents.filter(s => s.duty && s.duty.trim() !== '-' && s.duty.trim() !== '').length;

    // Build Grade Breakdown for Cover Page
    const gradeRowsSummaryHtml = [1, 2, 3, 4, 5, 6].map(g => {
      const list = cachedAllStudents.filter(s => s.grade === g);
      const m = list.filter(s => s.gender === 'ชาย').length;
      const f = list.filter(s => s.gender === 'หญิง').length;
      const assigned = list.filter(s => s.duty && s.duty.trim() !== '-' && s.duty.trim() !== '').length;
      return `
        <tr>
          <td style="text-align: left; padding: 6px 12px; font-weight: 500;">มัธยมศึกษาปีที่ ${g}</td>
          <td style="text-align: center; padding: 6px 8px; font-weight: 700;">${list.length}</td>
          <td style="text-align: center; padding: 6px 8px;">${m}</td>
          <td style="text-align: center; padding: 6px 8px;">${f}</td>
          <td style="text-align: center; padding: 6px 8px; font-weight: 700; color: #ea580c;">${assigned}</td>
        </tr>
      `;
    }).join('');

    // Group students by Grade for printing
    let pagesHtml = '';

    if (isMaster) {
      // 🌟 Page 1: EXACT MATCH Cover Summary Page
      pagesHtml += `
        <div class="pdf-page cover-page">
          <!-- Header Banner -->
          <div class="pdf-header-card">
            <div class="pdf-badge-tag"><i class="fa-solid fa-clipboard-list"></i> ทำเนียบรายชื่อนักเรียน</div>
            <h1 class="pdf-main-title">คณะสีแสด (สีบุษราคัม) ประจำปีการศึกษา 2569</h1>
            <div class="pdf-sub-title">โรงเรียนสรรพวิทยาคม ตาก | การแข่งขันกีฬา-กรีฑาสีภายใน</div>
          </div>

          <!-- Stat KPI 4 Boxes Grid -->
          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-num">${totalStudents}</div>
              <div class="pdf-stat-lbl">นักเรียนทั้งหมด (คน)</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-num">${maleTotal}</div>
              <div class="pdf-stat-lbl">นักเรียนชาย (คน)</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-num">${femaleTotal}</div>
              <div class="pdf-stat-lbl">นักเรียนหญิง (คน)</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-num text-orange">${assignedTotal}</div>
              <div class="pdf-stat-lbl">ผู้มีหน้าที่ / นักกีฬา / สตาฟ (คน)</div>
            </div>
          </div>

          <!-- Grade Summary Table -->
          <div class="pdf-section-title">
            📊 สรุปยอดจำนวนนักเรียนแยกตามระดับชั้น
          </div>
          <table class="pdf-summary-table">
            <thead>
              <tr>
                <th style="text-align: left; width: 30%;">ระดับชั้น</th>
                <th style="width: 17%;">จำนวนนักเรียน (คน)</th>
                <th style="width: 17%;">ชาย (คน)</th>
                <th style="width: 17%;">หญิง (คน)</th>
                <th style="width: 19%;">นักกีฬา / สตาฟ / ผู้มีหน้าที่ (คน)</th>
              </tr>
            </thead>
            <tbody>
              ${gradeRowsSummaryHtml}
              <tr class="pdf-summary-total-row">
                <td style="text-align: left; font-weight: 700;">รวมทุกระดับชั้น</td>
                <td style="text-align: center; font-weight: 700;">${totalStudents}</td>
                <td style="text-align: center; font-weight: 700;">${maleTotal}</td>
                <td style="text-align: center; font-weight: 700;">${femaleTotal}</td>
                <td style="text-align: center; font-weight: 700; color: #ea580c;">${assignedTotal}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: right; color: #94a3b8; font-size: 11px;">
            เอกสารสรุปยอดอย่างเป็นทางการ คณะสีแสด 2569 • พิมพ์เมื่อ ${nowTh}
          </div>
        </div>
      `;

      // 🌟 Pages 2+: Grade by Grade List
      [1, 2, 3, 4, 5, 6].forEach(g => {
        const gradeStudents = cachedAllStudents.filter(s => s.grade === g);
        if (gradeStudents.length === 0) return;

        const gMale = gradeStudents.filter(s => s.gender === 'ชาย').length;
        const gFemale = gradeStudents.filter(s => s.gender === 'หญิง').length;
        const gAssigned = gradeStudents.filter(s => s.duty && s.duty.trim() !== '-' && s.duty.trim() !== '').length;

        const rows = gradeStudents.map((s, idx) => `
          <tr>
            <td class="center font-bold">${idx + 1}</td>
            <td class="center font-bold text-orange">${s.roomFull || `ม.${s.grade}/${s.room || '-'}`}</td>
            <td class="center">${s.classNo || '-'}</td>
            <td class="center font-mono">${s.id}</td>
            <td class="left font-bold">${s.name}</td>
            <td class="center">${s.gender || '-'}</td>
            <td class="left text-orange font-bold">${s.duty && s.duty !== '-' ? s.duty : '<span style="color:#cbd5e1; font-weight:normal;">-</span>'}</td>
            <td class="center font-mono">${s.phone && s.phone !== '-' ? s.phone : '-'}</td>
          </tr>
        `).join('');

        pagesHtml += `
          <div class="pdf-page">
            <div class="pdf-grade-header">
              <div>
                <h2 class="pdf-grade-title">รายชื่อนักเรียน คณะสีแสด — ระดับชั้นมัธยมศึกษาปีที่ ${g}</h2>
                <div class="pdf-grade-sub">จำนวนนักเรียน: ${gradeStudents.length} คน | ชาย ${gMale} คน | หญิง ${gFemale} คน | ผู้มีหน้าที่ ${gAssigned} คน</div>
              </div>
              <div class="pdf-grade-badge">ม.${g}</div>
            </div>

            <table class="pdf-roster-table">
              <thead>
                <tr>
                  <th style="width: 5%;">ลำดับ</th>
                  <th style="width: 8%;">ห้อง</th>
                  <th style="width: 6%;">เลขที่</th>
                  <th style="width: 11%;">รหัสประจำตัว</th>
                  <th style="width: 26%; text-align: left; padding-left: 8px;">ชื่อ - นามสกุล</th>
                  <th style="width: 7%;">เพศ</th>
                  <th style="width: 23%; text-align: left; padding-left: 8px;">ฝ่าย / หน้าที่</th>
                  <th style="width: 14%;">เบอร์โทรศัพท์</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        `;
      });

    } else {
      // Non-master (single page or filtered)
      const rows = studentsToPrint.map((s, idx) => `
        <tr>
          <td class="center font-bold">${idx + 1}</td>
          <td class="center font-bold text-orange">${s.roomFull || `ม.${s.grade}/${s.room || '-'}`}</td>
          <td class="center">${s.classNo || '-'}</td>
          <td class="center font-mono">${s.id}</td>
          <td class="left font-bold">${s.name}</td>
          <td class="center">${s.gender || '-'}</td>
          <td class="left text-orange font-bold">${s.duty && s.duty !== '-' ? s.duty : '<span style="color:#cbd5e1; font-weight:normal;">-</span>'}</td>
          <td class="center font-mono">${s.phone && s.phone !== '-' ? s.phone : '-'}</td>
        </tr>
      `).join('');

      pagesHtml += `
        <div class="pdf-page">
          <div class="pdf-grade-header">
            <div>
              <h2 class="pdf-grade-title">${title}</h2>
              <div class="pdf-grade-sub">${subtitle} • จำนวน: ${studentsToPrint.length} คน</div>
            </div>
            <div class="pdf-grade-badge">สีแสด</div>
          </div>

          <table class="pdf-roster-table">
            <thead>
              <tr>
                <th style="width: 5%;">ลำดับ</th>
                <th style="width: 8%;">ห้อง</th>
                <th style="width: 6%;">เลขที่</th>
                <th style="width: 11%;">รหัสประจำตัว</th>
                <th style="width: 26%; text-align: left; padding-left: 8px;">ชื่อ - นามสกุล</th>
                <th style="width: 7%;">เพศ</th>
                <th style="width: 23%; text-align: left; padding-left: 8px;">ฝ่าย / หน้าที่</th>
                <th style="width: 14%;">เบอร์โทรศัพท์</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }

    // 🚀 Direct 1-Click PDF File Download (No Printer Popup / No window.open)
    showToast('⏳ กำลังสร้างไฟล์ PDF โปรดรอสักครู่...', 'info');

    let tempContainer = document.getElementById('tempPdfExportContainer');
    if (!tempContainer) {
      tempContainer = document.createElement('div');
      tempContainer.id = 'tempPdfExportContainer';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-99999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm';
      tempContainer.style.background = '#ffffff';
      document.body.appendChild(tempContainer);
    }

    tempContainer.innerHTML = `
      <style>
        * { box-sizing: border-box; font-family: 'Sarabun', sans-serif; }
        .pdf-page { padding: 8mm 8mm 12mm 8mm; background: #fff; page-break-after: always; width: 210mm; min-height: 297mm; }
        .pdf-page:last-child { page-break-after: avoid; }
        .pdf-header-card { background: #fff3e0; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px; border-left: 6px solid #ea580c; }
        .pdf-badge-tag { display: inline-block; background: #ea580c; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 5px; margin-bottom: 4px; }
        .pdf-main-title { font-family: 'Prompt', sans-serif; font-size: 19px; font-weight: 800; color: #c2410c; margin: 0 0 2px 0; }
        .pdf-sub-title { font-size: 11.5px; color: #78716c; }
        .pdf-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
        .pdf-stat-box { background: #fff; border: 1.5px solid #fed7aa; border-radius: 8px; padding: 10px 8px; text-align: center; }
        .pdf-stat-num { font-family: 'Prompt', sans-serif; font-size: 22px; font-weight: 800; color: #ea580c; line-height: 1; margin-bottom: 3px; }
        .pdf-stat-lbl { font-size: 10.5px; color: #57534e; font-weight: 600; }
        .pdf-section-title { font-family: 'Prompt', sans-serif; font-size: 13.5px; font-weight: 700; color: #292524; margin-bottom: 6px; }
        .pdf-summary-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .pdf-summary-table th { background: #ea580c; color: #ffffff; font-family: 'Prompt', sans-serif; font-size: 10.5px; font-weight: 700; padding: 5px 6px; border: 1px solid #c2410c; }
        .pdf-summary-table td { border: 1px solid #e7e5e4; padding: 4.5px 6px; font-size: 10.5px; }
        .pdf-summary-table tbody tr:nth-child(even) { background: #fafaf9; }
        .pdf-summary-total-row td { background: #ffedd5 !important; border-top: 2px solid #ea580c; }
        .pdf-grade-header { display: flex; justify-content: space-between; align-items: center; background: #fff3e0; padding: 6px 12px; border-radius: 6px; margin-bottom: 6px; border-left: 4px solid #ea580c; }
        .pdf-grade-title { font-family: 'Prompt', sans-serif; font-size: 13px; font-weight: 800; color: #c2410c; margin: 0; }
        .pdf-grade-sub { font-size: 10px; color: #78716c; margin-top: 1px; }
        .pdf-grade-badge { background: #ea580c; color: #fff; font-family: 'Prompt', sans-serif; font-weight: 800; font-size: 13px; padding: 3px 10px; border-radius: 5px; }
        .pdf-roster-table { width: 100%; border-collapse: collapse; }
        .pdf-roster-table th { background: #ea580c; color: #ffffff; font-family: 'Prompt', sans-serif; font-size: 10px; font-weight: 700; padding: 4px 3px; border: 1px solid #c2410c; text-align: center; }
        .pdf-roster-table td { border: 1px solid #e7e5e4; padding: 3px 3px; font-size: 9.5px; vertical-align: middle; }
        .pdf-roster-table tbody tr:nth-child(even) { background: #fafaf9; }
        .center { text-align: center; }
        .left { text-align: left; }
        .font-bold { font-weight: 700; }
        .text-orange { color: #c2410c; }
        .font-mono { font-family: monospace; font-size: 9.5px; }
      </style>
      ${pagesHtml}
    `;

    const opt = {
      margin:       [6, 6, 6, 6],
      filename:     `${title.replace(/[\/\\?%*:|"<>]/g, '_')}_2569.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    if (typeof html2pdf !== 'undefined') {
      html2pdf().set(opt).from(tempContainer).save().then(() => {
        showToast('🎉 บันทึกไฟล์ PDF ลงเครื่องเรียบร้อยแล้ว!', 'success');
        setTimeout(() => {
          tempContainer.innerHTML = '';
        }, 1000);
      }).catch(err => {
        console.error('html2pdf error:', err);
        showToast('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
      });
    } else {
      showToast('กำลังโหลดโมดูล PDF กรุณาลองใหม่อีกครั้ง', 'error');
    }
  }

  // Initial check
  checkAuth();
});
