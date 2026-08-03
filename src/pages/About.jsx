import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faXmark } from '@fortawesome/free-solid-svg-icons'
import pkg from '../../package.json'
import Tour from '../components/Tour'

function About() {
  const [lightboxSrc, setLightboxSrc] = useState(null)

  const contributors = [
    {
      name: 'Nestor Anyanwu',
      role: 'Director of ICT NACOS FUTO',
      avatarUrl: "https://aqndgxltxpgovpedspzf.supabase.co/storage/v1/object/public/roundup-images/nestor-avatar.jpg"
    }
  ]

  const aboutTourSteps = [
  { selector: '.about-avatar', title: 'View full image', text: 'Tap profile photo to see it full size.' }
]

  /**
   ,
    {
      name: 'Oruche Chukwudumebi Godfrey',
      role: 'Director of ICT ASICTS FUTO',
      avatarUrl: "https://aqndgxltxpgovpedspzf.supabase.co/storage/v1/object/public/roundup-images/dumebi-avatar.JPG"
    }
   */

  return (
    <div>
      <Tour steps={aboutTourSteps} storageKey="roundup_tour_about" onComplete={() => {}} />
      {lightboxSrc && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="lightbox-close"
            onClick={() => setLightboxSrc(null)}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
          <img
            src={lightboxSrc}
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="page-header">
        <Link to="/menu" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> Menu
        </Link>
      </div>

      <div className="about-hero">
        <div className="about-logo-circle">
          <img src='https://aqndgxltxpgovpedspzf.supabase.co/storage/v1/object/public/roundup-images/icon-192.png' style={{ width: "100%", height: "100%", borderRadius: "13px" }} alt="image of roundup official logo"/>
        </div>
        <h1 className="about-app-name bold">Roundup</h1>
        <p className="about-version">Version {pkg.version}</p>
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

        {/**
         <div className="menu-section">
          <p className="menu-section-label">Endorsement</p>
          <div className="about-card about-endorsement">
            <div className="about-person-row">
              <div>
                <div
                  className="about-avatar about-avatar-blue"
                  onClick={() => setLightboxSrc('https://aqndgxltxpgovpedspzf.supabase.co/storage/v1/object/public/roundup-images/nacos-avatar.png')}
                  style={{ cursor: 'pointer' }}
                >
                  <img src='https://aqndgxltxpgovpedspzf.supabase.co/storage/v1/object/public/roundup-images/nacos-avatar.png' alt="NACOS avatar" className='avatar-image' />
                </div>
                <div>
                  <p className="about-endorsement-body bold">Nigeria Association of Computing Students (NACOS)</p>
                  <p className="about-endorsement-university">
                    Federal University of Technology Owerri (FUTO)
                  </p>
                  <p className="about-endorsement-text" style={{ marginTop: '6px' }}>
                    Officially endorsed and recommended to all class representatives.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
         */}

        <div className="menu-section">
          <p className="menu-section-label">Founder & Creator</p>
          <div className="about-card">
            <div className="about-person-row">
              <div>
                <div
                  className="about-avatar about-avatar-dark"
                  onClick={() => setLightboxSrc('https://aqndgxltxpgovpedspzf.supabase.co/storage/v1/object/public/roundup-images/austin-avatar-two.PNG')}
                  style={{ cursor: 'pointer' }}
                >
                  <img src='https://aqndgxltxpgovpedspzf.supabase.co/storage/v1/object/public/roundup-images/austin-avatar-two.PNG' alt="Austin avatar" className='avatar-image' />
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

        {/* <div className="menu-section">
          <p className="menu-section-label">Contributors</p>
          <div className="menu-list">
            {contributors.map((contributor, index) => (
              <div key={index} className="about-contributor-row">
                <div
                  className="about-avatar about-avatar-grey"
                  onClick={() => setLightboxSrc(contributor.avatarUrl)}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={contributor.avatarUrl} alt={`${contributor.name}-avatar`} className='avatar-image' />
                </div>
                <div>
                  <p className="about-contributor-name light-bold">{contributor.name}</p>
                  <p className="about-contributor-role">{contributor.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  )
}

export default About