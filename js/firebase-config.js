/**
 * ==============================================================================
 * การตั้งค่า Firebase & Google Sheets สำหรับระบบรับสมัคร คณะสีบุษราคัม
 * ==============================================================================
 * 
 * 📌 หากต้องการเชื่อมต่อ Firebase Firestore:
 * 1. นำ firebaseConfig ที่ได้จาก Firebase Console มาวางในตัวแปรด้านล่างนี้
 * 2. หากยังไม่ได้ใส่ Config ระบบจะทำงานผ่าน Local API (Node.js Express) ให้อัตโนมัติ 100%!
 * ==============================================================================
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBEJrULPmcGyBH1T0H9j4yiiz94VDpS_7k",
  authDomain: "toapz-c6acf.firebaseapp.com",
  projectId: "toapz-c6acf",
  storageBucket: "toapz-c6acf.firebasestorage.app",
  messagingSenderId: "67963668623",
  appId: "1:67963668623:web:5f43320f98f19b8e8548fa",
  measurementId: "G-FZ7Q544FS6"
};

// 📌 วาง URL ของ Google Apps Script Webhook ที่นี่ (เพื่อยิงข้อมูลลง Google Sheet อัตโนมัติ)
const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzi_YwN3XQsnbpcS00riDjayVWFhmx_oV1RQ_8eXX66p2sroQ9DLg3K7TcA0Z5toq28eQ/exec";

// ตรวจสอบว่าใส่ Firebase Config แล้วหรือยัง
const IS_FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY" && FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";

// Export ตัวแปรเพื่อให้ไฟล์ register.js และ admin.js ใช้งานได้
window.ORANGE_CONFIG = {
  firebaseConfig: FIREBASE_CONFIG,
  isFirebaseConfigured: IS_FIREBASE_CONFIGURED,
  googleSheetWebhookUrl: GOOGLE_SHEET_WEBHOOK_URL,
  apiBaseUrl: window.location.origin
};
