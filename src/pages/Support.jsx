import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faHeadset, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

const SUPPORT_WHATSAPP = 'https://wa.me/2348065571520?text=Hi%2C%20I%20need%20help%20with%20Roundup.'

function Support() {
  return (
    <div>
      <div className="page-header">
        <Link to="/menu" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> Menu
        </Link>
      </div>

      <div className="support-page-hero">
        <div className="support-icon-circle">
          <FontAwesomeIcon icon={faHeadset} className="support-icon" />
        </div>
        <h1 className="page-title bold" style={{ marginTop: '16px', marginBottom: '8px', textAlign: 'center' }}>
          Contact Support
        </h1>
        <p className="support-page-subtitle">
          Got a problem or question? Reach out directly on WhatsApp and we'll get back to you as soon as we can.
        </p>
      </div>

      <div className="form-card" style={{ marginBottom: '16px' }}>
        <p className="support-section-label light-bold">What you can reach out about</p>
        <ul className="support-list">
          <li>Something in the app isn't working the way it should</li>
          <li>You're confused about how a feature works</li>
          <li>You have a suggestion or feedback</li>
          <li>Anything else on your mind</li>
        </ul>
      </div>

      <div className="form-card" style={{ marginBottom: '20px' }}>
        <p className="support-section-label light-bold">Response time</p>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, marginTop: '8px' }}>
          Usually within a few hours. If it's urgent, mention it at the start of your message and we'll prioritize it.
        </p>
      </div>

      <a
        href={SUPPORT_WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary support-cta-btn"
      >
        <FontAwesomeIcon icon={faWhatsapp} className="invite-whatsapp-icon" /> Message on WhatsApp <FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowRight} />
      </a>
    </div>
  )
}

export default Support