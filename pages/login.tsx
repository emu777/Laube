import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { NextPage, GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Login: NextPage = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const { view } = router.query;

  useEffect(() => {
    if (session) {
      router.replace('/');
    }
  }, [session, router]);

  if (session) {
    return null;
  }

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
        />
      </div>
    </div>
  );
};

export default Login;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
