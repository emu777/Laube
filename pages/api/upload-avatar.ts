import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Formidable } from 'formidable';
import fs from 'fs';
import SftpClient from 'ssh2-sftp-client';
import path from 'path';

// formidableにファイルのアップロードを処理させるため、Next.jsのデフォルトのbodyパーサーを無効化
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
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
    const form = new Formidable();
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // 一意のファイル名を生成
    const fileExt = path.extname(file.originalFilename || 'file');
    const fileName = `${user.id}-${Date.now()}${fileExt}`;
    const remotePath = `${process.env.XSERVER_UPLOAD_PATH}/${fileName}`;

    // SFTPクライアントの設定
    const sftp = new SftpClient();
    await sftp.connect({
      host: process.env.XSERVER_HOST,
      port: parseInt(process.env.XSERVER_PORT || '22', 10),
      username: process.env.XSERVER_USER,
      password: process.env.XSERVER_PASSWORD,
    });

    // ファイルをXserverにアップロード
    const data = fs.createReadStream(file.filepath);
    await sftp.put(data, remotePath);
    await sftp.end();

    // アップロードされたファイルの公開URLを生成
    const publicUrl = `${process.env.XSERVER_PUBLIC_URL_BASE}/${fileName}`;

    // クライアントに公開URLを返す
    res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file.' });
  }
}
