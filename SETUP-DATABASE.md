# WillowShop — ติดตั้ง Database (PHP + MySQL)

โปรเจ็กต์ใช้ **PHP** + **MySQL/MariaDB** เก็บสินค้า การขาย การรับเข้า และรายงาน

## สิ่งที่ต้องมี

- PHP 8.1+ (เปิด `pdo_mysql`)
- MySQL หรือ MariaDB
- XAMPP / Laragon หรือ `php` ใน PATH

## 1) สร้างฐานข้อมูล

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

## 2) ตั้งค่า `.env`

คัดลอกจาก `.env.example` แล้วใส่รหัสผ่าน MySQL:

```
DB_HOST=127.0.0.1
DB_NAME=willowshop
DB_USER=root
DB_PASS=รหัสผ่านของคุณ
```

## 3) รันเว็บ

จากโฟลเดอร์ `TONLONG`:

```bash
php -S localhost:8080 router.php
```

เปิด: `http://localhost:8080/pages/login.html`

### XAMPP

คัดลอกโฟลเดอร์ไป `C:\xampp\htdocs\willowshop` แล้วเปิด  
`http://localhost/willowshop/pages/login.html`  
(ต้องมีไฟล์ `.env` ที่ root โปรเจ็กต์)

## บัญชีทดสอบ

| Username | Password   | สิทธิ์ |
|----------|------------|--------|
| admin    | admin1234  | ทุกหน้า |
| staff    | staff1234  | POS เท่านั้น |

## API (PHP)

| Method | ไฟล์ | คำอธิบาย |
|--------|------|----------|
| POST | `/api/auth.php` | เข้าสู่ระบบ |
| GET/POST/PUT/DELETE | `/api/products.php` | สต็อกสินค้า |
| GET/POST | `/api/sales.php` | ขาย / ประวัติวันนี้ |
| GET/POST | `/api/receives.php` | รับสินค้าเข้า |
| GET | `/api/reports.php` | รายงาน |
