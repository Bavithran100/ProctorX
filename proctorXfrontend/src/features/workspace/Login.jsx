import { useReducer, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../shared/state/AuthSlice";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Client from "../../shared/api/Client";
import Logo from "../../shared/components/Logo";
import "../../App.css";

export default function Login() {
  const [state, dispatchForm] = useReducer(
    (state, action) => ({ ...state, [action.name]: action.value }),
    { email: "", password: "" }
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  function handleChange(e) {
    dispatchForm({ name: e.target.name, value: e.target.value });
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    setError("");

    if (!state.email || !state.password) {
      setError("Please provide both email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await Client.post("/Login", state);

      dispatch(
        loginSuccess({
          user: res.data.email,
          role: res.data.role,
          approved: res.data.approved
        })
      );

      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  function loginWithGoogle() {
    window.location.href = "http://localhost:9080/oauth2/authorization/google";
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("oauth") === "true") {
      checkSession();
    }
  }, [location.search]);

  async function checkSession() {
    try {
      setCheckingAuth(true);
      const res = await Client.get("/me");

      dispatch(
        loginSuccess({
          user: res.data.email,
          role: res.data.role,
          approved: res.data.approved
        })
      );

      navigate("/dashboard");
    } catch {
      setError("Google authentication could not be completed.");
    } finally {
      setCheckingAuth(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="page">
        <div className="card loading-card" style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
          <div className="hero-badge">Session Verification</div>
          <h2>Signing you in...</h2>
          <p className="subtitle">Verifying your secure token and permissions.</p>
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="auth-shell">
        {/* Left Information Showcase */}
        <div className="auth-side-panel">
          <div>
            <Link to="/" style={{ display: "inline-block", marginBottom: 20 }}>
              <Logo size="lg" />
            </Link>
            <div className="hero-badge">
              <span className="badge-dot" /> Secure Authentication Gateway
            </div>
            <h1 style={{ margin: "12px 0", fontSize: "clamp(2rem, 3.5vw, 3rem)" }}>
              Access your assessment workspace
            </h1>
            <p className="subtitle">
              Sign in as an administrator or coordinator to manage exam operations, or authenticate with Google for student assessment access.
            </p>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <strong>Session-Aware Protection</strong>
              Maintains secure token continuity with automated CSRF rotation.
            </div>
            <div className="feature-item">
              <strong>Seamless Single Sign-On</strong>
              Google OAuth authentication for instant, verified student onboarding.
            </div>
            <div className="feature-item">
              <strong>Live Telemetry & Proctoring</strong>
              Continuous background security monitoring during all active exam sessions.
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="card auth-card">
          <div style={{ marginBottom: 20 }}>
            <h2>Sign In</h2>
            <p className="subtitle">Enter your credentials to continue</p>
          </div>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="field-group">
              <div className="field-stack">
                <label>Admin / Coordinator Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="name@institution.edu"
                  value={state.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div className="field-stack">
                <label>Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={state.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn full"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Sign In with Credentials"}
            </button>
          </form>

          <hr className="divider" />

          <div className="field-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Candidate / Student Access
            </label>
            <button type="button" className="google-btn" onClick={loginWithGoogle}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign In with Google Account
            </button>
          </div>

          <div className="switch">
            New Coordinator?{" "}
            <span onClick={() => navigate("/register")}>
              Request Account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
