import { useReducer, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../shared/state/AuthSlice";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Client, { formatApiError, GOOGLE_AUTH_URL } from "../../shared/api/Client";
import Logo from "../../shared/components/Logo";
import usePageMeta from "../../shared/hooks/usePageMeta";
import "../../App.css";

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  usePageMeta({
    title: "Sign In — Candidate & Coordinator Portal",
    description: "Sign in to ProctorX assessment workspace. Access candidate examinations or faculty control room."
  });

  const [state, dispatchForm] = useReducer(
    (state, action) => ({ ...state, [action.name]: action.value }),
    {
      email: location.state?.registeredEmail || "",
      password: ""
    }
  );

  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [notice, setNotice] = useState(location.state?.roleNotice || "");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    dispatchForm({ name: e.target.name, value: e.target.value });
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    setError("");
    setIsOffline(false);

    if (!state.email.trim() || !state.password) {
      setError("Please provide both email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await Client.post("/Login", {
        email: state.email.trim(),
        password: state.password
      });

      dispatch(
        loginSuccess({
          user: res.data.email,
          email: res.data.email,
          name: res.data.name,
          username: res.data.username,
          role: res.data.role,
          approved: res.data.approved,
          institution: res.data.institution,
          department: res.data.department,
          designation: res.data.designation,
          bio: res.data.bio,
          skills: res.data.skills,
          profileCompleted: res.data.profileCompleted
        })
      );

      navigate("/dashboard");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      if (err.isOffline || msg.includes("unreachable")) {
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function loginWithGoogle() {
    window.location.href = GOOGLE_AUTH_URL;
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
          email: res.data.email,
          name: res.data.name,
          username: res.data.username,
          role: res.data.role,
          approved: res.data.approved,
          institution: res.data.institution,
          department: res.data.department,
          designation: res.data.designation,
          bio: res.data.bio,
          skills: res.data.skills,
          profileCompleted: res.data.profileCompleted
        })
      );

      navigate("/dashboard");
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg || "Google authentication could not be completed.");
      if (err.isOffline) setIsOffline(true);
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
              <span className="badge-dot" /> Universal Authentication Gateway
            </div>
            <h1 style={{ margin: "12px 0", fontSize: "clamp(2rem, 3.5vw, 3rem)" }}>
              Access your assessment workspace
            </h1>
            <p className="subtitle">
              Sign in with your email credentials or Google account. ProctorX automatically routes Students, Coordinators, and Administrators to their dedicated workspace.
            </p>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <strong>Unified Role Routing</strong>
              Instant access to student assessments, coordinator exam suites, or administrative controls.
            </div>
            <div className="feature-item">
              <strong>Public Portfolio & LeetCode Profiles</strong>
              Showcase verified coding scores and evaluation results with your unique public profile URL.
            </div>
            <div className="feature-item">
              <strong>Live Telemetry & AI Proctoring</strong>
              Protected browser environment with real-time heartbeat and on-device face & object detection.
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="card auth-card">
          <div style={{ marginBottom: 20 }}>
            <h2>Sign In</h2>
            <p className="subtitle">Enter your account credentials or use Google SSO</p>
          </div>

          {/* Role / Success Notice */}
          {notice && (
            <div
              style={{
                background: "rgba(59, 130, 246, 0.12)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                color: "#60A5FA",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.84rem",
                marginBottom: 16
              }}
            >
              ℹ️ {notice}
            </div>
          )}

          {/* Error / Offline Banner */}
          {error && (
            <div className={`error ${isOffline ? "offline-error" : ""}`} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>{isOffline ? "⚠️" : "✕"}</span>
                <div>
                  <strong>{isOffline ? "Backend API Offline" : "Authentication Notice"}</strong>
                  <div style={{ marginTop: 2, fontSize: "0.83rem", lineHeight: 1.4 }}>{error}</div>
                  {isOffline && (
                    <button
                      type="button"
                      className="ghost-btn"
                      style={{ marginTop: 8, padding: "4px 10px", fontSize: "0.75rem" }}
                      onClick={handleLogin}
                    >
                      Retry Connection
                    </button>
                  )}
                  {error.includes("Google Sign-In") && (
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="google-btn"
                        style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                        onClick={loginWithGoogle}
                      >
                        Sign In with Google Now
                      </button>
                      <Link
                        to="/forgot-password"
                        className="ghost-btn"
                        style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                      >
                        Set Password →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="field-group">
              <div className="field-stack">
                <label>Email Address</label>
                <input
                  name="email"
                  type="email"
                  placeholder="name@institution.edu"
                  value={state.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="field-stack">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ margin: 0 }}>Password</label>
                  <Link
                    to="/forgot-password"
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--primary-light)",
                      textDecoration: "none",
                      fontWeight: 500
                    }}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={state.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                    style={{ paddingRight: 42, width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: 10,
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "1.05rem",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn full"
              disabled={loading}
              style={{ marginTop: 6 }}
            >
              {loading ? "Authenticating..." : "Sign In with Email"}
            </button>
          </form>

          <hr className="divider" />

          {/* Google SSO */}
          <div className="field-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Single Sign-On (Students & Coordinators)
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

          <div className="switch" style={{ marginTop: 20 }}>
            Don't have an account?{" "}
            <span onClick={() => navigate("/register")}>
              Create Student or Coordinator Account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
