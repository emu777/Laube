import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaBell } from 'react-icons/fa';
import { FaUser, FaComments, FaRegCompass, FaFilm } from 'react-icons/fa';

// 各アイコンの定義
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TimelineIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TalkIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const BottomNav = ({ unreadNotificationCount = 0 }: { unreadNotificationCount?: number }) => {
  const router = useRouter();

  const navItems = [
    { href: '/', label: '出会い', icon: UsersIcon },
    { href: '/timeline', label: 'タイムライン', icon: TimelineIcon },
    { href: '/recommendations', label: 'オススメ', icon: StarIcon },
    { href: '/chat', label: 'トーク', icon: TalkIcon },
    { href: '/notifications', label: '通知', icon: FaBell, showBadge: true },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-full shadow-lg flex items-center px-2">
      {navItems.map(({ href, label, icon: Icon, showBadge }) => {
        const isActive = router.pathname === href;
        return (
          <Link
            key={href}
            href={href}
              className={`relative flex flex-col items-center justify-center no-underline w-20 py-1.5 text-xs rounded-full transition-all duration-200 ${
                isActive ? 'bg-gray-700/80 text-white scale-110' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-[30px] h-[30px] mb-0.5" />
            {showBadge && unreadNotificationCount > 0 && (
              <span className="absolute top-0 right-2.5 -mt-1 bg-red-500 text-white text-xs font-bold rounded-full px-1 min-w-[18px] text-center">
                {unreadNotificationCount}
              </span>
            )}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
