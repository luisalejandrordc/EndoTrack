<?php
// Database credentials are NOT stored in code. They are read from a `.env` file
// (kept out of git) or from real environment variables.
// Setup: copy `.env.example` to `.env` and fill in your values.

function loadEnv(string $path): array {
    $vars = [];
    if (!is_readable($path)) return $vars;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$k, $v] = explode('=', $line, 2);
        $vars[trim($k)] = trim(trim($v), "\"'");
    }
    return $vars;
}

function env(string $key, ?string $default = null): ?string {
    static $file = null;
    if ($file === null) {
        // Prefer a .env one level above the web root (not downloadable); fall back to the project folder.
        $file = loadEnv(dirname(__DIR__) . '/.env') + loadEnv(__DIR__ . '/.env');
    }
    $real = getenv($key);
    if ($real !== false) return $real;
    return $file[$key] ?? $default;
}

define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_NAME', env('DB_NAME', 'endoso_mvp'));
define('DB_USER', env('DB_USER', 'root'));
define('DB_PASS', env('DB_PASS', ''));

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}
