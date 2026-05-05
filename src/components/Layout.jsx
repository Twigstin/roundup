import { Link, useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { supabase } from '../api/supabase'

function Layout() {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <span className="app-name">Roundup</span>
        <div className="nav-links">
          <Link
            to="/"
            className={isActive('/') ? 'nav-link active' : 'nav-link'}
          >
            Tasks
          </Link>
          <Link
            to="/roster"
            className={isActive('/roster') ? 'nav-link active' : 'nav-link'}
          >
            Roster
          </Link>
          <button
            className="nav-logout-btn"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </nav>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout