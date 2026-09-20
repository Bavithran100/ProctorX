import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import Client, { formatApiError } from "../../shared/api/Client";
import { updateUserProfile } from "../../shared/state/AuthSlice";
import AppShell from "../../shared/components/AppShell";
import CompetencyRadar from "../adaptive/components/CompetencyRadar";
import "../../App.css";

export default function Profile() {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: auth.name || "",
    username: auth.username || "",
    institution: auth.institution || "",
    department: auth.department || "",
    designation: auth.designation || "",
    bio: auth.bio || "",
    skills: auth.skills || ""
  });

  const [adaptiveData, setAdaptiveData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFormData({
      name: auth.name || "",
      username: auth.username || "",
      institution: auth.institution || "",
      department: auth.department || "",
      designation: auth.designation || "",
      bio: auth.bio || "",
      skills: auth.skills || ""
    });

    // Fetch verified adaptive skill vector
    Client.get("/adaptive/profile")
      .then((res) => setAdaptiveData(res.data))
      .catch((err) => console.debug("Adaptive telemetry not ready:", err));
  }, [auth]);

  // Calculate profile completeness
  const calculateCompleteness = () => {
    const fields = [
      formData.name,
      formData.username,
      formData.institution,
      formData.department,
      formData.designation,
      formData.bio,
      formData.skills
    ];
    const filled = fields.filter((f) => f && f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completeness = calculateCompleteness();

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await Client.put("/profile", formData);

      dispatch(
        updateUserProfile({
          name: res.data.name,
          username: res.data.username,
          institution: res.data.institution,
          department: res.data.department,
          designation: res.data.designation,
          bio: res.data.bio,
          skills: res.data.skills,
          profileCompleted: res.data.profileCompleted,
          approved: res.data.approved
        })
      );

      setSuccessMsg("Profile updated successfully! Information synced with verification queue.");
    } catch (err) {
      setErrorMsg(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  const publicUrl = auth.username
    ? `${window.location.origin}/u/${auth.username}`
    : `${window.location.origin}/u/${formData.username || "username"}`;

  function handleCopyUrl() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <AppShell
      title="User Profile & Verification"
      subtitle="Complete your academic profile to unlock scheduled examinations and customize your public portfolio."
      activeNav="/profile"
    >
      <div className="profile-container" style={{ maxWidth: 1040, margin: "0 auto" }}>
        {/* Top Profile Summary Card */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, var(--bg-surface-2) 0%, rgba(99, 102, 241, 0.08) 100%)",
            borderColor: "var(--border-medium)",
            marginBottom: 24,
            padding: "28px 32px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "var(--radius-full)",
                  background: "linear-gradient(135deg, var(--primary), var(--cyan))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  fontWeight: 700,
                  color: "#FFF",
                  boxShadow: "0 0 25px var(--primary-glow)",
                  flexShrink: 0
                }}
              >
                {formData.name ? formData.name.charAt(0).toUpperCase() : "U"}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "1.4rem", margin: 0, color: "var(--text-primary)" }}>
                    {formData.name || auth.user || "User Profile"}
                  </h2>
                  <span className="status-chip" style={{ fontSize: "0.75rem" }}>
                    {auth.role}
                  </span>
                  <span
                    className={`status-chip ${auth.approved ? "approved" : "pending"}`}
                    style={{ fontSize: "0.75rem" }}
                  >
                    {auth.approved ? "✓ Admin Approved" : "⏳ Pending Approval"}
                  </span>
                </div>

                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                  {formData.designation ? `${formData.designation} · ` : ""}
                  {formData.institution || "Institution Not Specified"}
                </p>

                {auth.username && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Public URL:
                    </span>
                    <Link
                      to={`/u/${auth.username}`}
                      target="_blank"
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--cyan)",
                        textDecoration: "underline",
                        fontFamily: "var(--font-mono)"
                      }}
                    >
                      /u/{auth.username} ↗
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Public Link Action */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleCopyUrl}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>{copied ? "✓ Copied!" : "📋 Copy Public Profile Link"}</span>
              </button>
              <Link to={`/u/${auth.username || formData.username}`} target="_blank" className="ghost-btn" style={{ fontSize: "0.8rem" }}>
                Preview Public Portfolio →
              </Link>
            </div>
          </div>

          {/* Profile Completeness Bar */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6 }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                Profile Completeness
              </span>
              <span style={{ color: completeness === 100 ? "#34D399" : "var(--primary-light)", fontWeight: 700 }}>
                {completeness}% {completeness === 100 ? "(Ready for Admin Review)" : ""}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 6,
                background: "var(--bg-surface-3)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${completeness}%`,
                  height: "100%",
                  background: completeness === 100 ? "var(--success)" : "linear-gradient(90deg, var(--primary), var(--cyan))",
                  borderRadius: "var(--radius-full)",
                  transition: "width 0.4s ease"
                }}
              />
            </div>
          </div>
        </div>

        {/* Adaptive Coach Competency Radar Showcase */}
        {adaptiveData && adaptiveData.diagnosticCompleted && (
          <div
            className="card"
            style={{
              marginBottom: 24,
              padding: "26px 32px",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)",
              border: "1px solid rgba(6, 182, 212, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🌐</span> Verified Algorithmic Competency Radar
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Continuous 12-Dimension skill vector calibrated via ProctorX Adaptive Engine
                </p>
              </div>
              <Link to="/adaptive-coach" className="secondary-btn" style={{ fontSize: "0.82rem", padding: "6px 14px" }}>
                Open Adaptive Coach →
              </Link>
            </div>

            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
              <CompetencyRadar dsaMasteryVector={adaptiveData.dsaMasteryVector} size={360} />
            </div>
          </div>
        )}

        {/* Verification Status Notice Card */}
        {!auth.approved && (
          <div
            className="card"
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              borderColor: "rgba(245, 158, 11, 0.3)",
              marginBottom: 24,
              padding: "18px 24px"
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: "1.4rem" }}>🛡️</span>
              <div>
                <strong style={{ color: "#FBBF24", fontSize: "0.95rem" }}>
                  Account Awaiting Administrator Verification
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {auth.role === "STUDENT"
                    ? "Today's and upcoming scheduled exams are locked until your academic details are verified by your institution's administrator. Complete your college, department, and year details below to expedite approval."
                    : "Exam authoring and live monitor tools are locked until platform administrators approve your coordinator profile. Please ensure your academic designation and institution details are up to date."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Messages */}
        {errorMsg && <div className="error" style={{ marginBottom: 18 }}>{errorMsg}</div>}
        {successMsg && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34D399",
              padding: "12px 18px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.88rem",
              marginBottom: 18
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        {/* Profile Edit Form */}
        <div className="card" style={{ padding: "32px 36px" }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 6px" }}>Edit Profile Information</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
              This information is displayed on your public candidate portfolio and reviewed by administrators.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="field-stack">
                  <label>Full Name *</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Maya Lin"
                    required
                  />
                </div>

                <div className="field-stack">
                  <label>Public Username Slug * (URL Handle)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="e.g. maya-lin"
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="field-stack">
                  <label>Institution / College Name</label>
                  <input
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    placeholder="e.g. Stanford University / MIT"
                  />
                </div>

                <div className="field-stack">
                  <label>Department / Branch</label>
                  <input
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
              </div>

              <div className="field-stack">
                <label>{auth.role === "STUDENT" ? "Year of Study / Degree Program" : "Designation / Academic Title"}</label>
                <input
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder={auth.role === "STUDENT" ? "e.g. 3rd Year B.Tech CSE" : "e.g. Assistant Professor"}
                />
              </div>

              <div className="field-stack">
                <label>Professional Bio / Summary</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Tell examiners or employers about your core focus, academic background, or technical interests..."
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="field-stack">
                <label>Technical Skills (Comma separated)</label>
                <input
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g. Java, Data Structures, Python, React, SQL, Algorithms"
                />
                <small style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  These will appear as badges on your LeetCode-style public profile.
                </small>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
              <button
                type="submit"
                className="btn primary-btn"
                disabled={loading}
                style={{ minWidth: 180 }}
              >
                {loading ? "Saving Changes..." : "Save Profile & Request Verification"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
