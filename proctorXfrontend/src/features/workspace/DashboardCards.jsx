import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function DashboardCards({ role, approved }) {
  const navigate = useNavigate();
  const isApproved = approved ?? false;

  const studentCards = [
    {
      title: "Live & Past Exams",
      description: "Enter active live assessments or attend proctored Virtual Contests on attended and missed exams.",
      action: isApproved ? "Open Exam Hub" : "🔒 Locked (Approval Required)",
      path: isApproved ? "/exams/today" : "/profile",
      icon: "⚡",
      tag: isApproved ? "Live & Practice" : "🔒 Locked",
      locked: !isApproved
    },
    {
      title: "Upcoming Assessments",
      description: "Review scheduled exam timetables, durations, and start times for future assessment rounds.",
      action: isApproved ? "View Schedule" : "🔒 Locked (Approval Required)",
      path: isApproved ? "/exams/upcoming" : "/profile",
      icon: "📅",
      tag: isApproved ? "Scheduled" : "🔒 Locked",
      locked: !isApproved
    }
  ];

  const performanceCards = [
    {
      title: "Assessment Results",
      description: "Inspect completed exam submissions, evaluated scores, pass/fail status, and timestamp records.",
      action: "View My Results",
      path: "/results",
      icon: "📊",
      tag: "Evaluations"
    },
    {
      title: "Exam Rules & Security Handbook",
      description: "Understand anti-cheat restrictions, fullscreen requirements, permitted tab limits, and reconnect rules.",
      action: "Read Guidelines",
      path: "/rules",
      icon: "🛡️",
      tag: "Handbook"
    },
    {
      title: "Profile & Public Portfolio",
      description: "Manage your academic affiliation, technical skill tags, and shareable LeetCode-style profile link.",
      action: "Manage Profile",
      path: "/profile",
      icon: "👤",
      tag: "Public URL"
    }
  ];

  const coordinatorActions = [
    {
      title: "Create New Examination",
      desc: "Configure timing, marks auto-split, instructions, and choose manual or AI question authoring.",
      label: isApproved ? "Create Exam" : "🔒 Locked (Approval Required)",
      path: isApproved ? "/admin/create-exam" : "/profile",
      icon: "✍️",
      locked: !isApproved
    },
    {
      title: "Live Control Room",
      desc: "Supervise active sessions in real time (5s heartbeat ticker), issue prompts, or pause/terminate attempts.",
      label: isApproved ? "Open Control Room" : "🔒 Locked (Approval Required)",
      path: isApproved ? "/admin/monitor" : "/profile",
      icon: "📡",
      locked: !isApproved
    },
    {
      title: "Malpractice & Action Audit",
      desc: "Review timestamped candidate infractions (tab switches, phone detections) and coordinator interventions.",
      label: "View Audit Logs",
      path: "/admin/malpractice",
      icon: "🔍"
    },
    {
      title: "Faculty Profile & Verification",
      desc: "Manage academic designation, university department details, and public verification status.",
      label: "Edit Profile",
      path: "/profile",
      icon: "👤"
    }
  ];

  const adminActions = [
    {
      title: "User Approvals & Verification",
      desc: "Review pending coordinator and student registrations, verify university emails, and grant platform access.",
      label: "Approve Users",
      path: "/admin/approve",
      icon: "👥",
      highlight: true
    },
    {
      title: "Create New Examination",
      desc: "Configure timing, marks auto-split, instructions, and choose manual or AI question authoring.",
      label: "Create Exam",
      path: "/admin/create-exam",
      icon: "✍️"
    },
    {
      title: "Live Control Room",
      desc: "Supervise active sessions in real time (5s heartbeat ticker), issue prompts, or pause/terminate attempts.",
      label: "Open Control Room",
      path: "/admin/monitor",
      icon: "📡"
    },
    {
      title: "Malpractice & Action Audit",
      desc: "Review timestamped candidate infractions (tab switches, phone detections) and coordinator interventions.",
      label: "View Audit Logs",
      path: "/admin/malpractice",
      icon: "🔍"
    }
  ];

  return (
    <>
      {role === "STUDENT" && (
        <>
          {/* Top Telemetry Summary Tiles */}
          <div className="summary-grid">
            <div className="card summary-card">
              <span>Security Readiness</span>
              <strong>Biometrics Ready</strong>
              <p className="helper-text">On-device YOLO detection active for exam sessions.</p>
            </div>
            <div className="card summary-card">
              <span>Assessment Delivery</span>
              <strong>MCQ & Code IDE</strong>
              <p className="helper-text">Integrated Java compiler & test case execution.</p>
            </div>
            <div className="card summary-card">
              <span>Account Status</span>
              <strong style={{ color: isApproved ? "#34D399" : "#FBBF24" }}>
                {isApproved ? "Verified & Active" : "Pending Approval"}
              </strong>
              <p className="helper-text">{isApproved ? "Full exam access granted." : "Profile under review."}</p>
            </div>
          </div>

          {/* Available Examinations */}
          <section className="section">
            <div className="section-header">
              <h3>Examinations</h3>
              <p className="section-subtitle">
                {isApproved
                  ? "Access today's scheduled tests or review future upcoming exam dates."
                  : "Scheduled examinations unlock once your account is verified by your institution."}
              </p>
            </div>
            <div className="section-grid">
              {studentCards.map((card) => (
                <div
                  key={card.title}
                  className="card dashboard-card"
                  style={card.locked ? { opacity: 0.85, borderColor: "rgba(245, 158, 11, 0.3)" } : {}}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div className="card-icon">{card.icon}</div>
                      <span className={`status-chip ${card.locked ? "pending" : ""}`}>{card.tag}</span>
                    </div>
                    <h4>{card.title}</h4>
                    <p>{card.description}</p>
                  </div>
                  <div className="card-footer">
                    <button
                      onClick={() => navigate(card.path)}
                      style={card.locked ? { borderColor: "rgba(245, 158, 11, 0.4)", color: "#FBBF24" } : {}}
                    >
                      {card.action} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Performance & Guidelines */}
          <section className="section">
            <div className="section-header">
              <h3>Results, Profile & Handbook</h3>
              <p className="section-subtitle">Review previous score breakdowns, customize your public portfolio, and check integrity rules.</p>
            </div>
            <div className="section-grid">
              {performanceCards.map((card) => (
                <div key={card.title} className="card dashboard-card">
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div className="card-icon">{card.icon}</div>
                      <span className="status-chip">{card.tag}</span>
                    </div>
                    <h4>{card.title}</h4>
                    <p>{card.description}</p>
                  </div>
                  <div className="card-footer">
                    <button onClick={() => navigate(card.path)}>
                      {card.action} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {role === "COORDINATOR" && (
        <section className="section">
          <div className="section-header">
            <h3>Coordinator Mission Operations</h3>
            <p className="section-subtitle">
              {isApproved
                ? "Author examinations, inspect student sessions, and review audit logs."
                : "Authoring tools are locked pending administrator verification of your faculty profile."}
            </p>
          </div>

          <div className="section-grid">
            {coordinatorActions.map((action) => (
              <div
                key={action.title}
                className="card dashboard-card"
                style={action.locked ? { opacity: 0.85, borderColor: "rgba(245, 158, 11, 0.3)" } : {}}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div className="card-icon">{action.icon}</div>
                    {action.locked && <span className="status-chip pending">🔒 Locked</span>}
                  </div>
                  <h4>{action.title}</h4>
                  <p>{action.desc}</p>
                </div>
                <div className="card-footer">
                  <button
                    onClick={() => navigate(action.path)}
                    style={action.locked ? { borderColor: "rgba(245, 158, 11, 0.4)", color: "#FBBF24" } : {}}
                  >
                    {action.label} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {role === "ADMIN" && (
        <section className="section">
          <div className="section-header">
            <h3>Administrator Master Operations</h3>
            <p className="section-subtitle">Manage user approvals, author exams, and conduct live institutional monitoring.</p>
          </div>

          <div className="section-grid">
            {adminActions.map((action) => (
              <div
                key={action.title}
                className="card dashboard-card"
                style={action.highlight ? { borderColor: "var(--border-focus)", boxShadow: "0 0 20px var(--primary-glow)" } : {}}
              >
                <div>
                  <div className="card-icon">{action.icon}</div>
                  <h4>{action.title}</h4>
                  <p>{action.desc}</p>
                </div>
                <div className="card-footer">
                  <button
                    onClick={() => navigate(action.path)}
                    style={action.highlight ? { background: "var(--primary)", color: "#FFF", borderColor: "var(--primary)" } : {}}
                  >
                    {action.label} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
