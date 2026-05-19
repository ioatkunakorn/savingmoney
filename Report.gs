// ============================================================
// Report.gs - ระบบสร้างรายงาน PDF
// ============================================================

// ============================================================
// generateReport - สร้างรายงาน PDF
// ============================================================
function generateReport(e) {
  const params = e.parameter;
  const body = e.postData ? JSON.parse(e.postData.contents) : {};
  const month = parseInt(params.month || body.month);
  const year = parseInt(params.year || body.year);
  const classroom = params.classroom || body.classroom || '';
  const type = params.type || body.type || 'monthly'; // monthly, student, class

  // ดึงข้อมูล
  const students = getStudentsData(classroom);
  const transactions = getTransactionsData(month, year);

  // สร้าง HTML สำหรับ PDF
  const html = buildReportHTML(students, transactions, month, year, classroom, type);

  // สร้าง PDF Blob
  const blob = HtmlService.createHtmlOutput(html).getAs('application/pdf');
  blob.setName(`รายงานออมเงิน_${year}_${String(month).padStart(2,'0')}.pdf`);

  // แปลง Blob เป็น Base64
  const base64 = Utilities.base64Encode(blob.getBytes());

  return jsonResponse(true, 'สร้างรายงานสำเร็จ', {
    pdf_base64: base64,
    filename: `รายงานออมเงิน_${year}_${String(month).padStart(2,'0')}.pdf`
  });
}

// ============================================================
// getStudentsData - ดึงข้อมูลนักเรียน
// ============================================================
function getStudentsData(classroom) {
  const sheet = getSheet(SHEETS.STUDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1)
    .filter(row => row[0] && row[10] !== 'deleted' && (!classroom || row[4] === classroom))
    .map(row => {
      const s = {};
      headers.forEach((h, j) => s[h] = row[j]);
      return s;
    });
}

