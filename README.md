# 📚 ระบบบริหารจัดการออมเงินนักเรียน
## Student Saving Management System

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Thai](https://img.shields.io/badge/language-ภาษาไทย-red)

ระบบบริหารจัดการออมเงินนักเรียนสำหรับโรงเรียนประถมและมัธยม พัฒนาด้วย HTML + TailwindCSS + Google Apps Script + Google Sheets **ใช้งานฟรี ไม่มีค่า Server**

---

## ✨ ฟีเจอร์หลัก

- 🔐 **ระบบ Login** - แยกสิทธิ์ Admin และ Teacher
- 📊 **Dashboard** - ดูสถิติการออมแบบ Real-time
- 👥 **จัดการนักเรียน** - CRUD + ค้นหา + Filter ห้องเรียน
- 💰 **ฝากเงิน** - ค้นหานักเรียน + บันทึกทันที
- 💸 **ถอนเงิน** - ตรวจสอบยอดอัตโนมัติ
- 📋 **ประวัติรายการ** - Filter + ค้นหาได้
- 📄 **รายงาน PDF** - รายคน / รายห้อง / รายเดือน พร้อมลายเซ็น
- 🌙 **Dark Mode** - รองรับการใช้งานกลางคืน
- 📱 **Responsive** - ใช้งานได้ทั้งมือถือและคอมพิวเตอร์

---

## 🏗 โครงสร้างโปรเจกต์

```
student-saving-system/
│
├── frontend/
│   └── index.html          ← ไฟล์หน้าเว็บหลัก (รวมทุกหน้าแล้ว)
│
├── backend-gas/
│   ├── Code.gs             ← ไฟล์หลัก + Router
│   ├── Auth.gs             ← ระบบ Login / Token
│   ├── Student.gs          ← CRUD นักเรียน
│   ├── Transaction.gs      ← ฝาก/ถอน/ดูประวัติ
│   ├── Report.gs           ← สร้าง PDF
│   └── appsscript.json     ← Config GAS
│
├── docs/
│   └── setup-guide.md
│
└── README.md
```

---

## 🚀 วิธี Deploy (ทำตามขั้นตอน)

### ขั้นตอนที่ 1: สร้าง Google Sheets

1. ไปที่ [sheets.google.com](https://sheets.google.com) และสร้าง Spreadsheet ใหม่
2. ตั้งชื่อว่า **"ระบบออมเงินนักเรียน"**
3. คัดลอก **Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### ขั้นตอนที่ 2: สร้าง Google Apps Script

1. ใน Google Sheets ไปที่ **Extensions → Apps Script**
2. ลบโค้ดเดิมออกทั้งหมด
3. สร้างไฟล์ตามนี้:

   **สร้างไฟล์ Code.gs** → วางโค้ดจาก `backend-gas/Code.gs`

   **คลิก + เพิ่มไฟล์ → Script** → ตั้งชื่อ `Auth` → วางโค้ดจาก `Auth.gs`

   ทำแบบเดียวกันกับ `Student.gs`, `Transaction.gs`, `Report.gs`

4. แก้ไข **SPREADSHEET_ID** ใน `Code.gs`:
   ```javascript
   const SPREADSHEET_ID = 'ใส่ ID ที่คัดลอกในขั้นตอนที่ 1';
   ```

5. **รันฟังก์ชัน setupDefaultUsers** เพื่อสร้างผู้ใช้เริ่มต้น:
   - คลิก **Run** → เลือก `setupDefaultUsers`
   - อนุญาต Permissions ที่ Google ขอ

### ขั้นตอนที่ 3: Deploy เป็น Web App

1. คลิก **Deploy → New deployment**
2. เลือก **Type: Web app**
3. ตั้งค่า:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. คลิก **Deploy**
5. คัดลอก **Web app URL** ที่ได้

### ขั้นตอนที่ 4: เชื่อม Frontend

1. เปิดไฟล์ `frontend/index.html`
2. แก้ไขบรรทัดนี้:
   ```javascript
   const API_URL = 'วาง Web app URL ที่ได้จากขั้นตอนที่ 3';
   const USE_DEMO = false; // เปลี่ยนเป็น false
   ```

### ขั้นตอนที่ 5: Deploy บน GitHub Pages

1. สร้าง Repository ใหม่บน GitHub
2. Upload ไฟล์ทั้งหมด
3. ไปที่ **Settings → Pages**
4. เลือก Source: **Deploy from a branch → main**
5. รอ 2-3 นาที เว็บจะขึ้นที่ `https://[username].github.io/[repo-name]/frontend/`

---

## 👤 ข้อมูล Login เริ่มต้น

| ชื่อผู้ใช้ | รหัสผ่าน | สิทธิ์ |
|-----------|----------|--------|
| admin | admin123 | Admin (ทุกสิทธิ์) |
| teacher | teacher123 | Teacher (ฝาก/ถอน/ดูรายงาน) |

> **⚠️ สำคัญ**: เปลี่ยนรหัสผ่านทันทีหลัง Deploy จริง

---

## 📊 โครงสร้าง Google Sheets

ระบบจะสร้าง Sheet อัตโนมัติเมื่อใช้งาน:

### Sheet: Students
| คอลัมน์ | ความหมาย |
|---------|----------|
| student_id | รหัสอ้างอิง (Auto) |
| student_code | รหัสนักเรียน |
| firstname | ชื่อ |
| lastname | นามสกุล |
| classroom | ห้องเรียน |
| gender | เพศ |
| birthdate | วันเกิด |
| parent_name | ชื่อผู้ปกครอง |
| phone | เบอร์โทร |
| balance | ยอดเงินคงเหลือ |
| status | สถานะ (active/deleted) |
| created_at | วันที่สร้าง |
| updated_at | วันที่แก้ไขล่าสุด |

### Sheet: Transactions
| คอลัมน์ | ความหมาย |
|---------|----------|
| transaction_id | รหัสรายการ |
| student_id | รหัสนักเรียน |
| date | วันที่ทำรายการ |
| type | ประเภท (deposit/withdraw) |
| amount | จำนวนเงิน |
| balance_after | ยอดหลังทำรายการ |
| note | หมายเหตุ |
| created_by | ผู้บันทึก |
| timestamp | เวลา |

---

## 🔐 Security

- ✅ รหัสผ่านเข้ารหัส SHA-256
- ✅ Token-based Authentication
- ✅ Session หมดอายุใน 8 ชั่วโมง
- ✅ ตรวจสอบสิทธิ์ทุก API Call
- ✅ Audit Log บันทึกทุกการกระทำ
- ✅ ป้องกัน Duplicate Transaction
- ✅ Validate Input ทุก Field

---

## 📱 รองรับอุปกรณ์

- ✅ คอมพิวเตอร์ (Desktop)
- ✅ แท็บเล็ต (Tablet)
- ✅ มือถือ (Mobile)

---

## 🛠 Tech Stack

| ส่วน | เทคโนโลยี |
|-----|-----------|
| Frontend | HTML5 + TailwindCSS CDN + Vanilla JS |
| Backend | Google Apps Script (V8) |
| Database | Google Sheets |
| PDF | Apps Script HTML Service |
| Hosting | GitHub Pages (ฟรี) |

---

## ❓ คำถามที่พบบ่อย

**Q: ระบบรองรับนักเรียนกี่คน?**
A: รองรับได้ถึง 10,000+ คน (Google Sheets รองรับ 10 ล้านเซลล์)

**Q: ข้อมูลปลอดภัยไหม?**
A: ข้อมูลเก็บใน Google Drive ของโรงเรียน มีระบบ Access Control ของ Google

**Q: ใช้งานฟรีหรือไม่?**
A: ฟรีทั้งหมด! Google Workspace Education มี quota เพียงพอสำหรับโรงเรียน

**Q: Offline ได้ไหม?**
A: ต้องการ Internet สำหรับเชื่อมต่อ Google Sheets (โหมด Demo ใช้ Offline ได้)

---

## 📞 Support

หากพบปัญหา สามารถแจ้ง Issue ใน GitHub Repository ได้เลย

---

## 📄 License

MIT License - ใช้งานได้อย่างอิสระสำหรับโรงเรียน
