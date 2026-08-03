import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faArrowLeft } from '@fortawesome/free-solid-svg-icons'

const TOTAL_SLIDES = 5 // intro, classlist, courses, profile, task

function OnboardingCarousel({ hasClassList, hasCourses, hasTasks, profileComplete }) {
  const navigate = useNavigate()

  const [slideIndex, setSlideIndex] = useState(() => {
    const saved = localStorage.getItem('roundup_onboarding_slide')
    return saved ? parseInt(saved, 10) : 0
  })

  useEffect(() => {
    localStorage.setItem('roundup_onboarding_slide', String(slideIndex))
  }, [slideIndex])

  const [viewportHeight, setViewportHeight] = useState(null)
  const trackRef = useRef(null)

  const goNext = () => setSlideIndex(i => Math.min(i + 1, TOTAL_SLIDES - 1))
  const goBack = () => setSlideIndex(i => Math.max(i - 1, 0))

  const handleProfileChoice = (setup) => {
    if (setup) {
      navigate('/account/profile', { state: { from: '/' } })
      return
    }
    goNext()
  }

  useEffect(() => {
    if (!trackRef.current) return
    const activeSlide = trackRef.current.children[slideIndex]
    if (activeSlide) setViewportHeight(activeSlide.offsetHeight)
  }, [slideIndex])


  const StepProgress = ({ current }) => {
    const labels = ['Class list', 'Courses', 'Profile', 'Task']
    const doneFlags = [hasClassList, hasCourses, profileComplete, hasTasks]

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        {labels.map((label, i) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
            <div
              className={`onboarding-step-number ${doneFlags[i] ? 'onboarding-step-done' : i === current ? '' : 'onboarding-step-number-muted'}`}
              style={{ width: '24px', height: '24px', fontSize: '11px' }}
            >
              {doneFlags[i] ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '10px', color: i === current ? '#111' : '#999', textAlign: 'center' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  

  return (
    <div className="onboarding-banner">
      <div
        className="onboarding-carousel-viewport"
        style={{ height: viewportHeight ? `${viewportHeight}px` : 'auto', transition: 'height 0.3s ease' }}
      >
        <div
          ref={trackRef}
          className="onboarding-carousel-track"
          style={{ transform: `translateX(-${slideIndex * 100}%)` }}
        >
          {/* Intro — always slide 0, never conditionally skipped */}
          <div className="onboarding-slide">
            {/* <StepProgress current={0} /> */}
            <p className="onboarding-title bold">Welcome to Roundup 👋</p>
            <p className="onboarding-subtitle" style={{ marginBottom: '20px', lineHeight: '20px' }}>
              Roundup helps class reps track payments, submissions, and attendance — all in one place.<br/>No more spreadsheets, endless WhatsApp chats, or bulky record books.
              <span style={{ marginTop: '10px', display: 'block' }}>Add your class list and courses once, then create and manage tasks in seconds.</span>
            </p>
            <div style={{ width: '100%', display: 'flex' }}>
              <button className="btn-primary" style={{ margin: 'auto' }} onClick={goNext}>
                Get started<FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', marginLeft: '4px' }} />
              </button>
            </div>
          </div>

          {/* Class list */}
          <div className="onboarding-slide">
  <StepProgress current={0} />
  <p className="onboarding-title bold">
    {hasClassList ? 'Class list added ✓' : 'Add your class list'}
  </p>
  <p className="onboarding-subtitle" style={{ marginBottom: '20px', lineHeight: '20px' }}>
    {hasClassList
      ? 'Nice! your students are ready to go. Tap Next to continue.'
      : 'Import your class list so Roundup can track entries for each student.'}
  </p>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <button className="btn-primary" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '10px', marginRight: '4px' }} />Back</button>
    {hasClassList ? (
      <button className="btn-primary" onClick={goNext}>Next<FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', marginLeft: '4px' }} /></button>
    ) : (
      <button className="btn-primary" onClick={() => navigate('/roster', { state: { from: '/' } })}>
        Go to Roster<FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', marginLeft: '4px' }} />
      </button>
    )}
  </div>
</div>

          {/* Courses */}
          <div className="onboarding-slide">
  <StepProgress current={1} />
  <p className="onboarding-title bold">
    {hasCourses ? 'Courses added ✓' : 'Add your courses'}
  </p>
  <p className="onboarding-subtitle" style={{ marginBottom: '20px', lineHeight: '20px' }}>
    {hasCourses
      ? 'Great! your courses are set up. Tap Next to continue.'
      : "Add the courses your class is offering this semester. Roundup uses these for multi-item payment tracking."}
  </p>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <button className="btn-primary" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '10px', marginRight: '4px' }} />Back</button>
    {hasCourses ? (
      <button className="btn-primary" onClick={goNext}>Next<FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', marginLeft: '4px' }} /></button>
    ) : (
      <button className="btn-primary" onClick={() => navigate('/roster?tab=courses')}>
        Add courses<FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', marginLeft: '4px' }} />
      </button>
    )}
  </div>
</div>

          {/* Profile */}
          <div className="onboarding-slide">
  <StepProgress current={2} />
  <p className="onboarding-title bold">
    {profileComplete ? 'Profile set up ✓' : 'Set up your profile'}
  </p>
  <p className="onboarding-subtitle" style={{ marginBottom: '20px', lineHeight: '20px' }}>
    {profileComplete
      ? "You're all set. Tap Next to continue."
      : 'Add your name and level so Roundup feels more personal. It takes just a few seconds.'}
  </p>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <button className="btn-primary" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '10px', marginRight: '4px' }} />Back</button>
    {profileComplete ? (
      <button className="btn-primary" onClick={goNext}>Next<FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', marginLeft: '4px' }} /></button>
    ) : (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn-secondary" onClick={() => handleProfileChoice(false)}>Skip</button>
        <button className="btn-primary" onClick={() => handleProfileChoice(true)}>Set up</button>
      </div>
    )}
  </div>
</div>

          {/* Create task */}
          <div className="onboarding-slide">
  <StepProgress current={3} />
  <p className="onboarding-title bold">
    {hasTasks ? "You're all set! ✓" : 'Create your first task'}
  </p>
  <p className="onboarding-subtitle" style={{ marginBottom: '20px', lineHeight: '20px' }}>
    {hasTasks
      ? "You've created your first task. Head to your dashboard to keep tracking."
      : 'Start tracking payments, submissions or attendance for your class.'}
  </p>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <button className="btn-primary" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '10px', marginRight: '4px' }} />Back</button>
    <button className="btn-primary" onClick={() => navigate(hasTasks ? '/' : '/tasks/new')}>
      {hasTasks ? 'Back to tasks' : 'Create new task'}<FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '10px', marginLeft: '4px' }} />
    </button>
  </div>
</div>
        </div>
      </div>

      <div className="multi-item-dots" style={{ marginTop: '16px' }}>
        {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
          <span key={i} className={`multi-item-dot multi-item-dot-md ${i === slideIndex ? 'multi-item-dot-active' : ''}`} />
        ))}
      </div>
    </div>
  )
}

export default OnboardingCarousel