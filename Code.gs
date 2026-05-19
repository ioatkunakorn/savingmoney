// ============================================================
// Code.gs - ไฟล์หลัก Google Apps Script
// ระบบบริหารจัดการออมเงินนักเรียน
// ============================================================

// กำหนดค่า Spreadsheet ID (ใส่ ID ของ Google Sheet ที่สร้าง)
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// ชื่อ Sheet ต่างๆ
const SHEETS = {
  STUDENTS: 'Students',
  TRANSACTIONS: 'Transactions',
  USERS: 'Users',
  AUDIT_LOGS: 'AuditLogs'
};

// ============================================================
// doGet - จัดการ HTTP GET Requests
// ============================================================
function doGet(e) {
  return handleCors(e, 'GET');
}

// ============================================================
// doPost - จัดการ HTTP POST Requests
// ============================================================
function doPost(e) {
  return handleCors(e, 'POST');
}

// ============================================================
// handleCors - จัดการ CORS และ Routing
// ============================================================
function handleCors(e, method) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const action = e.parameter.action || (e.postData ? JSON.parse(e.postData.contents).action : '');
    const token = e.parameter.token || (e.postData ? JSON.parse(e.postData.contents || '{}').token : '');

    // Routes ที่ไม่ต้องการ token
    const publicRoutes = ['login'];

    let result;

    if (!publicRoutes.includes(action)) {
      const authCheck = validateToken(token);
      if (!authCheck.valid) {
        output.setContent(JSON.stringify({ success: false, message: 'Unauthorized', timestamp: new Date().toISOString() }));
        return output;
      }
    }

    // Routing
    switch (action) {
      case 'login': result = login(e); break;
      case 'getStudents': result = getStudents(e); break;
      case 'addStudent': result = addStudent(e); break;
      case 'updateStudent': result = updateStudent(e); break;
      case 'deleteStudent': result = deleteStudent(e); break;
      case 'deposit': result = deposit(e); break;
      case 'withdraw': result = withdraw(e); break;
      case 'getTransactions': result = getTransactions(e); break;
      case 'getDashboard': result = getDashboard(e); break;
      case 'generateReport': result = generateReport(e); break;
      default:
        result = { success: false, message: 'Action not found: ' + action };
    }

    output.setContent(JSON.stringify({ ...result, timestamp: new Date().toISOString() }));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, message: err.message, timestamp: new Date().toISOString() }));
  }

  return output;
}

// ============================================================
// getSpreadsheet - เปิด Google Spreadsheet
// ============================================================
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ============================================================
// getSheet - ดึง Sheet ตามชื่อ
// ============================================================
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  return sheet;
}

// ============================================================
// initializeSheet - สร้าง Header ของแต่ละ Sheet
// ============================================================
function initializeSheet(sheet, sheetName) {
  const headers = {
    Students: ['student_id','student_code','firstname','lastname','classroom','gender','birthdate','parent_name','phone','balance','status','created_at','updated_at'],
    Transactions: ['transaction_id','student_id','date','type','amount','balance_after','note','created_by','timestamp'],
    Users: ['user_id','username','password_hash','fullname','role','last_login','status','created_at'],
    AuditLogs: ['log_id','user','action','module','payload','timestamp','ip']
  };
  if (headers[sheetName]) {
    sheet.getRange(1, 1, 1, headers[sheetName].length).setValues([headers[sheetName]]);
    sheet.getRange(1, 1, 1, headers[sheetName].length)
      .setBackground('#1a5276').setFontColor('#ffffff').setFontWeight('bold');
  }
}

// ============================================================
// generateId - สร้าง ID อัตโนมัติ
// ============================================================
function generateId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 5);
}

// ============================================================
// jsonResponse - สร้าง Response มาตรฐาน
// ============================================================
function jsonResponse(success, message, data = null) {
  return { success, message, data };
}
