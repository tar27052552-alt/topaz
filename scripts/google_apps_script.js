/**
 * ==============================================================================
 * 🏆 Google Apps Script สำหรับระบบรับสมัครออนไลน์ คณะสีแสด (สีบุษราคัม) ปี 2569
 * ==============================================================================
 * 
 * 🌟 ฟังก์ชันการทำงาน (เฉพาะหน้ารวม ม.1 - ม.6 แบบ 100% Clean & Fast):
 * 1. [2-Way Live Sync] รับข้อมูลการสมัครจากหน้าเว็บ และอัปเดตลงในแท็บ ม.1 - ม.6 (คอลัมน์ I: หน้าที่, คอลัมน์ J: เบอร์โทร) ทันที
 * 2. [Live Search] ค้นหาข้อมูลนักเรียนแบบ Real-time จากแท็บ ม.1 - ม.6
 * 3. [Format Phone] จัดรูปแบบเบอร์โทรศัพท์ 10 หลัก (0xx-xxx-xxxx) ทั่วทั้งชีต ม.1 - ม.6
 * 
 * 📌 วิธีนำไปใช้งานใน Google Sheets:
 * 1. เปิด Google Sheet -> เมนู "ส่วนขยาย" (Extensions) -> "Apps Script"
 * 2. ลบโค้ดเดิมทั้งหมด วางโค้ดนี้แทนที่ -> กด "บันทึก" (Ctrl+S)
 * 3. กดปุ่มสีน้ำเงิน "ทำให้ใช้งานได้" (Deploy) -> "จัดการการทำให้ใช้งานได้"
 * 4. กดรูปดินสอ ✏️ -> ช่องเวอร์ชันเลือก "เวอร์ชันใหม่" (New version) -> กด "ทำให้ใช้งานได้" (Deploy)
 * ==============================================================================
 */

// ==============================================================================
// 🌟 เมนูลัดใน Google Sheets
// ==============================================================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🏆 คณะสีแสด 69")
    .addItem("🧹 ล้างคำซ้ำในช่องหน้าที่ทั้งหมด (Deduplicate Duties)", "cleanDuplicateDutiesInAllGradeSheets")
    .addItem("📱 จัดรูปแบบเบอร์โทรศัพท์ทั้งหมด (0xx-xxx-xxxx)", "formatAllPhoneNumbersInSheets")
    .addToUi();
}

