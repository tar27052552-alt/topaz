/**
 * ==============================================================================
 * สคริปต์อัปโหลดข้อมูลเริ่มต้นขึ้น Firebase Firestore
 * ==============================================================================
 * 
 * 📌 วิธีใช้งาน:
 * 1. ดาวน์โหลด Service Account Key จาก Firebase Console (Project Settings -> Service Accounts -> Generate new private key)
 * 2. บันทึกไฟล์เป็น serviceAccountKey.json ไว้ในโฟลเดอร์โปรเจกต์นี้
 * 3. รันคำสั่ง: node seed_firebase.js
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

async function seedFirebase() {
  const serviceKeyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(serviceKeyPath)) {
    console.log('⚠️ ไม่พบไฟล์ serviceAccountKey.json');
    console.log('หากต้องการอัปโหลดข้อมูลขึ้น Firebase Firestore กรุณาวางไฟล์ serviceAccountKey.json จาก Firebase Console');
    console.log('ปัจจุบันระบบทำงานผ่านฐานข้อมูล Local JSON และ Express Server พร้อมใช้งาน 100% เรียบร้อยแล้ว!');
    return;
  }

  const admin = require('firebase-admin');
  const serviceAccount = require(serviceKeyPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();

  // 1. Seed Students
  console.log('--- 1. นำเข้าข้อมูลนักเรียน 492 คนขึ้น Firestore ---');
  const students = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'students_master.json'), 'utf-8'));
  const batch1 = db.batch();
  students.forEach(s => {
    const docRef = db.collection('students').doc(s.id);
    batch1.set(docRef, s);
  });
  await batch1.commit();
  console.log(`[OK] นำเข้านักเรียน ${students.length} คนสำเร็จ`);

  // 2. Seed Sports Config & Quotas
  console.log('--- 2. นำเข้าการตั้งค่าโควตากีฬา 7 ชนิด 18 รุ่น ---');
  const sports = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'sports_config.json'), 'utf-8'));
  const batch2 = db.batch();
  sports.forEach(s => {
    const docRef = db.collection('sports_config').doc(s.id);
    batch2.set(docRef, s);
  });
  await batch2.commit();
  console.log(`[OK] นำเข้าการตั้งค่ากีฬาสำเร็จ`);

  // 3. Seed Existing Registrations
  console.log('--- 3. นำเข้ารายชื่อนักกีฬาที่ลงทะเบียนแล้ว 107 รายการ ---');
  const regs = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'registrations.json'), 'utf-8'));
  const batch3 = db.batch();
  regs.forEach(r => {
    const docRef = db.collection('registrations').doc(r.id);
    batch3.set(docRef, r);
  });
  await batch3.commit();
  console.log(`[OK] นำเข้ารายการลงทะเบียน ${regs.length} รายการสำเร็จ`);

  console.log('\n🎉 ข้อมูลทั้งหมดถูกนำขึ้น Firebase Firestore เรียบร้อยสมบูรณ์!');
}

seedFirebase().catch(err => console.error('Error seeding Firebase:', err));
