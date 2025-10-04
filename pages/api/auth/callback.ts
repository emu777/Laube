import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextApiRequest, NextApiResponse } from 'next';
import { serialize, parse } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (typeof code === 'string') {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => {
            const parsedCookies = parse(req.headers.cookie || '');
            return Object.entries(parsedCookies).map(([name, value]) => ({ name, value }));
          },
          setAll: (cookiesToSet) => {
            res.setHeader(
              'Set-Cookie',
              cookiesToSet.map(({ name, value, options }) => serialize(name, value, options))
            );
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 認証フロー完了後、トップページにリダイレクト
  res.redirect('/');
}
