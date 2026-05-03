import '../styles/globals.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { AppProvider } from '../lib/AppContext'
import { Analytics } from '@vercel/analytics/react'

function trackPageView() {
  fetch('/api/admin/track', { method: 'POST' }).catch(() => {})
}

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    // Track initial page load
    trackPageView()

    // Track subsequent route changes
    const handleRouteChange = () => trackPageView()
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])

  return (
    <AppProvider>
      <Component {...pageProps} />
      <Analytics />
    </AppProvider>
  )
}
