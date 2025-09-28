import { GetServerSidePropsContext, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useUser } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import AvatarIcon from '@/components/AvatarIcon';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type LastMessage = {
  content: string;
  created_at: string;
};

type ChatRoom = {
  id: string;
  other_user: Profile;
  last_message: LastMessage | null;
};

type ChatPageProps = {
  chatRooms: ChatRoom[];
};

const ChatPage: NextPage<ChatPageProps> = ({ chatRooms }) => {
  const user = useUser();

  if (!user) return null;

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Header />
      <main className="p-4 pt-24 pb-24">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">トーク</h1>

          {chatRooms.length > 0 ? (
            <div className="space-y-2">
              {chatRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/chat/${room.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/60 transition-colors"
                >
                  <AvatarIcon avatarUrlPath={room.other_user.avatar_url} size={48} />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline">
                      <p className="font-bold text-white truncate">{room.other_user.username || '未設定'}</p>
                      {room.last_message && (
                        <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(room.last_message.created_at), { addSuffix: true, locale: ja })}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {room.last_message?.content || 'まだメッセージはありません'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">まだトークはありません。</p>
              <p className="text-gray-500 text-sm mt-1">気になる人を見つけてマッチングしましょう！</p>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default ChatPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const { data: rooms, error } = await supabase
    .from('chat_rooms')
    .select('id, user1:profiles!user1_id(*), user2:profiles!user2_id(*), messages(content, created_at)')
    .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
    .order('created_at', { foreignTable: 'messages', ascending: false });

  if (error) {
    console.error('Error fetching chat rooms:', error);
    return { props: { chatRooms: [] } };
  }

  const chatRooms = rooms.map(room => {
    // Supabase returns related records as an array, so we access the first element.
    const user1 = Array.isArray(room.user1) ? room.user1[0] : room.user1;
    const user2 = Array.isArray(room.user2) ? room.user2[0] : room.user2;
    const otherUser = user1.id === session.user.id ? user2 : user1;
    // messages are already sorted by created_at desc, so the first one is the latest.
    const lastMessage = room.messages.length > 0 ? room.messages[0] : null;

    return {
      id: room.id,
      other_user: otherUser,
      last_message: lastMessage,
    };
  });

  return {
    props: {
      chatRooms,
    },
  };
};