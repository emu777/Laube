<?php
require '../../cors.php';
require '../../db_connect.php';

header('Content-Type: application/json; charset=utf-8');

$userId = $_GET['user_id'] ?? null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id is required.']);
    exit;
}

try {
    // 1. ユーザーが参加しているチャットルームと、相手のユーザーIDを取得
    $stmt = $pdo_xserver_chat->prepare("
        SELECT
            p1.room_id,
            p2.user_id AS other_user_id
        FROM chat_room_participants AS p1
        JOIN chat_room_participants AS p2 ON p1.room_id = p2.room_id AND p1.user_id != p2.user_id
        WHERE p1.user_id = ?
    ");
    $stmt->execute([$userId]);
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($rooms)) {
        echo json_encode([]);
        exit;
    }

    $otherUserIds = array_column($rooms, 'other_user_id');
    $roomIds = array_column($rooms, 'room_id');

    // 2. 相手ユーザーのプロフィール情報をSupabaseから一括取得
    $profiles = [];
    if (!empty($otherUserIds)) {
        $in_placeholders = implode(',', array_fill(0, count($otherUserIds), '?'));
        $profiles_stmt = $pdo_supabase->prepare(
            "SELECT id, username, avatar_url FROM public.profiles WHERE id IN ($in_placeholders)"
        );
        $profiles_stmt->execute($otherUserIds);
        $profiles_list = $profiles_stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($profiles_list as $profile) {
            $profiles[$profile['id']] = $profile;
        }
    }

    // 3. 各ルームの最新メッセージと未読件数を取得
    $lastMessages = [];
    $unreadCounts = [];
    if (!empty($roomIds)) {
        $in_placeholders = implode(',', array_fill(0, count($roomIds), '?'));

        // 最新メッセージ
        $last_message_stmt = $pdo_xserver_chat->query("
            SELECT m.room_id, m.content, m.created_at
            FROM chat_messages m
            INNER JOIN (
                SELECT room_id, MAX(id) as max_id
                FROM chat_messages
                WHERE room_id IN ($in_placeholders)
                GROUP BY room_id
            ) lm ON m.room_id = lm.room_id AND m.id = lm.max_id
        ");
        $last_message_stmt->execute($roomIds);
        foreach ($last_message_stmt->fetchAll(PDO::FETCH_ASSOC) as $msg) {
            $lastMessages[$msg['room_id']] = $msg;
        }
    }

    // 4. 全ての情報を結合してレスポンスを作成
    $response = [];
    foreach ($rooms as $room) {
        $otherUserId = $room['other_user_id'];
        $response[] = [
            'id' => $room['room_id'],
            'other_user' => $profiles[$otherUserId] ?? null,
            'last_message' => $lastMessages[$room['room_id']] ?? null,
            'unread_count' => 0, // 未読件数機能は後で実装します
        ];
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch chat rooms: ' . $e->getMessage()]);
}
?>