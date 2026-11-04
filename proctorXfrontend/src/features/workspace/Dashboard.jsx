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

  const role = useSelector((state) => state.auth.role);
  const approved = useSelector((state) => state.auth.approved);
  const authChecked = useSelector((state) => state.auth.authChecked);
  const user = useSelector((state) => state.auth.user);
  const name = useSelector((state) => state.auth.name);
  const username = useSelector((state) => state.auth.username);
  const profileCompleted = useSelector((state) => state.auth.profileCompleted);
  const faceEnrolled = useSelector((state) => state.auth.faceEnrolled);

  // Dynamic browser title and SEO meta (Private / Noindex)
  usePageMeta({
    title:
      role === "ADMIN"
        ? "Platform Administration Hub"
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
    return "Real-time attendance telemetry, 12-vector cognitive diagnostics, and instant WebAssembly practice arena.";
  };

  return (
    <AppShell title={getWelcomeTitle()} subtitle={getWelcomeSubtitle()} activeNav="/dashboard">
      <div className="dashboard-shell">
        {/* Unapproved Account Warning Banner */}
        {!approved && role !== "ADMIN" && (
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04))",
              borderColor: "rgba(245, 158, 11, 0.4)",
              marginBottom: 24,
              padding: "20px 24px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ fontSize: "1.6rem" }}>🔒</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <strong style={{ color: "#FBBF24", fontSize: "1rem" }}>
                      Access Review Pending: Platform Features Locked
                    </strong>
                    <span className="status-chip pending" style={{ fontSize: "0.7rem" }}>
                      Awaiting Verification
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 680 }}>
                    {role === "STUDENT"
                      ? "Your account is in the institutional approval queue for scheduled proctored exams. Meanwhile, AI Adaptive Coach, Skill Diagnostics, and LeetCode-style Practice Training are freely available for you to use."
                      : "Examination authoring and control room tools are locked until administrator approval. Complete your faculty affiliation to expedite approval. Adaptive Coach is freely available."}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  className="secondary-btn"
                  onClick={() => navigate("/adaptive-coach")}
                  style={{ fontSize: "0.82rem", padding: "8px 14px", color: "#A78BFA", borderColor: "rgba(124, 58, 237, 0.4)" }}
                >
                  🎯 Open Adaptive Coach (Free)
                </button>
                <button
                  className="primary-btn"
                  onClick={() => navigate("/profile")}
                  style={{ fontSize: "0.82rem", padding: "8px 16px" }}
                >
                  {profileCompleted ? "View Profile Details" : "Complete Profile (Required) →"}
                </button>
                {username && (
                  <Link
                    to={`/u/${username}`}
                    target="_blank"
                    className="ghost-btn"
                    style={{ fontSize: "0.82rem", padding: "8px 14px" }}
                  >
                    Public Portfolio ↗
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Welcome Hero Banner */}
        <div className="dashboard-hero" style={{ marginBottom: 24 }}>
          <div>
            <div className="hero-badge">
              <span className="badge-dot" /> Authenticated {role} Session
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
                    🎯 Open 12-Vector Radar →
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
                Practice across 12 DSA topics with instant client WebAssembly execution (~1ms), automated edge-case test evaluations, and deep cognitive bug taxonomy profiling.
              </p>
              <div className="spotlight-actions">
                <button className="primary-btn" onClick={() => navigate("/adaptive-coach/training")}>
                  ⚡ Launch Targeted Practice Loop
                </button>
                <button className="secondary-btn" onClick={() => navigate("/adaptive-coach/diagnostic")}>
                  🎯 6-Question Skill Baseline
                </button>
                <button className="ghost-btn" onClick={() => navigate("/adaptive-coach")}>
                  🌐 12-Vector Radar (Free) →
                </button>
              </div>
            </div>
            <div className="spotlight-metrics">
              <div className="metric-item">
                <span className="metric-val">12</span>
                <span className="metric-lbl">DSA Vectors</span>
              </div>
              <div className="metric-item">
                <span className="metric-val">9</span>
                <span className="metric-lbl">AI Error Profiles</span>
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

