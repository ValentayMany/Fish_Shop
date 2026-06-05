# 🐠 WillowShop — สรุปโปรเจกต์ & แผนพัฒนา

> **อัปเดตล่าสุด:** 4 มิถุนายน 2026  
> **สถานะ:** ✅ ใช้งานได้ (MVP)

---

## 📋 ภาพรวมโปรเจกต์

**WillowShop** เป็นระบบจัดการร้านขายปลาครบวงจร (ภาษาลาว) ประกอบด้วย:

- **ระบบ POS** — ขายสินค้า คำนวณเงินทอน พิมพ์ใบเสร็จ
- **ระบบสต็อกสินค้า** — เพิ่ม/แก้ไข/ลบสินค้า ดูจำนวนคงเหลือ
- **ระบบรับสินค้าจากซัพพลายเออร์** — บันทึกบิลรับสินค้า อัปเดตสต็อกอัตโนมัติ
- **ระบบรายงาน** — ยอดขายรายวัน/รายเดือน สรุปกำไร-ขาดทุน
- **ระบบ Login/Auth** — เข้าสู่ระบบด้วย username/password

---

## 🏗️ โครงสร้างโปรเจกต์

```
TONLONG/
├── .env                    # ค่า config (DB host, user, pass, name)
├── .htaccess               # URL rewrite rules
├── router.php              # PHP built-in server router
├── SETUP-DATABASE.md       # คู่มือติดตั้ง database
│
├── api/                    # 🔌 Backend REST API (PHP)
│   ├── lib/
│   │   ├── db.php          # เชื่อมต่อ MySQL (PDO)
│   │   ├── env.php         # อ่าน .env file
│   │   └── response.php    # JSON response helpers
│   ├── auth.php            # Login/Logout API
│   ├── users.php           # CRUD จัดการผู้ใช้ (admin only)
│   ├── dashboard.php       # ข้อมูล Dashboard หน้าแรก
│   ├── products.php        # CRUD สินค้า
│   ├── receives.php        # บันทึกการรับสินค้า
│   ├── reports.php         # ดึงข้อมูลรายงาน
│   ├── sales.php           # บันทึกการขาย
│   └── upload.php          # อัปโหลดรูปภาพสินค้า
│
├── database/               # 🗄️ SQL Schema & Seed
│   ├── schema.sql          # โครงสร้างตาราง MySQL
│   └── seed.sql            # ข้อมูลตัวอย่าง
│
├── pages/                  # 📄 หน้า HTML (SPA-like)
│   ├── login.html          # หน้าเข้าสู่ระบบ
│   ├── dashboard.html      # หน้า Dashboard หน้าแรก (admin)
│   ├── pos.html            # หน้าขายสินค้า (POS)
│   ├── stock.html          # หน้าจัดการสต็อก
│   ├── supplier.html       # หน้ารับสินค้าจากซัพพลายเออร์
│   ├── report.html         # หน้ารายงาน
│   └── users.html          # หน้าจัดการผู้ใช้ (admin)
│
├── js/                     # ⚙️ JavaScript
│   ├── api.js              # AquaAPI — fetch wrapper
│   ├── auth.js             # ตรวจสอบ session / logout
│   ├── utils.js            # AppUtils — formatKip, escapeHtml ฯลฯ
│   └── pages/
│       ├── login.js
│       ├── dashboard.js    # Logic หน้า Dashboard
│       ├── pos.js          # Logic หน้า POS (ตะกร้า, ชำระเงิน, ใบเสร็จ)
│       ├── stock.js        # Logic หน้าสต็อก (CRUD, อัปโหลดรูป)
│       ├── supplier.js     # Logic หน้ารับสินค้า (อัปโหลดรูป)
│       ├── report.js       # Logic หน้ารายงาน (กราฟ, ตาราง)
│       └── users.js        # Logic หน้าจัดการผู้ใช้
│
├── css/                    # 🎨 Stylesheets
│   ├── style.css           # Global styles / Design system
│   ├── components.css      # Shared components
│   ├── fonts.css           # Font imports
│   └── pages/
│       ├── login.css
│       ├── dashboard.css
│       ├── pos.css
│       ├── stock.css
│       ├── supplier.css
│       ├── report.css
│       └── users.css
│
└── uploads/                # 📁 โฟลเดอร์เก็บรูปภาพสินค้าที่อัปโหลด
```

