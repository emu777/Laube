<?php
require 'cors.php'; // CORS設定を読み込む
require 'db_connect.php'; // データベース接続を読み込む

try {
    // 1. Xserverから投稿(posts)とコメント(comments)を取得
    $posts_stmt = $pdo_xserver_timeline->query("
        SELECT 
            p.id, p.user_id, p.content, p.created_at
        FROM posts p
        ORDER BY p.created_at DESC
    ");
    $posts = $posts_stmt->fetchAll(PDO::FETCH_ASSOC);

    $comments_stmt = $pdo_xserver_timeline->prepare("
        SELECT 
            c.id, c.post_id, c.user_id, c.content, c.created_at
        FROM comments c
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    ");

    $userIds = [];
    foreach ($posts as &$post) {
        $comments_stmt->execute([$post['id']]);
        $comments = $comments_stmt->fetchAll(PDO::FETCH_ASSOC);
        $post['comments'] = $comments;

        // 必要なユーザーIDを収集
        if ($post['user_id']) $userIds[] = $post['user_id'];
        foreach ($comments as $comment) {
            if ($comment['user_id']) $userIds[] = $comment['user_id'];
        }
    }
    unset($post); // foreachの参照を解除

    // 2. 収集したユーザーIDでSupabaseからプロフィール情報を一括取得
    $profiles = [];
    if (!empty($userIds)) {
        // ★★★ 修正点: array_unique の前に空でないことを確認する ★★★
        if (!empty($userIds)) {
            $uniqueUserIds = array_unique($userIds);
            $reindexedUserIds = array_values($uniqueUserIds); // Re-index the array to ensure sequential keys

            if (!empty($reindexedUserIds)) {
                $in_placeholders = implode(',', array_fill(0, count($reindexedUserIds), '?'));
                $profiles_stmt = $pdo_supabase->prepare(
                    "SELECT id, username, avatar_url, location, age FROM public.profiles WHERE id IN ($in_placeholders)"
                );
                $profiles_stmt->execute($reindexedUserIds);
                $profiles_list = $profiles_stmt->fetchAll(PDO::FETCH_ASSOC);

                // IDをキーにした連想配列に変換して、後でアクセスしやすくする
                foreach ($profiles_list as $profile) {
                    $profiles[$profile['id']] = $profile;
                }
            }
        }
    }

    // 3. 投稿とコメントにプロフィール情報を結合
    foreach ($posts as &$post) {
        $post['profiles'] = $profiles[$post['user_id']] ?? null;
        if (isset($post['comments']) && is_array($post['comments'])) {
            foreach ($post['comments'] as &$comment) {
                $comment['profiles'] = $profiles[$comment['user_id']] ?? null;
            }
            unset($comment);
        }
    }
    unset($post);

    header('Content-Type: application/json; charset=utf-8'); // ヘッダーを送信
    echo json_encode($posts);

} catch (Exception $e) {
    http_response_code(500);
    // エラーの詳細を出力してデバッグしやすくする
    header('Content-Type: application/json; charset=utf-8'); // ヘッダーを送信
    echo json_encode(['error' => 'An error occurred: ' . $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}