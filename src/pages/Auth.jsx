import { useState } from "react";
import { supabase } from "../api/supabase";

export const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
        setMessage("Account created! You can now login to your new account with your login credentials.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-main-ctn">
      <div>
        <h2 style={{ textAlign: "center" }}>
          {isSignUp ? "Create a new account" : "Log In to Roundup"}
        </h2>

        {error && (
          <p style={{
            color: '#c0392b',
            background: '#fdf0ef',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {error}
          </p>
        )}

        {message && (
          <p style={{
            color: '#27500A',
            background: '#EAF3DE',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {message}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="auth-form-submit-btn">
            <button className="bttn" type="submit" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Create new account" : "Log In"}
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
      </div>
    </div>
  );
};