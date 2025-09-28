import { GetServerSidePropsContext, NextPage } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
  profiles: Profile[];
  likedByUsers: LikedByUser[];
  isNewUser: boolean;
}

const Home: NextPage<HomePageProps> = ({ profiles, likedByUsers, isNewUser }) => {
  const router = useRouter();

  const [showAddToHomeScreenModal, setShowAddToHomeScreenModal] = useState(false);

  useEffect(() => {
    if (isNewUser) {
      setShowAddToHomeScreenModal(true);
    }
  }, [isNewUser, router]);

  const [showAllLikedBy, setShowAllLikedBy] = useState(false);

  const handleCloseModalAndRedirect = () => {
    setShowAddToHomeScreenModal(false);
    alert('アカウントご登録ありがとうございます！最初にプロフィールのご入力をお願いします。');
    router.push('/account');
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <Header />
      <main className="p-4 pt-24 pb-24">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          {/* あなたを気になっている人 */}
          {likedByUsers.length > 0 ? (
            <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-hidden">
                  <h2 className="text-lg font-semibold text-pink-400 mr-2 whitespace-nowrap">あなたに片思い中</h2>
                  {likedByUsers.slice(0, 5).map(({ liker }) => {
                    if (!liker) return null;
                    return (
                      <Link key={liker.id} href={`/profile/${liker.id}`}>
                        <AvatarIcon avatarUrlPath={liker.avatar_url} size={32} />
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
                      <Link key={liker.id} href={`/profile/${liker.id}`} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-800/40 hover:bg-gray-700/60 transition-colors text-center">
                        <AvatarIcon avatarUrlPath={liker.avatar_url} size={48} />
                        <span className="text-xs truncate text-white w-full">{liker.username || '未設定'}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-center gap-[15px]">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
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
  const supabase = createPagesServerClient(ctx)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }

  // ログインユーザーのプロフィールを取得して新規ユーザーか判定
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .maybeSingle();

  // 自分にいいねしたユーザーを取得
  const { data: likedByUsers, error: likedByError } = await supabase
    .from('likes')
    .select('created_at, liker:liker_id(id, username, avatar_url)')
    .eq('liked_id', session.user.id)
    .order('created_at', { ascending: false });

  // --- デバッグ用コード ---
  console.log('Liked By Users Data:', likedByUsers);
  // --------------------

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, location, age, last_seen')
    // 自分自身を除外する
    .not('id', 'eq', session.user.id)
    // ユーザー名が設定されているユーザーのみ取得
    .not('username', 'is', null)
    // last_seenが新しい順に並び替え、nullは最後にする
    .order('last_seen', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching profiles:', error);
  }
  if (likedByError) {
    console.error('Error fetching liked by users:', likedByError);
  }

  return {
    props: {
      profiles: profiles || [],
      likedByUsers: likedByUsers || [],
      isNewUser: !userProfile?.username,
    },
  }
}
