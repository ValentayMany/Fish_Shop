<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';

bootstrap_api();

$method = $_SERVER['REQUEST_METHOD'];

try {
    match ($method) {
        'GET' => handle_list(),
        'POST' => handle_create(),
        'PUT' => handle_update(),
        'DELETE' => handle_delete(),
        default => json_response(['status' => 'error', 'message' => 'Method not allowed'], 405),
    };
} catch (PDOException $e) {
    error_log('products.php: ' . $e->getMessage());
    json_response(['status' => 'error', 'message' => 'ເກີດຂໍ້ຜິດພາດໃນຖານຂໍ້ມູນ'], 500);
}

function product_row(array $row): array
{
    $url = $row['image_url'] ?? '';
    $imgHtml = $url !== ''
        ? '<img src="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" class="item-thumb">'
        : ($row['category'] === 'fish' ? '<div style="font-size:24px;">🐟</div>' : '<div style="font-size:24px;">🥣</div>');

    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'detail' => $row['detail'] ?? '',
        'category' => $row['category'],
        'cost' => (float) $row['cost'],
        'price' => (float) $row['price'],
        'qty' => (int) $row['qty'],
        'image_url' => $url,
        'imgHtml' => $imgHtml,
    ];
}

function handle_list(): void
{
    $stmt = db()->query('SELECT * FROM products ORDER BY category, id');
    $products = [];
    while ($row = $stmt->fetch()) {
        $products[] = product_row($row);
    }
    json_response(['status' => 'success', 'products' => $products]);
}

function handle_create(): void
{
    $body = read_json_body();
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        json_response(['status' => 'error', 'message' => 'ກະລຸນາປ້ອນຊື່ສິນຄ້າ']);
    }

    $category = in_array($body['category'] ?? '', ['fish', 'food'], true) ? $body['category'] : 'fish';
    $cost = max(0, (float) ($body['cost'] ?? 0));
    $price = max(0, (float) ($body['price'] ?? 0));
    $qty = max(0, (int) ($body['qty'] ?? 0));
    $detail = trim((string) ($body['detail'] ?? ''));
    $imageUrl = sanitize_image_url(trim((string) ($body['image_url'] ?? '')));

    $stmt = db()->prepare(
        'INSERT INTO products (name, detail, category, cost, price, qty, image_url) VALUES (?,?,?,?,?,?,?)'
    );
    $stmt->execute([$name, $detail ?: null, $category, $cost, $price, $qty, $imageUrl ?: null]);
    $id = (int) db()->lastInsertId();

    $fetched = db()->prepare('SELECT * FROM products WHERE id = ?');
    $fetched->execute([$id]);
    $row = $fetched->fetch();
    if (!$row) {
        json_response(['status' => 'error', 'message' => 'ບໍ່ພົບສິນຄ້າຫຼັງບັນທຶກ'], 500);
    }

    json_response(['status' => 'success', 'product' => product_row($row)], 201);
}

function handle_update(): void
{
    $body = read_json_body();
    $id = (int) ($body['id'] ?? 0);
    if ($id <= 0) {
        json_response(['status' => 'error', 'message' => 'ລະບຸ id ສິນຄ້າ']);
    }

    $check = db()->prepare('SELECT id FROM products WHERE id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) {
        json_response(['status' => 'error', 'message' => 'ບໍ່ພົບສິນຄ້າ'], 404);
    }

    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        json_response(['status' => 'error', 'message' => 'ກະລຸນາປ້ອນຊື່ສິນຄ້າ']);
    }

    $category = in_array($body['category'] ?? '', ['fish', 'food'], true) ? $body['category'] : 'fish';
    $cost = max(0, (float) ($body['cost'] ?? 0));
    $price = max(0, (float) ($body['price'] ?? 0));
    $qty = max(0, (int) ($body['qty'] ?? 0));
    $detail = trim((string) ($body['detail'] ?? ''));
    $imageUrl = sanitize_image_url(trim((string) ($body['image_url'] ?? '')));

    $stmt = db()->prepare(
        'UPDATE products SET name=?, detail=?, category=?, cost=?, price=?, qty=?, image_url=? WHERE id=?'
    );
    $stmt->execute([$name, $detail ?: null, $category, $cost, $price, $qty, $imageUrl ?: null, $id]);

    $fetched = db()->prepare('SELECT * FROM products WHERE id = ?');
    $fetched->execute([$id]);
    $row = $fetched->fetch();
    if (!$row) {
        json_response(['status' => 'error', 'message' => 'ບໍ່ພົບສິນຄ້າ'], 404);
    }
    json_response(['status' => 'success', 'product' => product_row($row)]);
}

function sanitize_image_url(string $url): string
{
    if ($url === '' || str_starts_with($url, 'blob:')) {
        return '';
    }
    return $url;
}

function handle_delete(): void
{
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        json_response(['status' => 'error', 'message' => 'ລະບຸ id ສິນຄ້າ']);
    }

    $stmt = db()->prepare('DELETE FROM products WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        json_response(['status' => 'error', 'message' => 'ບໍ່ພົບສິນຄ້າ'], 404);
    }
    json_response(['status' => 'success']);
}
