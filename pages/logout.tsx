import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serialize, parse } from 'cookie';

export const getServerSideProps: GetServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          const parsedCookies = parse(ctx.req.headers.cookie || '');
          return Object.entries(parsedCookies).map(([name, value]) => ({
            name,
            value,
          }));
        },
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          ctx.res.setHeader(
            'Set-Cookie',
            cookiesToSet.map(({ name, value, options }) => serialize(name, value, options))
          );
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
