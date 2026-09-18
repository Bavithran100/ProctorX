import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Client, { formatApiError } from "../../shared/api/Client";
import Logo from "../../shared/components/Logo";
import "../../App.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const navigate = useNavigate();

  async function handleForgotSubmit(e) {
    if (e) e.preventDefault();
    setError("");
    setIsOffline(false);
    setSuccessInfo(null);

    if (!email.trim()) {
      setError("Please provide your account email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await Client.post("/auth/forgot-password", { email: email.trim() });
      setSuccessInfo({
        message: res.data?.message || "Password reset instructions have been sent to your email.",
        isGoogleAccount: res.data?.isGoogleAccount || false
      });
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
    window.location.href = "http://localhost:9080/oauth2/authorization/google";
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
              <span className="badge-dot" /> Account Recovery Center
            </div>
            <h1 style={{ margin: "12px 0", fontSize: "clamp(2rem, 3.5vw, 3rem)" }}>
              Secure Password Reset & Access Recovery
            </h1>
            <p className="subtitle">
              Verify your identity and regain access to your ProctorX candidate assessments or faculty authoring workspace.
            </p>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <strong>Cryptographic Verification</strong>
              Time-bounded, one-time security tokens valid for 30 minutes to protect account integrity.
            </div>
            <div className="feature-item">
              <strong>Hybrid Authentication</strong>
              Accounts registered with Google SSO can set a dedicated password to enable manual email login anytime.
            </div>
            <div className="feature-item">
              <strong>Automated Telemetry Audit</strong>
              Every recovery request is cryptographically timestamped and logged for security compliance.
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="card auth-card">
          <div style={{ marginBottom: 20 }}>
            <h2>Reset Password</h2>
            <p className="subtitle">Enter your registered email to receive a recovery link</p>
          </div>

          {/* Success State */}
          {successInfo ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "var(--radius-full)",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34D399",
                  fontSize: "2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}
              >
                ✉️
              </div>

              <h3 style={{ fontSize: "1.25rem", marginBottom: 8, color: "var(--text-primary)" }}>
                {successInfo.isGoogleAccount ? "Google Account Detected" : "Reset Link Dispatched"}
              </h3>

              <div
                style={{
                  background: successInfo.isGoogleAccount
                    ? "rgba(59, 130, 246, 0.12)"
                    : "rgba(16, 185, 129, 0.12)",
                  border: `1px solid ${successInfo.isGoogleAccount ? "rgba(59, 130, 246, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                  color: successInfo.isGoogleAccount ? "#60A5FA" : "#34D399",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.88rem",
                  lineHeight: 1.5,
                  textAlign: "left",
                  marginBottom: 20
                }}
              >
                {successInfo.message}
              </div>

              {successInfo.isGoogleAccount && (
                <div style={{ marginBottom: 20 }}>
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
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setSuccessInfo(null)}
                >
                  Request Another Link
                </button>
                <Link to="/login" className="primary-btn">
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className={`error ${isOffline ? "offline-error" : ""}`} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: "1.1rem" }}>{isOffline ? "⚠️" : "✕"}</span>
                    <div>
                      <strong>{isOffline ? "API Server Offline" : "Reset Notice"}</strong>
                      <div style={{ marginTop: 2, fontSize: "0.83rem", lineHeight: 1.4 }}>{error}</div>
                      {isOffline && (
                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ marginTop: 8, padding: "4px 10px", fontSize: "0.75rem" }}
                          onClick={handleForgotSubmit}
                        >
                          Retry Connection
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleForgotSubmit}>
                <div className="field-group">
                  <div className="field-stack">
                    <label>Registered Email Address</label>
                    <input
                      name="email"
                      type="email"
                      placeholder="name@institution.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn full"
                  disabled={loading}
                  style={{ marginTop: 6 }}
                >
                  {loading ? "Generating Secure Link..." : "Send Password Reset Link"}
                </button>
              </form>

              <hr className="divider" />

              <div className="switch" style={{ margin: 0, textAlign: "center" }}>
                Remember your password?{" "}
                <span onClick={() => navigate("/login")}>
                  Sign In
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
