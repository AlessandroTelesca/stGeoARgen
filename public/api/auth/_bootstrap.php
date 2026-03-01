<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

function send_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function parse_allowed_origins(): array
{
    global $config;

    $configuredOrigins = getenv('CORS_ORIGIN');
    if ($configuredOrigins && trim($configuredOrigins) !== '') {
        $parts = array_map('trim', explode(',', $configuredOrigins));
        return array_values(array_filter($parts, static fn ($origin) => $origin !== ''));
    }

    if (isset($config['cors_origins']) && is_array($config['cors_origins'])) {
        return array_values(array_filter(array_map('trim', $config['cors_origins']), static fn ($origin) => $origin !== ''));
    }

    return [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
    ];
}

function apply_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedOrigins = parse_allowed_origins();

    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function ensure_post_request(): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if ($method !== 'POST') {
        send_json(405, ['message' => 'Method not allowed']);
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        send_json(400, ['message' => 'Invalid JSON body']);
    }

    return $decoded;
}

function create_pdo(): PDO
{
    global $config;

    $host = getenv('DB_HOST') ?: ($config['db_host'] ?? '127.0.0.1');
    $port = getenv('DB_PORT') ?: ($config['db_port'] ?? '3306');
    $database = getenv('DB_NAME') ?: ($config['db_name'] ?? 'stgeoargen');
    $username = getenv('DB_USER') ?: ($config['db_user'] ?? 'root');
    $password = getenv('DB_PASSWORD') ?: ($config['db_password'] ?? '');

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $database);

    return new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
