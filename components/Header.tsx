import { useState } from 'react';
import Link from 'next/link';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const supabase = useSupabaseClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login'); // 変更なしですが、これが正しい実装です
  };

  const openLogoutConfirm = () => {
    setIsOpen(false); // メインメニューを閉じる
    setShowLogoutConfirm(true); // 確認モーダルを開く
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm z-40">
        <Link href="/" className="text-2xl font-bold text-white no-underline">
          Laube
        </Link>
        <div className="relative z-30">
          <button onClick={() => setIsOpen(!isOpen)} className="bg-transparent border-none text-white cursor-pointer">
            {isOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </header>
      {isOpen && (
        <div className="fixed inset-0 bg-gray-900 z-50 pt-20 px-4">
          <div className="w-full max-w-md mx-auto">
            <ul className="list-none m-0 p-0 space-y-1">
              <li>
                <Link
                  href="/account"
                  className="block px-4 py-3 text-white no-underline rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  マイプロフ
                </Link>
              </li>
              <li>
                <Link
                  href="/friends"
                  className="block px-4 py-3 text-white no-underline rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  フレンド一覧
                </Link>
              </li>
              <li>
                <button
                  onClick={openLogoutConfirm}
                  className="w-full text-left bg-transparent border-none px-4 py-3 text-red-400 cursor-pointer hover:bg-gray-700 rounded"
                >
                  ログアウト
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ログアウト確認モーダル */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm text-center shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white">確認</h2>
            <p className="text-sm text-gray-300">ログアウトしますか？</p>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full p-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors"
              >
                いいえ
              </button>
              <button
                onClick={handleLogout}
                className="w-full p-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default Header;
