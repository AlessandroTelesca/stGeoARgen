<?php
/**
 * save_treasure_reward.php - Speichert einmalige Schatzkisten-Belohnung pro User.
 *
 * POST-Parameter (JSON body):
 *   user_id    - (optional) ID des Users, muss zum Session-Token passen
 *   Header: Authorization: Bearer <Session-Token>
 *   reward_key - Eindeutiger Reward-Key (z.B. klosterweiher_treasure_chest)
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

$rewardKey = trim((string)($body['reward_key'] ?? 'klosterweiher_treasure_chest'));

$db = getDB();
$userId = requireUser($db, $body['user_id'] ?? null);

// Nur in reward_definitions bekannte Belohnungen, Punkte laut DB – sonst ließe sich mit
// beliebigen reward_keys jeweils erneut Punkte holen.
$stmt = $db->prepare('SELECT points FROM reward_definitions WHERE reward_key = ?');
$stmt->execute([$rewardKey]);
$reward = $stmt->fetch();
if (!$reward) {
    sendResponse(['success' => false, 'message' => 'Unbekannter reward_key.'], 400);
}
$points = (int) $reward['points'];

// User muss existieren
$stmt = $db->prepare('SELECT id, total_points FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();
if (!$user) {
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
        'total_points' => (int)$user['total_points'],
    ]);
}

// INSERT IGNORE + rowCount: bei parallelen Requests vergibt nur der erste die Punkte.
$db->beginTransaction();
$stmt = $db->prepare(
    'INSERT IGNORE INTO user_rewards (user_id, reward_key, points, claimed_at)
     VALUES (?, ?, ?, NOW())'
);
$stmt->execute([$userId, $rewardKey, $points]);
$awarded = $stmt->rowCount() === 1;
if ($awarded) {
    $db->prepare('UPDATE users SET total_points = total_points + ? WHERE id = ?')
       ->execute([$points, $userId]);
}
$db->commit();

$userPointsStmt = $db->prepare('SELECT total_points FROM users WHERE id = ?');
$userPointsStmt->execute([$userId]);
$userPoints = $userPointsStmt->fetch();

sendResponse([
    'success' => true,
    'message' => $awarded ? 'Schatzkisten-Belohnung gespeichert.' : 'Schatzkisten-Belohnung bereits vergeben.',
    'already_claimed' => !$awarded,
    'points_awarded' => $awarded ? $points : 0,
    'points_total' => $points,
    'total_points' => (int)($userPoints['total_points'] ?? 0),
]);