---

## 🗄️ ตารางฐานข้อมูล (MySQL — `willowshop`)

| ตาราง | หน้าที่ |
|---|---|
| `users` | ข้อมูลผู้ใช้ (admin/staff), username, password hash |
| `products` | สินค้า (ชื่อ, รายละเอียด, หมวดหมู่ fish/food, ต้นทุน, ราคาขาย, จำนวนคงเหลือ, รูปภาพ) |
| `sales` | บิลขาย (เลขบิล, ยอดรวม, วิธีชำระเงิน, เงินรับ, เงินทอน) |
| `sale_items` | รายละเอียดสินค้าในบิลขาย |
| `receive_orders` | บิลรับสินค้าจากซัพพลายเออร์ |
| `receive_items` | รายละเอียดสินค้าในบิลรับ |

---

## 🛠️ เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | HTML5 + CSS3 + Vanilla JavaScript |
| Backend | PHP 8.x (REST API) |
| Database | MySQL (via XAMPP) |
| Web Server | XAMPP Apache / PHP built-in server |
| Hosting (Dev) | `localhost:8080` หรือ `localhost/TONLONG` |

---

## ✅ ฟีเจอร์ที่ทำเสร็จแล้ว

### 1. ระบบ Login/Auth
- [x] เข้าสู่ระบบด้วย username/password
- [x] Session-based authentication
- [x] แยก role: admin / staff
- [x] หน้า Admin จัดการ users (เพิ่ม/ลบ/แก้ไข) ✨ ใหม่
- [x] เปลี่ยนรหัสผ่าน ✨ ใหม่
- [x] แยกสิทธิ์การเข้าถึง (admin เห็นทุกหน้า, staff เห็นแค่ POS) ✨ ใหม่

### 2. ระบบ POS (ขายสินค้า)
- [x] แสดงสินค้าแบบ Grid (แยก Tab ปลา/อาหารปลา)
- [x] ค้นหาสินค้าจากชื่อ
- [x] เพิ่ม/ลดจำนวนในตะกร้า
- [x] ตรวจสอบสต็อกก่อนขาย (ขายเกินสต็อกไม่ได้)
- [x] ระบบส่วนลด (บาท / เปอร์เซ็นต์)
- [x] ชำระเงินสด / โอนเงิน
- [x] คำนวณเงินทอน
- [x] พิมพ์ใบเสร็จ
- [x] ประวัติการขายวันนี้

### 3. ระบบสต็อกสินค้า
- [x] แสดงรายการสินค้าทั้งหมด
- [x] เพิ่มสินค้าใหม่
- [x] แก้ไขสินค้า (ชื่อ, ราคา, รายละเอียด)
- [x] ลบสินค้า
- [x] อัปโหลดรูปภาพสินค้า ✨ ใหม่

### 4. ระบบรับสินค้าจากซัพพลายเออร์
- [x] สร้างบิลรับสินค้า
- [x] เพิ่มสินค้าเข้าบิล (สินค้าที่มีอยู่ หรือ สินค้าใหม่)
- [x] กรอกชื่อซัพพลายเออร์, ต้นทุน, ราคาขาย, จำนวน
- [x] อัปโหลดรูปภาพสินค้าใหม่ ✨ ใหม่
- [x] บันทึกบิล → อัปเดตสต็อกอัตโนมัติ
- [x] ดูประวัติบิลรับสินค้า

### 5. ระบบรายงาน
- [x] ยอดขายรายวัน
- [x] ยอดขายรายเดือน
- [x] สรุปรายได้, ต้นทุน, กำไร
- [x] กราฟยอดขาย (Bar Chart)
- [x] ตารางรายละเอียดรายการขาย
- [x] กรองรายงานตามช่วงวันที่ ✨ ใหม่
- [x] Export รายงานเป็น PDF / Excel ✨ ใหม่
- [x] รายงานสินค้าขายดี / ขายไม่ดี ✨ ใหม่
- [x] รายงานสต็อกต่ำ (เตือนล่วงหน้า) ✨ ใหม่
- [x] รายงานตามซัพพลายเออร์ ✨ ใหม่

