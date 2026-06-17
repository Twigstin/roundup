import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { Auth } from './pages/Auth.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import { supabase } from './api/supabase.js'
import Spinner from './components/Spinner.jsx'
import { NetworkProvider } from './context/NetworkContext.jsx'
import posthog from 'posthog-js'

const testEmails = [
  'aniobi653@gmail.com',
  'austinaniobi0@gmail.com',
  'aniobiaustin19@gmail.com',
  'twigstin@gmail.com',
  'okehieugochukwu85@gmail.com'
]

posthog.init('phc_ransVbfReTXvvxUVQ7vXS2dV8Fmy5ypk8uagY3Lxakfd', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only'
})

const urlParams = new URLSearchParams(window.location.search)
const refParam = urlParams.get('ref')
if (refParam) {
  localStorage.setItem('roundup_ref', refParam)
}


function Root() {
  const [session, setSession] = useState(undefined)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    // 1. Get initial session status on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // 2. Let Supabase handle the incoming recovery URL automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
        setSession(currentSession)
        // Clean up the URL instantly so layout components don't loop/redirect
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  if (currentSession?.user?.email_confirmed_at) {
    setSession(currentSession)
    posthog.identify(currentSession.user.id, {
      email: currentSession.user.email,
      name: currentSession.user.user_metadata?.display_name || null,
      is_test: testEmails.includes(currentSession.user.email)
    })

    // Capture referral if present
    const pendingRef = localStorage.getItem('roundup_ref')
console.log('pendingRef:', pendingRef)
console.log('currentSession.user.id:', currentSession.user.id)

if (pendingRef && pendingRef !== currentSession.user.id) {
  try {
    console.log('Attempting referral capture...')
    
    const { data: existing, error: selectError } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', currentSession.user.id)
      .maybeSingle()

    console.log('existing:', existing)
    console.log('selectError:', selectError)

    if (!existing) {
      console.log('Inserting referral...')
      const { data: insertData, error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: pendingRef,
          referred_id: currentSession.user.id
        })
        .select()

      console.log('insertData:', insertData)
      console.log('insertError:', insertError)

      if (!insertError) {
        posthog.capture('referral_signup', { referrer_id: pendingRef })
        console.log('Referral captured successfully')
      }
    }
  } catch (err) {
    console.error('Referral capture failed:', err)
  } finally {
    localStorage.removeItem('roundup_ref')
  }
}
  } else {
    supabase.auth.signOut()
  }
}

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setIsRecovery(false)
        posthog.reset()
        window.history.replaceState({}, '', '/')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="loading-container">
        <Spinner size={36} />
      </div>
    )
  }

  // Render Reset screen if flag is raised
  if (isRecovery) {
    return <ResetPassword onDone={() => setIsRecovery(false)} />
  }

  if (!session) {
    return <Auth />
  }

  return (
  <NetworkProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </NetworkProvider>
)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)

export default Root