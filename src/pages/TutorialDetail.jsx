import { useParams, useNavigate, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import tutorials from '../data/tutorialsData'

function TutorialDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const tutorial = tutorials.find(t => t.id === id)

  // Graceful fallback if ID doesn't match anything
  if (!tutorial) {
    return (
      <div>
        <div className="page-header">
          <Link to="/tutorials" className="back-link">
            <FontAwesomeIcon icon={faChevronLeft} /> Tutorials
          </Link>
        </div>
        <div className="empty-state">
          <p className="empty-title">Tutorial not found</p>
          <p className="empty-subtitle">This tutorial doesn't exist or may have been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <Link to="/tutorials" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> All tutorials
        </Link>
      </div>

      <h1 className="page-title bold" style={{ marginBottom: '6px' }}>{tutorial.title}</h1>
      <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px', lineHeight: 1.5 }}>
        {tutorial.description}
      </p>

      {/* YouTube embed - lazy loaded, privacy enhanced */}
      <div className="how-to-video-wrapper">
        <iframe
          className="how-to-video"
          src={`https://www.youtube-nocookie.com/embed/${tutorial.youtubeId}`}
          title={tutorial.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>

      {/* Step by step guide - only render if steps exist */}
      {tutorial.steps && tutorial.steps.length > 0 && (
        <>
          <div style={{ marginTop: '28px', marginBottom: '8px' }}>
            <p className="menu-section-label">Step by step</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
            {tutorial.steps.map((step, index) => (
              <div key={index} className="how-to-step-card">
                <div className="how-to-step-icon" style={{ background: step.bg }}>
                  <FontAwesomeIcon icon={step.icon} style={{ color: step.color, fontSize: '16px' }} />
                </div>
                <div className="how-to-step-content">
                  <p className="how-to-step-title light-bold">{step.title}</p>
                  <p className="how-to-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* I'm ready button - always present */}
      <div className="how-to-ready-section">
        <p className="how-to-ready-label">Got everything you need?</p>
        <button
          className="btn-primary how-to-ready-btn"
          onClick={() => navigate('/')}
        >
          I'm ready, let's go <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '8px' }} />
        </button>
      </div>
    </div>
  )
}

export default TutorialDetail