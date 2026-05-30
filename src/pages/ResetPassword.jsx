import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import Spinner from '../components/Spinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

function ResetPassword({ onDone }) {
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

  const handleReset = async () => {
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
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => onDone(), 2000)
    }
  }

  return (
    <div className="auth-main-ctn">
      <div>
        <div className="about-logo-circle" style={{ margin: 'auto', marginBottom: '20px' }}>
          <img src='https://aqndgxltxpgovpedspzf.supabase.co/storage/v1/object/public/roundup-images/icon-192.png' style={{ width: "100%", height: "100%", borderRadius: "13px" }} alt="image of roundup official logo"/>
        </div>
        <h3 style={{ textAlign: 'center' }}>Create a new password</h3>

        {success ? (
          <p style={{
            color: '#27500A',
            background: '#EAF3DE',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginTop: '20px',
            textAlign: 'center'
          }}>
            Password updated! Use this new password to log in on any device.
          </p>
        ) : (
          <>
            {error && (
              <p style={{
                color: '#c0392b',
                background: '#fdf0ef',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                marginTop: '16px'
              }}>
                {error}
              </p>
            )}

            <div className="inputs-container" style={{ marginBottom: '12px', marginTop: '20px' }}>
              <div className="input-wrapper">
                <FontAwesomeIcon icon={faLock} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                />
                <FontAwesomeIcon
                  icon={showPassword ? faEyeSlash : faEye}
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>

              <div className="input-wrapper">
                <FontAwesomeIcon icon={faLock} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-form-submit-btn">
              <button className="bttn" onClick={handleReset} disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size={14} />
                    <span style={{ marginLeft: '10px' }}>Updating...</span>
                  </>
                ) : 'Update password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPassword