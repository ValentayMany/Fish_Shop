<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';

bootstrap_api();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

try {
    $pdo = db();
    $today = (new DateTime('today'))->format('Y-m-d');
    $weekStart = (new DateTime('today'))->modify('-6 days')->format('Y-m-d');

    $todayStmt = $pdo->prepare(
        'SELECT COALESCE(SUM(total_amount), 0) AS sales_total, COUNT(*) AS bill_count
         FROM sales WHERE sold_at >= ? AND sold_at < DATE_ADD(?, INTERVAL 1 DAY)'
    );
    $todayStmt->execute([$today . ' 00:00:00', $today]);
    $todayRow = $todayStmt->fetch() ?: ['sales_total' => 0, 'bill_count' => 0];

    $lowStockStmt = $pdo->query(
        'SELECT id, name, category, qty FROM products WHERE qty < 10 ORDER BY qty ASC, name ASC LIMIT 20'
    );
    $lowStock = [];
    while ($row = $lowStockStmt->fetch()) {
        $lowStock[] = [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'category' => $row['category'],
            'qty' => (int) $row['qty'],
        ];
    }

    $chartDays = [];
    $cursor = new DateTime($weekStart);
    $endDt = new DateTime($today);
    while ($cursor <= $endDt) {
        $chartDays[$cursor->format('Y-m-d')] = [
            'label' => $cursor->format('d/m'),
            'sales' => 0.0,
        ];
        $cursor->modify('+1 day');
    }

    $chartStmt = $pdo->prepare(
        'SELECT DATE(sold_at) AS d, SUM(total_amount) AS sales
         FROM sales
         WHERE sold_at >= ? AND sold_at < DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY DATE(sold_at)'
    );
    $chartStmt->execute([$weekStart . ' 00:00:00', $today]);
    while ($row = $chartStmt->fetch()) {
        $key = $row['d'];
        if (isset($chartDays[$key])) {
            $chartDays[$key]['sales'] = (float) $row['sales'];
        }
    }

    $topStmt = $pdo->prepare(
        'SELECT si.product_name AS name, SUM(si.qty) AS qty, SUM(si.line_total) AS revenue
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         WHERE s.sold_at >= ? AND s.sold_at < DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY si.product_name
         ORDER BY qty DESC
         LIMIT 5'
    );
    $topStmt->execute([$weekStart . ' 00:00:00', $today]);
    $topRows = $topStmt->fetchAll();
    $maxQty = 0;
    foreach ($topRows as $r) {
        $maxQty = max($maxQty, (int) $r['qty']);
    }

    $topProducts = [];
    $rank = 1;
    foreach ($topRows as $r) {
        $qty = (int) $r['qty'];
        $topProducts[] = [
            'rank' => $rank++,
            'name' => $r['name'],
            'qty' => $qty,
            'revenue' => (float) $r['revenue'],
            'width_pct' => $maxQty > 0 ? round(($qty / $maxQty) * 100) : 0,
        ];
    }

    json_response([
        'status' => 'success',
        'data' => [
            'today' => [
                'sales_total' => (float) $todayRow['sales_total'],
                'bill_count' => (int) $todayRow['bill_count'],
            ],
            'low_stock' => $lowStock,
            'low_stock_count' => count($lowStock),
            'weekly_chart' => array_values($chartDays),
            'top_products' => $topProducts,
        ],
    ]);
} catch (PDOException $e) {
    error_log('dashboard.php: ' . $e->getMessage());
    json_response(['status' => 'error', 'message' => 'ເກີດຂໍ້ຜິດພາດໃນຖານຂໍ້ມູນ'], 500);
}
