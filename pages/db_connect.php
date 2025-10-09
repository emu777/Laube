<?php
// エラーレポートを有効にする（開発時のみ）
ini_set('display_errors', 0); // 画面にエラーを表示しない
error_reporting(E_ALL);

// --- Xserverのデータベース接続情報 ---
$xserver_host = 'localhost'; // またはXserver指定のホスト名
$xserver_dbname = 'laube777_laubetimeline001';
$xserver_user = 'laube777_owner';
$xserver_password = 'osa151515'; // 正しいパスワードを設定してください

$xserver_dsn = "mysql:host=$xserver_host;dbname=$xserver_dbname;charset=utf8mb4";
// --- Supabaseのデータベース接続情報 ---
// Supabaseのプロジェクト設定 > Database > Connection string から取得
$supabase_host = 'aws-1-ap-northeast-1.pooler.supabase.com'; // Transaction Poolerのホスト
$supabase_dbname = 'postgres';
$supabase_user = 'postgres.ufncdfxyawpmotgywzeo'; // Transaction Poolerのユーザー名
$supabase_password = 'uNliNONIyPiiPKWZ'; // SupabaseのDBパスワードを設定してください

$supabase_dsn = "pgsql:host=$supabase_host;port=6543;dbname=$supabase_dbname;user=$supabase_user;password=$supabase_password";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// データベース接続の確立
try {
    $pdo_xserver = new PDO($xserver_dsn, $xserver_user, $xserver_password, $options);
    $pdo_supabase = new PDO($supabase_dsn, null, null, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}