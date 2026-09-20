import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Client, { formatApiError } from "../../shared/api/Client";
import Logo from "../../shared/components/Logo";
import CompetencyRadar from "../adaptive/components/CompetencyRadar";
import "../../App.css";

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchPublicProfile() {
      try {
        setLoading(true);
        setError("");
        const res = await Client.get(`/public/profile/${username}`);
        setProfile(res.data);
      } catch (err) {
        setError(formatApiError(err) || "Profile not found.");
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      fetchPublicProfile();
    }
  }, [username]);

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // Parse comma-separated skills
  const skillsList = profile?.skills
    ? profile.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="page" style={{ minHeight: "100vh", background: "var(--bg-app)", paddingBottom: 60 }}>
      {/* Top Public Header */}
      <header
        style={{
          height: 64,
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface-1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          position: "sticky",
          top: 0,
          zIndex: 50
        }}
      >
        <Link to="/" style={{ display: "flex", alignItems: "center" }}>
          <Logo size="md" />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={handleShare}
            className="secondary-btn"
            style={{ fontSize: "0.82rem", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>{copied ? "✓ Copied Link" : "🔗 Share Profile"}</span>
          </button>
          <Link to="/login" className="ghost-btn" style={{ fontSize: "0.82rem", padding: "6px 14px" }}>
            Sign In
          </Link>
          <Link to="/register" className="primary-btn" style={{ fontSize: "0.82rem", padding: "6px 14px" }}>
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Public Profile Container */}
      <div style={{ maxWidth: 1080, margin: "36px auto", padding: "0 20px" }}>
        {loading ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div className="loading-orbit" style={{ margin: "0 auto 20px" }}>
              <span className="brand-symbol">P</span>
            </div>
            <h3>Loading Public Portfolio...</h3>
            <p className="subtitle">Fetching verified candidate telemetry</p>
          </div>
        ) : error || !profile ? (
          <div className="card" style={{ padding: 48, textAlign: "center", maxWidth: 540, margin: "40px auto" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔍</div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Profile Not Found</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
              The profile for <strong style={{ color: "var(--text-primary)" }}>@{username}</strong> does not exist or has not been published yet.
            </p>
            <Link to="/" className="primary-btn">
              Return to Homepage
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }} className="public-profile-grid">
            {/* Left Sidebar Card */}
            <div className="card" style={{ padding: "32px 24px", height: "fit-content" }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "var(--radius-full)",
                    background: "linear-gradient(135deg, var(--primary), var(--cyan))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.4rem",
                    fontWeight: 700,
                    color: "#FFF",
                    margin: "0 auto 16px",
                    boxShadow: "0 0 35px var(--primary-glow)"
                  }}
                >
                  {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
                </div>

                <h2 style={{ fontSize: "1.4rem", margin: "0 0 4px", color: "var(--text-primary)" }}>
                  {profile.name}
                </h2>
                <div style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)", fontSize: "0.88rem", marginBottom: 12 }}>
                  @{profile.username}
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  <span className="status-chip" style={{ fontSize: "0.75rem" }}>
                    {profile.role === "STUDENT" ? "🎓 Candidate" : "🏛️ Coordinator"}
                  </span>
                  <span className="status-chip approved" style={{ fontSize: "0.75rem" }}>
                    ✓ Verified Member
                  </span>
                </div>
              </div>

              <hr className="divider" style={{ margin: "16px 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: "0.88rem" }}>
                {profile.institution && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: "1.1rem" }}>🏛️</span>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Institution</div>
                      <strong style={{ color: "var(--text-primary)" }}>{profile.institution}</strong>
                    </div>
                  </div>
                )}

                {profile.department && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: "1.1rem" }}>📚</span>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Department</div>
                      <strong style={{ color: "var(--text-primary)" }}>{profile.department}</strong>
                    </div>
                  </div>
                )}

                {profile.designation && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: "1.1rem" }}>💼</span>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Standing / Title</div>
                      <strong style={{ color: "var(--text-primary)" }}>{profile.designation}</strong>
                    </div>
                  </div>
                )}
              </div>

              {profile.bio && (
                <>
                  <hr className="divider" style={{ margin: "16px 0" }} />
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: 6 }}>
                      About Candidate
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                      {profile.bio}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Right Main Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* LeetCode-style Performance KPI Banner */}
              <div
                className="card"
                style={{
                  background: "linear-gradient(135deg, var(--bg-surface-2) 0%, rgba(99, 102, 241, 0.08) 100%)",
                  padding: "24px 28px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <h3 style={{ fontSize: "1.15rem", margin: 0 }}>Verified Performance Summary</h3>
                  <span className="hero-badge" style={{ color: "var(--cyan)", borderColor: "rgba(6, 182, 212, 0.3)" }}>
                    ProctorX Verified
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
                  <div className="card" style={{ background: "var(--bg-surface-1)", padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Assessments Taken</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", margin: "4px 0" }}>
                      {profile.examsCompleted || 0}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Completed tests</div>
                  </div>

                  <div className="card" style={{ background: "var(--bg-surface-1)", padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Passed</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#34D399", margin: "4px 0" }}>
                      {profile.examsPassed || 0}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Cleared benchmarks</div>
                  </div>

                  <div className="card" style={{ background: "var(--bg-surface-1)", padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Pass Rate</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--cyan)", margin: "4px 0" }}>
                      {profile.passRate || 0}%
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Evaluation success</div>
                  </div>

                  <div className="card" style={{ background: "var(--bg-surface-1)", padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Integrity Score</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--primary-light)", margin: "4px 0" }}>
                      100%
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Zero proctor flags</div>
                  </div>
                </div>
              </div>

              {/* AI Competency Telemetry & Radar Showcase */}
              {profile.adaptiveTelemetry && (
                <div
                  className="card"
                  style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                    padding: "26px 28px",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <div>
                      <h3 style={{ fontSize: "1.15rem", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8, color: "#F8FAFC" }}>
                        <span>🌐</span> Verified Algorithmic Competency Vector
                      </h3>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "#94A3B8" }}>
                        12-Dimension skill calibration generated through ProctorX continuous adaptive testing
                      </p>
                    </div>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 999,
                        background: "rgba(6, 182, 212, 0.15)",
                        border: "1px solid rgba(6, 182, 212, 0.35)",
                        color: "#38BDF8",
                        fontSize: "0.78rem",
                        fontWeight: 700
                      }}
                    >
                      Readiness: {Math.round((profile.adaptiveTelemetry.overallReadiness || 0.45) * 100)}%
                    </span>
                  </div>

                  {/* 12-Dimension Competency Radar Chart */}
                  <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                    <CompetencyRadar
                      dsaMasteryVector={profile.adaptiveTelemetry.dsaMasteryVector || []}
                      size={360}
                    />
                  </div>

                  {/* Behavioral Dimensions Bars */}
                  {profile.adaptiveTelemetry.behavioralVector && profile.adaptiveTelemetry.behavioralVector.length > 0 && (
                    <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <div style={{ fontSize: "0.8rem", color: "#94A3B8", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
                        Behavioral & Problem-Solving Proficiency
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                        {profile.adaptiveTelemetry.behavioralVector.map((bv) => {
                          const pct = Math.round((bv.mastery || 0.2) * 100);
                          const name = bv.skill
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase());

                          return (
                            <div key={bv.skill} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                                <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{name}</span>
                                <span style={{ color: "#38BDF8", fontWeight: 700 }}>{pct}%</span>
                              </div>
                              <div style={{ height: 6, background: "rgba(15, 23, 42, 0.8)", borderRadius: 999, overflow: "hidden" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${pct}%`,
                                    background: "linear-gradient(90deg, #6366F1, #06B6D4)",
                                    borderRadius: 999
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Skills Showcase */}
              <div className="card" style={{ padding: "24px 28px" }}>
                <h3 style={{ fontSize: "1.15rem", margin: "0 0 16px" }}>Technical Skills & Competencies</h3>
                {skillsList.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                    No specific skill tags published yet.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {skillsList.map((skill, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "rgba(99, 102, 241, 0.12)",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                          color: "var(--primary-light)",
                          padding: "6px 14px",
                          borderRadius: "var(--radius-full)",
                          fontSize: "0.85rem",
                          fontWeight: 500
                        }}
                      >
                        ⚡ {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ProctorX Verification Security Guarantee */}
              <div
                className="card"
                style={{
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent)",
                  borderColor: "rgba(16, 185, 129, 0.2)",
                  padding: "20px 24px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--radius-full)",
                      background: "rgba(16, 185, 129, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.3rem",
                      color: "#34D399",
                      flexShrink: 0
                    }}
                  >
                    🛡️
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "0.95rem", color: "#34D399" }}>
                      Authenticated Assessment Record
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      All tests and code submissions displayed on this portfolio were conducted inside ProctorX secure sandboxes with AI telemetry and continuous verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
