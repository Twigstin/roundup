import { useNavigate, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faListCheck,
  faUsers,
  faCreditCard,
  faFileCircleCheck,
  faUserCheck,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons'

// Replace this with your actual YouTube video ID
// e.g. for https://www.youtube.com/watch?v=dQw4w9WgXcQ the ID is dQw4w9WgXcQ

//video link: yqYROpLBgaY
const YOUTUBE_VIDEO_ID = 'yqYROpLBgaY'

const steps = [
  {
    icon: faUsers,
    color: '#085041',
    bg: '#E1F5EE',
    title: 'Set up your class list',
    desc: 'Go to the Roster tab and create a class list. Add your students manually or import them from a CSV or Excel file. This is the foundation — every task you create will track from this list.'
  },
  {
    icon: faListCheck,
    color: '#3C3489',
    bg: '#EEEDFE',
    title: 'Create a task',
    desc: 'Head to Tasks and tap "+ New task". Give it a name, choose a type — Payment, Submission, or Attendance — and select your class list. Roundup automatically loads all your students into the task.'
  },
  {
    icon: faCreditCard,
    color: '#085041',
    bg: '#E1F5EE',
    title: 'Track payments',
    desc: 'For payment tasks, tap a student\'s row to cycle through Not paid → Paid → Part paid. You can also mark whether you\'ve collected the money using the "Collected" toggle.'
  },
  {
    icon: faFileCircleCheck,
    color: '#3C3489',
    bg: '#EEEDFE',
    title: 'Track submissions',
    desc: 'For submission tasks, toggle each student between Pending and Submitted. Add notes to any student\'s entry to record details like submission date or file name.'
  },
  {
    icon: faUserCheck,
    color: '#633806',
    bg: '#FAEEDA',
    title: 'Take attendance',
    desc: 'For attendance tasks, mark each student as Present or Absent with a single tap. The summary cards at the top update in real time so you always know your count.'
  },
]

function HowToUse() {
  const navigate = useNavigate()

  const handleReady = () => {
    navigate('/')
  }

  return (
    <div>
      <div className="page-header">
        <Link to="/menu" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> Menu
        </Link>
      </div>

      <h1 className="page-title bold" style={{ marginBottom: '6px' }}>How to use Roundup</h1>
      <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px', lineHeight: 1.5 }}>
        Everything you need to know to manage your class like a pro.
      </p>

      {/* YouTube embed */}
      <div className="how-to-video-wrapper">
        <iframe
          className="how-to-video"
          src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}`}
          title="How to use Roundup"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>

      {/* Step by step guide */}
      <div style={{ marginTop: '28px', marginBottom: '8px' }}>
        <p className="menu-section-label">Step by step</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {steps.map((step, index) => (
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

      {/* I'm ready button */}
      <div className="how-to-ready-section">
        <p className="how-to-ready-label">Got everything you need?</p>
        <button
          className="btn-primary how-to-ready-btn"
          onClick={handleReady}
        >
          I'm ready, let's go <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '8px' }} />
        </button>
      </div>
    </div>
  )
}

export default HowToUse