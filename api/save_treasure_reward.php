<?php
/**
 * save_treasure_reward.php - Speichert einmalige Schatzkisten-Belohnung pro User.
 *
 * POST-Parameter (JSON body):
 *   user_id    - ID des Users
 *   reward_key - Eindeutiger Reward-Key (z.B. klosterweiher_treasure_chest)
 *   points     - Punkte (Standard: 50)
 *
 * Response (JSON):
 *   success: true  -> { success, message, already_claimed, points_awarded, points_total }
 *   success: false -> { success, message }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$userId = filter_var($body['user_id'] ?? 0, FILTER_VALIDATE_INT);
$rewardKey = trim((string)($body['reward_key'] ?? 'klosterweiher_treasure_chest'));
$points = filter_var($body['points'] ?? 50, FILTER_VALIDATE_INT);

if (!$userId || $userId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungueltige user_id.'], 400);
}
if ($rewardKey === '') {
    sendResponse(['success' => false, 'message' => 'reward_key fehlt.'], 400);
}
if (!$points || $points <= 0) {
    $points = 50;
}

$db = getDB();

// User muss existieren
$stmt = $db->prepare('SELECT id FROM users WHERE id = ?');
$stmt->execute([$userId]);
if (!$stmt->fetch()) {
    sendResponse(['success' => false, 'message' => 'User nicht gefunden.'], 404);
}

// Bereits erhalten?
$stmt = $db->prepare('SELECT points FROM user_rewards WHERE user_id = ? AND reward_key = ? LIMIT 1');
$stmt->execute([$userId, $rewardKey]);
$existing = $stmt->fetch();

if ($existing) {
    sendResponse([
        'success' => true,
        'message' => 'Schatzkisten-Belohnung bereits vergeben.',
        'already_claimed' => true,
        'points_awarded' => 0,
        'points_total' => (int)$existing['points'],
    ]);
}

$stmt = $db->prepare(
    'INSERT INTO user_rewards (user_id, reward_key, points, claimed_at)
     VALUES (?, ?, ?, NOW())'
);
$stmt->execute([$userId, $rewardKey, $points]);

sendResponse([
    'success' => true,
    'message' => 'Schatzkisten-Belohnung gespeichert.',
    'already_claimed' => false,
    'points_awarded' => $points,
    'points_total' => $points,
]);
