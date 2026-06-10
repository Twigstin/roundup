import { useNavigate, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faCirclePlay } from '@fortawesome/free-solid-svg-icons'
import tutorials from '../data/tutorialsData'

function TutorialList() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="page-header">
        <Link to="/menu" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> Menu
        </Link>
      </div>

      <h1 className="page-title bold" style={{ marginBottom: '6px' }}>How to use Roundup</h1>
      <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px', lineHeight: 1.5 }}>
        Step-by-step video guides to help you get the most out of Roundup.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tutorials.map((tutorial) => (
          <button
            key={tutorial.id}
            className="tutorial-list-card"
            onClick={() => navigate(`/tutorials/${tutorial.id}`)}
          >
            <div className="tutorial-list-card-icon">
              <FontAwesomeIcon icon={faCirclePlay} style={{ fontSize: '22px', color: '#111' }} />
            </div>
            <div className="tutorial-list-card-content">
              <p className="tutorial-list-card-title light-bold">{tutorial.title}</p>
              <p className="tutorial-list-card-desc">{tutorial.description}</p>
              <span className="tutorial-list-card-duration">{tutorial.duration}</span>
            </div>
            <span className="menu-list-chevron">
              <FontAwesomeIcon icon={faChevronRight} className="back-linky" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TutorialList