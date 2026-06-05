<?php

/**
 * PHP built-in server router:
 * cd TONLONG && php -S localhost:8080 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (preg_match('#^/api/([a-z_]+\.php)#', $uri, $m)) {
    $file = __DIR__ . '/api/' . $m[1];
    if (is_file($file)) {
        require $file;
        return true;
    }
}

$local = __DIR__ . $uri;
if ($uri !== '/' && is_file($local)) {
    return false;
}

if ($uri === '/' || $uri === '') {
    header('Location: /pages/login.html');
    return true;
}

return false;
