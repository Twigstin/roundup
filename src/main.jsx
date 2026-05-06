import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { Auth } from './pages/Auth.jsx'
import { supabase } from './api/supabase.js'
import Spinner from './components/Spinner.jsx'

function Root() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
const accessToken = hashParams.get('access_token')
const refreshToken = hashParams.get('refresh_token')

if (accessToken && refreshToken) {
  supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  }).then(({ data: { session } }) => {
    setSession(session)
    window.history.replaceState({}, document.title, '/')
  })
}

  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      setSession(session)
    }
    if (event === 'SIGNED_OUT') {
      setSession(null)
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