import { GetServerSideProps } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getCookie, setCookie } from 'cookies-next';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => getCookie(name, ctx),
        set: (name: string, value: string, options: CookieOptions) => {
          setCookie(name, value, { ...ctx, ...options });
        },
        remove: (name: string, options: CookieOptions) => {
          // `cookies-next` には `remove` がないので、空の値をセットして有効期限を過去にする
          setCookie(name, '', { ...ctx, ...options, maxAge: 0 });
        },
      },
    }
  );

  await supabase.auth.signOut();

  return {
    redirect: {
      destination: '/login',
      permanent: false,
    },
  };
};

const LogoutPage = () => {
  // このページはサーバーサイドでリダイレクトされるため、実際には表示されません。
  // ローディング表示などを念のため入れておきます。
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <p>ログアウトしています...</p>
    </div>
  );
};

export default LogoutPage;
