import { GetServerSidePropsContext, NextPage } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

type Profile = {
  id: string
  username: string | null
  avatar_url: string | null
  location: string | null
  age: number | null
  sexualities: string[] | null
  position: string | null
  drinking: string | null
  smoking: string | null
  bio: string | null
  hobbies: string[] | null;
}

type ProfilePageProps = {
  profile: Profile | null
  isLiked: boolean
  isMyProfile: boolean
}

const ProfilePage: NextPage<ProfilePageProps> = ({ profile, isLiked: initialIsLiked, isMyProfile }) => {
  const supabase = useSupabaseClient()
  const user = useUser()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(initialIsLiked)

  useEffect(() => {
    if (profile?.avatar_url) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url)
      setAvatarUrl(data.publicUrl)
    }
  }, [profile, supabase])

  const handleLike = async () => {
    if (!user || !profile || isMyProfile) return

    if (isLiked) {
      // いいねを取り消す
      const { error } = await supabase.from('likes').delete().match({ liker_id: user.id, liked_id: profile.id })
      if (error) {
        console.error('Error unliking profile:', error)
      } else {
        setIsLiked(false)
      }
    } else {
      // いいねする
      const { error } = await supabase.from('likes').insert({ liker_id: user.id, liked_id: profile.id })
      if (error) {
        console.error('Error liking profile:', error)
      } else {
        setIsLiked(true)
      }
    }
  }

  if (!profile) {
    return (
      <div className="bg-gray-900 min-h-screen text-white">
        <Header />
        <main className="p-4 pt-24 text-center">
          <p>ユーザーが見つかりませんでした。</p>
          <Link href="/" className="text-blue-400 hover:underline">
            一覧に戻る
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Header />
      <main className="p-4 pt-24 pb-24">
        <div className="w-full max-w-md mx-auto bg-gray-800 rounded-xl sm:p-6 space-y-6">
          <div className="relative w-full mx-auto aspect-[4/5] max-h-[500px] sm:max-h-[640px] sm:rounded-xl overflow-hidden shadow-lg">
              {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
              <div className="w-full h-full bg-gray-700" />
              )}

            {/* 名前・居住地・年齢 */}
            <div className="absolute bottom-0 left-0 p-4 text-white bg-gradient-to-t from-black/70 to-transparent w-full">
              <h1 className="text-xl font-bold drop-shadow-md">{profile.username || '未設定'}</h1>
              <div className="text-gray-200 text-xs drop-shadow-md mt-1">
                {(profile.location || profile.age) && (
                  <>
                    <span>{profile.location || '未設定'}</span>
                    {profile.location && profile.age && <span className="mx-1">/</span>}
                    {profile.age && <span>{profile.age}歳</span>}
                  </>
                )}
              </div>
              <div className="text-gray-200 text-xs drop-shadow-md mt-1">
                {(profile.sexualities && profile.sexualities.length > 0 || profile.position) && (
                  <>
                    <span>{profile.sexualities?.join(' / ') || '未設定'}</span>
                    {profile.sexualities && profile.sexualities.length > 0 && profile.position && <span className="mx-1">/</span>}
                    {profile.position && <span>{profile.position}</span>}
                  </>
                )}
              </div>
            </div>

            {/* いいねボタン */}
            {!isMyProfile && (
              <div className="absolute bottom-4 right-4">
                <button
                  onClick={handleLike}
                  className={`w-16 h-16 rounded-full transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center border-4 border-gray-800 shadow-xl ${
                    isLiked
                      ? 'bg-pink-500 text-white'
                      : 'bg-white text-pink-500 hover:bg-pink-50'
                  }`}
                  aria-label={isLiked ? 'いいねを取り消す' : 'いいねする'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill={isLiked ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 20.25l-7.682-7.682a4.5 4.5 0 010-6.364z"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {profile.bio && (
            <>
              <div className="border-t border-gray-700 my-4" />
              <p className="text-sm text-center whitespace-pre-wrap leading-relaxed text-gray-300">{profile.bio}</p>
            </>
          )}

          {profile.hobbies && profile.hobbies.length > 0 && (
            <>
              <div className="border-t border-white/10 my-4" />
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.hobbies.map(hobby => (
                  <span key={hobby} className="bg-gray-700 text-gray-300 text-xs font-semibold px-2.5 py-1 rounded-full">{hobby}</span>
                ))}
              </div>
            </>
          )}

          <div className="border-t border-white/10 my-4" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {profile.drinking && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">お酒</span>
                <span className="font-semibold text-white">{profile.drinking}</span>
              </div>
            )}
            {profile.smoking && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">タバコ</span>
                <span className="font-semibold text-white">{profile.smoking}</span>
              </div>
            )}
          </div>

          <div className="pt-4">
            <Link href="/" className="block w-full text-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded no-underline">
              一覧に戻る
            </Link>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}

export default ProfilePage

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } }
  }

  const { id } = ctx.params as { id: string }
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !profile) {    
    return { props: { profile: null, isLiked: false, isMyProfile: false } }
  }

  const isMyProfile = session.user.id === profile.id
  let isLiked = false

  if (!isMyProfile) {
    const { data: likeData, error: likeError } = await supabase
      .from('likes')
      .select('*')
      .eq('liker_id', session.user.id)
      .eq('liked_id', profile.id)
      .single()
    isLiked = !!likeData
  }

  return {
    props: { profile, isLiked, isMyProfile },
  }
}
