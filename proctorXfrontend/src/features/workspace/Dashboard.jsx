import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { loginSuccess, logout } from "../../shared/state/AuthSlice";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import DashboardCards from "./DashboardCards";
import Logo from "../../shared/components/Logo";
import "../../App.css";

export default function Dashboard() {
  const dispatch = useDispatch();

  const role = useSelector((state) => state.auth.role);
  const approved = useSelector((state) => state.auth.approved);
  const authChecked = useSelector((state) => state.auth.authChecked);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    async function refreshAuth() {
      try {
        const res = await Client.get("/me");

        dispatch(
          loginSuccess({
            user: res.data.email,
            role: res.data.role,
            approved: res.data.approved
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

  if (role === "COORDINATOR" && approved === false) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 540, width: "100%", textAlign: "center", padding: "40px 32px" }}>
          <Logo size="lg" className="justify-center" style={{ justifyContent: "center", marginBottom: 20 }} />
          <div className="hero-badge" style={{ color: "#FBBF24", borderColor: "rgba(245, 158, 11, 0.3)" }}>
            Access Review Pending
          </div>
          <h2 style={{ fontSize: "1.6rem", margin: "12px 0 8px" }}>Account Under Admin Review</h2>
          <p className="subtitle" style={{ lineHeight: 1.6 }}>
            Your coordinator registration has been received and is currently in the administrative approval queue.
            Once an administrator verifies your institution role, full examination authoring and control room access will be unlocked.
          </p>
          <div style={{ marginTop: 24 }}>
            <button
              className="ghost-btn"
              onClick={() => {
                Client.post("/auth/logout").finally(() => {
                  localStorage.clear();
                  dispatch(logout());
                  window.location.href = "/login";
                });
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getWelcomeTitle = () => {
    if (role === "ADMIN") return "Platform Administration Hub";
    if (role === "COORDINATOR") return "Exam Operations & Control Hub";
    return "Candidate Assessment Workspace";
  };

  const getWelcomeSubtitle = () => {
    if (role === "ADMIN") return "Manage coordinator approvals, live exam monitors, and platform security.";
    if (role === "COORDINATOR") return "Create exams, draft questions, supervise active candidates, and audit logs.";
    return "View active exams, launch secure test sessions, and track evaluation scores.";
  };

  return (
    <AppShell title={getWelcomeTitle()} subtitle={getWelcomeSubtitle()} activeNav="/dashboard">
      <div className="dashboard-shell">
        {/* Welcome Hero Banner */}
        <div className="dashboard-hero">
          <div>
            <div className="hero-badge">
              <span className="badge-dot" /> Authenticated Session
            </div>
            <h2>Welcome back, {user ? user.split("@")[0] : "User"}</h2>
            <p style={{ maxWidth: 650 }}>
              {role === "STUDENT"
                ? "Your active examinations and scheduled assessments are displayed below. Complete the biometric camera check before entering any live test."
                : "Operational tools for examination creation, AI blueprint generation, live candidate heartbeats, and audit oversight."}
            </p>
          </div>
        </div>

        {/* Dashboard Cards Content */}
        <DashboardCards role={role} />
      </div>
    </AppShell>
  );
}
