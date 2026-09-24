import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Client, { formatApiError, GOOGLE_AUTH_URL } from "../../shared/api/Client";
import Logo from "../../shared/components/Logo";
import usePageMeta from "../../shared/hooks/usePageMeta";
import "../../App.css";

export default function Register() {
  const [role, setRole] = useState("STUDENT"); // "STUDENT" | "COORDINATOR"

  usePageMeta({
    title: "Create Account — Student & Coordinator Registration",
    description: "Create your ProctorX account. Register as a Student to take exams or Coordinator to author and monitor assessments."
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    institution: "",
    department: "",
    designation: ""
  });

  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleRegister(e) {
    if (e) e.preventDefault();
    setError("");
    setIsOffline(false);
    setSuccessMsg("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      return setError("Please complete all required fields.");
    }

    if (formData.password.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: role,
        institution: formData.institution.trim() || null,
        department: formData.department.trim() || null,
        designation: formData.designation.trim() || null
      };

      const res = await Client.post("/Register", payload);

      setSuccessMsg(
        typeof res.data === "string"
          ? res.data
          : "Account created successfully! Redirecting to sign in..."
      );

      setTimeout(() => {
        navigate("/login", {
          state: {
            registeredEmail: formData.email,
            roleNotice:
              role === "COORDINATOR"
                ? "Coordinator account registered. Access requires administrator approval."
                : "Student account created. Please complete your profile to unlock active assessments."
          }
        });
      }, 1500);
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

  function handleGoogleSignup() {
    // Store selected role in cookie and localStorage so OAuth handler assigns the chosen role
    document.cookie = `preferredRole=${role}; path=/; max-age=600; SameSite=Lax`;
    localStorage.setItem("proctorx_oauth_role", role);
    window.location.href = GOOGLE_AUTH_URL;
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
              <span className="badge-dot" /> ProctorX Cloud Onboarding
            </div>
            <h1 style={{ margin: "12px 0", fontSize: "clamp(2rem, 3.2vw, 2.8rem)" }}>
              {role === "STUDENT"
                ? "Join as Candidate & Build Your Portfolio"
                : "Register as Academic Exam Coordinator"}
            </h1>
            <p className="subtitle">
              {role === "STUDENT"
                ? "Complete assessments in a high-integrity environment with integrated code execution, AI proctoring, and shareable public developer portfolios."
                : "Design robust assessments with automated marking, AI question generation, and real-time live candidate session telemetry."}
            </p>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <strong>Public Portfolio URL</strong>
              Showcase verified test scores and solved coding challenges with a public LeetCode-style profile.
            </div>
            <div className="feature-item">
              <strong>Institutional Role Management</strong>
              Granular permissions linking students and coordinators directly to their universities and departments.
            </div>
            <div className="feature-item">
              <strong>On-Device YOLO AI Proctoring</strong>
              Privacy-first local browser telemetry ensuring smooth, secure, and authenticated examination sessions.
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="card auth-card" style={{ maxWidth: 520 }}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: "1.6rem" }}>Create Account</h2>
            <p className="subtitle">Select your account type to register</p>
          </div>

          {/* Role Switcher Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              padding: 4,
              background: "var(--bg-surface-2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              marginBottom: 20
            }}
          >
            <button
              type="button"
              onClick={() => setRole("STUDENT")}
              style={{
                padding: "9px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: role === "STUDENT" ? "var(--primary)" : "transparent",
                color: role === "STUDENT" ? "#FFF" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <span>🎓</span> Student / Candidate
            </button>
            <button
              type="button"
              onClick={() => setRole("COORDINATOR")}
              style={{
                padding: "9px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: role === "COORDINATOR" ? "var(--primary)" : "transparent",
                color: role === "COORDINATOR" ? "#FFF" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <span>🏛️</span> Coordinator / Faculty
            </button>
          </div>

          {/* Offline / Error Banner */}
          {error && (
            <div className={`error ${isOffline ? "offline-error" : ""}`} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>{isOffline ? "⚠️" : "✕"}</span>
                <div>
                  <strong>{isOffline ? "API Server Offline" : "Registration Notice"}</strong>
                  <div style={{ marginTop: 2, fontSize: "0.83rem", lineHeight: 1.4 }}>{error}</div>
                  {isOffline && (
                    <button
                      type="button"
                      className="ghost-btn"
                      style={{ marginTop: 8, padding: "4px 10px", fontSize: "0.75rem" }}
                      onClick={handleRegister}
                    >
                      Retry Connection
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34D399",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.88rem",
                marginBottom: 16
              }}
            >
              ✓ {successMsg}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister}>
            <div className="field-group">
              <div className="field-stack">
                <label>Full Name *</label>
                <input
                  name="name"
                  placeholder={role === "STUDENT" ? "e.g. Maya Lin" : "e.g. Dr. Robert Langdon"}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field-stack">
                <label>{role === "STUDENT" ? "Student Email *" : "Institutional Email *"}</label>
                <input
                  name="email"
                  type="email"
                  placeholder={role === "STUDENT" ? "maya@university.edu" : "robert@institution.edu"}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Institution and Department */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field-stack">
                  <label>Institution / College</label>
                  <input
                    name="institution"
                    placeholder="e.g. Stanford University"
                    value={formData.institution}
                    onChange={handleChange}
                  />
                </div>
                <div className="field-stack">
                  <label>Department</label>
                  <input
                    name="department"
                    placeholder="e.g. Computer Science"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="field-stack">
                <label>{role === "STUDENT" ? "Year of Study / Program" : "Designation / Academic Title"}</label>
                <input
                  name="designation"
                  placeholder={role === "STUDENT" ? "e.g. 3rd Year B.Tech CSE" : "e.g. Associate Professor"}
                  value={formData.designation}
                  onChange={handleChange}
                />
              </div>

              {/* Password Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field-stack">
                  <label>Password *</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      style={{ paddingRight: 40, width: "100%" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: 8,
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
                <div className="field-stack">
                  <label>Confirm Password *</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      style={{ paddingRight: 40, width: "100%" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      style={{
                        position: "absolute",
                        right: 8,
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
                      {showConfirmPassword ? "👁️" : "🙈"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn full"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading
                ? "Creating Account..."
                : `Create ${role === "STUDENT" ? "Student" : "Coordinator"} Account`}
            </button>
          </form>

          <hr className="divider" />

          {/* Google Sign-up with selected role */}
          <div className="field-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Or Quick Sign-up with Google as {role === "STUDENT" ? "Student" : "Coordinator"}
            </label>
            <button
              type="button"
              className="google-btn"
              onClick={handleGoogleSignup}
              title={`Sign up with Google as ${role}`}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign Up with Google ({role === "STUDENT" ? "Student" : "Coordinator"})
            </button>
          </div>

          <div className="switch" style={{ marginTop: 18 }}>
            Already have a ProctorX account?{" "}
            <span onClick={() => navigate("/login")}>
              Sign In
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
