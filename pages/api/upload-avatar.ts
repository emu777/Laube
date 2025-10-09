import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fetch from 'node-fetch';
import { Readable } from 'stream';
import FormData from 'form-data'; // form-dataをインポート
import { createServerClient } from '@supabase/ssr';
import fs from 'fs';

// formidableにファイルのアップロードを処理させるため、Next.jsのデフォルトのbodyパーサーを無効化
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ユーザー認証
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies[name],
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const oldAvatarUrl = fields.oldAvatarUrl?.[0];

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'ファイルが見つかりません。' });
    }

    // PHPスクリプトに送信するためのフォームデータを作成
    const formData = new FormData();
    const fileStream = fs.createReadStream(file.filepath);
    formData.append('file', fileStream, file.originalFilename || 'upload.jpg');

    // PHPスクリプトのエンドポイントURL
    const uploadUrl = 'https://api.laube777.com/avatars/img_upload.php';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        // form-dataが自動でContent-Typeヘッダーを設定するため、ここではカスタムヘッダーのみ
        // PHP側で設定した秘密のキーをヘッダーに含める
        'X-Upload-Token': 'sykosaryo03090730', // PHPスクリプトと同じキーを設定
      },
    });

    if (!response.ok) {
      // PHPスクリプトからの応答がJSONでない場合（HTMLエラーページなど）を考慮
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        if (typeof errorData === 'object' && errorData !== null && 'error' in errorData) {
          throw new Error(String((errorData as { error: unknown }).error));
        }
      } catch (e) {
        // JSONの解析に失敗した場合、HTMLの内容をエラーとして表示
        throw new Error(`アップロードサーバーからの予期しない応答です: ${errorText.substring(0, 200)}`);
      }
      throw new Error(`アップロードに失敗しました。ステータス: ${response.status}`);
    }

    const result: unknown = await response.json(); // 成功時はJSONを期待
    // 型ガード: resultがオブジェクトで、'url'プロパティを持つか確認
    if (
      typeof result === 'object' &&
      result !== null &&
      'url' in result &&
      typeof (result as { url: unknown }).url === 'string'
    ) {
      const newUrl = (result as { url: string }).url;

      // 古いアバターの削除処理 (oldAvatarUrlが存在し、XserverのURLである場合のみ)
      if (
        oldAvatarUrl &&
        typeof oldAvatarUrl === 'string' &&
        (oldAvatarUrl.startsWith('https://api.laube777.com/avatars/images/') ||
          oldAvatarUrl.startsWith('https://laube777.com/avatars/images/'))
      ) {
        // 古い画像の削除は「撃ちっぱなし」で実行し、成否はメインの処理に影響させない
        const oldUrlToDelete = oldAvatarUrl.split('?')[0];
        fetch('https://api.laube777.com/avatars/delete_avatar.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Delete-Token': 'sykosaryo03090730', // PHPスクリプトで設定した秘密のキー
          },
          body: JSON.stringify({ fileUrl: oldUrlToDelete }),
        })
          .then((res) => {
            if (res.ok) {
              console.log('古いアバターの削除リクエストを送信しました:', oldUrlToDelete);
            } else {
              res
                .text()
                .then((text) => console.warn(`古いアバターの削除に失敗しました (Status: ${res.status}):`, text));
            }
          })
          .catch((err) => console.error('古いアバターの削除リクエスト自体に失敗しました:', err));
      }

      res.status(200).json({ url: newUrl }); // 新しいURLをクライアントに返す
    } else {
      throw new Error('PHPスクリプトからの応答が不正です。');
    }
  } catch (error: unknown) {
    console.error('An unexpected error occurred in /api/upload-avatar:', error);
    let errorMessage = 'ファイルのアップロードに失敗しました。';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(500).json({ error: errorMessage });
  }
}
