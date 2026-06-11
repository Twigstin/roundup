import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import Spinner from '../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { Link, useLocation } from 'react-router-dom'

function EditProfile() {
  const { state } = useLocation()
  const backPath = state?.from || '/account'
  const backLabel = state?.from === '/menu' ? 'Menu'
    : state?.from === '/' ? 'Tasks'
    : 'Manage account'
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [level, setLevel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const meta = session?.user?.user_metadata || {}
      setFirstName(meta.first_name || '')
      setLastName(meta.last_name || '')
      setLevel(meta.level || '')
      setLoading(false)
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 4000)
    return () => clearTimeout(timer)
  }, [error])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(false), 3000)
    return () => clearTimeout(timer)
  }, [success])

  const handleSave = async () => {
  const nameRegex = /^[a-zA-Z]+$/

  if (!firstName.trim()) {
    setError('Please enter your first name')
    return
  }
  if (!nameRegex.test(firstName.trim())) {
    setError('First name must contain letters only, no spaces or special characters')
    return
  }
  if (lastName.trim() && !nameRegex.test(lastName.trim())) {
    setError('Last name must contain letters only, no spaces or special characters')
    return
  }
  if (!level) {
    setError('Please select your level')
    return
  }

  setSaving(true)
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      level
    }
  })
  setSaving(false)

  if (updateError) {
    setError(updateError.message)
  } else {
    setSuccess(true)
  }
}

  if (loading) {
    return (
      <div className="loading-container">
        <Spinner size={36} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <Link to={backPath} className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> {backLabel}
        </Link>
      </div>

      <div className="form-card">
        <h1 className="page-title bold" style={{ marginBottom: '24px' }}>Edit profile</h1>

        {error && <p className="form-error">{error}</p>}

        {success && (
          <p style={{
            color: '#27500A',
            background: '#EAF3DE',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            Profile updated successfully!
          </p>
        )}

        <div className="form-field">
          <label className="form-label">First name</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Austin"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Last name</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Aniobi (optional)"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="form-field">
  <label className="form-label">Level</label>
  <select
    className="form-input"
    value={level}
    onChange={(e) => setLevel(e.target.value)}
  >
    <option value="">Select your level</option>
    <option value="100L">100L</option>
    <option value="200L">200L</option>
    <option value="300L">300L</option>
    <option value="400L">400L</option>
    <option value="500L">500L</option>
    <option value="600L">600L</option>
  </select>
  <span className="form-hint">This appears on your profile in the menu</span>
</div>

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '12px' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner size={14} />
              <span style={{ marginLeft: '10px' }}>Saving...</span>
            </>
          ) : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

export default EditProfile