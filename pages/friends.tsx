import { GetServerSidePropsContext, NextPage } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serialize, parse } from 'cookie';
import { useState, useRef, MouseEvent as ReactMouseEvent, useEffect } from 'react';
import { useSupabase } from './_app';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import AvatarIcon from '@/components/AvatarIcon';
import PageLayout from '@/components/PageLayout';

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type FriendsPageProps = {
  friends: Profile[];
};

const FriendsPage: NextPage<FriendsPageProps> = ({ friends }) => {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [friendList, setFriendList] = useState(friends);
  const [userToBlock, setUserToBlock] = useState<Profile | null>(null);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const dragStartX = useRef(0);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, [supabase]);

  const handleDragStart = (e: ReactMouseEvent<HTMLDivElement>, id: string) => {
    dragStartX.current = e.clientX;
    setSwipedItemId(id);
  };

  const handleDragEnd = (e: ReactMouseEvent<HTMLDivElement>, friend: Profile) => {
    const dragEndX = e.clientX;
    const dragDistance = dragStartX.current - dragEndX;

    // 50px以上左にスワイプされたらブロック確認
    if (dragDistance > 50) {
      setUserToBlock(friend);
    }
    // スワイプが終わったらリセット
    setSwipedItemId(null);
    dragStartX.current = 0;
  };

  const handleBlockCancel = () => {
    setUserToBlock(null);
  };

  const handleBlockConfirm = async () => {
    if (!user || !userToBlock) return;

    const { error } = await supabase.rpc('unfriend_and_block', {
      p_user_id_1: user.id,
      p_user_id_2: userToBlock.id,
    });

    if (error) {
      console.error('Error blocking friend:', error);
      alert('ブロック処理に失敗しました。');
    } else {
      // UIからフレンドを削除
      setFriendList((currentFriends) => currentFriends.filter((f) => f.id !== userToBlock.id));
      alert(`${userToBlock.username}さんをブロックしました。`);
    }
    setUserToBlock(null);
  };

  return (
    <PageLayout maxWidth="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">フレンド一覧</h1>

      {friendList.length > 0 ? (
        <div className="overflow-hidden">
          {friendList.map((friend) => (
            <div key={friend.id} className="relative">
              {/* ブロックボタン (背景) */}
              <div className="absolute inset-y-0 right-0 bg-red-600 flex items-center justify-center px-6">
                <span className="font-bold text-white">ブロック</span>
              </div>

              {/* フレンド情報 (スワイプする要素) */}
              <div
                className="relative bg-gray-900 border-b border-gray-700 transition-transform duration-200 ease-out"
                style={{ transform: swipedItemId === friend.id ? 'translateX(-100px)' : 'translateX(0)' }}
                onMouseDown={(e) => handleDragStart(e, friend.id)}
                onMouseUp={(e) => handleDragEnd(e, friend)}
                onTouchStart={(e) => {
                  dragStartX.current = e.touches[0].clientX;
                  setSwipedItemId(friend.id);
                }}
                onTouchEnd={(e) => {
                  const dragEndX = e.changedTouches[0].clientX;
                  const dragDistance = dragStartX.current - dragEndX;
                  if (dragDistance > 50) setUserToBlock(friend);
                  setSwipedItemId(null);
                  dragStartX.current = 0;
                }}
              >
                <Link
                  href={`/profile/${friend.id}`}
                  className="flex items-center gap-4 p-4 w-full hover:bg-gray-800 transition-colors"
                >
                  <AvatarIcon avatarUrlPath={friend.avatar_url} size={48} />
                  <p className="font-bold text-white truncate flex-1">{friend.username || '未設定'}</p>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">まだフレンドはいません。</p>
          <p className="text-gray-500 text-sm mt-1">気になる人を見つけてマッチングしましょう！</p>
        </div>
      )}
      {/* ブロック確認モーダル */}
      {userToBlock && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm text-center shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white">確認</h2>
            <p className="text-sm text-gray-300">{userToBlock.username}さんをブロックします。よろしいですか？</p>
            <div className="flex gap-4 pt-2">
              <button
                onClick={handleBlockCancel}
                className="w-full p-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors"
              >
                いいえ
              </button>
              <button
                onClick={handleBlockConfirm}
                className="w-full p-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default FriendsPage;

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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  // 自分が「いいね」したユーザーのIDリストを取得
  const { data: myLikes } = await supabase.from('likes').select('liked_id').eq('liker_id', session.user.id);
  const myLikedUserIds = myLikes ? myLikes.map((like) => like.liked_id) : [];

  if (myLikedUserIds.length === 0) {
    return { props: { friends: [] } };
  }

  // 自分を「いいね」していて、かつ自分も「いいね」しているユーザーのIDを取得
  const { data: friendLikeIds, error: likeError } = await supabase
    .from('likes')
    .select('liker_id')
    .eq('liked_id', session.user.id)
    .in('liker_id', myLikedUserIds);

  if (likeError) {
    console.error('Error fetching friend likes:', likeError);
    return { props: { friends: [] } };
  }

  const friendUserIds = friendLikeIds ? friendLikeIds.map((item) => item.liker_id) : [];

  if (friendUserIds.length === 0) {
    return { props: { friends: [] } };
  }

  // 取得したIDを元に、フレンドのプロフィール情報を取得
  const { data: friendsData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', friendUserIds);

  if (profilesError) console.error('Error fetching friend profiles:', profilesError);

  const friends = friendsData || [];

  return { props: { friends } };
};
