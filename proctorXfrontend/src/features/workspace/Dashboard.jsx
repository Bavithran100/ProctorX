import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginSuccess, logout } from "../../shared/state/AuthSlice";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import DashboardCards from "./DashboardCards";
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

  useEffect(() => {
    async function refreshAuth() {
      try {
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
      } catch {
        dispatch(logout());
      }
    }

    refreshAuth();
  }, [dispatch]);

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

  const getWelcomeTitle = () => {
    if (role === "ADMIN") return "Platform Administration Hub";
    if (role === "COORDINATOR") return "Exam Operations & Control Hub";
    return "Candidate Assessment Workspace";
  };

  const getWelcomeSubtitle = () => {
    if (role === "ADMIN") return "Manage user approvals, live exam monitors, and platform security.";
    if (role === "COORDINATOR") return "Create exams, draft questions, supervise active candidates, and audit logs.";
    return "View active exams, launch secure test sessions, and track evaluation scores.";
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
                      ? "Your account is in the institutional approval queue for scheduled proctored exams. Meanwhile, AI Adaptive Coach, Skill Diagnostics, and Practice Training are freely available for you to use."
                      : "Examination authoring and control room tools are locked until administrator approval. Complete your faculty affiliation to expedite approval. Adaptive Coach is freely available."}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  className="secondary-btn"
                  onClick={() => navigate("/adaptive-coach")}
                  style={{ fontSize: "0.82rem", padding: "8px 14px", color: "var(--cyan)", borderColor: "rgba(6, 182, 212, 0.4)" }}
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
        <div className="dashboard-hero">
          <div>
            <div className="hero-badge">
              <span className="badge-dot" /> Authenticated {role} Session
            </div>
            <h2>Welcome back, {displayName}</h2>
            <p style={{ maxWidth: 650 }}>
              {role === "STUDENT"
                ? "Your active examinations, scheduled assessments, and public portfolio settings are displayed below."
                : "Operational tools for examination creation, AI blueprint generation, live candidate heartbeats, and audit oversight."}
            </p>
          </div>
        </div>

        {/* Dashboard Cards Content */}
        <DashboardCards role={role} approved={approved} />
      </div>
    </AppShell>
  );
}
