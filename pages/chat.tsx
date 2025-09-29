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
  unread_count: number;
};

type ChatPageProps = {
  chatRooms: ChatRoom[];
  error?: string;
};

const ChatPage: NextPage<ChatPageProps> = ({ chatRooms, error }) => {
  const user = useUser();

  if (!user) return null;

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Header />
      <main className="p-4 pt-24 pb-24">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">トーク</h1>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg mb-6">
              <p className="font-bold">データ取得エラー</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

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
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-sm text-gray-400 truncate pr-2">
                        {room.last_message?.content || 'まだメッセージはありません'}
                      </p>
                      {room.unread_count > 0 && (
                        <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-xs font-bold text-white">
                          {room.unread_count}
                        </span>
                      )}
                    </div>
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

  // 1. ブロック関係にあるユーザーIDのリストを取得
  const { data: blocksData } = await supabase
    .from('blocks')
    .select('blocker_id,blocked_id')
    .or(`blocker_id.eq.${session.user.id},blocked_id.eq.${session.user.id}`);
  const blockedUserIds = new Set<string>();
  if (blocksData) {
    for (const block of blocksData) {
      if (block.blocker_id === session.user.id) {
        blockedUserIds.add(block.blocked_id);
      }
      if (block.blocked_id === session.user.id) {
        blockedUserIds.add(block.blocker_id);
      }
    }
  }

  // 2. チャットルームを取得
  const { data, error } = await supabase.rpc('get_chat_rooms_with_details', {
    p_user_id: session.user.id,
  });

  if (error) {
    console.error('Error fetching chat rooms:', error);
    return { props: { chatRooms: [], error: error.message } };
  }

  // 3. ブロックしたユーザーのチャットルームを除外
  let chatRooms: ChatRoom[] = data.map((room: ChatRoom) => ({
    id: room.id,
    other_user: room.other_user,
    last_message: room.last_message,
    unread_count: room.unread_count,
  }));

  if (blockedUserIds.size > 0) {
    chatRooms = chatRooms.filter((room: ChatRoom) => !blockedUserIds.has(room.other_user.id));
  }

  return {
    props: {
      chatRooms,
    },
  };
};