<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/env.php';
require_once __DIR__ . '/lib/response.php';

bootstrap_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['status' => 'error', 'message' => 'Method not allowed'], 405);
}

/* ---------- Validate file ---------- */
if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errCode = $_FILES['image']['error'] ?? -1;
    json_response(['status' => 'error', 'message' => 'ບໍ່ພົບໄຟລ໌ (code ' . $errCode . ')'], 400);
}

$file      = $_FILES['image'];
$mimeType  = mime_content_type($file['tmp_name']);
$allowed   = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$maxSize   = 5 * 1024 * 1024; // 5 MB

if (!in_array($mimeType, $allowed, true)) {
    json_response(['status' => 'error', 'message' => 'ອະນຸຍາດສະເພາະ JPG, PNG, GIF, WEBP'], 415);
}

if ($file['size'] > $maxSize) {
    json_response(['status' => 'error', 'message' => 'ໄຟລ໌ໃຫຍ່ເກີນ 5 MB'], 413);
}

/* ---------- Build destination ---------- */
$ext       = match ($mimeType) {
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
};

$uploadsDir = dirname(__DIR__) . '/uploads';
if (!is_dir($uploadsDir) && !mkdir($uploadsDir, 0755, true)) {
    json_response(['status' => 'error', 'message' => 'ສ້າງໂຟລເດີ uploads ບໍ່ໄດ້'], 500);
}

$filename = 'product_' . bin2hex(random_bytes(8)) . '.' . $ext;
$destPath = $uploadsDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    json_response(['status' => 'error', 'message' => 'ຍ້າຍໄຟລ໌ລົ້ມເຫລວ'], 500);
}

$imageUrl = '/uploads/' . $filename;
json_response(['status' => 'success', 'image_url' => $imageUrl], 201);
