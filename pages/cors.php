<?php
// エラーレポートを有効にする（開発時のみ）
ini_set('display_errors', 0); // 本番環境では0にすることを推奨
error_reporting(E_ALL);

// 許可するオリジンを設定
$allowed_origins = [
    'http://localhost:3000', // 開発環境
    'https://laube777.com',     // 本番環境のドメイン
    'https://laube-777.netlify.app' 
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Upload-Token, X-Delete-Token');

// プリフライトリクエスト（OPTIONSメソッド）への対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}