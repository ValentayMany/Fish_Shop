<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/db.php';

bootstrap_api();

$method = $_SERVER['REQUEST_METHOD'];

try {
    match ($method) {
        'GET' => handle_list(),
        'POST' => handle_post(),
        'PUT' => handle_update(),
        'DELETE' => handle_delete(),
        default => json_response(['status' => 'error', 'message' => 'Method not allowed'], 405),
    };
} catch (PDOException $e) {
    error_log('users.php: ' . $e->getMessage());
    json_response(['status' => 'error', 'message' => 'ເກີດຂໍ້ຜິດພາດໃນຖານຂໍ້ມູນ'], 500);
}

function require_admin(): void
{
    $role = trim((string) ($_SERVER['HTTP_X_USER_ROLE'] ?? ''));
    if ($role !== 'admin') {
        json_response(['status' => 'error', 'message' => 'ບໍ່ມີສິດເຂົ້າເຖິງ'], 403);
    }
}

function current_username(): string
{
    return trim((string) ($_SERVER['HTTP_X_USER_NAME'] ?? ''));
}

function user_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'username' => $row['username'],
        'display_name' => $row['display_name'],
        'role' => $row['role'],
        'role_label' => $row['role_label'],
        'created_at' => $row['created_at'],
    ];
}

function role_label_for(string $role): string
{
    return match ($role) {
        'admin' => 'ເຈົ້າຂອງຮ້ານ',
        default => 'ພະນັກງານຂາຍ',
    };
}

function validate_password(string $password): ?string
{
    if (strlen($password) < 4) {
        return 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ';
    }
    return null;
}

function handle_list(): void
{
    require_admin();

    $stmt = db()->query('SELECT id, username, display_name, role, role_label, created_at FROM users ORDER BY id');
    $users = [];
    while ($row = $stmt->fetch()) {
        $users[] = user_row($row);
    }
    json_response(['status' => 'success', 'users' => $users]);
}

function handle_post(): void
{
    $body = read_json_body();
    $action = (string) ($body['action'] ?? 'create');

    if ($action === 'change_password') {
        handle_change_password($body);
        return;
    }

    require_admin();
    handle_create($body);
}