// ============================================================
// getTransactionsData - ดึงรายการของเดือน
// ============================================================
function getTransactionsData(month, year) {
  const sheet = getSheet(SHEETS.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  return data.slice(1)
    .filter(row => row[0] && String(row[2]).startsWith(prefix))
    .map(row => {
      const t = {};
      headers.forEach((h, j) => t[h] = row[j]);
      return t;
    });
}

// ============================================================
// buildReportHTML - สร้าง HTML Template สำหรับ PDF
// ============================================================
function buildReportHTML(students, transactions, month, year, classroom, type) {
  const monthNames = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

  // สร้าง Map ข้อมูลรายการของแต่ละนักเรียน
  const txMap = {};
  transactions.forEach(t => {
    if (!txMap[t.student_id]) txMap[t.student_id] = { deposit: 0, withdraw: 0, txList: [] };
    if (t.type === 'deposit') txMap[t.student_id].deposit += parseFloat(t.amount) || 0;
    if (t.type === 'withdraw') txMap[t.student_id].withdraw += parseFloat(t.amount) || 0;
    txMap[t.student_id].txList.push(t);
  });

  let totalDeposit = 0, totalWithdraw = 0, totalBalance = 0;
  students.forEach(s => {
    const d = txMap[s.student_id] || { deposit: 0, withdraw: 0 };
    totalDeposit += d.deposit;
    totalWithdraw += d.withdraw;
    totalBalance += parseFloat(s.balance) || 0;
  });

  const rows = students.sort((a, b) => {
    if (a.classroom < b.classroom) return -1;
    if (a.classroom > b.classroom) return 1;
    return a.firstname.localeCompare(b.firstname, 'th');
  }).map((s, i) => {
    const d = txMap[s.student_id] || { deposit: 0, withdraw: 0 };
    return `<tr class="${i % 2 === 1 ? 'alt' : ''}">
      <td class="center">${i + 1}</td>
      <td class="center">${s.student_code}</td>
      <td>${s.firstname} ${s.lastname}</td>
      <td class="center">${s.classroom}</td>
      <td class="right">฿${d.deposit.toLocaleString('th-TH')}</td>
      <td class="right">฿${d.withdraw.toLocaleString('th-TH')}</td>
      <td class="right bold">฿${(parseFloat(s.balance) || 0).toLocaleString('th-TH')}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
  * { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
  body { padding: 30px 40px; color: #1a1a2e; font-size: 13px; }
  .header { text-align: center; border-bottom: 3px solid #1a5276; padding-bottom: 16px; margin-bottom: 20px; }
  .school-name { font-size: 20px; font-weight: 700; color: #1a5276; }
  .report-title { font-size: 16px; font-weight: 600; margin-top: 4px; }
  .report-sub { font-size: 13px; color: #555; margin-top: 2px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12px; color: #666; }
  .doc-no { background: #f0f4f8; padding: 4px 10px; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #1a5276; color: white; padding: 10px 8px; font-weight: 600; font-size: 12px; }
  td { padding: 8px; border-bottom: 1px solid #e0e7ef; font-size: 12px; }
  tr.alt td { background: #f7fafc; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .total-row td { background: #e8f4fd; font-weight: 700; border-top: 2px solid #1a5276; }
  .summary { display: flex; gap: 20px; margin: 16px 0; }
  .summary-card { flex: 1; border: 1px solid #dde3ea; border-radius: 8px; padding: 12px; text-align: center; }
  .summary-card .label { font-size: 11px; color: #777; }
  .summary-card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  .deposit-color { color: #27ae60; }
  .withdraw-color { color: #e74c3c; }
  .balance-color { color: #1a5276; }
  .signatures { display: flex; justify-content: space-around; margin-top: 50px; }
  .sig { text-align: center; width: 220px; }
  .sig-line { border-top: 1px solid #555; padding-top: 6px; margin-top: 40px; font-size: 12px; }
  .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
</style>
</head>
<body>
<div class="header">
  <div class="school-name">โรงเรียนสาธิต</div>
  <div class="report-title">รายงานการออมเงินนักเรียน</div>
  <div class="report-sub">ประจำเดือน${monthNames[month]} พ.ศ. ${year}${classroom ? ' | ห้องเรียน ' + classroom : ' | ทั้งโรงเรียน'}</div>
</div>

<div class="meta">
  <span>วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH', {year:'numeric',month:'long',day:'numeric'})}</span>
  <span class="doc-no">เลขที่เอกสาร: RPT-${year}${String(month).padStart(2,'0')}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}</span>
</div>

<div class="summary">
  <div class="summary-card">
    <div class="label">จำนวนนักเรียน</div>
    <div class="value">${students.length} คน</div>
  </div>
  <div class="summary-card">
    <div class="label">ยอดฝากรวม</div>
    <div class="value deposit-color">฿${totalDeposit.toLocaleString('th-TH')}</div>
  </div>
  <div class="summary-card">
    <div class="label">ยอดถอนรวม</div>
    <div class="value withdraw-color">฿${totalWithdraw.toLocaleString('th-TH')}</div>
  </div>
  <div class="summary-card">
    <div class="label">ยอดคงเหลือรวม</div>
    <div class="value balance-color">฿${totalBalance.toLocaleString('th-TH')}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th width="5%">ที่</th>
      <th width="10%">รหัส</th>
      <th width="30%">ชื่อ-นามสกุล</th>
      <th width="10%">ห้อง</th>
      <th width="15%">ยอดฝาก</th>
      <th width="15%">ยอดถอน</th>
      <th width="15%">ยอดคงเหลือ</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="4" class="right">รวมทั้งหมด</td>
      <td class="right">฿${totalDeposit.toLocaleString('th-TH')}</td>
      <td class="right">฿${totalWithdraw.toLocaleString('th-TH')}</td>
      <td class="right">฿${totalBalance.toLocaleString('th-TH')}</td>
    </tr>
  </tbody>
</table>

<div class="signatures">
  <div class="sig">
    <div class="sig-line">ลงชื่อ ครูผู้รับผิดชอบ<br>(.......................................)<br>วันที่ ...... / ...... / ......</div>
  </div>
  <div class="sig">
    <div class="sig-line">ลงชื่อ ผู้ตรวจสอบ<br>(.......................................)<br>วันที่ ...... / ...... / ......</div>
  </div>
  <div class="sig">
    <div class="sig-line">ลงชื่อ ผู้อำนวยการโรงเรียน<br>(.......................................)<br>วันที่ ...... / ...... / ......</div>
  </div>
</div>

<div class="footer">สร้างโดยระบบออมเงินนักเรียน | Student Saving Management System</div>
</body>
</html>`;
}
