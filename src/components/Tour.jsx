import { useState, useEffect } from 'react'

function Tour({ steps, storageKey, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(storageKey)
    if (seen) {
      onComplete()
      setSkipped(true)
    }
  }, [])

  // ← ONLY this measurement effect — the old synchronous duplicate is gone
  useEffect(() => {
    if (skipped) return
    const measure = () => {
      const el = getVisibleElement(steps[stepIndex]?.selector)
      if (el) setTargetRect(el.getBoundingClientRect())
      else setTargetRect(null)
    }
    const raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [stepIndex, skipped])

  useEffect(() => {
    if (skipped) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [skipped])

  useEffect(() => {
    if (skipped) return
    const recalc = () => {
      const el = getVisibleElement(steps[stepIndex]?.selector)
      if (el) setTargetRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [stepIndex, skipped])

  const getVisibleElement = (selector) => {
  const candidates = document.querySelectorAll(selector)
  for (const el of candidates) {
    if (el.offsetParent !== null) return el
  }
  return null
}

  const finish = () => {
    localStorage.setItem(storageKey, 'true')
    setSkipped(true)
    onComplete()
  }

  const next = () => {
    if (stepIndex < steps.length - 1) setStepIndex(i => i + 1)
    else finish()
  }

  const prev = () => setStepIndex(i => Math.max(0, i - 1))

  if (skipped || !targetRect) return null

  const padding = 8
  const highlightTop = targetRect.top - padding
  const highlightLeft = targetRect.left - padding
  const highlightWidth = targetRect.width + padding * 2
  const highlightHeight = targetRect.height + padding * 2

  const spaceBelow = window.innerHeight - targetRect.bottom
  const tooltipTop = spaceBelow > 160
    ? targetRect.bottom + 16
    : Math.max(16, targetRect.top - 160)

  const tooltipLeft = Math.min(
    Math.max(16, targetRect.left),
    window.innerWidth - 300
  )

  const placement = spaceBelow > 160 ? 'below' : 'above'

  return (
    <div className="tour-overlay">
      <div
        className="tour-highlight"
        style={{
          top: `${highlightTop}px`,
          left: `${highlightLeft}px`,
          width: `${highlightWidth}px`,
          height: `${highlightHeight}px`
        }}
        onClick={(e) => e.stopPropagation()}
      />
      <div
        className={`tour-tooltip tour-tooltip-${placement}`}
        style={{ top: `${tooltipTop}px`, left: `${tooltipLeft}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="tour-tooltip-title bold">{steps[stepIndex].title}</p>
        <p className="tour-tooltip-text">{steps[stepIndex].text}</p>
        <div className="tour-tooltip-actions">
          <button className="tour-skip" onClick={finish}>Skip</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {stepIndex > 0 && (
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={prev}>
                Back
              </button>
            )}
            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={next}>
              {stepIndex < steps.length - 1 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tour