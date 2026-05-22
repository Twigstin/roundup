import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { Auth } from './pages/Auth.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import { supabase } from './api/supabase.js'
import Spinner from './components/Spinner.jsx'

function Root() {
  const [session, setSession] = useState(undefined)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    // 1. Get initial session status on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // 2. Let Supabase handle the incoming recovery URL automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
        setSession(currentSession)
        // Clean up the URL instantly so layout components don't loop/redirect
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(currentSession)
      }

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setIsRecovery(false)
        window.history.replaceState({}, '', '/')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="loading-container">
        <Spinner size={24} />
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
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)

export default Root