// ==============================================================================
// 1. POST: บันทึกข้อมูลการสมัครลงในแท็บ ม.1 - ม.6
// ==============================================================================
function doPost(e) {
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // กรณีสั่ง Batch Update
    if (data.action === "batchSync" && Array.isArray(data.items)) {
      var count = batchUpdateStudents(ss, data.items);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "ซิงค์ข้อมูลสำเร็จทั้งหมด " + count + " รายการ",
        updatedCount: count
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // กรณีสั่ง Clean/Deduplicate ทุกหน้า
    if (data.action === "cleanAllNotes") {
      var cleanNoteCount = cleanAllNotesInAllGradeSheets();
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "ล้างหมายเหตุทั้งหมดแล้ว " + cleanNoteCount + " รายการ",
        cleanedCount: cleanNoteCount
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "cleanAllDuties") {
      var cleanCount = cleanDuplicateDutiesInAllGradeSheets();
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "ทำความสะอาดหน้าที่ทั้งหมดแล้ว " + cleanCount + " รายการ",
        cleanedCount: cleanCount
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var studentId = String(data.studentId || "").trim();
    var phone = String(data.phone || "").trim();
    var activityTitle = getCleanActivityTitle(data);
    var note = String(data.note || "").trim();
    var overwrite = data.overwrite === true || data.action === "overwriteDuty";

    var gradeNumber = data.grade || extractGrade(data.roomFull);
    var targetSheetName = "ม." + gradeNumber;
    var gradeSheet = ss.getSheetByName(targetSheetName);

    var updatedGrade = false;
    var foundRow = -1;

    // 1. ค้นหาในแท็บ ม. ของนักเรียน
    if (gradeSheet) {
      foundRow = findStudentRow(gradeSheet, studentId);
      if (foundRow > 0) {
        updateStudentRow(gradeSheet, foundRow, activityTitle, phone, note, overwrite);
        updatedGrade = true;
      }
    }

    // 2. ถ้าไม่พบในแท็บ ม. ที่ระบุ ให้ค้นหาทุกแท็บ ม.1 - ม.6
    if (!updatedGrade) {
      var allGrades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];
      for (var i = 0; i < allGrades.length; i++) {
        var gName = allGrades[i];
        if (gName === targetSheetName) continue;
        var gSheet = ss.getSheetByName(gName);
        if (gSheet) {
          foundRow = findStudentRow(gSheet, studentId);
          if (foundRow > 0) {
            updateStudentRow(gSheet, foundRow, activityTitle, phone, note, overwrite);
            updatedGrade = true;
            break;
          }
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "บันทึกข้อมูลลงในหน้ารวม ม. เรียบร้อยแล้ว",
      studentId: studentId,
      activityTitle: activityTitle,
      updatedGrade: updatedGrade
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==============================================================================
// 2. GET: ดึงข้อมูลนักเรียนจากแท็บ ม.1 - ม.6 แบบ Real-time
// ==============================================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var queryId = e.parameter.studentId || e.parameter.id;

    if (!queryId) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "กรุณาระบุ studentId"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    queryId = String(queryId).trim();
    var allGrades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];

    for (var g = 0; g < allGrades.length; g++) {
      var sheet = ss.getSheetByName(allGrades[g]);
      if (!sheet) continue;

      var rowNum = findStudentRow(sheet, queryId);
      if (rowNum > 0) {
        var rowData = sheet.getRange(rowNum, 1, 1, 11).getValues()[0];
        var studentObj = {
          seq: rowData[0],
          gradeName: rowData[1],
          roomNo: rowData[2],
          roomFull: rowData[3],
          classNo: rowData[4],
          id: String(rowData[5]).replace(/[^\d]/g, ""),
          name: rowData[6],
          gender: rowData[7],
          duty: rowData[8] || "",
          phone: rowData[9] ? formatPhoneNumber(String(rowData[9])) : "",
          note: rowData[10] || ""
        };

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          data: studentObj
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "notFound",
      message: "ไม่พบรหัสนักเรียน " + queryId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==============================================================================
// 3. ฟังก์ชันช่วยเหลือ (Helpers)
// ==============================================================================
function findStudentRow(sheet, studentId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 5) return -1;
  var colFValues = sheet.getRange(5, 6, lastRow - 4, 1).getValues();
  for (var i = 0; i < colFValues.length; i++) {
    var idInSheet = String(colFValues[i][0]).replace(/[^\d]/g, "").trim();
    if (idInSheet === studentId) {
      return i + 5;
    }
  }
  return -1;
}

function updateStudentRow(sheet, rowNum, activityTitle, phone, note, overwrite) {
  var dirtyWords = ["กัป", "การ์ตูน", "โยเกิร์ต", "สิ", "หยก", "นาเดียร์", "อลิษา", "อัญชณพร", "กัน"];
  var currentDuty = String(sheet.getRange(rowNum, 9).getValue() || "").trim();
  var duties = [];

  if (overwrite) {
    // โหมดแทนที่ค่า / ล้างหน้าที่ (เมื่อ activityTitle ว่าง ให้ล้างช่องหน้าที่เป็นค่าว่าง)
    if (activityTitle && activityTitle !== "-" && activityTitle !== "ไม่มีหน้าที่") {
      duties = String(activityTitle).split(",").map(function(s) { return s.trim(); }).filter(function(d) {
        return Boolean(d) && dirtyWords.indexOf(d) === -1;
      });
    }
  } else {
    // โหมดต่อท้าย (Append)
    if (currentDuty && currentDuty !== "-") {
      duties = currentDuty.split(",").map(function(s) { return s.trim(); }).filter(function(d) {
        return Boolean(d) && dirtyWords.indexOf(d) === -1;
      });
    }
    if (activityTitle && activityTitle !== "-") {
      var newTitles = String(activityTitle).split(",").map(function(s) { return s.trim(); }).filter(function(d) {
        return Boolean(d) && dirtyWords.indexOf(d) === -1;
      });
      for (var i = 0; i < newTitles.length; i++) {
        if (duties.indexOf(newTitles[i]) === -1) {
          duties.push(newTitles[i]);
        }
      }
    }
  }

  // Deduplicate array
  var uniqueDuties = [];
  for (var i = 0; i < duties.length; i++) {
    if (uniqueDuties.indexOf(duties[i]) === -1) {
      uniqueDuties.push(duties[i]);
    }
  }
  
  // บันทึกค่าหน้าที่ (ถ้าว่างให้เป็นค่าว่าง "")
  sheet.getRange(rowNum, 9).setValue(uniqueDuties.length > 0 ? uniqueDuties.join(", ") : "");

  if (overwrite) {
    sheet.getRange(rowNum, 10).setValue(phone ? formatPhoneNumber(phone) : "");
  } else if (phone) {
    sheet.getRange(rowNum, 10).setValue(formatPhoneNumber(phone));
  }

  if (note) {
    var currentNote = String(sheet.getRange(rowNum, 11).getValue() || "").trim();
    var noteItems = currentNote ? currentNote.split("|").map(function(s) { return s.trim(); }).filter(Boolean) : [];
    if (noteItems.indexOf(note) === -1) {
      noteItems.push(note);
    }
    sheet.getRange(rowNum, 11).setValue(noteItems.join(" | "));
  } else if (overwrite) {
    sheet.getRange(rowNum, 11).setValue("");
  }
}

function cleanAllNotesInAllGradeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allGrades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];
  var cleanedCount = 0;

  for (var g = 0; g < allGrades.length; g++) {
    var sheet = ss.getSheetByName(allGrades[g]);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();
    if (lastRow < 5) continue;
    var range = sheet.getRange(5, 11, lastRow - 4, 1);
    var values = range.getValues();
    var hasValues = false;

    for (var r = 0; r < values.length; r++) {
      if (values[r][0] !== "") {
        values[r][0] = "";
        cleanedCount++;
        hasValues = true;
      }
    }
    if (hasValues) {
      range.setValues(values);
    }
  }
  return cleanedCount;
}

function cleanDuplicateDutiesInAllGradeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allGrades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];
  var dirtyWords = ["กัป", "การ์ตูน", "โยเกิร์ต", "สิ", "หยก", "นาเดียร์", "อลิษา", "อัญชณพร", "กัน"];
  var cleanedCount = 0;

  for (var g = 0; g < allGrades.length; g++) {
    var sheet = ss.getSheetByName(allGrades[g]);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();
    if (lastRow < 5) continue;
    var range = sheet.getRange(5, 9, lastRow - 4, 1);
    var values = range.getValues();
    var changed = false;

    for (var r = 0; r < values.length; r++) {
      var d = String(values[r][0] || "").trim();
      if (d) {
        var items = d.split(",").map(function(s) { return s.trim(); }).filter(function(item) {
          return Boolean(item) && dirtyWords.indexOf(item) === -1;
        });
        var uniqueItems = [];
        for (var i = 0; i < items.length; i++) {
          if (uniqueItems.indexOf(items[i]) === -1) {
            uniqueItems.push(items[i]);
          }
        }
        var cleanedD = uniqueItems.length > 0 ? uniqueItems.join(", ") : "-";
        if (cleanedD !== d) {
          values[r][0] = cleanedD;
          changed = true;
          cleanedCount++;
        }
      }
    }

    if (changed) {
      range.setValues(values);
    }
  }

  try {
    SpreadsheetApp.getUi().alert("🧹 ล้างคำซ้ำและชื่อเล่นสำเร็จ!", "ล้างคำซ้ำและชื่อเล่นในช่องหน้าที่เรียบร้อยแล้วทั้งหมด " + cleanedCount + " คน", SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
  return cleanedCount;
}

function formatAllPhoneNumbersInSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allGrades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];
  var formatted = 0;

  for (var g = 0; g < allGrades.length; g++) {
    var sheet = ss.getSheetByName(allGrades[g]);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();
    if (lastRow < 5) continue;
    var range = sheet.getRange(5, 10, lastRow - 4, 1);
    var values = range.getValues();
    var changed = false;

    for (var r = 0; r < values.length; r++) {
      var p = String(values[r][0] || "").trim();
      if (p && p !== "-") {
        var formattedP = formatPhoneNumber(p);
        if (formattedP !== p) {
          values[r][0] = formattedP;
          changed = true;
          formatted++;
        }
      }
    }

    if (changed) {
      range.setValues(values);
    }
  }

  try {
    SpreadsheetApp.getUi().alert("📱 จัดรูปแบบเบอร์โทรสำเร็จ!", "จัดรูปแบบเบอร์โทรศัพท์ทั้งหมด " + formatted + " เบอร์เรียบร้อยแล้ว", SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

function getCleanActivityTitle(data) {
  var title = data.categoryTitle || data.roleName || data.sportName || "";
  if (!title && data.departmentName) {
    // Use regex to remove ALL occurrences of "ฝ่าย" (not just the first one)
    title = data.departmentName.replace(/ฝ่าย/g, "").trim();
  }
  return title;
}

function extractGrade(roomStr) {
  if (!roomStr) return 1;
  var match = String(roomStr).match(/ม\.(\d)/);
  return match ? parseInt(match[1]) : 1;
}

function formatPhoneNumber(phone) {
  if (!phone) return "-";
  var digits = String(phone).replace(/[^\d]/g, "");
  if (digits.length === 10) {
    return digits.substring(0, 3) + "-" + digits.substring(3, 6) + "-" + digits.substring(6, 10);
  } else if (digits.length === 9) {
    // 9-digit numbers are not standard Thai format — return as-is to avoid garbling
    return phone;
  }
  return phone;
}

function batchUpdateStudents(ss, items) {
  var allGrades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];
  var count = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var studentId = String(it.studentId || "").trim();
    if (!studentId) continue;

    // Try the expected grade tab first, then fall back to all tabs (same as doPost)
    var gradeNumber = it.grade || extractGrade(it.roomFull);
    var primarySheet = ss.getSheetByName("ม." + gradeNumber);
    var row = primarySheet ? findStudentRow(primarySheet, studentId) : -1;
    var targetSheet = row > 0 ? primarySheet : null;

    if (!targetSheet) {
      for (var g = 0; g < allGrades.length; g++) {
        if (allGrades[g] === "ม." + gradeNumber) continue;
        var gSheet = ss.getSheetByName(allGrades[g]);
        if (!gSheet) continue;
        row = findStudentRow(gSheet, studentId);
        if (row > 0) {
          targetSheet = gSheet;
          break;
        }
      }
    }

    if (targetSheet && row > 0) {
      updateStudentRow(targetSheet, row, it.activityTitle, it.phone, it.note);
      count++;
    }
  }
  return count;
}
