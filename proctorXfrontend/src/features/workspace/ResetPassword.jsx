import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Client, { formatApiError } from "../../shared/api/Client";
import Logo from "../../shared/components/Logo";
import "../../App.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setVerifying(false);
        setTokenError("No password reset token was provided in the link.");
        return;
      }

      try {
        setVerifying(true);
        const res = await Client.get(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
        if (res.data?.valid) {
          setTokenValid(true);
          setTokenInfo(res.data);
        } else {
          setTokenError(res.data?.message || "Invalid or expired password reset token.");
        }
      } catch (err) {
        setTokenError(formatApiError(err) || "Invalid or expired password reset token.");
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  async function handleResetSubmit(e) {
    if (e) e.preventDefault();
    setSubmitError("");

    if (!password || !confirmPassword) {
      setSubmitError("Please fill in both password fields.");
      return;
    }

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await Client.post("/auth/reset-password", {
        token: token,
        newPassword: password
      });

      setSuccess(true);
    } catch (err) {
      setSubmitError(formatApiError(err) || "Failed to reset password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  }

  // Visual password strength check
  const getPasswordStrength = () => {
    if (!password) return { label: "Empty", percent: 0, color: "var(--border-subtle)" };
    let score = 0;
    if (password.length >= 6) score += 25;
    if (password.length >= 10) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9!@#$%^&*]/.test(password)) score += 25;

    if (score <= 25) return { label: "Weak", percent: 25, color: "#EF4444" };
    if (score <= 50) return { label: "Fair", percent: 50, color: "#F59E0B" };
    if (score <= 75) return { label: "Good", percent: 75, color: "var(--cyan)" };
    return { label: "Strong", percent: 100, color: "#10B981" };
  };

  const strength = getPasswordStrength();

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
              <span className="badge-dot" /> Secure Credential Provisioning
            </div>
            <h1 style={{ margin: "12px 0", fontSize: "clamp(2rem, 3.5vw, 3rem)" }}>
              Set New Account Password
            </h1>
            <p className="subtitle">
              Configure your updated password to restore access across candidate assessments and faculty operations.
            </p>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <strong>BCrypt Hashed Security</strong>
              Passwords are salted and securely hashed before storage in database records.
            </div>
            <div className="feature-item">
              <strong>Instant Token Invalidation</strong>
              Security tokens are immediately burned once the new password is confirmed.
            </div>
            <div className="feature-item">
              <strong>Universal SSO Continuity</strong>
              Google Sign-In remains active alongside your newly configured password.
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="card auth-card">
          {verifying ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div className="loading-orbit" style={{ margin: "0 auto 20px" }}>
                <span className="brand-symbol">P</span>
              </div>
              <h3>Validating Recovery Token...</h3>
              <p className="subtitle">Verifying cryptographic signature and expiration window</p>
            </div>
          ) : tokenError || !tokenValid ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "var(--radius-full)",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#EF4444",
                  fontSize: "2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}
              >
                ⚠️
              </div>

              <h3 style={{ fontSize: "1.3rem", marginBottom: 8, color: "var(--text-primary)" }}>
                Reset Link Invalid or Expired
              </h3>

              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.5, marginBottom: 24 }}>
                {tokenError || "This password reset token has expired or has already been used. Please request a fresh reset link."}
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => navigate("/forgot-password")}
                >
                  Request Fresh Reset Link →
                </button>
                <Link to="/login" className="ghost-btn">
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
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
                ✓
              </div>

              <h3 style={{ fontSize: "1.3rem", marginBottom: 8, color: "var(--text-primary)" }}>
                Password Updated Successfully!
              </h3>

              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.5, marginBottom: 24 }}>
                Your account password has been updated. You can now sign in using your email and new password.
              </p>

              <button
                type="button"
                className="btn full primary-btn"
                onClick={() => navigate("/login", { state: { registeredEmail: tokenInfo?.email } })}
              >
                Sign In Now →
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <h2>Create New Password</h2>
                <p className="subtitle">
                  Resetting credentials for <strong style={{ color: "var(--text-primary)" }}>{tokenInfo?.email}</strong>
                </p>
              </div>

              {submitError && <div className="error" style={{ marginBottom: 16 }}>{submitError}</div>}

              <form onSubmit={handleResetSubmit}>
                <div className="field-group">
                  <div className="field-stack">
                    <label>New Password (min. 6 characters)</label>
                    <input
                      name="password"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div style={{ marginTop: -4, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>Strength:</span>
                        <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                      </div>
                      <div style={{ width: "100%", height: 4, background: "var(--bg-surface-3)", borderRadius: "var(--radius-full)" }}>
                        <div
                          style={{
                            width: `${strength.percent}%`,
                            height: "100%",
                            background: strength.color,
                            borderRadius: "var(--radius-full)",
                            transition: "all 0.3s ease"
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="field-stack">
                    <label>Confirm New Password</label>
                    <input
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn full"
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  {loading ? "Updating Password..." : "Save New Password"}
                </button>
              </form>

              <div className="switch" style={{ marginTop: 20, textAlign: "center" }}>
                Cancel and return to{" "}
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
