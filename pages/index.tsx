import { GetServerSidePropsContext, NextPage } from 'next';
import { serialize, parse } from 'cookie';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProfileCard from '@/components/ProfileCard';
import AvatarIcon from '@/components/AvatarIcon';

// プロフィールデータの型を定義します
type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  age: number | null;
  last_seen: string | null;
  hobbies: string[] | null;
  bio: string | null;
};

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
};

const Home: NextPage<HomePageProps> = ({ profiles, likedByUsers, isNewUser }) => {
  const router = useRouter();
  const [showAddToHomeScreenModal, setShowAddToHomeScreenModal] = useState(false);

  const handleCloseModalAndRedirect = () => {
    setShowAddToHomeScreenModal(false);
    alert('アカウントご登録ありがとうございます！最初にプロフィールのご入力をお願いします。');
    router.push('/account');
  };

  useEffect(() => {
    if (isNewUser) {
      setShowAddToHomeScreenModal(true);
    }
  }, [isNewUser]);

  const [showAllLikedBy, setShowAllLikedBy] = useState(false);

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <main>
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
                      <Link
                        key={liker.id}
                        href={{
                          pathname: '/profile/[id]',
                          query: { id: liker.id },
                        }}
                        className="transition-transform duration-200 hover:scale-110"
                      >
                        <AvatarIcon avatarUrlPath={liker.avatar_url} size={40} />
                      </Link>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowAllLikedBy(!showAllLikedBy)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <span className="w-12 text-center">もっと見る</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transition-transform ${showAllLikedBy ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {showAllLikedBy && (
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {likedByUsers.map(({ liker }) => {
                    if (!liker) return null;
                    return (
                      <Link
                        key={liker.id}
                        href={{
                          pathname: '/profile/[id]',
                          query: { id: liker.id },
                        }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-800/40 hover:bg-gray-700/60 transition-colors text-center transition-transform duration-200 hover:scale-105"
                      >
                        <AvatarIcon avatarUrlPath={liker.avatar_url} size={56} />
                        <span className="text-sm truncate text-white w-full">{liker.username || '未設定'}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.isArray(profiles) &&
              profiles.map((profile, index) => <ProfileCard key={profile.id} profile={profile} priority={index < 5} />)}
          </div>
        </div>
      </main>

      {/* ホーム画面追加案内モーダル */}
      {showAddToHomeScreenModal && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm text-center shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-white">ホーム画面に追加</h2>
            <p className="text-sm text-gray-300">
              このアプリをホーム画面に追加すると、次回から素早くアクセスできます。
            </p>
            <div className="text-left text-xs bg-gray-700 p-3 rounded-lg text-gray-400 space-y-2">
              <p>
                <span className="font-bold text-white">iOS (Safari):</span>
                <br />
                画面下の共有アイコン{' '}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 inline-block -mt-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>{' '}
                をタップし、「ホーム画面に追加」を選択してください。
              </p>
              <p>
                <span className="font-bold text-white">Android (Chrome):</span>
                <br />
                右上のメニュー{' '}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 inline-block -mt-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
                    clipRule="evenodd"
                  />
                </svg>{' '}
                をタップし、「ホーム画面に追加」または「アプリをインストール」を選択してください。
              </p>
            </div>
            <button
              onClick={handleCloseModalAndRedirect}
              className="w-full p-3 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 transition-colors"
            >
              次へ進む
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

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

  // ログインユーザーのプロフィールを取得して新規ユーザーか判定
  const { data: userProfile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();

  // --- ここからデータ取得ロジックを追加 ---
  // 0. 自分が「いいね」したユーザーIDを取得
  const { data: myLikes } = await supabase.from('likes').select('liked_id').eq('liker_id', user.id);
  const myLikedUserIds = myLikes ? myLikes.map((like) => like.liked_id) : [];

  // 1. ブロック関係にあるユーザーIDのリストを取得
  const { data: blocksData } = await supabase
    .from('blocks')
    .select('blocker_id,blocked_id')
    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
  const blockedUserIds = new Set<string>();
  if (blocksData) {
    for (const block of blocksData) {
      if (block.blocker_id === user.id) blockedUserIds.add(block.blocked_id);
      if (block.blocked_id === user.id) blockedUserIds.add(block.blocker_id);
    }
  }

  // 2. 自分を「いいね」してくれたが、まだマッチングしていない（自分がいいねを返していない）ユーザーを取得
  const excludeFromLikedBy = Array.from(new Set([...myLikedUserIds, ...Array.from(blockedUserIds)]));
  let likedByQuery = supabase.from('likes').select('created_at, liker_id').eq('liked_id', user.id);
  if (excludeFromLikedBy.length > 0) {
    likedByQuery = likedByQuery.not('liker_id', 'in', `(${excludeFromLikedBy.join(',')})`);
  }
  const { data: likesData, error: likesError } = await likedByQuery.order('created_at', { ascending: false });
  if (likesError) console.error('Error fetching liked by users:', likesError);

  let likedByUsers: LikedByUser[] = [];
  if (likesData && likesData.length > 0) {
    const likerIds = likesData.map((like) => like.liker_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', likerIds);

    if (profilesError) {
      console.error('Error fetching liker profiles:', profilesError);
    } else {
      likedByUsers = likesData.map((like) => ({
        created_at: like.created_at,
        liker: (profilesData || []).find((p) => p.id === like.liker_id) || null,
      }));
    }
  }

  // 3. プロフィール一覧を取得 (自分、ブロックしたユーザー、いいねをくれたユーザーは除外)
  const likedByIds = likedByUsers.map((u) => u.liker?.id).filter(Boolean);
  const excludeFromProfiles = Array.from(new Set([user.id, ...Array.from(blockedUserIds), ...likedByIds]));

  let profilesQuery = supabase.from('profiles').select('*').not('username', 'is', null);
  if (excludeFromProfiles.length > 0) {
    // この行は変更ありませんが、この条件が重要です
    profilesQuery = profilesQuery.not('id', 'in', `(${excludeFromProfiles.join(',')})`); // 修正
  }
  const { data: profilesData, error: profilesError } = await profilesQuery.order('last_seen', {
    ascending: false,
    nullsFirst: false,
  });
  if (profilesError) console.error('Error fetching profiles:', profilesError);
  // --- ここまで ---

  return {
    props: {
      profiles: profilesData || [],
      likedByUsers: likedByUsers || [],
      isNewUser: !userProfile?.username,
    },
  };
};
