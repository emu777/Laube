import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import Image from 'next/image';

type Profile = {
  avatar_url: string | null;
};

export default function Avatar({
  uid,
  url,
  size,
  onUpload,
}: {
  uid: string;
  url: Profile['avatar_url'];
  size: number;
  onUpload: (filePath: string) => void;
}) {
  const supabase = useSupabase();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (url) {
      if (url.startsWith('http')) {
        setImageUrl(url);
      } else {
        const { data } = supabase.storage.from('avatars').getPublicUrl(url);
        setImageUrl(data.publicUrl);
      }
    }
  }, [url, supabase]);

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    console.log('uploadAvatar function triggered.');
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('アップロードする画像を選択してください。');
      }

      const file = event.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      // 新しく作成したAPIエンドポイントにファイルを送信
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'アップロードに失敗しました。');
      }

      const data = await response.json();
      const newUrl = data.url;

      console.log('Upload successful. Calling onUpload callback.');
      onUpload(newUrl); // Xserver上の公開URLを渡す
    } catch (error) {
      console.error('An error occurred in uploadAvatar:', error);
      alert('画像のアップロード中にエラーが発生しました。コンソールで詳細を確認してください。');
    } finally {
      console.log('uploadAvatar function finished. Setting uploading to false.');
      setUploading(false);
    }
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Avatar"
          className="w-full h-full rounded-full object-cover"
          width={size}
          height={size}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gray-700" />
      )}
      <div className="absolute bottom-0 right-0">
        <label
          htmlFor="single"
          className="flex items-center justify-center w-10 h-10 bg-pink-600 rounded-full cursor-pointer hover:bg-pink-700 transition-colors text-white"
          aria-label="アバターをアップロード"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {uploading ? 'Uploading ...' : 'Upload'}
        </label>
        <input
          style={{
            visibility: 'hidden',
            position: 'absolute',
          }}
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </div>
    </div>
  );
}