### 6. ระบบ Dashboard ✨ ใหม่
- [x] ยอดขายวันนี้ / จำนวนบิลวันนี้
- [x] แจ้งเตือนสินค้าคงเหลือต่ำ
- [x] กราฟยอดขาย 7 วันล่าสุด
- [x] สินค้าขายดี Top 5

### 7. ระบบอัปโหลดรูปภาพ ✨ ใหม่
- [x] Backend API (`api/upload.php`)
- [x] รองรับ JPEG, PNG, GIF, WebP
- [x] จำกัดขนาด 5MB
- [x] ตั้งชื่อไฟล์ unique ด้วย `uniqid()`
- [x] เก็บไฟล์ใน `uploads/`

---

## 🚀 แผนพัฒนาต่อไป (Roadmap)

### 🔴 ความสำคัญสูง (Priority High)

#### P1 — ระบบจัดการผู้ใช้ (User Management) ✅ เสร็จแล้ว
- [x] หน้า Admin จัดการ users (เพิ่ม/ลบ/แก้ไข)
- [x] เปลี่ยนรหัสผ่าน
- [x] แยกสิทธิ์การเข้าถึง (admin เห็นทุกหน้า, staff เห็นแค่ POS)

#### P2 — Dashboard หน้าแรก ✅ เสร็จแล้ว
- [x] หน้า Dashboard แสดงภาพรวม:
  - ยอดขายวันนี้
  - จำนวนบิลวันนี้
  - สินค้าคงเหลือต่ำ (แจ้งเตือน)
  - กราฟยอดขายสัปดาห์ล่าสุด
  - สินค้าขายดี Top 5

#### P3 — ปรับปรุงระบบรายงาน ✅ เสร็จแล้ว
- [x] กรองรายงานตามช่วงวันที่
- [x] Export รายงานเป็น PDF / Excel
- [x] รายงานสินค้าขายดี / ขายไม่ดี
- [x] รายงานสต็อกต่ำ (เตือนล่วงหน้า)
- [x] รายงานตามซัพพลายเออร์

---

### 🟡 ความสำคัญกลาง (Priority Medium)

#### P4 — ปรับปรุงระบบ POS
- [ ] Barcode / QR Code Scanner
- [ ] พักบิล (Hold order) — ขายหลายบิลพร้อมกัน
- [ ] คืนสินค้า (Refund)
- [ ] พิมพ์ใบเสร็จแบบ Thermal Printer (58mm/80mm)
- [ ] ระบบสมาชิก/ลูกค้าประจำ

#### P5 — ปรับปรุงระบบสต็อก
- [ ] แจ้งเตือนสินค้าใกล้หมด (Low stock alert)
- [ ] ตั้งค่า minimum stock ของแต่ละสินค้า
- [ ] บันทึกวันหมดอายุ (สำหรับอาหารปลา)
- [ ] ปรับสต็อกแบบ manual (stock adjustment)
- [ ] ประวัติการเคลื่อนไหวสต็อก (Stock movement log)

#### P6 — ระบบซัพพลายเออร์
- [ ] ฐานข้อมูลซัพพลายเออร์ (ชื่อ, เบอร์โทร, ที่อยู่)
- [ ] ดูประวัติการสั่งซื้อของแต่ละ supplier
- [ ] เปรียบเทียบราคาจาก supplier ต่างๆ

---

### 🟢 ความสำคัญต่ำ (Priority Low / Nice-to-have)

#### P7 — UI/UX Improvements
- [ ] Dark mode / Light mode toggle
- [ ] Responsive design (ใช้งานบนมือถือ)
- [ ] Animation & transitions
- [ ] Notification system (แจ้งเตือนใน app)
- [ ] Multiple language support (ลาว/ไทย/อังกฤษ)

