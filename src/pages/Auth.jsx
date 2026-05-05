import { useState } from "react";

export const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ isSignUp, email, password });
  };

  return (
    <div className="auth-main-ctn">
      <div>
        <h2 style={{ textAlign: "center" }}>{isSignUp ? "Create a new account" : "Log In to Roundup"}</h2>
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
            <button id="auth-form-submit-btn" className="bttn" type="submit">
              {isSignUp ? "Create new account" : "Log In"}
            </button>
          </div>
        </form>
        <div className="signin-btn">
          <button id="signin-btn" className="bttn" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Switch to Log in" : "Switch to Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};