import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaBell, FaFilm, FaComments } from 'react-icons/fa';
import { useNotifications } from '../contexts/NotificationContext';

const BottomNav = () => {
  const router = useRouter();
  const { unreadCount: unreadNotificationCount } = useNotifications();

  // 各アイコンの定義
  const UsersIcon = ({ className }: { className?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  const StarIcon = ({ className }: { className?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  const navItems = [
    { href: '/', label: '出会い', icon: UsersIcon },
    { href: '/timeline', label: 'タイムライン', icon: FaFilm },
    { href: '/recommendations', label: 'オススメ', icon: StarIcon },
    { href: '/chat', label: 'トーク', icon: FaComments },
    { href: '/notifications', label: '通知', icon: FaBell, showBadge: true },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-30 bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-full shadow-lg flex items-center justify-around px-2 h-16 max-w-md mx-auto">
      {navItems.map(({ href, label, icon: Icon, showBadge }) => {
        const isActive = router.pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center justify-center no-underline w-16 h-16 text-xs transition-all duration-300 ease-out ${
              isActive ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <div
              className={`relative flex flex-col items-center transition-transform duration-300 ease-out ${isActive ? '-translate-y-1' : ''}`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span
                className={`whitespace-nowrap transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}
              >
                {label}
              </span>
              {isActive && <div className="absolute -bottom-2 w-1.5 h-1.5 bg-pink-500 rounded-full" />}
            </div>
            {showBadge && unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-3 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center border-2 border-gray-800">
                {unreadNotificationCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
