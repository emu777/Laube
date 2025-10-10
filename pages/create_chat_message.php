<?php
require '../cors.php';
require '../db_connect.php';

// ★★★ デバッグ用: このファイルが実行されたことをログに残す ★★★
error_log("--- create_chat_message.php execution started ---");

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);

$roomId = $data['room_id'] ?? null;
$senderId = $data['sender_id'] ?? null;
$content = $data['content'] ?? null;

// ★★★ デバッグ用: 受け取ったデータをログに残す ★★★
error_log("Received data: room_id=" . ($roomId ?? 'null') . ", sender_id=" . ($senderId ?? 'null') . ", content=" . ($content ?? 'null'));

if (!$roomId || !$senderId || !$content) {
    error_log("Validation failed: One or more required parameters are missing."); // ★★★ デバッグ用 ★★★
    http_response_code(400);
    echo json_encode(['error' => 'room_id, sender_id, and content are required.']);
    exit;
}

try {
    // 1. Xserverのchat_messagesテーブルに新しいメッセージを挿入
    error_log("Attempting to insert into chat_messages..."); // ★★★ デバッグ用 ★★★
    $stmt = $pdo_xserver_chat->prepare("
        INSERT INTO chat_messages (room_id, sender_id, content) VALUES (?, ?, ?)
    ");
    $stmt->execute([$roomId, $senderId, $content]);
    $newMessageId = $pdo_xserver_chat->lastInsertId();

    // 2. 挿入したメッセージを再度取得
    $stmt = $pdo_xserver_chat->prepare("
        SELECT id, room_id, sender_id, content, created_at, is_read
        FROM chat_messages
        WHERE id = ?
    ");
    $stmt->execute([$newMessageId]);
    $newMessage = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$newMessage) {
        throw new Exception('Failed to fetch the new message.');
    }

    // 3. Supabaseから送信者のプロフィール情報を取得
    $profiles_stmt = $pdo_supabase->prepare(
        "SELECT id, username, avatar_url FROM public.profiles WHERE id = ?"
    );
    $profiles_stmt->execute([$senderId]);
    $senderProfile = $profiles_stmt->fetch(PDO::FETCH_ASSOC);

    // 4. メッセージにプロフィール情報を結合して返す
    $newMessage['sender'] = $senderProfile ?? null;

    echo json_encode($newMessage);
} catch (Exception $e) {
    error_log("Caught exception: " . $e->getMessage()); // ★★★ デバッグ用 ★★★
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create chat message: ' . $e->getMessage()]);
}
?>