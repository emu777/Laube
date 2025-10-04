import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaHeart, FaStream, FaStar, FaComments, FaBell } from 'react-icons/fa';

type BottomNavProps = {
  unreadNotificationCount: number;
};

const BottomNav = ({ unreadNotificationCount }: BottomNavProps) => {
  const router = useRouter();

  const navItems = [
    { href: '/', icon: <FaHeart />, label: '出会い' },
    { href: '/timeline', icon: <FaStream />, label: 'タイムライン' },
    { href: '/recommendations', icon: <FaStar />, label: 'オススメ' },
    { href: '/chats', icon: <FaComments />, label: 'トーク' },
    { href: '/notifications', icon: <FaBell />, label: '通知' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center text-xs transition-colors duration-200 ${
              router.pathname === item.href ? 'text-pink-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="text-xl mb-1">{item.icon}</div>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
