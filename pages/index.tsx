import { GetServerSidePropsContext, NextPage } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useState } from 'react';
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
}

type HomePageProps = {
  profiles: Profile[]
}

const Home: NextPage<HomePageProps> = ({ profiles }) => {
  const [showAllActive, setShowAllActive] = useState(false);

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <Header />
      <main className="p-4 pt-24 pb-24">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          {/* アクティブユーザー表示 */}
          <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-hidden">
                {profiles.slice(0, 7).map(profile => (
                  <Link key={profile.id} href={`/profile/${profile.id}`}>
                    <AvatarIcon avatarUrlPath={profile.avatar_url} size={32} isActive={true} />
                  </Link>
                ))}
              </div>
              <button onClick={() => setShowAllActive(!showAllActive)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                <span>もっと見る</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showAllActive ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            {showAllActive && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">アクティブなユーザー</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {profiles.map(profile => (
                    <Link key={profile.id} href={`/profile/${profile.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 hover:bg-gray-700/60 transition-colors">
                      <AvatarIcon avatarUrlPath={profile.avatar_url} size={40} isActive={true} />
                      <span className="text-sm truncate text-white">{profile.username || '未設定'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-[15px]">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </div>
      </main>
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

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, location, age, last_seen')
    // 最終アクティビティが5分以内のユーザーをオンラインとみなす
    .gt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order('last_seen', { ascending: false });

  if (error) {
    console.error('Error fetching profiles:', error)
    return { props: { profiles: [] } }
  }

  return {
    props: {
      profiles: profiles || [],
    },
  }
}
