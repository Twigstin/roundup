import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../api/supabase'
import Spinner from '../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

function ChangePassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 4000)
    return () => clearTimeout(timer)
  }, [error])

  const handleChange = async () => {
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div>
      <div className="page-header">
        <Link to="/account" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> Manage account
        </Link>
      </div>

      <div className="form-card">
        <h1 className="page-title bold" style={{ marginBottom: '24px' }}>Reset password</h1>

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
            Password updated successfully!
          </p>
        )}

        <div className="form-field">
          <label className="form-label">New password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: '40px' }}
            />
            <FontAwesomeIcon
              icon={showPassword ? faEyeSlash : faEye}
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#aaa',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Confirm new password</label>
          <input
            className="form-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '12px' }}
          onClick={handleChange}
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner size={14} />
              <span style={{ marginLeft: '10px' }}>Updating...</span>
            </>
          ) : 'Update password'}
        </button>
      </div>
    </div>
  )
}

export default ChangePassword