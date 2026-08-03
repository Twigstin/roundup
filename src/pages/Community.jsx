import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'


const ROUNDUP_LOGO_URL = 'https://aqndgxltxpgovpedspzf.supabase.co/storage/v1/object/public/roundup-images/icon-192.png'
const COMMUNITY_LINK = 'https://chat.whatsapp.com/JNWoXb4eibt8ZBE1Gu0IAF?mode=gi_t'

function Community() {
  return (
    <div>
      <div className="page-header">
        <Link to="/menu" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> Menu
        </Link>
      </div>

      <div className="support-page-hero">
        <div className="about-logo-circle">
          <img
            src={ROUNDUP_LOGO_URL}
            style={{ width: '100%', height: '100%', borderRadius: '13px' }}
            alt="Roundup logo"
          />
        </div>
        <h1 className="page-title bold" style={{ marginTop: '16px', marginBottom: '8px', textAlign: 'center' }}>
          Join the Roundup Community
        </h1>
        <p className="support-page-subtitle">
          A WhatsApp group for class reps using Roundup — across Nigerian universities.
        </p>
      </div>

      <div className="form-card" style={{ marginBottom: '16px' }}>
        <p className="support-section-label light-bold">What you'll find in the group</p>
        <ul className="support-list">
          <li>Updates on new Roundup features before anyone else</li>
          <li>Tips and workflows from other class reps</li>
          <li>A direct line to report bugs or suggest ideas</li>
          <li>A community of people solving the same problems you are</li>
        </ul>
      </div>

      <a
        href={COMMUNITY_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary support-cta-btn"
      >
        <FontAwesomeIcon icon={faWhatsapp} className="invite-whatsapp-icon" /> Join the community
      </a>
    </div>
  )
}

export default Community