<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';

bootstrap_api();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handle_history();
} elseif ($method === 'POST') {
    handle_receive();
} else {
    json_response(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

function handle_history(): void
{
    try {
        $stmt = db()->query(
            'SELECT id, note, total_cost, receive_date, created_at FROM receive_orders ORDER BY receive_date DESC, id DESC LIMIT 50'
        );
        $records = [];
        while ($order = $stmt->fetch()) {
            $itemsStmt = db()->prepare(
                'SELECT name, qty, supplier, cost, sale_price FROM receive_items WHERE receive_order_id = ?'
            );
            $itemsStmt->execute([$order['id']]);
            $items = [];
            while ($item = $itemsStmt->fetch()) {
                $items[] = [
                    'name' => $item['name'],
                    'qty' => (int) $item['qty'],
                    'supplier' => $item['supplier'],
                    'price' => (float) $item['cost'],
                    'salePrice' => (float) $item['sale_price'],
                ];
            }
            $records[] = [
                'date' => $order['receive_date'],
                'note' => $order['note'] ?? '',
                'items' => $items,
                'total' => (float) $order['total_cost'],
            ];
        }
        json_response(['status' => 'success', 'history' => $records]);
    } catch (PDOException $e) {
        error_log('receives.php GET: ' . $e->getMessage());
        json_response(['status' => 'error', 'message' => 'ເກີດຂໍ້ຜິດພາດ'], 500);
    }
}

function handle_receive(): void
{
    $body = read_json_body();
    $items = $body['items'] ?? [];
    $note = trim((string) ($body['note'] ?? ''));
    if (!is_array($items) || count($items) === 0) {
        json_response(['status' => 'error', 'message' => 'ບໍ່ມີລາຍການສິນຄ້າ']);
    }

    $receiveDate = trim((string) ($body['receive_date'] ?? ''));
    if ($receiveDate === '') {
        $receiveDate = date('Y-m-d');
    }

    db()->beginTransaction();
    try {
        $grandTotal = 0.0;
        foreach ($items as $item) {
            $qty = (int) ($item['qty'] ?? 0);
            $cost = (float) ($item['price'] ?? $item['cost'] ?? 0);
            if ($qty > 0) {
                $grandTotal += $cost * $qty;
            }
        }

        $orderStmt = db()->prepare(
            'INSERT INTO receive_orders (note, total_cost, receive_date) VALUES (?,?,?)'
        );
        $orderStmt->execute([$note ?: null, $grandTotal, $receiveDate]);
        $orderId = (int) db()->lastInsertId();

        $itemInsert = db()->prepare(
            'INSERT INTO receive_items (receive_order_id, product_id, name, detail, category, supplier, cost, sale_price, qty, image_url)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        );

        $savedCount = 0;

        foreach ($items as $item) {
            $name = trim((string) ($item['name'] ?? ''));
            $qty = (int) ($item['qty'] ?? 0);
            $cost = (float) ($item['price'] ?? $item['cost'] ?? 0);
            $salePrice = (float) ($item['salePrice'] ?? $item['sale_price'] ?? 0);
            $category = in_array($item['category'] ?? '', ['fish', 'food'], true) ? $item['category'] : 'fish';
            $detail = trim((string) ($item['detail'] ?? ''));
            $supplier = trim((string) ($item['supplier'] ?? '')) ?: 'ຊັບພາຍເອີ້ທົ່ວໄປ';
            $imageUrl = trim((string) ($item['image_url'] ?? ''));
            if (str_starts_with($imageUrl, 'blob:')) {
                $imageUrl = '';
            }

            if ($name === '' || $qty <= 0) {
                continue;
            }

            $productId = find_or_create_product($name, $detail, $category, $cost, $salePrice, $qty, $imageUrl);

            $itemInsert->execute([
                $orderId,
                $productId,
                $name,
                $detail ?: null,
                $category,
                $supplier,
                $cost,
                $salePrice > 0 ? $salePrice : null,
                $qty,
                $imageUrl ?: null,
            ]);
            $savedCount++;
        }

        if ($savedCount === 0) {
            db()->rollBack();
            json_response(['status' => 'error', 'message' => 'ບໍ່ມີລາຍການສິນຄ້າທີ່ບັນທຶກໄດ້']);
        }

        db()->commit();
        json_response(['status' => 'success', 'message' => 'ບັນທຶກການຮັບເຂົ້າສຳເລັດ']);
    } catch (Throwable $e) {
        if (db()->inTransaction()) {
            db()->rollBack();
        }
        error_log('receives.php POST: ' . $e->getMessage());
        json_response(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
}

function find_or_create_product(
    string $name,
    string $detail,
    string $category,
    float $cost,
    float $salePrice,
    int $qty,
    string $imageUrl
): int {
    $find = db()->prepare('SELECT id, price FROM products WHERE name = ? AND category = ? LIMIT 1 FOR UPDATE');
    $find->execute([$name, $category]);
    $existing = $find->fetch();

    if ($existing) {
        $update = db()->prepare(
            'UPDATE products SET qty = qty + ?, cost = ?, price = IF(? > 0, ?, price), detail = COALESCE(?, detail),
             image_url = COALESCE(?, image_url) WHERE id = ?'
        );
        $update->execute([
            $qty,
            $cost,
            $salePrice,
            $salePrice,
            $detail ?: null,
            $imageUrl ?: null,
            $existing['id'],
        ]);
        return (int) $existing['id'];
    }

    $price = $salePrice > 0 ? $salePrice : max($cost * 1.3, 1);
    $insert = db()->prepare(
        'INSERT INTO products (name, detail, category, cost, price, qty, image_url) VALUES (?,?,?,?,?,?,?)'
    );
    $insert->execute([$name, $detail ?: null, $category, $cost, $price, $qty, $imageUrl ?: null]);
    return (int) db()->lastInsertId();
}
