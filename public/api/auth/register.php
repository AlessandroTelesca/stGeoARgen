<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

apply_cors_headers();
ensure_post_request();

$body = read_json_body();
$username = isset($body['username']) ? trim((string) $body['username']) : '';
$email = isset($body['email']) ? strtolower(trim((string) $body['email'])) : '';
$password = isset($body['password']) ? (string) $body['password'] : '';

if ($username === '' || $email === '' || $password === '') {
    send_json(400, ['message' => 'username, email and password are required']);
}

if (mb_strlen($password) < 6) {
    send_json(400, ['message' => 'Password must be at least 6 characters long']);
}

try {
    $pdo = create_pdo();

    $checkStmt = $pdo->prepare('SELECT id FROM users WHERE email = :email OR username = :username LIMIT 1');
    $checkStmt->execute([
        ':email' => $email,
        ':username' => $username,
    ]);

    $existingUser = $checkStmt->fetch();
    if ($existingUser) {
        send_json(409, ['message' => 'Ein Konto mit dieser E-Mail oder diesem Benutzernamen existiert bereits.']);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    $insertStmt = $pdo->prepare('INSERT INTO users (username, email, password_hash) VALUES (:username, :email, :password_hash)');
    $insertStmt->execute([
        ':username' => $username,
        ':email' => $email,
        ':password_hash' => $passwordHash,
    ]);

    send_json(201, [
        'user' => [
            'id' => (int) $pdo->lastInsertId(),
            'username' => $username,
            'email' => $email,
        ],
    ]);
} catch (Throwable $error) {
    error_log('Register failed: ' . $error->getMessage());
    send_json(500, ['message' => 'Registrierung fehlgeschlagen. Bitte später erneut versuchen.']);
}
