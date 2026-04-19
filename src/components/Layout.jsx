import { Link, useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'

function Layout() {
    const location = useLocation()
    const isActive = (path) => location.pathname === path

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
        </div>
      </nav>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
    )
}

export default Layout