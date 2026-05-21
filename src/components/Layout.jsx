import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { supabase } from '../api/supabase'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faListCheck, 
  faUsers, 
  faBars,
  faChevronLeft,
  faHouse,
  faUser
} from '@fortawesome/free-solid-svg-icons'

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const shallowRoutes = ['/', '/roster', '/menu']
  const isShallowRoute = shallowRoutes.includes(location.pathname)

  const pillPositions = [8, 'calc(33.333% + 4px)', 'calc(66.666% + 0px)']


  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('roundup_sidebar')
    return saved !== null ? JSON.parse(saved) : true
  })

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const toggleSidebar = () => {
    setSidebarExpanded(prev => {
      const next = !prev
      localStorage.setItem('roundup_sidebar', JSON.stringify(next))
      return next
    })
  }

  const navItems = [
    { path: '/', icon: faHouse, label: 'Tasks' },
    { path: '/roster', icon: faUsers, label: 'Roster' },
    { path: '/menu', icon: faUser, label: 'Menu' },
  ]

  const activeIndex = navItems.findIndex(item => isActive(item.path))

  return (
    <div className="app-shell">

      {/* DESKTOP LAYOUT */}
      <div className="desktop-layout">
        <div className={`sidebar ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
          <div className="sidebar-header">
            {sidebarExpanded && <span className="app-name">Roundup</span>}
            <button className="sidebar-toggle" onClick={toggleSidebar}>
              <FontAwesomeIcon icon={sidebarExpanded ? faChevronLeft : faBars} />
            </button>
          </div>

          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${isActive(item.path) ? 'sidebar-nav-item-active' : ''}`}
              >
                <FontAwesomeIcon icon={item.icon} className="sidebar-nav-icon" />
                {sidebarExpanded && <span className="sidebar-nav-label">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="desktop-content">
          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="mobile-layout">
        <main className="page-content">
          <Outlet />
        </main>

        {isShallowRoute && (
          <div className="bottom-nav">
          <div
            className="bottom-nav-pill"
            style={{ 
              left: pillPositions[activeIndex],
              transform: 'none',
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
          {navItems.map((item, index) => (
            <button
              key={item.path}
              className={`bottom-nav-item ${activeIndex === index ? 'bottom-nav-item-active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <FontAwesomeIcon icon={item.icon} className="bottom-nav-icon" />
              <span className="bottom-nav-label">{item.label}</span>
            </button>
          ))}
        </div>
        )}
      </div>

    </div>
  )
}

export default Layout