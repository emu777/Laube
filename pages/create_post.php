<?php
require 'cors.php'; // CORS設定を読み込む
require 'db_connect.php'; // データベース接続を読み込む

header('Content-Type: application/json; charset=utf-8'); // require の後に移動

// フロントエンドから送信されたJSONデータを取得
$data = json_decode(file_get_contents('php://input'), true);
$userId = $data['user_id'] ?? null;
$content = $data['content'] ?? null;

// 必須パラメータのチェック
if (!$userId || !$content) {
    http_response_code(400);
    echo json_encode(['error' => 'user_idとcontentは必須です。']);
    exit;
}

try {
    // 1. 投稿を挿入
    $stmt = $pdo_xserver_timeline->prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)");
    $stmt->execute([$userId, $content]);
    $newPostId = $pdo_xserver_timeline->lastInsertId();

    // 2. 挿入した投稿を取得
    $post_stmt = $pdo_xserver_timeline->prepare("
        SELECT 
            p.id, p.user_id, p.content, p.created_at
        FROM posts p
        WHERE p.id = ?
    ");
    $post_stmt->execute([$newPostId]);
    $newPost = $post_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$newPost) {
        throw new Exception('Failed to fetch the new post.');
    }

    // 3. Supabaseから投稿者のプロフィール情報を取得
    $profile = null;
    if (isset($pdo_supabase)) {
        $profiles_stmt = $pdo_supabase->prepare(
            "SELECT id, username, avatar_url, location, age FROM public.profiles WHERE id = ?"
        );
        $profiles_stmt->execute([$userId]);
        $profile = $profiles_stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    // 4. フロントエンドが期待するPost型に整形
    $newPost['comments'] = [];
    $newPost['profiles'] = $profile;

    echo json_encode($newPost);

} catch (Exception $e) {
    http_response_code(500);
    // エラーの詳細を出力してデバッグしやすくする
    echo json_encode(['error' => '投稿の作成に失敗しました: ' . $e->getMessage()]);
}
?>