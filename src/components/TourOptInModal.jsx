import { useState, useEffect } from 'react'

function TourOptInModal() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const asked = localStorage.getItem('roundup_tour_optin_asked')
    if (!asked) setShow(true)
  }, [])


  useEffect(() => {
  document.body.style.overflow = show ? 'hidden' : ''
  return () => { document.body.style.overflow = '' }
}, [show])

  const respond = (wantsTour) => {
    localStorage.setItem('roundup_tour_optin_asked', 'true')
    if (wantsTour) {
      // Clear every existing tour flag so all tours behave as if fresh
      Object.keys(localStorage)
        .filter(k => k.startsWith('roundup_tour_'))
        .forEach(k => localStorage.removeItem(k))
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="modal-overlay-new-list">
      <div className="update-banner" id='tour-update-banner' style={{ maxWidth: '400px' }}>
        <div style={{ padding: '28px 24px 20px' }}>
          <p className="page-title bold" style={{ fontSize: '18px', marginBottom: '10px' }}>
            ✨ Explore what's new?
          </p>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>
            We've added quick guided tours to help you get around the app. Want a walkthrough as you visit each page?
          </p>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => respond(false)}>
            No thanks
          </button>
          <button className="btn-primary" style={{ flex: 1, padding: '12px' }} onClick={() => respond(true)}>
            Yes, show me
          </button>
        </div>
      </div>
    </div>
  )
}

export default TourOptInModal