function handle_create(array $body): void
{
    $username = trim((string) ($body['username'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $displayName = trim((string) ($body['display_name'] ?? ''));
    $role = in_array($body['role'] ?? '', ['admin', 'staff'], true) ? $body['role'] : 'staff';

    if ($username === '' || $displayName === '') {
        json_response(['status' => 'error', 'message' => 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ຊື່ສະແດງ']);
    }

    if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
        json_response(['status' => 'error', 'message' => 'ຊື່ຜູ້ໃຊ້ຕ້ອງເປັນ a-z, 0-9, _ (3-50 ຕົວ)']);
    }

    $pwdErr = validate_password($password);
    if ($pwdErr !== null) {
        json_response(['status' => 'error', 'message' => $pwdErr]);
    }

    $check = db()->prepare('SELECT id FROM users WHERE username = ?');
    $check->execute([$username]);
    if ($check->fetch()) {
        json_response(['status' => 'error', 'message' => 'ຊື່ຜູ້ໃຊ້ນີ້ມີແລ້ວ']);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $roleLabel = role_label_for($role);

    $stmt = db()->prepare(
        'INSERT INTO users (username, password_hash, role, display_name, role_label) VALUES (?,?,?,?,?)'
    );
    $stmt->execute([$username, $hash, $role, $displayName, $roleLabel]);
    $id = (int) db()->lastInsertId();

    $fetched = db()->prepare('SELECT id, username, display_name, role, role_label, created_at FROM users WHERE id = ?');
    $fetched->execute([$id]);
    $row = $fetched->fetch();
    if (!$row) {
        json_response(['status' => 'error', 'message' => 'ບໍ່ພົບຜູ້ໃຊ້ຫຼັງບັນທຶກ'], 500);
    }

    json_response(['status' => 'success', 'user' => user_row($row)], 201);
}

function handle_change_password(array $body): void
{
    $username = current_username();
    if ($username === '') {
        json_response(['status' => 'error', 'message' => 'ບໍ່ພົບຂໍ້ມູນຜູ້ໃຊ້'], 401);
    }

    $currentPassword = (string) ($body['current_password'] ?? '');
    $newPassword = (string) ($body['new_password'] ?? '');

    $pwdErr = validate_password($newPassword);
    if ($pwdErr !== null) {
        json_response(['status' => 'error', 'message' => $pwdErr]);
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($currentPassword, (string) $row['password_hash'])) {
        json_response(['status' => 'error', 'message' => 'ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ']);
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $update = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $update->execute([$hash, $row['id']]);

    json_response(['status' => 'success', 'message' => 'ປ່ຽນລະຫັດຜ່ານສຳເລັດ']);
}

function handle_update(): void
{
    require_admin();

    $body = read_json_body();
    $id = (int) ($body['id'] ?? 0);
    if ($id <= 0) {
        json_response(['status' => 'error', 'message' => 'ລະບຸ id ຜູ້ໃຊ້']);
    }

    $check = db()->prepare('SELECT * FROM users WHERE id = ?');
    $check->execute([$id]);
    $existing = $check->fetch();
    if (!$existing) {
        json_response(['status' => 'error', 'message' => 'ບໍ່ພົບຜູ້ໃຊ້'], 404);
    }

    $displayName = trim((string) ($body['display_name'] ?? ''));
    $role = in_array($body['role'] ?? '', ['admin', 'staff'], true) ? $body['role'] : $existing['role'];
    $newPassword = (string) ($body['new_password'] ?? '');

    if ($displayName === '') {
        json_response(['status' => 'error', 'message' => 'ກະລຸນາປ້ອນຊື່ສະແດງ']);
    }

    if ($existing['role'] === 'admin' && $role !== 'admin') {
        $adminCount = (int) db()->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($adminCount <= 1) {
            json_response(['status' => 'error', 'message' => 'ຕ້ອງມີ admin ຢ່າງໜ້ອຍ 1 ຄົນ']);
        }
    }

    $roleLabel = role_label_for($role);

    if ($newPassword !== '') {
        $pwdErr = validate_password($newPassword);
        if ($pwdErr !== null) {
            json_response(['status' => 'error', 'message' => $pwdErr]);
        }
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = db()->prepare(
            'UPDATE users SET display_name=?, role=?, role_label=?, password_hash=? WHERE id=?'
        );
        $stmt->execute([$displayName, $role, $roleLabel, $hash, $id]);
    } else {
        $stmt = db()->prepare('UPDATE users SET display_name=?, role=?, role_label=? WHERE id=?');
        $stmt->execute([$displayName, $role, $roleLabel, $id]);
    }

    $fetched = db()->prepare('SELECT id, username, display_name, role, role_label, created_at FROM users WHERE id = ?');
    $fetched->execute([$id]);
    $row = $fetched->fetch();
    json_response(['status' => 'success', 'user' => user_row($row)]);
}

function handle_delete(): void
{
    require_admin();

    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        json_response(['status' => 'error', 'message' => 'ລະບຸ id ຜູ້ໃຊ້']);
    }

    $check = db()->prepare('SELECT * FROM users WHERE id = ?');
    $check->execute([$id]);
    $existing = $check->fetch();
    if (!$existing) {
        json_response(['status' => 'error', 'message' => 'ບໍ່ພົບຜູ້ໃຊ້'], 404);
    }

    $currentUser = current_username();
    if ($currentUser !== '' && $existing['username'] === $currentUser) {
        json_response(['status' => 'error', 'message' => 'ບໍ່ສາມາດລຶບບັນຊີຂອງຕົນເອງ']);
    }

    if ($existing['role'] === 'admin') {
        $adminCount = (int) db()->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($adminCount <= 1) {
            json_response(['status' => 'error', 'message' => 'ຕ້ອງມີ admin ຢ່າງໜ້ອຍ 1 ຄົນ']);
        }
    }

    $stmt = db()->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['status' => 'success']);
}
