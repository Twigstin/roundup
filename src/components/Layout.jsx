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
  faUser,
  faGrip,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useNetwork } from '../context/NetworkContext'

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [avatarLetter, setAvatarLetter] = useState('')
  const isOnline = useOnlineStatus()
const [showBanner, setShowBanner] = useState(false)
const [wasOffline, setWasOffline] = useState(false)
const [bannerMessage, setBannerMessage] = useState('')
const [bannerType, setBannerType] = useState('offline')
const { showFailureBanner } = useNetwork()

useEffect(() => {
  if (!isOnline) {
    setBannerMessage("You're offline. Changes may not be saved.")
    setBannerType('offline')
    setShowBanner(true)
    setWasOffline(true)
  } else if (isOnline && wasOffline) {
    setBannerMessage("You're back online. Changes will now save normally.")
    setBannerType('online')
    setShowBanner(true)
    const timer = setTimeout(() => {
      setShowBanner(false)
      setWasOffline(false)
    }, 3000)
    return () => clearTimeout(timer)
  }
}, [isOnline])

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    const email = session?.user?.email || ''
    setAvatarLetter(email.charAt(0).toUpperCase())
  })
}, [])
/*
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    setSession(session)
  }
  if (event === 'TOKEN_REFRESHED') {
    setSession(session)
  }
  if (event === 'SIGNED_OUT') {
    setSession(null)
  }
})
}, [])
*/

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
    { path: '/menu', icon: faGrip, label: 'Menu' },
  ]

  //<FontAwesomeIcon icon={faEllipsis} />

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
          
          <div className={`offline-banner ${bannerType === 'online' ? 'offline-banner-online' : ''} ${showBanner ? 'offline-banner-visible' : ''}`}>
  <span className={`offline-dot ${bannerType === 'online' ? 'offline-dot-online' : ''}`} />
  {bannerMessage}
</div>

{showFailureBanner && (
  <div className="supabase-failure-banner">
    ⚠ Having trouble connecting to the server. Please check your network.
  </div>
)}
          
          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="mobile-layout">
        {isShallowRoute && (
  <div id="mobile-top-nav" className="mobile-top-nav">
    <span className="app-name">Roundup</span>
    <button
      className="mobile-top-nav-avatar"
      onClick={() => navigate('/menu')}
    >
      <span className="mobile-top-nav-letter">
        {avatarLetter}
      </span>
    </button>
  </div>
)}

<div className={`offline-banner ${bannerType === 'online' ? 'offline-banner-online' : ''} ${showBanner ? 'offline-banner-visible' : ''}`}>
  <span className={`offline-dot ${bannerType === 'online' ? 'offline-dot-online' : ''}`} />
  {bannerMessage}
</div>

{showFailureBanner && (
  <div className="supabase-failure-banner">
    <FontAwesomeIcon icon={faTriangleExclamation} /> Having trouble connecting to the server. Please check your network.
  </div>
)}
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