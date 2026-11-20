import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Client, { formatApiError, GOOGLE_AUTH_URL } from "../../shared/api/Client";
import Logo from "../../shared/components/Logo";
import ServerAwakeningScreen from "../../shared/components/ServerAwakeningScreen";
import InstancedMeshBackground from "../../shared/components/InstancedMeshBackground";
import usePageMeta from "../../shared/hooks/usePageMeta";
import "../../App.css";

export default function Register() {
  const [role, setRole] = useState("STUDENT"); // "STUDENT" | "COORDINATOR" | "COLLEGE_ADMIN"

  usePageMeta({
    title: "Create Account — Student, Coordinator & Institution Registration",
    description: "Create your ProctorX account. Register as a Student, Faculty Coordinator, or College Administrator to license and monitor campus assessments."
  });
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    institution: "",
    orgCode: "",
    department: "",
    designation: ""
  });

  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [isCustomOrg, setIsCustomOrg] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchOrganizations() {
      try {
        setLoadingOrgs(true);
        const res = await Client.get("/public/organizations");
        if (mounted && Array.isArray(res.data)) {
          setOrganizations(res.data);
        }
      } catch (err) {
        // Silently fall back to manual entry
      } finally {
        if (mounted) setLoadingOrgs(false);
      }
    }
    fetchOrganizations();
    return () => {
      mounted = false;
    };
  }, []);

  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: "" });
  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [showAwakening, setShowAwakening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "username") {
      setUsernameStatus({ checking: false, available: null, message: "" });
    }
  }

  async function handleCheckUsername(u) {
    const clean = (u || "").trim().toLowerCase();
    if (clean.length < 3) {
      if (clean.length > 0) {
        setUsernameStatus({ checking: false, available: false, message: "At least 3 characters required." });
      } else {
        setUsernameStatus({ checking: false, available: null, message: "" });
      }
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameStatus({ checking: false, available: false, message: "Only letters, numbers, and underscores allowed." });
      return;
    }

    try {
      setUsernameStatus({ checking: true, available: null, message: "Verifying uniqueness..." });
      const res = await Client.get(`/check-username?username=${clean}`);
      if (res.data) {
        setUsernameStatus({
          checking: false,
          available: res.data.available,
          message: res.data.message
        });
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: err.response.data?.message || "Username already taken."
        });
      } else {
        setUsernameStatus({ checking: false, available: null, message: "" });
      }
    }
  }

  async function handleRegister(e) {
    if (e) e.preventDefault();
    setError("");
    setIsOffline(false);
    setSuccessMsg("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      return setError("Please complete all required fields.");
    }

    if (usernameStatus.available === false) {
      return setError("The chosen username is already taken. Please choose a different username.");
    }

    if (formData.password.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }

    let coldStartTimer = null;
    try {
      setLoading(true);

      // 2.5s watchdog for Render cold start
      coldStartTimer = setTimeout(() => {
        setShowAwakening(true);
      }, 2500);

      const orgTrimmed = formData.institution.trim();
      const payload = {
        name: formData.name.trim(),
        username: formData.username.trim() ? formData.username.trim().toLowerCase() : null,
        email: formData.email.trim(),
        password: formData.password,
        role: role,
        institution: orgTrimmed || null,
        organizationName: orgTrimmed || null,
        orgCode: formData.orgCode || null,
        department: formData.department.trim() || null,
        designation: formData.designation.trim() || null
      };

      const res = await Client.post("/Register", payload);

      if (coldStartTimer) clearTimeout(coldStartTimer);
      setShowAwakening(false);

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
              role === "COLLEGE_ADMIN"
                ? "Institution account created! Please sign in to choose your subscription package and seat quota."
                : role === "COORDINATOR"
                ? "Coordinator account registered. Access requires administrator approval."
                : "Student account created. Please complete your profile to unlock active assessments."
          }
        });
      }, 1500);
    } catch (err) {
      if (coldStartTimer) clearTimeout(coldStartTimer);

      const isColdStart =
        err.isOffline ||
        err.code === "ERR_NETWORK" ||
        err.code === "ECONNREFUSED" ||
        (err.response?.status >= 502 && err.response?.status <= 504);

      if (isColdStart) {
        setShowAwakening(true);
        return;
      }

      setShowAwakening(false);

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
    <div className="page" style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <InstancedMeshBackground fullscreen={true} opacity={0.88} />
      <div className="auth-shell" style={{ position: "relative", zIndex: 1 }}>
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
                : role === "COLLEGE_ADMIN"
                ? "License ProctorX for Your Institution"
                : "Register as Academic Exam Coordinator"}
            </h1>
            <p className="subtitle">
              {role === "STUDENT"
                ? "Complete assessments in a high-integrity environment with integrated code execution, AI proctoring, and shareable public developer portfolios."
                : role === "COLLEGE_ADMIN"
                ? "License the ProctorX examination suite for your university or college, allocate coordinator student quotas, and oversee campus-wide assessments."
                : "Design robust assessments with automated marking, AI question generation, and real-time live candidate session telemetry."}
            </p>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <strong>Public Portfolio & Transcripts</strong>
              Showcase verified test scores and solved coding challenges with an authentic performance record.
            </div>
            <div className="feature-item">
              <strong>Institutional Role & Quota Governance</strong>
              Granular tenant hierarchy linking students, faculty coordinators, and college administrators.
            </div>
            <div className="feature-item">
              <strong>On-Device AI Proctoring</strong>
              Privacy-first local browser telemetry ensuring smooth, secure, and authenticated examination sessions.
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="card auth-card" style={{ maxWidth: 540 }}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: "1.6rem" }}>Create Account</h2>
            <p className="subtitle">Select your account type to register</p>
          </div>

          {/* 3-Role Switcher Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              padding: 4,
              background: "var(--bg-surface-2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              marginBottom: 20
            }}
          >
            <button
              type="button"
              onClick={() => {
                setRole("STUDENT");
                setIsCustomOrg(false);
              }}
              style={{
                padding: "8px 6px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: role === "STUDENT" ? "var(--primary)" : "transparent",
                color: role === "STUDENT" ? "#FFF" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4
              }}
            >
              <span style={{ fontSize: "16px" }}>🎓</span>
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("COORDINATOR");
                setIsCustomOrg(false);
              }}
              style={{
                padding: "8px 6px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: role === "COORDINATOR" ? "var(--primary)" : "transparent",
                color: role === "COORDINATOR" ? "#FFF" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4
              }}
            >
              <span style={{ fontSize: "16px" }}>🏛️</span>
              <span>Coordinator</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("COLLEGE_ADMIN");
                setIsCustomOrg(false);
              }}
              style={{
                padding: "8px 6px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: role === "COLLEGE_ADMIN" ? "var(--primary)" : "transparent",
                color: role === "COLLEGE_ADMIN" ? "#FFF" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4
              }}
            >
              <span style={{ fontSize: "16px" }}>🏢</span>
              <span>College Admin</span>
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

              {/* Username with Bloom Filter Uniqueness Verification */}
              <div className="field-stack">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>Username (Handle) *</label>
                  {usernameStatus.message && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: usernameStatus.available ? "#10B981" : usernameStatus.available === false ? "#EF4444" : "#94A3B8"
                      }}
                    >
                      {usernameStatus.checking ? "⏳ " : usernameStatus.available ? "✓ " : "✗ "}
                      {usernameStatus.message}
                    </span>
                  )}
                </div>
                <input
                  name="username"
                  placeholder="e.g. mayalin_dev"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={() => handleCheckUsername(formData.username)}
                  autoComplete="username"
                  required
                  style={{
                    borderColor: usernameStatus.available === true
                      ? "#10B981"
                      : usernameStatus.available === false
                      ? "#EF4444"
                      : undefined
                  }}
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
              {role === "COLLEGE_ADMIN" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                  <div className="field-stack">
                    <label style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Organization / College Name *</span>
                      <span style={{ fontSize: "0.74rem", color: "#F59E0B", fontWeight: 600 }}>🏛️ Setup Campus</span>
                    </label>
                    <input
                      name="institution"
                      placeholder="e.g. Oxford Institute of Technology"
                      value={formData.institution}
                      onChange={handleChange}
                      required
                    />
                    <small style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                      Registered for your faculty coordinators & candidates to enter under.
                    </small>
                  </div>
                  <div className="field-stack">
                    <label>Division / Faculty</label>
                    <input
                      name="department"
                      placeholder="e.g. School of Engineering"
                      value={formData.department}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
                  <div className="field-stack">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={{ margin: 0 }}>
                        {role === "COORDINATOR" ? "Select Campus Organization *" : "Select Your College / Campus *"}
                      </label>
                      {organizations.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomOrg(!isCustomOrg);
                            setFormData((prev) => ({ ...prev, institution: "" }));
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#818CF8",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline"
                          }}
                        >
                          {isCustomOrg ? "← Pick from Registered" : "+ Unlisted Campus?"}
                        </button>
                      )}
                    </div>

                    {organizations.length > 0 && !isCustomOrg ? (
                      <div>
                        <select
                          name="orgCodeSelect"
                          value={formData.orgCode || ""}
                          onChange={(e) => {
                            const code = e.target.value;
                            const selected = organizations.find((o) => o.orgCode === code);
                            if (selected) {
                              setFormData((prev) => ({
                                ...prev,
                                orgCode: selected.orgCode,
                                institution: selected.name
                              }));
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                orgCode: "",
                                institution: ""
                              }));
                            }
                          }}
                          required
                          className="input"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "var(--bg-surface-2)",
                            color: "var(--text-primary)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-subtle)"
                          }}
                        >
                          <option value="">-- Choose Registered Campus ({organizations.length} Available) --</option>
                          {organizations.map((org) => (
                            <option
                              key={org.id || org.orgCode}
                              value={org.orgCode}
                              disabled={org.isFull}
                            >
                              🏛️ {org.name} [ID: {org.orgCode}] {org.adminName ? `— Dean: ${org.adminName}` : ""} {org.isFull ? "(SEATS FULL)" : ""}
                            </option>
                          ))}
                        </select>
                        {formData.orgCode && (
                          <div style={{ fontSize: "0.75rem", color: "#10B981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                            <span>✓</span> Campus Affiliation: <strong>{formData.institution}</strong> <span style={{ opacity: 0.8, fontFamily: "monospace" }}>({formData.orgCode})</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <input
                          name="institution"
                          placeholder={organizations.length > 0 ? "Enter unlisted college name" : "e.g. Oxford University"}
                          value={formData.institution}
                          onChange={handleChange}
                          required
                        />
                        {organizations.length === 0 ? (
                          <small style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                            No campuses registered yet. You can type your college or have your College Admin register first.
                          </small>
                        ) : (
                          <small style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                            Unlisted campus entry (without administrative license link).
                          </small>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="field-stack">
                    <label>Department / Branch *</label>
                    <input
                      name="department"
                      placeholder="e.g. Computer Science & Engg"
                      value={formData.department}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="field-stack">
                <label>
                  {role === "STUDENT"
                    ? "Year of Study / Roll No"
                    : role === "COLLEGE_ADMIN"
                    ? "Institutional Authority (e.g. Dean of Academics / Principal / HOD) *"
                    : "Designation / Academic Title"}
                </label>
                <input
                  name="designation"
                  placeholder={
                    role === "STUDENT"
                      ? "e.g. 3rd Year B.Tech CSE"
                      : role === "COLLEGE_ADMIN"
                      ? "e.g. Dean of Academics / Campus Director"
                      : "e.g. Associate Professor"
                  }
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
                : role === "COLLEGE_ADMIN"
                ? "Register Institution Account →"
                : role === "COORDINATOR"
                ? "Create Coordinator Account →"
                : "Create Student Account →"}
            </button>
          </form>

          <hr className="divider" />

          {/* Google Sign-up with selected role */}
          <div className="field-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Or Quick Sign-up with Google as {role === "COLLEGE_ADMIN" ? "Institution Admin" : role === "COORDINATOR" ? "Coordinator" : "Student"}
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

      {/* Render Cold-Start Awakening Overlay */}
      {showAwakening && (
        <ServerAwakeningScreen
          contextTitle="Account Registration"
          onServerReady={async () => {
            setShowAwakening(false);
            setSuccessMsg("✓ Backend server is online! Proceeding with registration...");
            await handleRegister(null);
          }}
          onCancel={() => {
            setShowAwakening(false);
          }}
        />
      )}
    </div>
  );
}
