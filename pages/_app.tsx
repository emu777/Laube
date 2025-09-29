import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react'
import { AppProps } from 'next/app'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GeistSans } from 'geist/font/sans'
import PageLoader from '@/components/PageLoader'
import { NotificationProvider } from '../contexts/NotificationContext';
import '@/styles/globals.css'

export default function MyApp({
  Component,
  pageProps,
}: AppProps<{
  initialSession: Session
}>) {
  const [supabaseClient] = useState(() => createPagesBrowserClient())
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleStart = () => setLoading(true)
    const handleComplete = () => setLoading(false)

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)

    // 5分ごとに最終アクティビティを更新
    const interval = setInterval(async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        await supabaseClient
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', session.user.id);
      }
    }, 5 * 60 * 1000);

    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
      clearInterval(interval);
    }
  }, [router, supabaseClient])

  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${GeistSans.style.fontFamily};
        }
      `}</style>
      <SessionContextProvider
        supabaseClient={supabaseClient}
        initialSession={pageProps.initialSession}
      >
        <NotificationProvider>
          {loading && <PageLoader />}
          <Component {...pageProps} />
        </NotificationProvider>
      </SessionContextProvider>
    </>
  )
}
