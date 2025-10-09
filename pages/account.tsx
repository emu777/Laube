import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GetServerSidePropsContext } from 'next';
import { serialize, parse } from 'cookie';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast'; // react-hot-toastをインポート
import Avatar from '@/components/Avatar';
import PageLayout from '@/components/PageLayout';
import SelectInput from '@/components/SelectInput'; // 作成したコンポーネントをインポート
import 'react-image-crop/dist/ReactCrop.css';

// プロフィールデータの型を定義します
type Profile = {
  id: string;
  email: string | undefined;
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

type AccountPageProps = {
  profile: Profile;
};

export default function Account({ profile: initialProfile }: AccountPageProps) {
  const supabase = useSupabase();
  const [profile, setProfile] = useState<Profile>(initialProfile);

  // 常に最新のavatar_urlを保持するためのref
  const avatarUrlRef = useRef(profile.avatar_url);
  avatarUrlRef.current = profile.avatar_url;

  const [isOptionalSectionOpen, setIsOptionalSectionOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  // --- クロップ機能用のState ---
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // --- ここまで ---

  const isFormInvalid = useMemo(() => {
    return (
      !profile.username?.trim() ||
      !profile.location ||
      !profile.age ||
      !profile.sexualities ||
      profile.sexualities.length === 0 ||
      !profile.vibe ||
      !profile.position ||
      !profile.partner_status ||
      !profile.marital_status ||
      !profile.hobbies ||
      profile.hobbies.length === 0
    );
  }, [profile]);

  async function updateProfile(updates: Partial<Profile>, alertMessage: string = 'プロフを更新しました。') {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // `id` を条件に、更新可能なデータのみを送信する
      const { error } = await supabase.from('profiles').update(updatesWithTimestamp).eq('id', user.id);
      if (error) throw error;
      // サーバーから最新のプロフィール情報を再取得してUIを更新
      const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (newProfile) setProfile(newProfile);
      alert(alertMessage);
    } catch (error) {
      alert('プロフィールの更新中にエラーが発生しました。');
      console.error('Error updating profile:', error);
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
      username: profile.username,
      avatar_url: profile.avatar_url,
      location: profile.location,
      sexualities: profile.sexualities,
      position: profile.position,
      vibe: profile.vibe,
      drinking: profile.drinking,
      smoking: profile.smoking,
      bio: profile.bio,
      hobbies: profile.hobbies,
      partner_status: profile.partner_status,
      marital_status: profile.marital_status,
      dating_experience: profile.dating_experience,
      mbti: profile.mbti,
    };
    // ageがnullでない場合のみupdatesオブジェクトに追加
    if (profile.age !== null) {
      updates.age = profile.age;
    }
    updateProfile(updates);
  }; // handleUpdateProfileの終了

  // --- クロップ機能用の関数 ---
  const handleFileSelectForCrop = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result?.toString() || null);
        setCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const minDim = Math.min(width, height); // 辺の短い方を基準にする
    const initialCrop: PixelCrop = {
      unit: 'px', // 'px' 固定なので PixelCrop を使用
      x: (width - minDim) / 2, // 中央に配置
      y: (height - minDim) / 2, // 中央に配置
      width: minDim,
      height: minDim,
    };
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  };

  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const cropData = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = cropData.width;
    canvas.height = cropData.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        image,
        cropData.x * scaleX,
        cropData.y * scaleY,
        cropData.width * scaleX,
        cropData.height * scaleY,
        0,
        0,
        cropData.width,
        cropData.height
      );
      canvas.toBlob(async (blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          // 先にアップロード処理を開始し、完了を待たずにモーダルを閉じる
          handleAvatarUpload(croppedFile);
          setCropModalOpen(false);
          setImageToCrop(null);
        }
      }, 'image/jpeg');
    }
  };
  // --- ここまで ---

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return;
    setIsAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // クロージャの問題を避けるため、ref経由で常に最新のURLを取得する
      const oldUrl = avatarUrlRef.current ? String(avatarUrlRef.current).split('?')[0] : null;
      if (oldUrl) {
        formData.append('oldAvatarUrl', oldUrl);
      }

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'アップロードに失敗しました。';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // JSONの解析に失敗した場合、テキストをそのままエラーメッセージとして使用
        } // ここにセミコロンがありませんでした
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const newUrl = data.url;

      // キャッシュバスティング: URLにタイムスタンプを追加してブラウザキャッシュを無効化
      const newCacheBustedUrl = `${newUrl}?t=${new Date().getTime()}`;

      // 2. データベースのURLを更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newCacheBustedUrl })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      // 3. UIの状態を更新
      setProfile((prev) => ({ ...prev, avatar_url: newCacheBustedUrl }));

      toast.success('アバター画像を更新しました。');
    } catch (error) {
      console.error('An error occurred during avatar upload:', error);
      toast.error('アバターの更新に失敗しました。');
    } finally {
      setIsAvatarUploading(false);
    }
  };
  const handleSexualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setProfile((prev) => {
      const prevSexualities = prev.sexualities || [];
      if (checked) {
        return { ...prev, sexualities: [...prevSexualities, value] };
      } else {
        return { ...prev, sexualities: prevSexualities.filter((item) => item !== value) };
      }
    });
  };

  const handleHobbyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setProfile((prev) => {
      const prevHobbies = prev.hobbies || [];
      if (checked) {
        return { ...prev, hobbies: [...prevHobbies, value] };
      } else {
        return { ...prev, hobbies: prevHobbies.filter((item) => item !== value) };
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

  if (!profile) return <PageLayout maxWidth="max-w-2xl">読み込み中...</PageLayout>;

  return (
    <PageLayout maxWidth="max-w-2xl">
      <div className="space-y-8">
        <h1 className="text-center w-full text-2xl font-bold">マイプロフィール</h1>

        <div className="flex justify-center">
          <Avatar
            key={profile.avatar_url} // URLが変わるたびにコンポーネントを強制的に再生成
            uid={profile.id}
            url={profile.avatar_url}
            size={150}
            onFileSelect={handleFileSelectForCrop}
            isUploading={isAvatarUploading}
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
                value={profile.username || ''}
                onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
                autoComplete="username"
                className="w-full p-3 text-white bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SelectInput
                id="location"
                label="居住地"
                value={profile.location || ''}
                onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                options={locationOptions}
                required
                autoComplete="address-level1"
              />
              <div className="space-y-2 relative">
                <label htmlFor="age" className="text-sm font-medium text-gray-400">
                  年齢
                </label>
                <select
                  id="age"
                  value={profile.age || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, age: Number(e.target.value) }))}
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
                      checked={(profile.sexualities || []).includes(opt)}
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
                value={profile.vibe || ''}
                onChange={(e) => setProfile((p) => ({ ...p, vibe: e.target.value }))}
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
                value={profile.position || ''}
                onChange={(e) => setProfile((p) => ({ ...p, position: e.target.value }))}
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
                  value={profile.partner_status || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, partner_status: e.target.value }))}
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
                  value={profile.marital_status || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, marital_status: e.target.value }))}
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
                      checked={(profile.hobbies || []).includes(opt)}
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
                    value={profile.bio || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
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
                      value={profile.drinking || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, drinking: e.target.value }))}
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
                      value={profile.smoking || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, smoking: e.target.value }))}
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
                      value={profile.dating_experience || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, dating_experience: e.target.value }))}
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
                      value={profile.mbti || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, mbti: e.target.value }))}
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
                value={profile.email || ''}
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

      {/* --- 画像クロップ用モーダル --- */}
      {cropModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg shadow-xl flex flex-col max-h-[calc(100vh-5rem)]">
            <h2 className="text-xl font-semibold text-white p-6 pb-4">画像を切り抜く</h2>
            <div className="flex justify-center">
              {imageToCrop && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imageToCrop}
                    onLoad={onImageLoad}
                    style={{ maxHeight: '60vh' }}
                  />
                </ReactCrop>
              )}
            </div>
            <div className="flex justify-end gap-4 p-6 pt-4 mt-auto">
              <button
                onClick={() => setCropModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCropConfirm}
                disabled={isAvatarUploading}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-full transition-colors disabled:opacity-50"
              >
                {isAvatarUploading ? '処理中...' : '決定'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* プレビュー用の非表示Canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return {
    props: {
      profile: await (async () => {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        return {
          ...profileData,
          email: user.email, // emailをprofileオブジェクトに追加
          id: user.id, // idもuserオブジェクトから取得して確実性を高める
        };
      })(),
    },
  };
};
