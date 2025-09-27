import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { NextPage, GetServerSidePropsContext } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Login: NextPage = () => {
  const session = useSession()
  const supabase = useSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.replace('/')
    }
  }, [session, router])

  if (session) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 p-4">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Laube</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            style: {
              button: { background: '#e11d48', color: 'white', borderColor: '#e11d48', borderRadius: '8px' },
              input: { background: '#1f2937', color: 'white', borderColor: '#4b5563', borderRadius: '8px' },
            },
          }}
          theme="dark"
          providers={['google']} // 'github'や'apple'など、他のプロバイダーも追加できます
        />
      </div>
    </div>
  )
}

export default Login

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}