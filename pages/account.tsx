import { useState, useEffect, useMemo, useCallback } from 'react';
import { GetServerSidePropsContext } from 'next';
import { serialize, parse } from 'cookie';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import useSWR from 'swr';
import { useSupabase } from './_app';
import type { User } from '@supabase/supabase-js';
import Avatar from '@/components/Avatar';
import PageLayout from '@/components/PageLayout';

// プロフィールデータの型を定義します
type Profile = {
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  age: number | null;
  sexualities: string[] | null;
  position: string | null;
  vibe: string | null;
  drinking: string | null;
  smoking: string | null;
  bio: string | null;
  hobbies: string[] | null;
  partner_status: string | null;
  marital_status: string | null;
  dating_experience: string | null;
  mbti: string | null;
};

export default function Account() {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetcher = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    return data;
  }, [supabase, user]);

  const { data: profile, error, isLoading, mutate } = useSWR<Profile>(user ? 'profile' : null, fetcher);

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState<Profile['username']>('');
  const [avatar_url, setAvatarUrl] = useState<Profile['avatar_url']>(null);
  const [location, setLocation] = useState<Profile['location']>('');
  const [age, setAge] = useState<Profile['age']>(null);
  const [sexualities, setSexualities] = useState<Profile['sexualities']>([]);
  const [position, setPosition] = useState<Profile['position']>('');
  const [vibe, setVibe] = useState<Profile['vibe']>('');
  const [drinking, setDrinking] = useState<Profile['drinking']>('');
  const [smoking, setSmoking] = useState<Profile['smoking']>('');
  const [bio, setBio] = useState<Profile['bio']>('');
  const [hobbies, setHobbies] = useState<Profile['hobbies']>([]);
  const [partnerStatus, setPartnerStatus] = useState<Profile['partner_status']>('');
  const [maritalStatus, setMaritalStatus] = useState<Profile['marital_status']>('');
  const [datingExperience, setDatingExperience] = useState<Profile['dating_experience']>('');
  const [mbti, setMbti] = useState<Profile['mbti']>('');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || null);
      setLocation(profile.location || '');
      setAge(profile.age || null);
      setSexualities(profile.sexualities || []);
      setPosition(profile.position || '');
      setVibe(profile.vibe || '');
      setDrinking(profile.drinking || '');
      setSmoking(profile.smoking || '');
      setBio(profile.bio || '');
      setHobbies(profile.hobbies || []);
      setPartnerStatus(profile.partner_status || '');
      setMaritalStatus(profile.marital_status || '');
      setDatingExperience(profile.dating_experience || '');
      setMbti(profile.mbti || '');
    }
  }, [profile]);

  const [isOptionalSectionOpen, setIsOptionalSectionOpen] = useState(false);

  const isFormInvalid = useMemo(() => {
    return (
      !username?.trim() ||
      !location ||
      !age ||
      !sexualities ||
      sexualities.length === 0 ||
      !vibe ||
      !position ||
      !partnerStatus ||
      !maritalStatus ||
      !hobbies ||
      hobbies.length === 0
    );
  }, [username, location, age, sexualities, vibe, position, partnerStatus, maritalStatus, hobbies]);

  async function updateProfile(updates: Partial<Profile>, alertMessage: string = 'プロフを更新しました。') {
    try {
      setLoading(true);
      if (!user) throw new Error('No user');

      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      console.log('プロフィール更新開始 (DB送信データ):', updates);
      // `id` を条件に、更新可能なデータのみを送信する
      const { error } = await supabase.from('profiles').update(updatesWithTimestamp).eq('id', user.id);
      if (error) throw error;
      mutate(); // SWRのキャッシュを再検証してUIを更新
      alert(alertMessage);
      console.log('プロフィール更新成功');
    } catch (error) {
      alert('プロフィールの更新中にエラーが発生しました。');
      console.error('プロフィール更新エラー:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateProfile = () => {
    if (isFormInvalid) {
      alert('必須項目で未入力の項目があります。');
      return;
    }
    const updates: Partial<Profile> = {
      username,
      avatar_url, // avatar_urlを更新オブジェクトに含める
      location,
      sexualities,
      position,
      vibe,
      drinking,
      smoking,
      bio,
      hobbies,
      partner_status: partnerStatus, // Supabaseのカラム名に合わせる
      marital_status: maritalStatus, // Supabaseのカラム名に合わせる
      dating_experience: datingExperience, // Supabaseのカラム名に合わせる
      mbti, // Supabaseのカラム名に合わせる
    };
    // ageがnullでない場合のみupdatesオブジェクトに追加
    if (age !== null) {
      updates.age = age;
    }
    updateProfile(updates);
  }; // handleUpdateProfileの終了
  const handleSexualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setSexualities((prev) => {
      const prevSexualities = prev || [];
      if (checked) {
        return [...prevSexualities, value];
      } else {
        return prevSexualities.filter((item) => item !== value);
      }
    });
  };

  const handleHobbyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setHobbies((prev) => {
      const prevHobbies = prev || [];
      if (checked) {
        return [...prevHobbies, value];
      } else {
        return prevHobbies.filter((item) => item !== value);
      }
    });
  };

  const sexualityOptions = [
    'レズビアン',
    'バイ',
    'パンセク',
    'ノンセク',
    'アセク',
    'アロマ',
    'デミロマ',
    'デミセク',
    'ポリアモリー',
    'FTM',
  ];

  const locationOptions = [
    '北海道',
    '青森県',
    '岩手県',
    '宮城県',
    '秋田県',
    '山形県',
    '福島県',
    '茨城県',
    '栃木県',
    '群馬県',
    '埼玉県',
    '千葉県',
    '東京都',
    '神奈川県',
    '新潟県',
    '富山県',
    '石川県',
    '福井県',
    '山梨県',
    '長野県',
    '岐阜県',
    '静岡県',
    '愛知県',
    '三重県',
    '滋賀県',
    '京都府',
    '大阪府',
    '兵庫県',
    '奈良県',
    '和歌山県',
    '鳥取県',
    '島根県',
    '岡山県',
    '広島県',
    '山口県',
    '徳島県',
    '香川県',
    '愛媛県',
    '高知県',
    '福岡県',
    '佐賀県',
    '長崎県',
    '熊本県',
    '大分県',
    '宮崎県',
    '鹿児島県',
    '沖縄県',
    '海外',
  ];

  const ageOptions = Array.from({ length: 82 }, (_, i) => i + 18);

  const vibeOptions = ['フェム', '中性', 'ボイ', '気分で変わる'];

  const positionOptions = ['タチ', 'リバタチ', 'リバ', 'リバネコ', 'ネコ', '分からない'];

  const drinkingOptions = ['呑まない', 'たまに', 'よく呑む'];

  const smokingOptions = ['紙タバコ', '電子タバコ', '吸わない'];

  const hobbyOptions = [
    '音楽',
    'ゲーム',
    '動物',
    '映画',
    'スポーツ',
    '読書',
    '美容',
    'グルメ・カフェ',
    '料理',
    'ドライブ',
    '観劇',
    'ものづくり',
    'アウトドア',
    'インドア',
  ];

  const partnerStatusOptions = ['いる', 'いない'];

  const maritalStatusOptions = ['未婚', '未婚（子有り）', '既婚', '既婚（子有り）'];

  const datingExperienceOptions = ['有', '無'];

  const mbtiOptions = [
    'INTJ',
    'INTP',
    'ENTJ',
    'ENTP',
    'INFJ',
    'INFP',
    'ENFJ',
    'ENFP',
    'ISTJ',
    'ISFJ',
    'ESTJ',
    'ESFJ',
    'ISTP',
    'ISFP',
    'ESTP',
    'ESFP',
  ];

  if (isLoading || !user) return <PageLayout maxWidth="max-w-2xl">読み込み中...</PageLayout>;

  return (
    <PageLayout maxWidth="max-w-2xl">
      <div className="space-y-8">
        <h1 className="text-center w-full text-2xl font-bold">マイプロフィール</h1>

        <div className="flex justify-center">
          <Avatar
            uid={user.id}
            url={avatar_url}
            size={150}
            onUpload={(url) => {
              setAvatarUrl(url);
              updateProfile({ avatar_url: url }, 'プロフィール画像を更新しました。');
            }}
          />
        </div>

        <form className="w-full space-y-8" onSubmit={(e) => e.preventDefault()}>
          {/* 必須項目 */}
          <div className="bg-gray-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold border-b border-gray-700 pb-3">必須項目</h2>
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-gray-400">
                ユーザー名
              </label>
              <input
                id="username"
                type="text"
                value={username || ''}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2 relative">
                <label htmlFor="location" className="text-sm font-medium text-gray-400">
                  居住地
                </label>
                <select
                  id="location"
                  value={location || ''}
                  onChange={(e) => setLocation(e.target.value)}
                  autoComplete="address-level1"
                  className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                  required
                >
                  <option value="">選択してください</option>
                  {locationOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2 relative">
                <label htmlFor="age" className="text-sm font-medium text-gray-400">
                  年齢
                </label>
                <select
                  id="age"
                  value={age || ''}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                  required
                >
                  <option value="">選択してください</option>
                  {ageOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-gray-400">セクシャリティ（複数選択可）</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                {sexualityOptions.map((opt) => (
                  <div key={opt} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`sexuality-${opt}`}
                      value={opt}
                      checked={(sexualities || []).includes(opt)}
                      onChange={handleSexualityChange}
                      className="h-4 w-4 rounded border-gray-500 bg-gray-700/50 text-pink-600 focus:ring-pink-500/50 accent-pink-600"
                    />
                    <label htmlFor={`sexuality-${opt}`} className="ml-3 text-sm">
                      {opt}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 relative">
              <label htmlFor="vibe" className="text-sm font-medium text-gray-400">
                雰囲気
              </label>
              <select
                id="vibe"
                value={vibe || ''}
                onChange={(e) => setVibe(e.target.value)}
                className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                required
              >
                <option value="">選択してください</option>
                {vibeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2 relative">
              <label htmlFor="position" className="text-sm font-medium text-gray-400">
                ポジション
              </label>
              <select
                id="position"
                value={position || ''}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                required
              >
                <option value="">選択してください</option>
                {positionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2 relative">
                <label htmlFor="partner_status" className="text-sm font-medium text-gray-400">
                  恋人
                </label>
                <select
                  id="partner_status"
                  value={partnerStatus || ''}
                  onChange={(e) => setPartnerStatus(e.target.value)}
                  className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                  required
                >
                  <option value="">選択してください</option>
                  {partnerStatusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2 relative">
                <label htmlFor="marital_status" className="text-sm font-medium text-gray-400">
                  結婚（子供）
                </label>
                <select
                  id="marital_status"
                  value={maritalStatus || ''}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                  required
                >
                  <option value="">選択してください</option>
                  {maritalStatusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-gray-400">趣味（複数選択可）</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                {hobbyOptions.map((opt) => (
                  <div key={opt} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`hobby-${opt}`}
                      value={opt}
                      checked={(hobbies || []).includes(opt)}
                      onChange={handleHobbyChange}
                      className="h-4 w-4 rounded border-gray-500 bg-gray-700/50 text-pink-600 focus:ring-pink-500/50 accent-pink-600"
                    />
                    <label htmlFor={`hobby-${opt}`} className="ml-3 text-sm">
                      {opt}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 任意入力項目 */}
          <div className="bg-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setIsOptionalSectionOpen(!isOptionalSectionOpen)}
              className="w-full p-6 text-left flex justify-between items-center"
            >
              <h2 className="text-lg font-semibold">任意入力項目</h2>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform ${isOptionalSectionOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {isOptionalSectionOpen && (
              <div className="p-6 pt-0 space-y-6">
                <div className="space-y-2">
                  <label htmlFor="bio" className="text-sm font-medium text-gray-400">
                    自己紹介
                  </label>
                  <textarea
                    id="bio"
                    rows={5}
                    maxLength={200}
                    value={bio || ''}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2 relative">
                    <label htmlFor="drinking" className="text-sm font-medium text-gray-400">
                      飲酒
                    </label>
                    <select
                      id="drinking"
                      value={drinking || ''}
                      onChange={(e) => setDrinking(e.target.value)}
                      className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                    >
                      <option value="">選択してください</option>
                      {drinkingOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-2 relative">
                    <label htmlFor="smoking" className="text-sm font-medium text-gray-400">
                      喫煙
                    </label>
                    <select
                      id="smoking"
                      value={smoking || ''}
                      onChange={(e) => setSmoking(e.target.value)}
                      className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                    >
                      <option value="">選択してください</option>
                      {smokingOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-2 relative">
                    <label htmlFor="dating_experience" className="text-sm font-medium text-gray-400">
                      女性との交際歴
                    </label>
                    <select
                      id="dating_experience"
                      value={datingExperience || ''}
                      onChange={(e) => setDatingExperience(e.target.value)}
                      className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                    >
                      <option value="">選択してください</option>
                      {datingExperienceOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-2 relative sm:col-span-3">
                    <label htmlFor="mbti" className="text-sm font-medium text-gray-400">
                      MBTI
                    </label>
                    <select
                      id="mbti"
                      value={mbti || ''}
                      onChange={(e) => setMbti(e.target.value)}
                      className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg appearance-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                    >
                      <option value="">選択してください</option>
                      {mbtiOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl p-6 space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-400">
                メールアドレス
              </label>
              <input
                id="email"
                type="text"
                value={user?.email || ''}
                autoComplete="email"
                disabled
                className="w-full p-3 text-gray-500 bg-gray-700/30 border border-gray-600 rounded-lg"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full p-3 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '保存中...' : 'プロフィールを更新'}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

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
  return {
    props: {},
  };
};
