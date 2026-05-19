// ============================================================
// Auth.gs - ระบบ Authentication & Authorization
// ============================================================

// เก็บ Session ใน PropertiesService (per-user)
const SESSION_DURATION_HOURS = 8;

// ============================================================
// login - เข้าสู่ระบบ
// ============================================================
function login(e) {
  const body = JSON.parse(e.postData.contents);
  const { username, password } = body;

  if (!username || !password) {
    return jsonResponse(false, 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  }

  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // ค้นหาผู้ใช้
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uObj = {};
    headers.forEach((h, j) => uObj[h] = row[j]);

    if (uObj.username === username && uObj.status === 'active') {
      // ตรวจสอบรหัสผ่าน (SHA-256 hash)
      const hashedInput = hashPassword(password);
      if (uObj.password_hash === hashedInput) {
        // สร้าง Token
        const token = generateToken(username, uObj.role);

        // บันทึก last_login
        const colIdx = headers.indexOf('last_login') + 1;
        sheet.getRange(i + 1, colIdx).setValue(new Date().toISOString());

        // บันทึก Audit Log
        logAudit(username, 'LOGIN', 'Auth', { username });

        return jsonResponse(true, 'เข้าสู่ระบบสำเร็จ', {
          token,
          user: {
            username: uObj.username,
            fullname: uObj.fullname,
            role: uObj.role
          }
        });
      }
    }
  }

  return jsonResponse(false, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
}

// ============================================================
// hashPassword - เข้ารหัส SHA-256
// ============================================================
function hashPassword(password) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return rawHash.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

// ============================================================
// generateToken - สร้าง Session Token
// ============================================================
function generateToken(username, role) {
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + SESSION_DURATION_HOURS);

  // เก็บ Token ใน Script Properties
  const props = PropertiesService.getScriptProperties();
  const sessions = JSON.parse(props.getProperty('sessions') || '{}');
  sessions[token] = { username, role, expiry: expiry.toISOString() };
  props.setProperty('sessions', JSON.stringify(sessions));

  return token;
}

// ============================================================
// validateToken - ตรวจสอบ Token
// ============================================================
function validateToken(token) {
  if (!token) return { valid: false };

  const props = PropertiesService.getScriptProperties();
  const sessions = JSON.parse(props.getProperty('sessions') || '{}');
  const session = sessions[token];

  if (!session) return { valid: false, message: 'Token ไม่ถูกต้อง' };
  if (new Date() > new Date(session.expiry)) {
    delete sessions[token];
    props.setProperty('sessions', JSON.stringify(sessions));
    return { valid: false, message: 'Token หมดอายุ' };
  }

  return { valid: true, username: session.username, role: session.role };
}

// ============================================================
// logAudit - บันทึก Audit Log
// ============================================================
function logAudit(user, action, module, payload) {
  const sheet = getSheet(SHEETS.AUDIT_LOGS);
  sheet.appendRow([
    generateId('LOG'),
    user,
    action,
    module,
    JSON.stringify(payload),
    new Date().toISOString(),
    ''
  ]);
}

// ============================================================
// setupDefaultUsers - สร้างผู้ใช้เริ่มต้น (รันครั้งแรก)
// ============================================================
function setupDefaultUsers() {
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  if (data.length > 1) {
    Logger.log('Users already exist');
    return;
  }

  const users = [
    [generateId('USR'), 'admin', hashPassword('admin123'), 'ผู้ดูแลระบบ', 'admin', '', 'active', new Date().toISOString()],
    [generateId('USR'), 'teacher', hashPassword('teacher123'), 'คุณครูประจำ', 'teacher', '', 'active', new Date().toISOString()],
  ];

  users.forEach(u => sheet.appendRow(u));
  Logger.log('Default users created successfully');
}
