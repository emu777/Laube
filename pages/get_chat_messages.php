<?php
require 'cors.php';
require 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

$roomId = $_GET['room_id'] ?? null;

if (!$roomId) {
    http_response_code(400);
    echo json_encode(['error' => 'room_id is required.']);
    exit;
}

try {
    // 1. Xserverから指定ルームのメッセージを取得
    $stmt = $pdo_xserver_chat->prepare("
        SELECT id, room_id, sender_id, content, created_at, is_read
        FROM chat_messages
        WHERE room_id = ?
        ORDER BY created_at ASC
    ");
    $stmt->execute([$roomId]);
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. メッセージ送信者のユーザーIDを収集
    $senderIds = array_unique(array_column($messages, 'sender_id'));

    // 3. Supabaseからプロフィール情報を一括取得
    $profiles = [];
    if (!empty($senderIds)) {
        $in_placeholders = implode(',', array_fill(0, count($senderIds), '?'));
        $profiles_stmt = $pdo_supabase->prepare(
            "SELECT id, username, avatar_url FROM public.profiles WHERE id IN ($in_placeholders)"
        );
        $profiles_stmt->execute($senderIds);
        foreach ($profiles_stmt->fetchAll(PDO::FETCH_ASSOC) as $profile) {
            $profiles[$profile['id']] = $profile;
        }
    }

    // 4. メッセージにプロフィール情報を結合
    foreach ($messages as &$message) {
        $message['sender'] = $profiles[$message['sender_id']] ?? null;
    }
    unset($message);

    echo json_encode($messages);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch chat messages: ' . $e->getMessage()]);
}
?>