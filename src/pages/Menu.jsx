import { supabase } from '../api/supabase'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight, faCircleInfo,faHeadset, faPeopleGroup, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'

function Menu() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user)
      setLoading(false)
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    setLoggingOut(false)
  }

  if (loading) return null

  return (
    <div className="menu-page">

      {/* Account section */}
      <div className="menu-section">
        <div className="menu-account-card">
          <div className="menu-avatar">
            <span className="menu-avatar-letter">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="menu-account-info">
            <p className="menu-account-email">{user?.email}</p>
            <p className="menu-account-sub">Free plan</p>
          </div>
        </div>
      </div>

      {/* App section */}
      <div className="menu-section">
        <p className="menu-section-label">App</p>
        <div className="menu-list">
          <button className="menu-list-item" onClick={() => navigate('/about')}>
            <span className="menu-list-item-label"><span style={{ marginRight: "10px" }}><FontAwesomeIcon icon={faCircleInfo} style={{ color: "#111" }} /></span>About Roundup</span>
            <span className="menu-list-chevron"><FontAwesomeIcon icon={faChevronRight} className="back-linky" /></span>
          </button>
          <button className="menu-list-item" onClick={() => {
            window.open('https://wa.me/2348065571520?text=Hi%2C%20I%20need%20help%20with%20Roundup.', '_blank')
          }}>
            <span className="menu-list-item-label"><span style={{ marginRight: "10px" }}><FontAwesomeIcon icon={faHeadset} style={{ color: "#111" }} /></span>Contact support</span>
            <span className="menu-list-chevron"><FontAwesomeIcon icon={faChevronRight} className="back-linky" /></span>
          </button>
          <button className="menu-list-item" onClick={() => {
            window.open('https://chat.whatsapp.com/JNWoXb4eibt8ZBE1Gu0IAF?mode=gi_t', '_blank')
          }}>
            <span className="menu-list-item-label"><span style={{ marginRight: "10px" }}><FontAwesomeIcon icon={faPeopleGroup} style={{ color: "#111" }} /></span>Join Roundup Community</span>
            <span className="menu-list-chevron"><FontAwesomeIcon icon={faChevronRight} className="back-linky" /></span>
          </button>
        </div>
      </div>

      {/* Account section */}
      <div className="menu-section">
        <p className="menu-section-label">Account</p>
        <div className="menu-list">
          <button className="menu-list-item menu-list-item-danger" onClick={handleLogout}>
            <span className="menu-list-item-label logout-label">{loggingOut ? (
                  <>
                    <Spinner size={14} /> <span style={{ marginLeft: '10px' }}>Logging out...</span>
                  </>
                ) : (
                  <>
                  <span><FontAwesomeIcon icon={faRightFromBracket} /></span><span style={{ marginLeft: '10px' }}>Log out</span>
                  </>
                )}</span>
          </button>
        </div>
      </div>

    </div>
  )
}

export default Menu