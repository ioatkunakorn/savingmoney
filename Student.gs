// ============================================================
// Student.gs - จัดการข้อมูลนักเรียน
// ============================================================

// ============================================================
// getStudents - ดึงรายชื่อนักเรียน (รองรับ pagination + filter)
// ============================================================
function getStudents(e) {
  const params = e.parameter;
  const search = params.search || '';
  const classroom = params.classroom || '';
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 50;

  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let students = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // ข้ามแถวว่าง

    const s = {};
    headers.forEach((h, j) => s[h] = row[j]);

    // Filter
    const fullName = `${s.firstname} ${s.lastname}`.toLowerCase();
    const matchSearch = !search || fullName.includes(search.toLowerCase()) || s.student_code.includes(search);
    const matchClass = !classroom || s.classroom === classroom;

    if (matchSearch && matchClass && s.status !== 'deleted') {
      students.push(s);
    }
  }

  // Pagination
  const total = students.length;
  const start = (page - 1) * pageSize;
  const paged = students.slice(start, start + pageSize);

  return jsonResponse(true, 'สำเร็จ', {
    students: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

// ============================================================
// addStudent - เพิ่มนักเรียนใหม่
// ============================================================
function addStudent(e) {
  const body = JSON.parse(e.postData.contents);
  const token = body.token;
  const session = validateToken(token);

  const { student_code, firstname, lastname, classroom, gender, birthdate, parent_name, phone } = body;

  // Validate required fields
  if (!student_code || !firstname || !lastname || !classroom) {
    return jsonResponse(false, 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
  }

  // ตรวจสอบรหัสนักเรียนซ้ำ
  if (isStudentCodeDuplicate(student_code)) {
    return jsonResponse(false, 'รหัสนักเรียน ' + student_code + ' มีอยู่แล้ว');
  }

  // Validate เบอร์โทรไทย
  if (phone && !isValidThaiPhone(phone)) {
    return jsonResponse(false, 'รูปแบบเบอร์โทรไม่ถูกต้อง');
  }

  const sheet = getSheet(SHEETS.STUDENTS);
  const studentId = generateId('STD');
  const now = new Date().toISOString();

  sheet.appendRow([
    studentId, student_code, firstname, lastname, classroom,
    gender || 'ชาย', birthdate || '', parent_name || '', phone || '',
    0, 'active', now, now
  ]);

  logAudit(session.username, 'ADD_STUDENT', 'Student', { studentId, student_code, firstname, lastname });

  return jsonResponse(true, 'เพิ่มนักเรียน ' + firstname + ' ' + lastname + ' สำเร็จ', { studentId });
}

// ============================================================
// updateStudent - แก้ไขข้อมูลนักเรียน
// ============================================================
function updateStudent(e) {
  const body = JSON.parse(e.postData.contents);
  const token = body.token;
  const session = validateToken(token);
  const { student_id } = body;

  if (!student_id) return jsonResponse(false, 'ไม่พบรหัสนักเรียน');

  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === student_id) {
      const fields = ['student_code','firstname','lastname','classroom','gender','birthdate','parent_name','phone'];
      fields.forEach(field => {
        if (body[field] !== undefined) {
          const colIdx = headers.indexOf(field) + 1;
          if (colIdx > 0) sheet.getRange(i + 1, colIdx).setValue(body[field]);
        }
      });
      // อัปเดต updated_at
      const updatedCol = headers.indexOf('updated_at') + 1;
      sheet.getRange(i + 1, updatedCol).setValue(new Date().toISOString());

      logAudit(session.username, 'UPDATE_STUDENT', 'Student', { student_id, ...body });
      return jsonResponse(true, 'แก้ไขข้อมูลสำเร็จ');
    }
  }

  return jsonResponse(false, 'ไม่พบนักเรียน');
}

// ============================================================
// deleteStudent - ลบนักเรียน (Soft Delete)
// ============================================================
function deleteStudent(e) {
  const body = JSON.parse(e.postData.contents);
  const token = body.token;
  const session = validateToken(token);

  // เฉพาะ Admin เท่านั้นที่ลบได้
  if (session.role !== 'admin') {
    return jsonResponse(false, 'ไม่มีสิทธิ์ดำเนินการ');
  }

  const { student_id } = body;
  if (!student_id) return jsonResponse(false, 'ไม่พบรหัสนักเรียน');

  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === student_id) {
      const statusCol = headers.indexOf('status') + 1;
      const updatedCol = headers.indexOf('updated_at') + 1;
      sheet.getRange(i + 1, statusCol).setValue('deleted');
      sheet.getRange(i + 1, updatedCol).setValue(new Date().toISOString());

      logAudit(session.username, 'DELETE_STUDENT', 'Student', { student_id });
      return jsonResponse(true, 'ลบนักเรียนสำเร็จ');
    }
  }

  return jsonResponse(false, 'ไม่พบนักเรียน');
}

// ============================================================
// isStudentCodeDuplicate - ตรวจสอบรหัสนักเรียนซ้ำ
// ============================================================
function isStudentCodeDuplicate(code) {
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  return data.slice(1).some(row => row[1] === code && row[10] !== 'deleted');
}

// ============================================================
// isValidThaiPhone - ตรวจสอบเบอร์โทรไทย
// ============================================================
function isValidThaiPhone(phone) {
  const cleaned = phone.replace(/[-\s]/g, '');
  return /^(0[689]\d{8}|0[2-9]\d{7})$/.test(cleaned);
}

// ============================================================
// getStudentById - ดึงข้อมูลนักเรียนตาม ID
// ============================================================
function getStudentById(studentId) {
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === studentId) {
      const s = {};
      headers.forEach((h, j) => s[h] = data[i][j]);
      return { row: i + 1, data: s };
    }
  }
  return null;
}

// ============================================================
// updateStudentBalance - อัปเดตยอดเงิน
// ============================================================
function updateStudentBalance(studentId, newBalance) {
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const balanceCol = headers.indexOf('balance') + 1;
  const updatedCol = headers.indexOf('updated_at') + 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === studentId) {
      sheet.getRange(i + 1, balanceCol).setValue(newBalance);
      sheet.getRange(i + 1, updatedCol).setValue(new Date().toISOString());
      return true;
    }
  }
  return false;
}
