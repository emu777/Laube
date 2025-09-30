import { GetServerSidePropsContext, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import AvatarIcon from '@/components/AvatarIcon';
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type FriendsPageProps = {
  friends: Profile[];
};

const FriendsPage: NextPage<FriendsPageProps> = ({ friends }) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [friendList, setFriendList] = useState(friends);
  const [userToBlock, setUserToBlock] = useState<Profile | null>(null);

  const trailingActions = (friendId: string) => (
    <TrailingActions>
      <SwipeAction
        destructive={true}
        onClick={() => {
          const friendToBlock = friendList.find(f => f.id === friendId);
          if (friendToBlock) {
            setUserToBlock(friendToBlock);
          }
        }}
      >
        <div className="bg-red-600 flex items-center justify-center text-white h-full px-6">
          <span className="font-bold">ブロック</span>
        </div>
      </SwipeAction>
    </TrailingActions>
  );

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
      setFriendList(currentFriends => currentFriends.filter(f => f.id !== userToBlock.id));
      alert(`${userToBlock.username}さんをブロックしました。`);
    }
    setUserToBlock(null);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Header />
      <main className="p-4 pt-24 pb-24 standalone:p-0 standalone:pt-24 standalone:pb-24">
        <div className="w-full max-w-2xl mx-auto standalone:max-w-none standalone:px-4">
          <h1 className="text-2xl font-bold mb-6">フレンド一覧</h1>

          {friendList.length > 0 ? (
            <div>
              <SwipeableList fullSwipe={false} destructiveCallbackDelay={300}>
                {friendList.map((friend) => (
                  <SwipeableListItem
                    key={friend.id}
                    trailingActions={trailingActions(friend.id)}
                  >
                    <div className="border-b border-gray-700">
                      <Link
                        href={`/profile/${friend.id}`}
                        className="flex items-center gap-4 p-4 w-full hover:bg-gray-800 transition-colors"
                      >
                        <AvatarIcon avatarUrlPath={friend.avatar_url} size={48} />
                        <p className="font-bold text-white truncate flex-1">{friend.username || '未設定'}</p>
                      </Link>
                    </div>
                  </SwipeableListItem>
                ))}
              </SwipeableList>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">まだフレンドはいません。</p>
              <p className="text-gray-500 text-sm mt-1">気になる人を見つけてマッチングしましょう！</p>
            </div>
          )}
        </div>
      </main>

      {/* ブロック確認モーダル */}
      {userToBlock && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm text-center shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white">確認</h2>
            <p className="text-sm text-gray-300">
              {userToBlock.username}さんをブロックします。よろしいですか？
            </p>
            <div className="flex gap-4 pt-2">
              <button onClick={() => setUserToBlock(null)} className="w-full p-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">いいえ</button>
              <button onClick={handleBlockConfirm} className="w-full p-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">はい</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default FriendsPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  // 自分が「いいね」したユーザーのIDリストを取得
  const { data: myLikes } = await supabase.from('likes').select('liked_id').eq('liker_id', session.user.id);
  const myLikedUserIds = myLikes ? myLikes.map(like => like.liked_id) : [];

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

  const friendUserIds = friendLikeIds ? friendLikeIds.map(item => item.liker_id) : [];

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