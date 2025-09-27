import { useState } from 'react';
import Link from 'next/link';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const supabase = useSupabaseClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm z-40">
          <Link href="/" className="text-2xl font-bold text-white no-underline">
            Laube
          </Link>
          <div className="relative z-30">
            <button onClick={() => setIsOpen(!isOpen)} className="bg-transparent border-none text-white cursor-pointer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
      </header>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 flex items-center justify-center" onClick={() => setIsOpen(false)}>
          <div className="bg-gray-800 rounded-lg p-4 min-w-[250px] text-center" onClick={(e) => e.stopPropagation()}>
            <ul className="list-none m-0 p-0 space-y-2">
              <li>
                <Link href="/account" className="block px-4 py-3 text-white no-underline rounded hover:bg-gray-700" onClick={() => setIsOpen(false)}>
                  マイプロフ
                </Link>
              </li>
              <li>
                <button onClick={handleLogout} className="w-full bg-transparent border-none px-4 py-3 text-white text-left cursor-pointer hover:bg-gray-700 rounded">
                  ログアウト
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};
export default Header;