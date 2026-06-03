import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faLock, faUser } from '@fortawesome/free-solid-svg-icons'

function Account() {
  return (
    <div>
      <div className="page-header">
        <Link to="/menu" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> Menu
        </Link>
      </div>

      <h1 className="page-title bold" style={{ marginBottom: '24px' }}>Manage account</h1>

      <div className="menu-section">
        <p className="menu-section-label">Profile</p>
        <div className="menu-list">
          <Link to="/account/profile" className="menu-list-item" style={{ textDecoration: 'none' }}>
            <span className="menu-list-item-label">
              <span style={{ marginRight: '10px' }}>
                <FontAwesomeIcon icon={faUser} style={{ color: '#111' }} />
              </span>
              Edit profile
            </span>
            <span className="menu-list-chevron">
              <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
            </span>
          </Link>
        </div>
      </div>

      <div className="menu-section" style={{ marginTop: '20px' }}>
        <p className="menu-section-label">Security</p>
        <div className="menu-list">
          <Link to="/account/password" className="menu-list-item" style={{ textDecoration: 'none' }}>
            <span className="menu-list-item-label">
              <span style={{ marginRight: '10px' }}>
                <FontAwesomeIcon icon={faLock} style={{ color: '#111' }} />
              </span>
              Reset password
            </span>
            <span className="menu-list-chevron">
              <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Account