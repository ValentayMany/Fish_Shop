<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';

bootstrap_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

$body = read_json_body();
$username = trim((string) ($body['username'] ?? ''));
$password = (string) ($body['password'] ?? '');

if ($username === '' || $password === '') {
    json_response(['status' => 'error', 'message' => 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ']);
}

try {
    $stmt = db()->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($password, (string) $row['password_hash'])) {
        json_response(['status' => 'error', 'message' => 'ຊື່ຜູ້ໃຊ້ຫຼືລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ']);
    }

    json_response([
        'status' => 'success',
        'user' => [
            'username' => $row['username'],
            'role' => $row['role'],
            'name' => $row['display_name'],
            'roleLabel' => $row['role_label'],
        ],
    ]);
} catch (PDOException $e) {
    error_log('auth.php: ' . $e->getMessage());
    json_response(['status' => 'error', 'message' => 'ເຊື່ອມຕໍ່ຖານຂໍ້ມູນບໍ່ສຳເລັດ'], 500);
}
