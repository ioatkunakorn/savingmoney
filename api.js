// ============================================================
// api.js - Service สำหรับเชื่อมต่อ Google Apps Script API
// ใช้งาน: import หรือ include ในไฟล์ HTML
// ============================================================

class SavingAPI {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.token = localStorage.getItem('saving_token') || null;
  }

  // ============================================================
  // _call - เรียก API
  // ============================================================
  async _call(action, params = {}, body = null) {
    const url = new URL(this.apiUrl);
    url.searchParams.set('action', action);
    if (this.token) url.searchParams.set('token', this.token);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const options = { method: 'GET' };
    if (body) {
      options.method = 'POST';
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify({ ...body, token: this.token, action });
    }

    try {
      const res = await fetch(url.toString(), options);
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ' + err.message };
    }
  }

  // ============================================================
  // AUTH
  // ============================================================
  async login(username, password) {
    const result = await this._call('login', {}, { username, password });
    if (result.success && result.data?.token) {
      this.token = result.data.token;
      localStorage.setItem('saving_token', this.token);
      localStorage.setItem('saving_user', JSON.stringify(result.data.user));
    }
    return result;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('saving_token');
    localStorage.removeItem('saving_user');
  }

  getCurrentUser() {
    const user = localStorage.getItem('saving_user');
    return user ? JSON.parse(user) : null;
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
  async getDashboard() {
    return this._call('getDashboard');
  }

  // ============================================================
  // STUDENTS
  // ============================================================
  async getStudents({ search = '', classroom = '', page = 1, pageSize = 50 } = {}) {
    return this._call('getStudents', { search, classroom, page, pageSize });
  }

  async addStudent(studentData) {
    return this._call('addStudent', {}, studentData);
  }

  async updateStudent(studentData) {
    return this._call('updateStudent', {}, studentData);
  }

  async deleteStudent(studentId) {
    return this._call('deleteStudent', {}, { student_id: studentId });
  }

  // ============================================================
  // TRANSACTIONS
  // ============================================================
  async deposit({ studentId, amount, note, date } = {}) {
    return this._call('deposit', {}, {
      student_id: studentId,
      amount,
      note: note || '',
      date: date || new Date().toISOString().split('T')[0]
    });
  }

  async withdraw({ studentId, amount, note, date } = {}) {
    return this._call('withdraw', {}, {
      student_id: studentId,
      amount,
      note: note || '',
      date: date || new Date().toISOString().split('T')[0]
    });
  }

  async getTransactions({ studentId = '', type = '', dateFrom = '', dateTo = '', page = 1, pageSize = 50 } = {}) {
    return this._call('getTransactions', {
      student_id: studentId, type, date_from: dateFrom, date_to: dateTo, page, pageSize
    });
  }

  // ============================================================
  // REPORTS
  // ============================================================
  async generateReport({ month, year, classroom = '', type = 'monthly' } = {}) {
    return this._call('generateReport', { month, year, classroom, type });
  }

  // ดาวน์โหลด PDF จาก base64
  downloadPDF(base64, filename) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Export สำหรับใช้งาน
// const api = new SavingAPI('YOUR_GAS_URL');
