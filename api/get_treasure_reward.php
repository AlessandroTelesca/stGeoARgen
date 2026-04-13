<?php
/**
 * get_treasure_reward.php - Liefert den Status einer Schatzkisten-Belohnung.
 *
 * GET-Parameter:
 *   user_id    - ID des Users
 *   reward_key - Eindeutiger Reward-Key (optional, Standard: klosterweiher_treasure_chest)
 *
 * Response (JSON):
 *   success: true -> { success, claimed, points, reward_key }
 */

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['success' => false, 'message' => 'Methode nicht erlaubt.'], 405);
}

$userId = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
$rewardKeyRaw = $_GET['reward_key'] ?? 'klosterweiher_treasure_chest';
$rewardKey = trim((string)$rewardKeyRaw);

if (!$userId || $userId <= 0) {
    sendResponse(['success' => false, 'message' => 'Ungueltige user_id.'], 400);
}
if ($rewardKey === '') {
    sendResponse(['success' => false, 'message' => 'reward_key fehlt.'], 400);
}

$db = getDB();

$stmt = $db->prepare('SELECT points FROM user_rewards WHERE user_id = ? AND reward_key = ? LIMIT 1');
$stmt->execute([$userId, $rewardKey]);
$entry = $stmt->fetch();

sendResponse([
    'success' => true,
    'claimed' => (bool)$entry,
    'points' => $entry ? (int)$entry['points'] : 0,
    'reward_key' => $rewardKey,
]);
