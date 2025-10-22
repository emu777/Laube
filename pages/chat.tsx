import { GetServerSidePropsContext, NextPage } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serialize, parse } from 'cookie';
import Link from 'next/link';
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

const ChatPage: NextPage<ChatPageProps> = ({ chatRooms, error: initialError }) => {
  // getServerSidePropsから渡されたデータを直接使用
  const error = initialError;
  const isLoading = !chatRooms && !error;

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <main className="p-4">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">トーク</h1>

          {/* エラー表示 */}
          {(error || initialError) && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg mb-6">
              <p className="font-bold">エラー</p>
              <p className="text-sm mt-1">{error || initialError}</p>
            </div>
          )}

          {isLoading && <p className="text-center py-10">読み込み中...</p>}

          {chatRooms && chatRooms.length > 0 ? (
            <div className="space-y-2">
              {chatRooms.map((room) => {
                // ★★★ 修正点: room と room.id が存在しない場合はリンクをレンダリングしない ★★★
                if (!room || !room.id) return null;
                return (
                  <Link
                    key={room.id}
                    href={`/chat/${room.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/60 transition-colors"
                  >
                    <AvatarIcon avatarUrlPath={room.other_user.avatar_url} size={56} />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline">
                        <p className="font-bold text-white truncate">{room.other_user.username || '未設定'}</p>
                        {room.last_message && (
                          <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(room.last_message.created_at), {
                              addSuffix: true,
                              locale: ja,
                            })}
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
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">まだトークはありません。</p>
              <p className="text-gray-500 text-sm mt-1">気になる人を見つけてマッチングしましょう！</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ChatPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const cookies = {
    getAll: () => {
      const parsedCookies = parse(ctx.req.headers.cookie || '');
      return Object.entries(parsedCookies).map(([name, value]) => ({ name, value }));
    },
    setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
      ctx.res.setHeader(
        'Set-Cookie',
        cookiesToSet.map(({ name, value, options }) => serialize(name, value, options))
      );
    },
  };
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  // タイムラインと同様に、サーバーサイドでPHP APIを叩く
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/get_chat_rooms.php?user_id=${user.id}`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`APIエラー: ${res.status} ${res.statusText} - ${errorText}`);
    }
    const chatRooms = await res.json();

    if (chatRooms.error) {
      throw new Error(chatRooms.error);
    }

    return {
      props: { chatRooms },
    };
  } catch (e: any) {
    return {
      props: { chatRooms: [], error: e.message },
    };
  }
};