#### P8 — ความปลอดภัย (Security)
- [ ] Password hashing ด้วย bcrypt (ถ้ายังไม่ได้ทำ)
- [ ] CSRF protection
- [ ] Rate limiting API
- [ ] Input validation ทั้ง frontend และ backend
- [ ] SQL injection prevention (ตรวจสอบ prepared statements)

#### P9 — โครงสร้างพื้นฐาน (Infrastructure)
- [ ] Deploy ขึ้น server จริง (VPS / Cloud)
- [ ] ตั้งค่า HTTPS
- [ ] Backup database อัตโนมัติ
- [ ] Docker container สำหรับ dev/prod
- [ ] CI/CD pipeline

#### P10 — ฟีเจอร์เสริม
- [ ] ระบบบัญชีรายรับ-รายจ่าย
- [ ] แชร์ใบเสร็จทาง LINE / QR code
- [ ] เชื่อมต่อเครื่องชั่งน้ำหนัก (สำหรับปลา)
- [ ] ระบบจัดการโปรโมชั่น
- [ ] API สำหรับ Mobile App (ในอนาคต)

---

## 🐛 Bug ที่แก้ไขแล้ว (Changelog)

### 2026-06-04
1. **[NEW]** P3 — ปรับปรุงรายงาน: สินค้าขายช้า, สต็อกต่ำ, supplier report, Export Excel (CSV)
2. **[NEW]** P2 — Dashboard หน้าแรก: `api/dashboard.php`, `pages/dashboard.html`, สถิติวันนี้ + กราฟ 7 วัน + Top 5 + low stock
2. **[NEW]** P1 — ระบบจัดการผู้ใช้: `api/users.php`, `pages/users.html`, CRUD + เปลี่ยนรหัสผ่าน, role guard
2. **[FIXED]** `pos.js` — SyntaxError จาก template literal ซ้ำซ้อน (ข้อมูล HTML ถูกก๊อปปี้ซ้ำ)
3. **[FIXED]** `pos.js` — ฟังก์ชัน `changeQty()` ถูก merge เข้ากับ `clearCart()` ทำให้ `{` ไม่ปิด
4. **[FIXED]** `api/upload.php` — ขาด `require_once 'lib/env.php'` ทำให้ `load_env()` หาไม่เจอ
5. **[NEW]** `api/upload.php` — เพิ่ม API อัปโหลดรูปภาพสินค้า
6. **[UPDATED]** `js/pages/stock.js` — อัปโหลดรูปจริงแทนการแจ้ง "ยังไม่รองรับ"
7. **[UPDATED]** `js/pages/supplier.js` — อัปโหลดรูปสินค้าใหม่ก่อน submit บิลรับสินค้า

---

## 🏃 วิธีรันโปรเจกต์

### ตัวเลือก A: ใช้ XAMPP
```bash
# 1. เปิด XAMPP → Start Apache + MySQL
# 2. Copy โฟลเดอร์โปรเจกต์ไปที่ D:\xampp\htdocs\TONLONG
# 3. Import database:
mysql -u root < database/schema.sql
mysql -u root willowshop < database/seed.sql
# 4. เปิดเบราว์เซอร์ → http://localhost/TONLONG
```

### ตัวเลือก B: ใช้ PHP Built-in Server
```bash
# 1. เปิด MySQL ก่อน (XAMPP หรือ standalone)
# 2. รันคำสั่ง:
php -S localhost:8080 router.php
# 3. เปิดเบราว์เซอร์ → http://localhost:8080
```

---

## 📝 หมายเหตุ

- **ไฟล์ `.env`** ต้องตั้งค่าให้ตรงกับ MySQL ของเครื่อง:
  ```
  DB_HOST=localhost
  DB_NAME=willowshop
  DB_USER=root
  DB_PASS=
  ```
- **โฟลเดอร์ `uploads/`** ต้อง writable (chmod 755 หรือ 775 บน Linux)
- ลบไฟล์ `fix_pos.py` ได้เมื่อไม่ต้องการใช้แล้ว (เป็น script ซ่อมโค้ดชั่วคราว)
