import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { serialize, parse } from 'cookie';
import { NextPage, GetServerSidePropsContext } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { useRouter } from 'next/router';
import { useSupabase } from './_app';
import { useState, useEffect } from 'react';

const Login: NextPage = () => {
  const supabase = useSupabase();
  const router = useRouter();
  const { view } = router.query;
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  useEffect(() => {
    // クライアントサイドでのみ window.location.origin を取得して redirectTo を設定
    // これにより、どの環境でも正しいリダイレクトURLが保証される
    setRedirectTo(window.location.origin);
  }, []);
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 p-4">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Laube</h1>

        <Auth
          supabaseClient={supabase}
          view={view === 'sign_up' ? 'sign_up' : 'sign_in'}
          appearance={{
            theme: ThemeSupa,
            style: {
              button: { background: '#e11d48', color: 'white', borderColor: '#e11d48', borderRadius: '8px' },
              input: { background: '#1f2937', color: 'white', borderColor: '#4b5563', borderRadius: '8px' },
            },
          }}
          localization={{
            variables: {
              sign_up: {
                email_label: 'メールアドレス',
                password_label: 'パスワード',
                email_input_placeholder: 'メールアドレス',
                password_input_placeholder: 'パスワード',
                button_label: '新規登録',
                social_provider_text: '{{provider}}で続行',
                link_text: 'アカウントをお持ちでないですか？新規登録',
              },
              sign_in: {
                email_label: 'メールアドレス',
                password_label: 'パスワード',
                email_input_placeholder: 'メールアドレス',
                password_input_placeholder: 'パスワード',
                button_label: 'ログイン',
                social_provider_text: '{{provider}}で続行',
                link_text: 'すでにアカウントをお持ちですか？ログイン',
              },
              magic_link: {
                email_input_label: 'メールアドレス',
                button_label: 'マジックリンクを送信',
                link_text: 'マジックリンクを送信',
              },
              forgotten_password: {
                email_label: 'メールアドレス',
                button_label: 'パスワードをリセット',
                link_text: 'パスワードをお忘れですか？',
              },
              update_password: { password_label: '新しいパスワード', button_label: 'パスワードを更新' },
              verify_otp: {
                email_input_label: 'メールアドレス',
                phone_input_label: '電話番号',
                token_input_label: 'OTP',
                button_label: '確認',
              },
            },
          }}
          theme="dark"
          providers={['google']} // 'github'や'apple'など、他のプロバイダーも追加できます
          redirectTo={redirectTo}
        />
      </div>
    </div>
  );
};

export default Login;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      initialSession: null, // This prop is not used, setting to null
    },
  };
};
