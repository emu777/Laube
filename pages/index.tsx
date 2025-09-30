import { GetServerSidePropsContext, NextPage } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import Header from '@/components/Header'
import ProfileCard from '@/components/ProfileCard'
import BottomNav from '@/components/BottomNav'
import AvatarIcon from '@/components/AvatarIcon'

// プロフィールデータの型を定義します
type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  age: number | null;
  last_seen: string | null;
  hobbies: string[] | null;
}

type LikedByUser = {
  created_at: string;
  liker: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type HomePageProps = {
  isNewUser: boolean;
}

const Home: NextPage<HomePageProps> = ({ isNewUser }) => {
  const router = useRouter();

  const [showAddToHomeScreenModal, setShowAddToHomeScreenModal] = useState(false);

  useEffect(() => {
    if (isNewUser) {
      setShowAddToHomeScreenModal(true);
    }
  }, [isNewUser, router]);

  const [showAllLikedBy, setShowAllLikedBy] = useState(false);
  const supabase = useSupabaseClient();

  // プロフィール一覧を取得するfetcher
  const profilesFetcher = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Not authenticated');
    const userId = sessionData.session.user.id;

    const { data: blocksData } = await supabase
      .from('blocks')
      .select('blocker_id,blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    const blockedUserIds = new Set<string>();
    if (blocksData) {
      for (const block of blocksData) {
        if (block.blocker_id === userId) blockedUserIds.add(block.blocked_id);
        if (block.blocked_id === userId) blockedUserIds.add(block.blocker_id);
      }
    }

    let profilesQuery = supabase
      .from('profiles')
      .select('id, username, avatar_url, location, age, last_seen, hobbies')
      .neq('id', userId)
      .not('username', 'is', null);
    if (blockedUserIds.size > 0) {
      profilesQuery = profilesQuery.not('id', 'in', `(${Array.from(blockedUserIds).join(',')})`);
    }
    const { data, error } = await profilesQuery.order('last_seen', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data;
  };

  // 片思いユーザーを取得するfetcher
  const likedByUsersFetcher = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Not authenticated');
    const userId = sessionData.session.user.id;

    // 1. ブロック関係のユーザーIDを取得
    const { data: blocksData } = await supabase
      .from('blocks')
      .select('blocker_id,blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    const blockedUserIds = new Set<string>();
    if (blocksData) {
      for (const block of blocksData) {
        if (block.blocker_id === userId) blockedUserIds.add(block.blocked_id);
        if (block.blocked_id === userId) blockedUserIds.add(block.blocker_id);
      }
    }

    // 2. 自分が「いいね」したユーザーIDを取得
    const { data: myLikes } = await supabase.from('likes').select('liked_id').eq('liker_id', userId);
    const myLikedUserIds = myLikes ? myLikes.map((like) => like.liked_id) : [];

    // 3. 除外するユーザーIDのリストを作成
    const excludeFromLikedBy = Array.from(new Set([...myLikedUserIds, ...Array.from(blockedUserIds)]));

    // 4. 自分を「いいね」したユーザーのIDと「いいね」した日時を取得
    let likedByQuery = supabase.from('likes').select('created_at, liker_id').eq('liked_id', userId);
    if (excludeFromLikedBy.length > 0) {
      likedByQuery = likedByQuery.not('liker_id', 'in', `(${excludeFromLikedBy.join(',')})`);
    }
    const { data: likesData, error: likesError } = await likedByQuery.order('created_at', { ascending: false });
    if (likesError) throw likesError;
    if (!likesData) return [];

    // 5. 取得したIDを元に、ユーザーのプロフィール情報を取得
    const likerIds = likesData.map(like => like.liker_id);
    const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('id, username, avatar_url').in('id', likerIds);
    if (profilesError) throw profilesError;

    // 6. 「いいね」情報とプロフィール情報を結合して返す
    return likesData.map(like => ({
      created_at: like.created_at,
      liker: profilesData.find(p => p.id === like.liker_id) || null,
    }));
  };

  const handleCloseModalAndRedirect = () => {
    setShowAddToHomeScreenModal(false);
    alert('アカウントご登録ありがとうございます！最初にプロフィールのご入力をお願いします。');
    router.push('/account');
  };

  const { data: profiles, isLoading: isLoadingProfiles } = useSWR<Profile[]>('profiles', profilesFetcher);
  const { data: likedByUsers, isLoading: isLoadingLikedBy } = useSWR<LikedByUser[]>('likedByUsers', likedByUsersFetcher);

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <Header />
      <main className="p-4 pt-24 pb-24 standalone:p-0 standalone:pt-24 standalone:pb-24">
        <div className="w-full max-w-4xl mx-auto space-y-8 standalone:max-w-none standalone:px-4">
          {/* あなたを気になっている人 */}
          {likedByUsers && likedByUsers.length > 0 ? (
            <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-hidden">
                  <h2 className="text-lg font-semibold text-pink-400 mr-2 whitespace-nowrap">あなたに片思い中</h2>
                  {likedByUsers.slice(0, 5).map(({ liker }) => {
                    if (!liker) return null;
                    return (
                      <Link key={liker.id} href={`/profile/${liker.id}`} className="transition-transform duration-200 hover:scale-110">
                        <AvatarIcon avatarUrlPath={liker.avatar_url} size={40} />
                      </Link>
                    );
                  })}
                </div>
                <button onClick={() => setShowAllLikedBy(!showAllLikedBy)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                  <span>もっと見る</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showAllLikedBy ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              {showAllLikedBy && (
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {likedByUsers.map(({ liker }) => {
                    if (!liker) return null;
                    return (
                      <Link key={liker.id} href={`/profile/${liker.id}`} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-800/40 hover:bg-gray-700/60 transition-colors text-center transition-transform duration-200 hover:scale-105">
                        <AvatarIcon avatarUrlPath={liker.avatar_url} size={56} />
                        <span className="text-sm truncate text-white w-full">{liker.username || '未設定'}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
          {isLoadingProfiles ? (
            <div className="text-center py-10">
              <p>ユーザーを探しています...</p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-start gap-[15px] w-fit mx-auto">
              {profiles?.map((profile) => <ProfileCard key={profile.id} profile={profile} />)}
            </div>
          )}
        </div>
      </main>

      {/* ホーム画面追加案内モーダル */}
      {showAddToHomeScreenModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm text-center shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-white">ホーム画面に追加</h2>
            <p className="text-sm text-gray-300">
              このアプリをホーム画面に追加すると、次回から素早くアクセスできます。
            </p>
            <div className="text-left text-xs bg-gray-700 p-3 rounded-lg text-gray-400 space-y-2">
              <p>
                <span className="font-bold text-white">iOS (Safari):</span><br />
                画面下の共有アイコン <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block -mt-1" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg> をタップし、「ホーム画面に追加」を選択してください。
              </p>
              <p>
                <span className="font-bold text-white">Android (Chrome):</span><br />
                右上のメニュー <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block -mt-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" /></svg> をタップし、「ホーム画面に追加」または「アプリをインストール」を選択してください。
              </p>
            </div>
            <button onClick={handleCloseModalAndRedirect} className="w-full p-3 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 transition-colors">
              次へ進む
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default Home

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  // ログインユーザーのプロフィールを取得して新規ユーザーか判定
  const { data: userProfile, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .maybeSingle();

  return {
    props: {
      isNewUser: !userProfile?.username,
    },
  }
}
