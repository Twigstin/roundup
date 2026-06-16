import { supabase } from '../api/supabase'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight, faUserPlus, faCircleInfo, faArrowRight, faCirclePlay, faHeadset, faPeopleGroup, faRightFromBracket, faUserCog } from '@fortawesome/free-solid-svg-icons'

function Menu() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ firstName: '', lastName: '', level: '' })
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user
      setUser(u)
      const meta = u?.user_metadata || {}
      setProfile({
        firstName: meta.first_name || '',
        lastName: meta.last_name || '',
        level: meta.level || ''
      })
      setLoading(false)
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    setLoggingOut(false)
  }

  const displayName = profile.firstName && profile.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile.firstName
      ? `${profile.firstName}`
      : user?.email || ''

  const avatarLetter = profile.firstName
    ? profile.firstName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || '?'
/*
  const subLine = profile.firstName
    ? `${profile.level ? profile.level + ' · ' : ''}Free plan`
    : 'Free plan'

*/

  if (loading) return null

  return (
    <div className="menu-page">
      <h1 className="page-title bold">Menu</h1>
      {/* Account banner — tapping goes to edit profile */}
      <div className="menu-section">
        <div
          className="menu-account-card"
          style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid #e5e5e5', borderRadius: '12px', background: '#fff' }}
          onClick={() => navigate('/account/profile', { state: { from: '/menu' } })}
        >
          <div className="menu-avatar">
            <span className="menu-avatar-letter">{avatarLetter}</span>
          </div>
          <div className="menu-account-info" style={{ flex: 1, minWidth: 0 }}>
  <p className="menu-account-email">{displayName}</p>
  <p className="menu-account-sub">
    {profile.firstName
      ? [profile.level, 'Free plan']
          .filter(Boolean)
          .map((part, i, arr) => (
            <span key={i}>
              {part}{i < arr.length - 1 && <span style={{ fontWeight: '700', margin: '0 4px' }}>·</span>}
            </span>
          ))
      : 'Free plan'
    }
  </p>
  {profile.firstName && user?.email && (
    <p className="menu-account-email-line">{user.email}</p>
  )}
</div>
          <span className="menu-list-chevron">
            <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
          </span>
        </div>
        {!profile.firstName && (
          <button
            className="menu-setup-prompt"
            onClick={() => navigate('/account/profile', { state: { from: '/menu' } })}
          >
            <span>👋 Complete your profile setup — add your name and level</span>
            <span className="menu-setup-arrow">Set up <FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowRight} /></span>
          </button>
        )}
      </div>

      {/* App section */}
      <div className="menu-section">
        <p className="menu-section-label">App</p>
        <div className="menu-list">
          <div className="menu-list-item" onClick={() => navigate('/about')}>
            <span className="menu-list-item-label">
              <span style={{ marginRight: '10px' }}>
                <FontAwesomeIcon icon={faCircleInfo} style={{ color: '#111' }} />
              </span>
              About Roundup
            </span>
            <span className="menu-list-chevron">
              <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
            </span>
          </div>
          <div className="menu-list-item" onClick={() => navigate('/tutorials')}>
            <span className="menu-list-item-label">
              <span style={{ marginRight: '10px' }}>
                <FontAwesomeIcon icon={faCirclePlay} style={{ color: '#111' }} />
              </span>
              How to use Roundup
            </span>
            <span className="menu-list-chevron">
              <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
            </span>
          </div>

          <div className="menu-list-item" onClick={() => navigate('/invite')}>
            <span className="menu-list-item-label">
              <span style={{ marginRight: '10px' }}>
                <FontAwesomeIcon icon={faUserPlus} style={{ color: '#111' }} />
              </span>
              Invite a user
            </span>
            <span className="menu-list-chevron">
              <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
            </span>
          </div>
          <div className="menu-list-item" onClick={() => {
            navigate('/support')
          }}>
            <span className="menu-list-item-label">
              <span style={{ marginRight: '10px' }}>
                <FontAwesomeIcon icon={faHeadset} style={{ color: '#111' }} />
              </span>
              Contact support
            </span>
            <span className="menu-list-chevron">
              <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
            </span>
          </div>
          <div className="menu-list-item" onClick={() => {
            navigate('/community')
          }}>
            <span className="menu-list-item-label">
              <span style={{ marginRight: '10px' }}>
                <FontAwesomeIcon icon={faPeopleGroup} style={{ color: '#111' }} />
              </span>
              Join Roundup Community
            </span>
            <span className="menu-list-chevron">
              <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
            </span>
          </div>
        </div>
      </div>

      {/* Account section */}
      <div className="menu-section">
        <p className="menu-section-label">Account</p>
        <div className="menu-list">
          <div className="menu-list-item" onClick={() => navigate('/account')}>
            <span className="menu-list-item-label">
              <span style={{ marginRight: '10px' }}>
                <FontAwesomeIcon icon={faUserCog} style={{ color: '#111' }} />
              </span>
              Manage account
            </span>
            <span className="menu-list-chevron">
              <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
            </span>
          </div>
          
          <div className="menu-list-item menu-list-item-danger" onClick={handleLogout}>
            <span className="menu-list-item-label logout-label">
              {loggingOut ? (
                <>
                  <Spinner size={14} />
                  <span style={{ marginLeft: '10px' }}>Logging out...</span>
                </>
              ) : (
                <>
                  <span><FontAwesomeIcon icon={faRightFromBracket} /></span>
                  <span style={{ marginLeft: '10px' }}>Log out</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Menu