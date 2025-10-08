import React from 'react';
import AvatarIcon from './AvatarIcon';

type Profile = {
  avatar_url: string | null;
};

export default function Avatar({
  uid,
  url,
  size,
  onFileSelect,
  isUploading,
}: {
  uid: string;
  url: Profile['avatar_url'];
  size: number;
  onFileSelect: (file: File) => void; // isUploadingをpropsとして受け取る
  isUploading: boolean;
}) {
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileSelect(event.target.files[0]);
    }
    event.target.value = ''; // 同じファイルを選択できるように値をリセット
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <AvatarIcon avatarUrlPath={url} size={size} />
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
          {isUploading ? '...' : ''}
        </label>
        <input
          style={{
            visibility: 'hidden',
            position: 'absolute',
          }}
          type="file"
          id="single"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>
    </div>
  );
}
