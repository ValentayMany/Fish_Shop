<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';

bootstrap_api();

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        handle_today_history();
    } elseif ($method === 'POST') {
        handle_checkout();
    } else {
        json_response(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
} catch (PDOException $e) {
    error_log('sales.php: ' . $e->getMessage());
    json_response(['status' => 'error', 'message' => 'ເກີດຂໍ້ຜິດພາດໃນຖານຂໍ້ມູນ'], 500);
} catch (Throwable $e) {
    error_log('sales.php: ' . $e->getMessage());
    json_response(['status' => 'error', 'message' => $e->getMessage()], 400);
}

function handle_today_history(): void
{
    $stmt = db()->query(
        "SELECT id, bill_number, total_amount, payment_method, sold_at
         FROM sales
         WHERE DATE(sold_at) = CURDATE()
         ORDER BY sold_at DESC"
    );
    $sales = [];
    while ($sale = $stmt->fetch()) {
        $itemsStmt = db()->prepare(
            'SELECT product_name, qty, unit_price FROM sale_items WHERE sale_id = ?'
        );
        $itemsStmt->execute([$sale['id']]);
        $parts = [];
        while ($item = $itemsStmt->fetch()) {
            $parts[] = $item['product_name'] . ' ×' . $item['qty'];
        }
        $soldAt = new DateTime($sale['sold_at']);
        $sales[] = [
            'items' => implode(', ', $parts),
            'time' => $soldAt->format('H:i'),
            'total' => (float) $sale['total_amount'],
            'method' => $sale['payment_method'],
            'bill_number' => $sale['bill_number'],
        ];
    }
    json_response(['status' => 'success', 'sales' => $sales]);
}

function handle_checkout(): void
{
    $body = read_json_body();
    $items = $body['items'] ?? [];
    if (!is_array($items) || count($items) === 0) {
        json_response(['status' => 'error', 'message' => 'ຕະກ້າວ່າງ']);
    }

    $paymentMethod = ($body['payment_method'] ?? 'cash') === 'transfer' ? 'transfer' : 'cash';
    $received = (float) ($body['received_amount'] ?? 0);
    $normalized = [];

    db()->beginTransaction();
    try {
        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $qty = (int) ($item['qty'] ?? 0);
            if ($productId <= 0 || $qty <= 0) {
                continue;
            }

            $p = db()->prepare('SELECT * FROM products WHERE id = ? FOR UPDATE');
            $p->execute([$productId]);
            $product = $p->fetch();
            if (!$product) {
                throw new RuntimeException('ບໍ່ພົບສິນຄ້າ #' . $productId);
            }
            if ((int) $product['qty'] < $qty) {
                throw new RuntimeException('ສິນຄ້າ "' . $product['name'] . '" ບໍ່ພໍໃນສະຕອັກ');
            }

            $unitPrice = (float) $product['price'];
            $normalized[] = [
                'product_id' => $productId,
                'product_name' => $product['name'],
                'category' => $product['category'],
                'qty' => $qty,
                'unit_price' => $unitPrice,
                'unit_cost' => (float) $product['cost'],
                'line_total' => $unitPrice * $qty,
            ];
        }

        if (count($normalized) === 0) {
            db()->rollBack();
            json_response(['status' => 'error', 'message' => 'ບໍ່ມີລາຍການທີ່ຖືກຕ້ອງ']);
        }

        $discountAmount = max(0, (float) ($body['discount_amount'] ?? 0));
        $subtotal = array_sum(array_column($normalized, 'line_total'));
        $total = max(0, $subtotal - $discountAmount);

        if ($paymentMethod === 'cash' && $received < $total) {
            db()->rollBack();
            json_response(['status' => 'error', 'message' => 'ຮັບເງິນມາບໍ່ພໍ'], 400);
        }

        if ($paymentMethod === 'transfer') {
            $received = $total;
        }

        $change = max(0, $received - $total);
        $billNumber = 'INV-' . date('ymd') . '-' . str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT);

        $saleStmt = db()->prepare(
            'INSERT INTO sales (bill_number, total_amount, discount_amount, payment_method, received_amount, change_amount)
             VALUES (?,?,?,?,?,?)'
        );
        $saleStmt->execute([$billNumber, $total, $discountAmount, $paymentMethod, $received, $change]);
        $saleId = (int) db()->lastInsertId();

        $itemStmt = db()->prepare(
            'INSERT INTO sale_items (sale_id, product_id, product_name, category, qty, unit_price, unit_cost, line_total)
             VALUES (?,?,?,?,?,?,?,?)'
        );
        $stockStmt = db()->prepare('UPDATE products SET qty = qty - ? WHERE id = ? AND qty >= ?');

        foreach ($normalized as $line) {
            $stockStmt->execute([$line['qty'], $line['product_id'], $line['qty']]);
            if ($stockStmt->rowCount() === 0) {
                throw new RuntimeException('ສິນຄ້າ "' . $line['product_name'] . '" ບໍ່ພໍໃນສະຕອັກ');
            }
            $itemStmt->execute([
                $saleId,
                $line['product_id'],
                $line['product_name'],
                $line['category'],
                $line['qty'],
                $line['unit_price'],
                $line['unit_cost'],
                $line['line_total'],
            ]);
        }

        db()->commit();

        json_response([
            'status' => 'success',
            'bill_number' => $billNumber,
            'total' => $total,
            'received' => $received,
            'change' => $change,
            'items' => $normalized,
        ]);
    } catch (Throwable $e) {
        if (db()->inTransaction()) {
            db()->rollBack();
        }
        throw $e;
    }
}
