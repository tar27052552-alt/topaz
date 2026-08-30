const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function syncToCloudFirestore() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ ⚡ กำลังอัปโหลดข้อมูลทั้งหมดขึ้น Firebase Cloud Firestore ให้อัตโนมัติ ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const rootDir = path.resolve(__dirname, '..');
  const masterStudents = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'students_master.json'), 'utf8'));
  const sportsConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'sports_config.json'), 'utf8'));
  const registrations = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'registrations.json'), 'utf8'));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', msg => console.log('  [Firestore Log]:', msg.text()));
  page.on('pageerror', err => console.error('  [Firestore Error]:', err.message));

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js"></script>
      <script src="https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore-compat.js"></script>
    </head>
    <body>
      <h1>Firestore Sync</h1>
    </body>
    </html>
  `;

  await page.setContent(html);

  const result = await page.evaluate(async (students, sports, regs) => {
    const firebaseConfig = {
      apiKey: "AIzaSyBEJrULPmcGyBH1T0H9j4yiiz94VDpS_7k",
      authDomain: "toapz-c6acf.firebaseapp.com",
      projectId: "toapz-c6acf",
      storageBucket: "toapz-c6acf.firebasestorage.app",
      messagingSenderId: "67963668623",
      appId: "1:67963668623:web:5f43320f98f19b8e8548fa",
      measurementId: "G-FZ7Q544FS6"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    console.log('Firebase initialized. Starting Firestore batch write...');

    // 1. Delete old 34317 if exists
    try {
      await db.collection('students').doc('34317').delete();
      console.log('Deleted old student 34317 from Firestore');
    } catch (e) {
      console.log('Delete 34317 notice:', e.message);
    }

    // 2. Upload Students in batches of 400
    console.log('Uploading ' + students.length + ' students...');
    const chunkSize = 400;
    for (let i = 0; i < students.length; i += chunkSize) {
      const chunk = students.slice(i, i + chunkSize);
      const batch = db.batch();
      chunk.forEach(s => {
        const docRef = db.collection('students').doc(String(s.id));
        batch.set(docRef, {
          id: String(s.id),
          name: s.name || '',
          grade: s.grade || 1,
          room: s.room || 1,
          roomFull: s.roomFull || ('ม.' + s.grade + '/' + s.room),
          classNo: s.classNo || '-',
          gender: s.gender || 'ชาย',
          level: s.level || (s.grade >= 4 ? 'senior' : 'junior'),
          duty: s.duty || '',
          phone: s.phone || '',
          note: s.note || ''
        });
      });
      await batch.commit();
      console.log('Committed batch ' + (i + 1) + ' to ' + Math.min(i + chunkSize, students.length));
    }

    // 3. Upload Sports Config
    console.log('Uploading ' + sports.length + ' sports configs...');
    const sportsBatch = db.batch();
    sports.forEach(sp => {
      const docRef = db.collection('sports_config').doc(sp.id);
      sportsBatch.set(docRef, sp);
    });
    await sportsBatch.commit();
    console.log('Committed sports configs successfully');

    // 4. Upload Registrations in batches
    console.log('Uploading ' + regs.length + ' registrations...');
    for (let i = 0; i < regs.length; i += chunkSize) {
      const chunk = regs.slice(i, i + chunkSize);
      const regBatch = db.batch();
      chunk.forEach(r => {
        const docRef = db.collection('registrations').doc(String(r.id));
        regBatch.set(docRef, r);
      });
      await regBatch.commit();
      console.log('Committed registrations batch ' + (i + 1) + ' to ' + Math.min(i + chunkSize, regs.length));
    }

    return {
      success: true,
      studentsCount: students.length,
      sportsCount: sports.length,
      regsCount: regs.length
    };
  }, masterStudents, sportsConfig, registrations);

  await page.close();
  await browser.close();

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ 🎉 อัปโหลดขึ้น Firestore สำเร็จ 100%!                            ║');
  console.log('║ 👥 นักเรียน: ' + result.studentsCount + ' คน | 🏆 กีฬา: ' + result.sportsCount + ' ชนิด | 📝 ลงทะเบียน: ' + result.regsCount + ' คน ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

if (require.main === module) {
  syncToCloudFirestore().catch(console.error);
}

module.exports = { syncToCloudFirestore };
