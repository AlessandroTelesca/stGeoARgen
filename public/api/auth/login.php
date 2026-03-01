<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

apply_cors_headers();
ensure_post_request();

$body = read_json_body();
$email = isset($body['email']) ? strtolower(trim((string) $body['email'])) : '';
$password = isset($body['password']) ? (string) $body['password'] : '';

if ($email === '' || $password === '') {
    send_json(400, ['message' => 'email and password are required']);
}

try {
    $pdo = create_pdo();

    $stmt = $pdo->prepare('SELECT id, username, email, password_hash FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);

    $user = $stmt->fetch();
    if (!$user) {
        send_json(401, ['message' => 'Ungültige Anmeldedaten.']);
    }

    if (!password_verify($password, (string) $user['password_hash'])) {
        send_json(401, ['message' => 'Ungültige Anmeldedaten.']);
    }

    send_json(200, [
        'user' => [
            'id' => (int) $user['id'],
            'username' => (string) $user['username'],
            'email' => (string) $user['email'],
        ],
    ]);
} catch (Throwable $error) {
    error_log('Login failed: ' . $error->getMessage());
    send_json(500, ['message' => 'Anmeldung fehlgeschlagen. Bitte später erneut versuchen.']);
}
