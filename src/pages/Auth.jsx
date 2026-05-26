import { useState, useEffect } from "react";
import { supabase } from "../api/supabase";
import Spinner from "../components/Spinner";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightToBracket, faLock, faEnvelope, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

export const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)

  useEffect(() => {
  if (!error) return
  const timer = setTimeout(() => setError(''), 4000)
  return () => clearTimeout(timer)
}, [error])

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Account created! Check your email to confirm your account before logging in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === 'Email not confirmed') {
          setError('Please confirm your email address before logging in. Check your inbox.')
        } else {
          setError(error.message)
        }
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-main-ctn">
      <div>
        <div className="about-logo-circle" style={{ margin: 'auto', marginBottom: "20px" }}>
          <span className="about-logo-letter bold"><FontAwesomeIcon icon={faRightToBracket} /></span>
        </div>
        <h3 style={{ textAlign: "center" }}>
          {isSignUp ? "Create a new account" : "Log In to Roundup"}
        </h3>

        {isForgotPassword ? (
  <div>
    {message && (
      <p style={{
        color: '#27500A', background: '#EAF3DE',
        padding: '10px 12px', borderRadius: '8px',
        fontSize: '13px', marginBottom: '16px'
      }}>
        {message}
      </p>
    )}
    {error && (
      <p style={{
        color: '#c0392b', background: '#fdf0ef',
        padding: '10px 12px', borderRadius: '8px',
        fontSize: '13px', marginBottom: '16px'
      }}>
        {error}
      </p>
    )}
    <div className="inputs-container" style={{ marginBottom: '12px' }}>
      <div className="input-wrapper">
        <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
        <input
          type="email"
          required
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </div>
    </div>
    <div className="auth-form-submit-btn">
      <button className="bttn" disabled={loading} onClick={async () => {
        setLoading(true)
        setError('')
        setMessage('')
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://getroundup.app'
        })
        setLoading(false)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Check your email for a password reset link.')
        }
      }}>
        {loading ? <><Spinner size={14} /><span style={{ marginLeft: '10px' }}>Sending...</span></> : 'Send reset link'}
      </button>
    </div>
    <div className="signin-btn" style={{ marginTop: '12px' }}>
      <button className="bttn" onClick={() => {
        setIsForgotPassword(false)
        setError('')
        setMessage('')
      }}>
        Back to login
      </button>
    </div>
  </div>
) : (
  <>
  <form className="auth-form" onSubmit={handleSubmit}>
          <div className="inputs-container">
          <div className="input-wrapper">
        <FontAwesomeIcon
          icon={faEnvelope}
          className="input-icon"
        />
        <input
          type="email"
          required
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
      </div>

      <div className="input-wrapper">
        <FontAwesomeIcon
          icon={faLock}
          className="input-icon"
        />
        <input
          type={showPassword ? 'text' : 'password'}
            required
            placeholder="Enter password"
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
      </div>
          <div className="auth-form-submit-btn">
            <button className="bttn" type="submit" disabled={loading}>
              {loading ? (
                  <>
                    <Spinner size={14} /><span style={{ marginLeft: '10px' }}>Please wait...</span>
                  </>
                ) : isSignUp ? "Create new account" : "Log In"}
            </button>
          </div>
        </form>

        <div className="signin-btn">
          <button className="bttn" onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
            setMessage("");
          }}>
            {isSignUp ? "Switch to Log in" : "Switch to Sign Up"}
          </button>
        </div>
        {!isSignUp && (
  <p style={{ textAlign: 'right', marginTop: '6px' }}>
    <button
      type="button"
      style={{ background: 'none', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer', padding: 0 }}
      onClick={() => { setIsForgotPassword(true); setError(''); setMessage('') }}
    >
      Forgot password?
    </button>
  </p>
)}
        </>
)}

        
      </div>
    </div>
  );
};