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
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 📌 วาง URL ของ Google Apps Script Webhook ที่นี่ (เพื่อยิงข้อมูลลง Google Sheet อัตโนมัติ)
const GOOGLE_SHEET_WEBHOOK_URL = localStorage.getItem('orange_sheet_webhook') || "";

// ตรวจสอบว่าใส่ Firebase Config แล้วหรือยัง
const IS_FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY" && FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";

// Export ตัวแปรเพื่อให้ไฟล์ register.js และ admin.js ใช้งานได้
window.ORANGE_CONFIG = {
  firebaseConfig: FIREBASE_CONFIG,
  isFirebaseConfigured: IS_FIREBASE_CONFIGURED,
  googleSheetWebhookUrl: GOOGLE_SHEET_WEBHOOK_URL,
  apiBaseUrl: window.location.origin
};
