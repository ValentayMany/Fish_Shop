<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';

bootstrap_api();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

$range = $_GET['range'] ?? 'today';
[$start, $end] = resolve_date_range($range, $_GET['start_date'] ?? null, $_GET['end_date'] ?? null);

if ($start > $end) {
    [$start, $end] = [$end, $start];
}

try {
    $pdo = db();

    $salesStmt = $pdo->prepare(
        'SELECT COALESCE(SUM(total_amount), 0) AS sales_total,
                COUNT(*) AS transactions
         FROM sales WHERE sold_at >= ? AND sold_at < DATE_ADD(?, INTERVAL 1 DAY)'
    );
    $salesStmt->execute([$start . ' 00:00:00', $end]);
    $salesRow = $salesStmt->fetch() ?: ['sales_total' => 0, 'transactions' => 0];

    $profitStmt = $pdo->prepare(
        'SELECT COALESCE(SUM((si.unit_price - si.unit_cost) * si.qty), 0) AS profit_total,
                COALESCE(SUM(si.qty), 0) AS items_sold
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         WHERE s.sold_at >= ? AND s.sold_at < DATE_ADD(?, INTERVAL 1 DAY)'
    );
    $profitStmt->execute([$start . ' 00:00:00', $end]);
    $profitRow = $profitStmt->fetch() ?: ['profit_total' => 0, 'items_sold' => 0];

    $monthStart = date('Y-m-01');
    $monthEnd = date('Y-m-t');
    $monthStmt = $pdo->prepare(
        'SELECT COALESCE(SUM(total_amount), 0) AS monthly_sales FROM sales
         WHERE sold_at >= ? AND sold_at < DATE_ADD(?, INTERVAL 1 DAY)'
    );
    $monthStmt->execute([$monthStart . ' 00:00:00', $monthEnd]);
    $monthlySales = (float) ($monthStmt->fetch()['monthly_sales'] ?? 0);

    $bestStmt = $pdo->query(
        "SELECT si.product_name AS name, SUM(si.qty) AS qty
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         WHERE s.sold_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         GROUP BY si.product_name
         ORDER BY qty DESC
         LIMIT 1"
    );
    $best = $bestStmt->fetch();
    $bestName = $best['name'] ?? '—';
    $bestQty = (int) ($best['qty'] ?? 0);

    $chart = build_chart($pdo, $range, $start, $end);
    $topProducts = build_top_products($pdo, $start, $end);
    $worstProducts = build_worst_products($pdo, $start, $end);
    $lowStock = build_low_stock($pdo);
    $supplierReport = build_supplier_report($pdo, $start, $end);
    [$historyTable, $historySummary] = build_history_table($pdo, $start, $end);

    json_response([
        'status' => 'success',
        'data' => [
            'stats' => [
                'sales_total' => (float) $salesRow['sales_total'],
                'profit_total' => (float) $profitRow['profit_total'],
                'items_sold' => (int) $profitRow['items_sold'],
                'transactions' => (int) $salesRow['transactions'],
                'monthly_sales' => $monthlySales,
                'best_seller_name' => $bestName,
                'best_seller_qty' => $bestQty,
            ],
            'chart' => $chart,
            'top_products' => $topProducts,
            'worst_products' => $worstProducts,
            'low_stock' => $lowStock,
            'supplier_report' => $supplierReport,
            'history_table' => $historyTable,
            'history_summary' => $historySummary,
            'date_range' => ['start' => $start, 'end' => $end],
        ],
    ]);
} catch (PDOException $e) {
    error_log('reports.php: ' . $e->getMessage());
    json_response(['status' => 'error', 'message' => 'ເກີດຂໍ້ຜິດພາດໃນຖານຂໍ້ມູນ'], 500);
}

function resolve_date_range(string $range, ?string $customStart, ?string $customEnd): array
{
    $today = new DateTime('today');
    return match ($range) {
        'week' => [
            (clone $today)->modify('-6 days')->format('Y-m-d'),
            $today->format('Y-m-d'),
        ],
        'month' => [
            (clone $today)->modify('-29 days')->format('Y-m-d'),
            $today->format('Y-m-d'),
        ],
        'custom' => [
            $customStart && preg_match('/^\d{4}-\d{2}-\d{2}$/', $customStart) ? $customStart : $today->format('Y-m-d'),
            $customEnd && preg_match('/^\d{4}-\d{2}-\d{2}$/', $customEnd) ? $customEnd : $today->format('Y-m-d'),
        ],
        default => [$today->format('Y-m-d'), $today->format('Y-m-d')],
    };
}

function build_chart(PDO $pdo, string $range, string $start, string $end): array
{
    $days = [];
    $cursor = new DateTime($start);
    $endDt = new DateTime($end);
    while ($cursor <= $endDt) {
        $days[$cursor->format('Y-m-d')] = [
            'label' => $cursor->format('d/m'),
            'sales' => 0.0,
        ];
        $cursor->modify('+1 day');
    }

    if (count($days) > 14) {
        $days = array_slice($days, -14, null, true);
    }

    $stmt = $pdo->prepare(
        'SELECT DATE(sold_at) AS d, SUM(total_amount) AS sales
         FROM sales
         WHERE sold_at >= ? AND sold_at < DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY DATE(sold_at)'
    );
    $stmt->execute([$start . ' 00:00:00', $end]);
    while ($row = $stmt->fetch()) {
        $key = $row['d'];
        if (isset($days[$key])) {
            $days[$key]['sales'] = (float) $row['sales'];
        }
    }

    return array_values($days);
}

