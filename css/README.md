# Frontend structure

## CSS

| File | Purpose |
|------|---------|
| `style.css` | ธีมหลัก, sidebar, ตาราง, ฟอร์ม |
| `components.css` | คอมโพเนนต์ร่วม (grid, thumb, logout) |
| `pages/*.css` | สไตล์เฉพาะแต่ละหน้า |

## JavaScript

| File | Purpose |
|------|---------|
| `js/utils.js` | `escapeHtml`, `formatKip`, `localDateInputValue` |
| `js/api.js` | `AquaAPI` client |
| `js/auth.js` | login guard + `logout()` |
| `js/pages/*.js` | logic แต่ละหน้า |

ลำดับโหลด: `utils.js` → `api.js` → `auth.js` (ถ้ามี) → `pages/*.js`
