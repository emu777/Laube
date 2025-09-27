import { useState, useEffect } from 'react'
import { useUser, useSupabaseClient, Session } from '@supabase/auth-helpers-react'
import { GetServerSidePropsContext } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

// プロフィールデータの型を定義します
type Profile = {
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  age: number | null;
  sexualities: string[] | null;
  position: string | null;
  drinking: string | null;
  smoking: string | null;
  bio: string | null;
  hobbies: string[] | null;
}

type AccountPageProps = {
  session: Session;
  profile: Profile;
};

export default function Account({ profile }: AccountPageProps) {
  const supabase = useSupabaseClient()
  const user = useUser()
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<Profile['username']>(profile.username || '')
  const [avatar_url, setAvatarUrl] = useState<Profile['avatar_url']>(profile.avatar_url || null)
  const [location, setLocation] = useState<Profile['location']>(profile.location || '')
  const [age, setAge] = useState<Profile['age']>(profile.age || null)
  const [sexualities, setSexualities] = useState<Profile['sexualities']>(profile.sexualities || [])
  const [position, setPosition] = useState<Profile['position']>(profile.position || '')
  const [drinking, setDrinking] = useState<Profile['drinking']>(profile.drinking || '')
  const [smoking, setSmoking] = useState<Profile['smoking']>(profile.smoking || '')
  const [bio, setBio] = useState<Profile['bio']>(profile.bio || '')
  const [hobbies, setHobbies] = useState<Profile['hobbies']>(profile.hobbies || [])

  useEffect(() => {
    setLoading(false);
  }, []);

  async function updateProfile({
    username,
    avatar_url,
    location,
    age,
    sexualities,
    position,
    drinking,
    smoking,
    bio,
    hobbies
  }: Partial<Profile>,
  alertMessage: string = 'プロフを更新しました。') {
    try {
      setLoading(true)
      if (!user) throw new Error('No user')

      const updates = {
        id: user.id,
        username,
        avatar_url,
        location,
        age,
        sexualities,
        position,
        drinking,
        smoking,
        bio,
        hobbies,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)
      if (error) throw error
      alert(alertMessage)
    } catch (error) {
      if (error instanceof Error) {
        alert('Error updating the data!')
        console.log(error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSexualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target
    setSexualities(prev => {
      const prevSexualities = prev || []
      if (checked) {
        return [...prevSexualities, value]
      } else {
        return prevSexualities.filter(item => item !== value)
      }
    })
  }

  const handleHobbyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target
    setHobbies(prev => {
      const prevHobbies = prev || []
      if (checked) {
        return [...prevHobbies, value]
      } else {
        return prevHobbies.filter(item => item !== value)
      }
    })
  }

  const sexualityOptions = [
    'レズビアン', 'バイ', 'パンセク', 'ノンセク', 'アセク',
    'アロマ', 'デミロマ', 'デミセク', 'ポリアモリー', 'FTM'
  ]

  const locationOptions = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県', '海外'
  ]

  const ageOptions = Array.from({ length: 82 }, (_, i) => i + 18)

  const positionOptions = ['タチ', 'リバタチ', 'リバネコ', 'ネコ', '無し']

  const drinkingOptions = ['頻繁', 'たまに', 'しない']

  const smokingOptions = ['紙タバコ', '電子タバコ', '吸わない']

  const hobbyOptions = [
    '音楽', 'ゲーム', '動物', '映画', 'スポーツ', '読書', '美容', 'グルメ・カフェ', '料理', 'ドライブ', '観劇', 'ものづくり', 'アウトドア', 'インドア'
  ]

  if (!user) return null;

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Header />
      <main className="p-4 pt-24 pb-24">
        <div className="w-full max-w-2xl mx-auto space-y-8">
          <h1 className="text-center w-full text-2xl font-bold">マイプロフィール</h1>

          <div className="flex justify-center">
            <Avatar
              uid={user.id}
              url={avatar_url}
              size={150}
              onUpload={(url) => {
                setAvatarUrl(url)
                updateProfile({ username, avatar_url: url, location, age, sexualities, position, drinking, smoking, bio, hobbies }, 'プロフィール画像を更新しました。')
              }}
            />
          </div>

          <form className="w-full space-y-8" onSubmit={(e) => e.preventDefault()}>
            <div className="bg-gray-800 rounded-xl p-6 space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-gray-400">ユーザー名</label>
                  <input id="username" type="text" value={username || ''} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="bio" className="text-sm font-medium text-gray-400">自己紹介</label>
                  <textarea id="bio" rows={5} maxLength={200} value={bio || ''} onChange={(e) => setBio(e.target.value)} className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <label htmlFor="location" className="text-sm font-medium text-gray-400">居住地</label>
                    <select id="location" value={location || ''} onChange={(e) => setLocation(e.target.value)} className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors">
                      <option value="">選択してください</option>
                      {locationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                  <div className="space-y-2 relative">
                    <label htmlFor="age" className="text-sm font-medium text-gray-400">年齢</label>
                    <select id="age" value={age || ''} onChange={(e) => setAge(Number(e.target.value))} className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors">
                      <option value="">選択してください</option>
                      {ageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-medium text-gray-400">セクシャリティ（複数選択可）</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                    {sexualityOptions.map(opt => (
                      <div key={opt} className="flex items-center">
                        <input type="checkbox" id={`sexuality-${opt}`} value={opt} checked={(sexualities || []).includes(opt)} onChange={handleSexualityChange} className="h-4 w-4 rounded border-gray-500 bg-gray-700/50 text-pink-600 focus:ring-pink-500/50 accent-pink-600" />
                        <label htmlFor={`sexuality-${opt}`} className="ml-3 text-sm">{opt}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2 relative">
                    <label htmlFor="position" className="text-sm font-medium text-gray-400">ポジション</label>
                    <select id="position" value={position || ''} onChange={(e) => setPosition(e.target.value)} className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors">
                      <option value="">選択してください</option>
                      {positionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                  </div>
                  <div className="space-y-2 relative">
                    <label htmlFor="drinking" className="text-sm font-medium text-gray-400">飲酒</label>
                    <select id="drinking" value={drinking || ''} onChange={(e) => setDrinking(e.target.value)} className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors">
                      <option value="">選択してください</option>
                      {drinkingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                  </div>
                  <div className="space-y-2 relative">
                    <label htmlFor="smoking" className="text-sm font-medium text-gray-400">喫煙</label>
                    <select id="smoking" value={smoking || ''} onChange={(e) => setSmoking(e.target.value)} className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors">
                      <option value="">選択してください</option>
                      {smokingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-medium text-gray-400">趣味（複数選択可）</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                    {hobbyOptions.map(opt => (
                      <div key={opt} className="flex items-center">
                        <input type="checkbox" id={`hobby-${opt}`} value={opt} checked={(hobbies || []).includes(opt)} onChange={handleHobbyChange} className="h-4 w-4 rounded border-gray-500 bg-gray-700/50 text-pink-600 focus:ring-pink-500/50 accent-pink-600" />
                        <label htmlFor={`hobby-${opt}`} className="ml-3 text-sm">{opt}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* アカウント */}
            <div className="bg-gray-800 rounded-xl p-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-400">メールアドレス</label>
                <input id="email" type="text" value={user?.email || ''} disabled className="w-full p-3 text-gray-500 bg-gray-700/30 border border-gray-600 rounded-lg" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button onClick={() => updateProfile({ username, avatar_url, location, age, sexualities, position, drinking, smoking, bio, hobbies })} disabled={loading} className="w-full p-3 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors">
                {loading ? '保存中...' : 'プロフィールを更新'}
              </button>
              <Link href="/" className="block w-full text-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg no-underline transition-colors">
                戻る
              </Link>
            </div>
          </form>
        </div>
      </main>
      <BottomNav />
      </div>
  )
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session)
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }

  const { data: profileData, error } = await supabase
    .from('profiles')
    .select(`username, avatar_url, location, age, sexualities, position, drinking, smoking, bio, hobbies`)
    .eq('id', session.user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: 0 rows
    console.error('Error fetching profile on server', error);
  }

  return {
    props: {
      initialSession: session,
      profile: profileData || {},
    },
  }
}
