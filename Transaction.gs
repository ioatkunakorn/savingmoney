// ============================================================
// Transaction.gs - ระบบฝาก/ถอนเงิน
// ============================================================

// ============================================================
// deposit - บันทึกการฝากเงิน
// ============================================================
function deposit(e) {
  const body = JSON.parse(e.postData.contents);
  const token = body.token;
  const session = validateToken(token);
  const { student_id, amount, note, date } = body;

  // Validate
  if (!student_id || !amount) {
    return jsonResponse(false, 'กรุณาระบุนักเรียนและจำนวนเงิน');
  }
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return jsonResponse(false, 'จำนวนเงินไม่ถูกต้อง');
  }
  if (numAmount > 100000) {
    return jsonResponse(false, 'จำนวนเงินเกินกำหนด (สูงสุด 100,000 บาท)');
  }

  // ดึงข้อมูลนักเรียน
  const studentResult = getStudentById(student_id);
  if (!studentResult) {
    return jsonResponse(false, 'ไม่พบนักเรียน');
  }

  const student = studentResult.data;
  if (student.status === 'deleted') {
    return jsonResponse(false, 'นักเรียนไม่ได้ใช้งาน');
  }

  // คำนวณยอดใหม่
  const currentBalance = parseFloat(student.balance) || 0;
  const newBalance = currentBalance + numAmount;

  // บันทึก Transaction (Atomic)
  const txSheet = getSheet(SHEETS.TRANSACTIONS);
  const txId = generateId('TXN');
  const txDate = date || new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();

  txSheet.appendRow([
    txId, student_id, txDate, 'deposit',
    numAmount, newBalance,
    note || '', session.username, timestamp
  ]);

  // อัปเดต Balance
  updateStudentBalance(student_id, newBalance);

  // บันทึก Audit
  logAudit(session.username, 'DEPOSIT', 'Transaction', {
    txId, student_id, amount: numAmount, newBalance
  });

  return jsonResponse(true, `ฝากเงิน ฿${numAmount.toLocaleString()} สำเร็จ`, {
    transaction_id: txId,
    student_name: `${student.firstname} ${student.lastname}`,
    amount: numAmount,
    balance_before: currentBalance,
    balance_after: newBalance
  });
}

// ============================================================
// withdraw - บันทึกการถอนเงิน
// ============================================================
function withdraw(e) {
  const body = JSON.parse(e.postData.contents);
  const token = body.token;
  const session = validateToken(token);
  const { student_id, amount, note, date } = body;

  // Validate
  if (!student_id || !amount) {
    return jsonResponse(false, 'กรุณาระบุนักเรียนและจำนวนเงิน');
  }
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return jsonResponse(false, 'จำนวนเงินไม่ถูกต้อง');
  }

  // ดึงข้อมูลนักเรียน
  const studentResult = getStudentById(student_id);
  if (!studentResult) {
    return jsonResponse(false, 'ไม่พบนักเรียน');
  }

  const student = studentResult.data;
  const currentBalance = parseFloat(student.balance) || 0;

  // ตรวจสอบยอดเงินพอไหม
  if (numAmount > currentBalance) {
    return jsonResponse(false, `ยอดเงินไม่เพียงพอ (คงเหลือ ฿${currentBalance.toLocaleString()})`);
  }

  const newBalance = currentBalance - numAmount;

  // บันทึก Transaction
  const txSheet = getSheet(SHEETS.TRANSACTIONS);
  const txId = generateId('TXN');
  const txDate = date || new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();

  txSheet.appendRow([
    txId, student_id, txDate, 'withdraw',
    numAmount, newBalance,
    note || '', session.username, timestamp
  ]);

  // อัปเดต Balance
  updateStudentBalance(student_id, newBalance);

  // บันทึก Audit
  logAudit(session.username, 'WITHDRAW', 'Transaction', {
    txId, student_id, amount: numAmount, newBalance
  });

  return jsonResponse(true, `ถอนเงิน ฿${numAmount.toLocaleString()} สำเร็จ`, {
    transaction_id: txId,
    student_name: `${student.firstname} ${student.lastname}`,
    amount: numAmount,
    balance_before: currentBalance,
    balance_after: newBalance
  });
}

