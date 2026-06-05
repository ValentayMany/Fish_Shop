USE willowshop;

INSERT INTO users (username, password_hash, role, display_name, role_label) VALUES
('admin', '$2y$10$ZnJ7Ym.DI5j7Pjm38jdMCejszTsdKzK6SIinpem5r/PcdxV48eAru', 'admin', 'Admin', 'ເຈົ້າຂອງຮ້ານ'),
('staff', '$2y$10$.qlwzqN3h6GVW6pFm/1iW.VHP/unFxvZWsFpCKU3zQn0u5b4TfGRm', 'staff', 'พนักงาน', 'พนักงานขาย')
ON DUPLICATE KEY UPDATE username = username;
-- admin / admin1234  |  staff / staff1234

DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM receive_items;
DELETE FROM receive_orders;
DELETE FROM products;

INSERT INTO products (id, name, detail, category, cost, price, qty, image_url) VALUES
(1, 'ປາກັດ', 'Betta splendens', 'fish', 90, 150, 12, 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=300&q=80'),
(2, 'ປາທອງ', 'Carassius auratus', 'fish', 50, 80, 3, 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=300&q=80'),
(3, 'ປານີອອນ', 'Paracheirodon innesi', 'fish', 15, 25, 50, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&q=80'),
(4, 'ປາດິສຄັດ', 'Symphysodon spp.', 'fish', 800, 1200, 5, 'https://images.unsplash.com/photo-1572111504021-40afd33e15dd?w=300&q=80'),
(5, 'ປາອະໂຣວານ່າ', 'Scleropages formosus', 'fish', 6000, 8500, 2, 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80'),
(6, 'ປາຫາງນົກຍູງ', 'Poecilia reticulata', 'fish', 20, 30, 80, 'https://images.unsplash.com/photo-1617130456185-da943e3fcc17?w=300&q=80'),
(101, 'ອາຫານປາກັດ', 'Betta Bits — Hikari', 'food', 30, 45, 20, 'https://images.unsplash.com/photo-1608454537062-4093bf3df404?w=300&q=80'),
(102, 'ອາຫານປາທອງ', 'Goldfish Pellet — Tetra', 'food', 40, 60, 15, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&q=80'),
(103, 'ອາຫານປາທົ່ວໄປ', 'Tropical Flakes — Sera', 'food', 35, 55, 18, 'https://images.unsplash.com/photo-1626618012641-bfbca5a31239?w=300&q=80');
