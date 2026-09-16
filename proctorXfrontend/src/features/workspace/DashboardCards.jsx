import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function DashboardCards({ role }) {
  const navigate = useNavigate();

  const studentCards = [
    {
      title: "Today's Active Exams",
      description: "Enter exams open within today's window. Complete biometric and fullscreen check to launch.",
      action: "Launch / View Today",
      path: "/exams/today",
      icon: "⚡",
      tag: "Active Window"
    },
    {
      title: "Upcoming Assessments",
      description: "Review scheduled exam timetables, durations, and start times for future assessment rounds.",
      action: "View Schedule",
      path: "/exams/upcoming",
      icon: "📅",
      tag: "Scheduled"
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
    }
  ];

  const coordinatorActions = [
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

  const adminActions = [
    {
      title: "Coordinator Approvals",
      desc: "Review pending coordinator registrations, verify university emails, and grant platform access.",
      label: "Approve Coordinators",
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
              <span>Proctoring State</span>
              <strong>Active Protection</strong>
              <p className="helper-text">Single-session enforcement & heartbeat tracking.</p>
            </div>
          </div>

          {/* Available Examinations */}
          <section className="section">
            <div className="section-header">
              <h3>Examinations</h3>
              <p className="section-subtitle">Access today's scheduled tests or review future upcoming exam dates.</p>
            </div>
            <div className="section-grid">
              {studentCards.map((card) => (
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

          {/* Performance & Guidelines */}
          <section className="section">
            <div className="section-header">
              <h3>Results & Handbook</h3>
              <p className="section-subtitle">Review previous score breakdowns and examination integrity rules.</p>
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
            <p className="section-subtitle">Author examinations, inspect student sessions, and review audit logs.</p>
          </div>

          <div className="section-grid">
            {coordinatorActions.map((action) => (
              <div key={action.title} className="card dashboard-card">
                <div>
                  <div className="card-icon">{action.icon}</div>
                  <h4>{action.title}</h4>
                  <p>{action.desc}</p>
                </div>
                <div className="card-footer">
                  <button onClick={() => navigate(action.path)}>
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