// ============================================================
// getTransactions - ดึงประวัติรายการ
// ============================================================
function getTransactions(e) {
  const params = e.parameter;
  const studentId = params.student_id || '';
  const type = params.type || '';
  const dateFrom = params.date_from || '';
  const dateTo = params.date_to || '';
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 50;

  const txSheet = getSheet(SHEETS.TRANSACTIONS);
  const txData = txSheet.getDataRange().getValues();
  const txHeaders = txData[0];

  // ดึง Student Map
  const stSheet = getSheet(SHEETS.STUDENTS);
  const stData = stSheet.getDataRange().getValues();
  const stHeaders = stData[0];
  const studentMap = {};
  stData.slice(1).forEach(row => {
    const s = {};
    stHeaders.forEach((h, j) => s[h] = row[j]);
    studentMap[s.student_id] = s;
  });

  let transactions = [];
  for (let i = txData.length - 1; i >= 1; i--) {
    const row = txData[i];
    if (!row[0]) continue;

    const t = {};
    txHeaders.forEach((h, j) => t[h] = row[j]);

    // Filter
    const matchStudent = !studentId || t.student_id === studentId;
    const matchType = !type || t.type === type;
    const matchFrom = !dateFrom || t.date >= dateFrom;
    const matchTo = !dateTo || t.date <= dateTo;

    if (matchStudent && matchType && matchFrom && matchTo) {
      const st = studentMap[t.student_id];
      transactions.push({
        ...t,
        student_name: st ? `${st.firstname} ${st.lastname}` : '',
        student_code: st?.student_code || '',
        classroom: st?.classroom || ''
      });
    }
  }

  const total = transactions.length;
  const start = (page - 1) * pageSize;
  const paged = transactions.slice(start, start + pageSize);

  return jsonResponse(true, 'สำเร็จ', {
    transactions: paged, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

// ============================================================
// getDashboard - ดึงข้อมูล Dashboard
// ============================================================
function getDashboard(e) {
  const stSheet = getSheet(SHEETS.STUDENTS);
  const stData = stSheet.getDataRange().getValues();
  const stHeaders = stData[0];

  let totalStudents = 0;
  let totalBalance = 0;
  const students = [];

  stData.slice(1).forEach(row => {
    const s = {};
    stHeaders.forEach((h, j) => s[h] = row[j]);
    if (s.status !== 'deleted' && s.student_id) {
      totalStudents++;
      totalBalance += parseFloat(s.balance) || 0;
      students.push(s);
    }
  });

  // Top 5 savers
  const topSavers = students
    .sort((a, b) => (parseFloat(b.balance) || 0) - (parseFloat(a.balance) || 0))
    .slice(0, 5)
    .map(s => ({ name: `${s.firstname} ${s.lastname}`, classroom: s.classroom, balance: parseFloat(s.balance) || 0 }));

  // Today transactions
  const today = new Date().toISOString().split('T')[0];
  const txSheet = getSheet(SHEETS.TRANSACTIONS);
  const txData = txSheet.getDataRange().getValues();
  const txHeaders = txData[0];

  let todayDeposit = 0;
  let todayWithdraw = 0;
  const monthlyData = {};

  txData.slice(1).forEach(row => {
    if (!row[0]) return;
    const t = {};
    txHeaders.forEach((h, j) => t[h] = row[j]);

    if (t.date === today) {
      if (t.type === 'deposit') todayDeposit += parseFloat(t.amount) || 0;
      if (t.type === 'withdraw') todayWithdraw += parseFloat(t.amount) || 0;
    }

    // Monthly summary
    const month = String(t.date).substr(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { deposit: 0, withdraw: 0 };
    if (t.type === 'deposit') monthlyData[month].deposit += parseFloat(t.amount) || 0;
    if (t.type === 'withdraw') monthlyData[month].withdraw += parseFloat(t.amount) || 0;
  });

  return jsonResponse(true, 'สำเร็จ', {
    totalStudents,
    totalBalance,
    todayDeposit,
    todayWithdraw,
    topSavers,
    monthlyData
  });
}
