import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSupabase } from '@/contexts/SupabaseContext';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const supabase = useSupabase();
  const router = useRouter();

  // ログインページではヘッダーを表示しない
  if (router.pathname === '/login') {
    return null;
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm z-[100]">
        <Link href="/" className="text-2xl font-bold text-white no-underline">
          Laube
        </Link>
        <div className={`relative ${isOpen ? 'z-[99]' : 'z-[103]'}`}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-transparent border-none text-white cursor-pointer"
            aria-label="メニューを開閉"
          >
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
        <div className="fixed inset-0 bg-black/70 z-[101]">
          {/* メニューを閉じるための透明なボタン。これによりイベントの競合を防ぐ */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 w-full h-full cursor-default"
            aria-label="メニューを閉じる"
          ></button>
        </div>
      )}
      <div
        className={`fixed top-0 right-0 bottom-0 bg-gray-900 border-l border-gray-700 shadow-2xl z-[102] w-64 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="pt-20 px-4">
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
                  href="/settings"
                  className="block px-4 py-3 text-white no-underline rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  設定
                </Link>
              </li>
              <li>
                <Link
                  href="/matches"
                  className="block px-4 py-3 text-white no-underline rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  フレンド一覧
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};
export default Header;