function build_top_products(PDO $pdo, string $start, string $end): array
{
    $stmt = $pdo->prepare(
        'SELECT si.product_name AS name,
                SUM(si.qty) AS qty,
                SUM((si.unit_price - si.unit_cost) * si.qty) AS profit
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         WHERE s.sold_at >= ? AND s.sold_at < DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY si.product_name
         ORDER BY qty DESC
         LIMIT 5'
    );
    $stmt->execute([$start . ' 00:00:00', $end]);
    $rows = $stmt->fetchAll();
    $maxQty = 0;
    foreach ($rows as $r) {
        $maxQty = max($maxQty, (int) $r['qty']);
    }

    $result = [];
    $rank = 1;
    foreach ($rows as $r) {
        $qty = (int) $r['qty'];
        $result[] = [
            'rank' => $rank++,
            'name' => $r['name'],
            'qty' => $qty,
            'profit' => (float) $r['profit'],
            'width_pct' => $maxQty > 0 ? round(($qty / $maxQty) * 100) : 0,
        ];
    }
    return $result;
}

function build_worst_products(PDO $pdo, string $start, string $end): array
{
    $allStmt = $pdo->query('SELECT name FROM products ORDER BY name');
    $allNames = $allStmt->fetchAll(PDO::FETCH_COLUMN);

    $soldStmt = $pdo->prepare(
        'SELECT si.product_name AS name, SUM(si.qty) AS qty
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         WHERE s.sold_at >= ? AND s.sold_at < DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY si.product_name'
    );
    $soldStmt->execute([$start . ' 00:00:00', $end]);
    $soldMap = [];
    while ($row = $soldStmt->fetch()) {
        $soldMap[$row['name']] = (int) $row['qty'];
    }

    $items = [];
    foreach ($allNames as $name) {
        $items[] = ['name' => $name, 'qty' => $soldMap[$name] ?? 0];
    }

    usort($items, static fn ($a, $b) => $a['qty'] <=> $b['qty']);
    $items = array_slice($items, 0, 5);

    $maxQty = 0;
    foreach ($items as $r) {
        $maxQty = max($maxQty, $r['qty']);
    }

    $result = [];
    $rank = 1;
    foreach ($items as $r) {
        $qty = (int) $r['qty'];
        $result[] = [
            'rank' => $rank++,
            'name' => $r['name'],
            'qty' => $qty,
            'width_pct' => $maxQty > 0 ? max(5, round(($qty / $maxQty) * 100)) : 5,
        ];
    }
    return $result;
}

function build_low_stock(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT id, name, category, qty, cost, price FROM products WHERE qty < 10 ORDER BY qty ASC, name ASC'
    );
    $rows = [];
    while ($row = $stmt->fetch()) {
        $rows[] = [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'category' => $row['category'],
            'qty' => (int) $row['qty'],
            'cost' => (float) $row['cost'],
            'price' => (float) $row['price'],
        ];
    }
    return $rows;
}

function build_supplier_report(PDO $pdo, string $start, string $end): array
{
    $stmt = $pdo->prepare(
        'SELECT ri.supplier,
                COUNT(DISTINCT ri.receive_order_id) AS order_count,
                SUM(ri.qty) AS total_qty,
                SUM(ri.cost * ri.qty) AS total_cost
         FROM receive_items ri
         INNER JOIN receive_orders ro ON ro.id = ri.receive_order_id
         WHERE ro.receive_date >= ? AND ro.receive_date <= ?
         GROUP BY ri.supplier
         ORDER BY total_cost DESC'
    );
    $stmt->execute([$start, $end]);
    $rows = [];
    while ($row = $stmt->fetch()) {
        $supplier = trim((string) $row['supplier']);
        if ($supplier === '') {
            $supplier = '—';
        }
        $rows[] = [
            'supplier' => $supplier,
            'order_count' => (int) $row['order_count'],
            'total_qty' => (int) $row['total_qty'],
            'total_cost' => (float) $row['total_cost'],
        ];
    }
    return $rows;
}

function build_history_table(PDO $pdo, string $start, string $end): array
{
    $stmt = $pdo->prepare(
        'SELECT s.id, s.sold_at, s.total_amount,
                GROUP_CONCAT(CONCAT(si.product_name, " ×", si.qty) SEPARATOR ", ") AS items_summary,
                SUM(si.qty) AS total_qty,
                SUM(si.unit_cost * si.qty) AS total_cost,
                SUM(si.line_total) AS total_sales,
                SUM((si.unit_price - si.unit_cost) * si.qty) AS total_profit
         FROM sales s
         INNER JOIN sale_items si ON si.sale_id = s.id
         WHERE s.sold_at >= ? AND s.sold_at < DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY s.id
         ORDER BY s.sold_at DESC
         LIMIT 100'
    );
    $stmt->execute([$start . ' 00:00:00', $end]);

    $table = [];
    $sumSales = 0.0;
    $sumCost = 0.0;
    $sumProfit = 0.0;

    while ($row = $stmt->fetch()) {
        $soldAt = new DateTime($row['sold_at']);
        $sales = (float) $row['total_sales'];
        $cost = (float) $row['total_cost'];
        $profit = (float) $row['total_profit'];
        $sumSales += $sales;
        $sumCost += $cost;
        $sumProfit += $profit;
        $table[] = [
            'items' => $row['items_summary'],
            'time' => $soldAt->format('d/m/Y H:i'),
            'qty' => (int) $row['total_qty'],
            'sales' => $sales,
            'cost' => $cost,
            'profit' => $profit,
        ];
    }

    return [
        $table,
        ['sales' => $sumSales, 'cost' => $sumCost, 'profit' => $sumProfit],
    ];
}
