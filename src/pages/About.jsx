import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'

function About() {
  const contributors = [
    { name: 'Nestor', role: 'ICT Head, ASICT Student Body' },
  ]

  return (
    <div>
      <div className="page-header">
        <Link to="/menu" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> Menu
        </Link>
      </div>

      <div className="about-hero">
        <div className="about-logo-circle">
          <span className="about-logo-letter bold">R</span>
        </div>
        <h1 className="about-app-name bold">Roundup</h1>
        <p className="about-version">Version 1.0.0</p>
      </div>

    <div className='menu-section-ctn'>
      <div className="menu-section" style={{ marginTop: '24px' }}>
        <p className="menu-section-label">About</p>
        <div className="about-card">
          <p className="about-description">
            Roundup is a class rep management tool built to simplify student tracking —
            payments, submissions, and attendance — all in one place.
            Built for Nigerian universities, by a Nigerian student.
          </p>
        </div>
      </div>

      <div className="menu-section">
        <p className="menu-section-label">Endorsement</p>
        <div className="about-card about-endorsement">
          <div className="about-person-row">
            <div>
            <div className="about-avatar about-avatar-blue" />
            <div>
              <p className="about-endorsement-body bold">ASICT Student Body</p>
              <p className="about-endorsement-university">
                Federal University of Technology Owerri (FUTO)
              </p>
              <p className="about-endorsement-text" style={{ marginTop: '6px' }}>
                Officially endorsed and recommended to all class representatives
                across the faculty.
              </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="menu-section">
        <p className="menu-section-label">Creator</p>
        <div className="about-card">
          <div className="about-person-row">
            <div>
            <div className="about-avatar about-avatar-dark">
              <img src='./src/assets/Images/austin-avatar.jpg' alt="Austin avatar" className='avatar-image' />
              </div>
            <div>
              <p className="about-creator-name light-bold">Austin Aniobi</p>
              <p className="about-creator-sub">
                Computer science student building tools that solve real campus problems.
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className="menu-section">
        <p className="menu-section-label">Contributors</p>
        <div className="menu-list">
          {contributors.map((contributor, index) => (
            <div key={index} className="about-contributor-row">
              <div className="about-avatar about-avatar-grey" />
              <div>
                <p className="about-contributor-nam light-bold">{contributor.name}</p>
                <p className="about-contributor-role">{contributor.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}

export default About