import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginSuccess, logout } from "../../shared/state/AuthSlice";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import DashboardCards from "./DashboardCards";
import ActivityHeatmap from "../../shared/components/ActivityHeatmap";
import usePageMeta from "../../shared/hooks/usePageMeta";
import "./dashboard.css";
import "../../App.css";

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    role,
    approved,
    authChecked,
    user,
    name,
    username,
    profileCompleted,
    faceEnrolled,
    orgCode,
    institution,
    organizationPaymentStatus,
    isFullyApproved,
    collegeAdminApproved,
    coordinatorApproved,
    coordinatorId
  } = useSelector((state) => state.auth);

  // States for student coordinator assignment
  const [coordsList, setCoordsList] = useState([]);
  const [selectedCoord, setSelectedCoord] = useState("");
  const [assigningCoord, setAssigningCoord] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (role === "STUDENT" && collegeAdminApproved && !coordinatorId) {
      Client.get("/student/coordinators")
        .then((res) => {
          const list = res.data || [];
          setCoordsList(list);
          if (list.length > 0) setSelectedCoord(list[0].id);
        })
        .catch(() => {});
    }
  }, [role, collegeAdminApproved, coordinatorId]);

  async function handleQuickAssignCoordinator() {
    if (!selectedCoord) return;
    try {
      setAssigningCoord(true);
      const res = await Client.put("/student/assign-coordinator", { coordinatorId: selectedCoord });
      if (res.data?.success) {
        setAssignSuccess(true);
        const meRes = await Client.get("/me");
        if (meRes.data) {
          dispatch(loginSuccess({ ...meRes.data, user: meRes.data.email }));
        }
      }
    } catch {
      alert("Failed to assign coordinator.");
    } finally {
      setAssigningCoord(false);
    }
  }

  function copyOrgCode() {
    if (orgCode) {
      navigator.clipboard.writeText(orgCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  // Dynamic browser title and SEO meta (Private / Noindex)
  usePageMeta({
    title:
      role === "SUPER_ADMIN" || role === "ADMIN"
        ? "Platform Administration Hub"
        : role === "COLLEGE_ADMIN"
        ? "Institutional Governance Hub"
        : role === "COORDINATOR"
        ? "Coordinator Mission Control"
        : "Student Dashboard — AI Practice Cockpit",
    description: "ProctorX authenticated workspace and autonomous evaluation cockpit.",
    noindex: true
  });

  // Dynamic telemetry and session states
  const [adaptiveData, setAdaptiveData] = useState(null);
  const [todaysExams, setTodaysExams] = useState([]);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(true);

  useEffect(() => {
    async function refreshAuthAndTelemetry() {
      try {
        const res = await Client.get("/me");
        if (res.data) {
          dispatch(
            loginSuccess({
              ...res.data,
              user: res.data.email
            })
          );
        }

        // Fetch adaptive learner model telemetry
        try {
          const adaptiveRes = await Client.get("/adaptive/profile");
          if (adaptiveRes.data) {
            setAdaptiveData(adaptiveRes.data);
          }
        } catch (e) {
          console.warn("Telemetry notice: Adaptive profile not available yet", e?.message);
        }

        // Fetch today's scheduled assessments (if student or admin)
        if (res.data?.role === "STUDENT" || role === "STUDENT") {
          try {
            const examsRes = await Client.get("/student/exams/today");
            if (Array.isArray(examsRes.data)) {
              setTodaysExams(examsRes.data);
            }
          } catch (e) {
            // Ignored if unapproved or none scheduled
          }
        }
      } catch {
        dispatch(logout());
      } finally {
        setIsLoadingTelemetry(false);
      }
    }

    refreshAuthAndTelemetry();
  }, [dispatch, role]);

  if (!authChecked) {
    return (
      <div className="page">
        <div className="card loading-card" style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
          <div className="hero-badge">Workspace Preparation</div>
          <h2>Loading your environment...</h2>
          <p className="subtitle">Syncing assessment states and credentials.</p>
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  const displayName = name || (user ? user.split("@")[0] : "User");

  // Dynamic attendance calendar generator (Mon - Sun of current week)
  const streakDays = adaptiveData?.streakDays || 1;
  const generateWeeklyStrip = () => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon ...
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const days = [];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const isToday = d.toDateString() === today.toDateString();
      const isPast = d < today && !isToday;
      const isFuture = d > today && !isToday;

      // Calculate if candidate was active/present
      const diffFromToday = Math.round((today - d) / (1000 * 60 * 60 * 24));
      const isPresent = (diffFromToday >= 0 && diffFromToday < streakDays) || isToday;

      days.push({
        label: dayNames[i],
        date: d.getDate(),
        isToday,
        isPast,
        isFuture,
        isPresent
      });
    }
    return days;
  };

  const weeklyDays = generateWeeklyStrip();
  const presentDaysCount = weeklyDays.filter((d) => d.isPresent).length;
  const weeklyAttendanceRate = Math.round((presentDaysCount / 7) * 100);

  // Compute readiness score from adaptive data
  const rawReadiness = adaptiveData?.overallReadiness;
  const readinessPercent = rawReadiness != null ? Math.round(rawReadiness * 100) : 74;
  const recommendedTopic = adaptiveData?.recommendedTopic || "ARRAY";
  const totalSolved = adaptiveData?.totalQuestionsSolved || 0;
  const totalSessions = adaptiveData?.totalSessionsCompleted || 0;

  const getWelcomeTitle = () => {
    if (role === "ADMIN") return "Platform Administration Hub";
    if (role === "COORDINATOR") return "Coordinator Operations & Authoring Hub";
    return "Student Cockpit & AI Practice Arena";
  };

  const getWelcomeSubtitle = () => {
    if (role === "ADMIN") return "Manage user approvals, live exam monitors, and platform security.";
    if (role === "COORDINATOR") return "Create exams, draft questions, supervise active candidates, and audit logs.";
    return "Real-time attendance telemetry, 20-D cognitive diagnostics, and instant WebAssembly practice arena.";
  };

  return (
    <AppShell title={getWelcomeTitle()} subtitle={getWelcomeSubtitle()} activeNav="/dashboard">
      <div className="dashboard-shell">
        {/* INCOMPLETE PROFILE REMINDER BANNER */}
        {!profileCompleted && role !== "SUPER_ADMIN" && role !== "ADMIN" && (
          <div
            className="card"
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              borderColor: "rgba(239, 68, 68, 0.35)",
              marginBottom: 24,
              padding: "20px 24px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ fontSize: "1.6rem" }}>⚠️</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <strong style={{ color: "#EF4444", fontSize: "1rem" }}>
                      Profile Incomplete: Action Required
                    </strong>
                    <span className="status-chip danger" style={{ fontSize: "0.7rem" }}>Verification Pending</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 680 }}>
                    Every user must complete their institutional profile (campus affiliation, department, and degree/title) before a verification request is submitted to college administrators.
                  </p>
                </div>
              </div>
              <button
                className="primary-btn"
                onClick={() => navigate("/profile")}
                style={{ fontSize: "0.84rem", padding: "10px 18px" }}
              >
                Complete Profile Now →
              </button>
            </div>
          </div>
        )}

        {/* COLLEGE ADMIN: Pending Activation Banner */}
        {role === "COLLEGE_ADMIN" && organizationPaymentStatus !== "ACTIVE" && (
          <div
            className="card"
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              borderColor: "rgba(245, 158, 11, 0.4)",
              marginBottom: 24,
              padding: "20px 24px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ fontSize: "1.6rem" }}>🏛️</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <strong style={{ color: "#FBBF24", fontSize: "1rem" }}>
                      Institutional Activation Pending
                    </strong>
                    <span className="status-chip pending" style={{ fontSize: "0.7rem" }}>
                      Onboarding Required
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 680 }}>
                    Please review institutional terms, select your campus subscription plan, and activate your account to enable coordinator and student registration quotas.
                  </p>
                </div>
              </div>
              <button
                className="primary-btn"
                onClick={() => navigate("/institution/activation")}
                style={{ fontSize: "0.84rem", padding: "10px 18px" }}
              >
                Complete Campus Activation →
              </button>
            </div>
          </div>
        )}

        {/* COORDINATOR: Pending Institutional Approval Banner */}
        {role === "COORDINATOR" && !collegeAdminApproved && (
          <div
            className="card"
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              borderColor: "rgba(245, 158, 11, 0.4)",
              marginBottom: 24,
              padding: "20px 24px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: "1.6rem" }}>⏳</span>
              <div>
                <strong style={{ color: "#FBBF24", fontSize: "0.98rem", display: "block", marginBottom: 4 }}>
                  Institutional Verification Pending (Stage 1)
                </strong>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Your coordinator account is awaiting verification by your College Administrator. Assessment authoring and control room access will activate upon approval.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT: Multi-Stage Approval Banners */}
        {role === "STUDENT" && !isFullyApproved && (
          <div
            className="card"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              borderColor: !collegeAdminApproved ? "rgba(245, 158, 11, 0.35)" : "rgba(56, 189, 248, 0.35)",
              marginBottom: 24,
              padding: "20px 24px"
            }}
          >
            {!collegeAdminApproved ? (
              /* Stage 1: College Admin Pending */
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: "1.6rem" }}>🏛️</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <strong style={{ color: "#FBBF24", fontSize: "0.98rem" }}>
                      Stage 1: Institutional Enrollment Pending
                    </strong>
                    <span className="status-chip pending" style={{ fontSize: "0.7rem" }}>Awaiting Dean</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Your candidate enrollment is awaiting institutional verification by your College Administrator. Once verified, you will choose your Faculty Coordinator.
                  </p>
                </div>
              </div>
            ) : !coordinatorId && !assignSuccess ? (
              /* Stage 2: Pick Coordinator */
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.3rem" }}>👨‍🏫</span>
                  <strong style={{ color: "#38BDF8", fontSize: "1rem" }}>
                    Stage 2: Select Your Faculty Coordinator (Required)
                  </strong>
                  <span className="status-chip approved" style={{ fontSize: "0.7rem" }}>Stage 1 Cleared ✓</span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 14 }}>
                  Your institutional identity is verified! Select your assigned Faculty Coordinator below to finalize assessment eligibility.
                </p>

                {coordsList.length === 0 ? (
                  <div style={{ fontSize: "0.84rem", color: "#F59E0B" }}>
                    ⏳ No approved faculty coordinators are currently available in your institution. Please check back shortly.
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      value={selectedCoord}
                      onChange={(e) => setSelectedCoord(e.target.value)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: "#080B11",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#F8FAFC",
                        fontSize: "0.85rem",
                        maxWidth: 360
                      }}
                    >
                      {coordsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          👨‍🏫 {c.name} ({c.department || "Faculty"}) — {c.email}
                        </option>
                      ))}
                    </select>
                    <button
                      className="primary-btn"
                      onClick={handleQuickAssignCoordinator}
                      disabled={assigningCoord || !selectedCoord}
                      style={{ fontSize: "0.82rem", padding: "8px 16px" }}
                    >
                      {assigningCoord ? "Assigning..." : "Confirm Faculty Assignment →"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Stage 2: Waiting Coordinator Clearance */
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: "1.6rem" }}>⏳</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <strong style={{ color: "#818CF8", fontSize: "0.98rem" }}>
                      Stage 2: Faculty Clearance Pending
                    </strong>
                    <span className="status-chip pending" style={{ fontSize: "0.7rem" }}>Coordinator Review</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Your candidate profile has been forwarded to your assigned Faculty Coordinator. Scheduled examination rooms will unlock once cleared.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Welcome Hero Banner */}
        <div className="dashboard-hero" style={{ marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <div className="hero-badge">
                <span className="badge-dot" /> Authenticated {role} Session
              </div>
              {orgCode && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    fontSize: "0.76rem"
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>Org:</span>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>{institution || "Campus"}</span>
                  <span style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>[{orgCode}]</span>
                  <button
                    onClick={copyOrgCode}
                    style={{
                      background: "none",
                      border: "none",
                      color: copiedCode ? "#10B981" : "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.72rem",
                      padding: 0
                    }}
                    title="Copy unique Organization Code"
                  >
                    {copiedCode ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
              )}
            </div>
            <h2>Welcome back, {displayName}</h2>
            <p style={{ maxWidth: 650 }}>
              {role === "STUDENT"
                ? "Your active attendance streak, cognitive readiness radar, and today's assessment hall are synchronized below."
                : "Operational tools for examination creation, AI blueprint generation, live candidate heartbeats, and audit oversight."}
            </p>
          </div>
        </div>

        {/* ==================================================================
            DYNAMIC STUDENT COCKPIT (Attendance, Readiness & Biometrics)
            ================================================================== */}
        {role === "STUDENT" && (
          <div className="dashboard-cockpit">
            {/* 1. LeetCode-Style Activity & Attendance Heatmap Radar */}
            <ActivityHeatmap
              data={adaptiveData?.activityHeatmap}
              title="submissions in the past one year"
            />

            {/* 2. Cockpit Tri-Grid (Readiness, Biometrics, Scheduled Exams) */}
            <div className="cockpit-tri-grid">
              {/* Card A: Algorithmic Readiness Gauge */}
              <div className="cockpit-card">
                <div>
                  <div className="cockpit-card-header">
                    <span className="cockpit-card-title">COGNITIVE READINESS</span>
                    <span style={{ fontSize: "12px", color: "#10B981", fontWeight: 700 }}>
                      ● CALIBRATED
                    </span>
                  </div>
                  <h4>Algorithmic Readiness Index</h4>
                  <p>
                    Continuous Bayesian mastery vector across 12 mathematical DSA dimensions.
                  </p>

                  <div className="readiness-meter-box">
                    <div className="readiness-score-row">
                      <span className="readiness-big-num">{readinessPercent}%</span>
                      <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                        Frontier: <strong>{recommendedTopic}</strong>
                      </span>
                    </div>
                    <div className="readiness-bar-track">
                      <div
                        className="readiness-bar-fill"
                        style={{ width: `${Math.min(100, readinessPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    className="btn-dashboard-action"
                    onClick={() => navigate("/adaptive-coach")}
                  >
                    🎯 Open Cognitive Radar →
                  </button>
                </div>
              </div>

              {/* Card B: Biometric Face & Edge Verification */}
              <div className="cockpit-card">
                <div>
                  <div className="cockpit-card-header">
                    <span className="cockpit-card-title">EDGE BIOMETRIC SECURITY</span>
                    <span style={{ fontSize: "12px", color: faceEnrolled ? "#10B981" : "#FBBF24", fontWeight: 700 }}>
                       {faceEnrolled ? "● ENROLLED" : "▲ PENDING"}
                    </span>
                  </div>
                  <h4>Biometric Face ID Status</h4>
                  <p>
                    On-device neural face descriptor required for instant entrance to proctored rounds.
                  </p>

                  <div
                    className={`biometric-chip-pill ${faceEnrolled ? "enrolled" : "pending"}`}
                  >
                    <span>{faceEnrolled ? "🛡️ Face Enrolled & Verified" : "⚠️ Biometrics Setup Required"}</span>
                  </div>
                </div>

                <div>
                  <button
                    className={faceEnrolled ? "btn-dashboard-secondary" : "btn-dashboard-action"}
                    onClick={() => navigate("/profile")}
                  >
                    {faceEnrolled ? "Inspect Biometric Profile →" : "Enroll Face Descriptor →"}
                  </button>
                </div>
              </div>

              {/* Card C: Today's Scheduled Assessment Hall */}
              <div className="cockpit-card">
                <div>
                  <div className="cockpit-card-header">
                    <span className="cockpit-card-title">ASSESSMENT ROUNDS TODAY</span>
                    <span style={{ fontSize: "12px", color: todaysExams.length > 0 ? "#10B981" : "#64748B", fontWeight: 700 }}>
                      {todaysExams.length > 0 ? `● ${todaysExams.length} READY` : "○ NONE TODAY"}
                    </span>
                  </div>
                  <h4>Official Examination Hall</h4>
                  <p>
                    {todaysExams.length > 0
                      ? `${todaysExams.length} examination round scheduled today with YOLOv8 supervision.`
                      : "No proctored rounds scheduled today. Practice freely in the AI Arena."}
                  </p>

                  <div
                    className={`exam-status-indicator ${todaysExams.length > 0 ? "active" : "empty"}`}
                  >
                    <span>
                      {todaysExams.length > 0
                        ? `⚡ ${todaysExams[0]?.title || "Active Examination Ready"}`
                        : "✓ Arena Open For Algorithmic Training"}
                    </span>
                  </div>
                </div>

                <div>
                  <button
                    className="btn-dashboard-action"
                    onClick={() => navigate(todaysExams.length > 0 ? "/exams/today" : "/adaptive-coach/training")}
                  >
                    {todaysExams.length > 0 ? "Enter Exam Hall ⚡" : "Launch AI Practice Loop ⚡"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Coding & Practice Arena Spotlight Card (Student Hub) */}
        {role === "STUDENT" && (
          <div className="practice-spotlight-card">
            <div className="spotlight-content">
              <div className="spotlight-badge">⚡ AUTONOMOUS AI PRACTICE ARENA</div>
              <h3 className="spotlight-title">Solve Algorithmic Challenges Evaluated by AI</h3>
              <p className="spotlight-desc">
                Practice across the 20-D Matrix (8 Core Concepts & 8 Algorithmic Patterns) with instant client WebAssembly execution (~1ms), automated edge-case test evaluations, and deep cognitive bug taxonomy profiling.
              </p>
              <div className="spotlight-actions">
                <button className="primary-btn" onClick={() => navigate("/adaptive-coach/training")}>
                  ⚡ Launch Targeted Practice Loop
                </button>
                <button className="secondary-btn" onClick={() => navigate("/adaptive-coach/diagnostic")}>
                  🎯 5-Question Skill Baseline
                </button>
                <button className="ghost-btn" onClick={() => navigate("/adaptive-coach")}>
                  🌐 Cognitive Radar (Free) →
                </button>
              </div>
            </div>
            <div className="spotlight-metrics">
              <div className="metric-item">
                <span className="metric-val">20</span>
                <span className="metric-lbl">Cognitive Vectors</span>
              </div>
              <div className="metric-item">
                <span className="metric-val">4</span>
                <span className="metric-lbl">Defect Profiles</span>
              </div>
              <div className="metric-item">
                <span className="metric-val">~1ms</span>
                <span className="metric-lbl">WASM Latency</span>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Cards Content */}
        <DashboardCards role={role} approved={approved} />
      </div>
    </AppShell>
  );
}

