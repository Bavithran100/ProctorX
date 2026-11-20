import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function DashboardCards({ role, approved }) {
  const navigate = useNavigate();
  const isApproved = approved ?? false;

  const practiceCards = [
    {
      title: "Adaptive AI Coach & Vector Practice",
      description: "Take the 20-D cognitive diagnostic, receive vector-calibrated programming challenges, and close conceptual defects with real-time AI feedback.",
      action: "Launch AI Coach",
      path: "/adaptive-coach",
      icon: "🧠",
      tag: "Autonomous AI",
      locked: false
    },
    {
      title: "Active & Missed Exam Arena",
      description: "Attend official scheduled assessments or practice missed exams under realistic timed contest conditions.",
      action: "Enter Exam Hall",
      path: "/exams/today",
      icon: "🚀",
      tag: "Live & Practice",
      locked: false
    },
    {
      title: "Upcoming Assessment Timetable",
      description: "Review upcoming examination rounds, permitted compilers, question structures, and syllabus tracks.",
      action: "View Timetable",
      path: "/exams/upcoming",
      icon: "📅",
      tag: "Schedule",
      locked: false
    },
    {
      title: "Evaluation Scorecards & Solutions",
      description: "Inspect evaluated submissions, automated test case verdicts, and AI semantic feedback reports.",
      action: "View Results",
      path: "/results",
      icon: "📊",
      tag: "Verified Reports",
      locked: false
    },
    {
      title: "Handbook, Proctoring & Integrity Rules",
      description: "Learn about on-device AI proctoring, permitted actions, browser focus rules, and compiler limits.",
      action: "Read Guidelines",
      path: "/rules",
      icon: "🛡️",
      tag: "Integrity Rules",
      locked: false
    }
  ];

  const examCards = [
    {
      title: "Today's Scheduled Examinations",
      description: "Enter official proctored examinations with biometric face identification and on-device YOLO supervision.",
      action: isApproved ? "Open Exam Hall" : "🔒 Locked (Approval Required)",
      path: "/exams/today",
      icon: "⚡",
      tag: isApproved ? "Official Exams" : "🔒 Locked",
      locked: !isApproved
    },
    {
      title: "Upcoming Exam Timetable",
      description: "Review scheduled dates, syllabi, permitted resources, and access requirements for upcoming assessment rounds.",
      action: isApproved ? "View Schedule" : "🔒 Locked (Approval Required)",
      path: "/exams/upcoming",
      icon: "📅",
      tag: isApproved ? "Scheduled" : "🔒 Locked",
      locked: !isApproved
    }
  ];

  const performanceCards = [
    {
      title: "AI Submission Results & Scorecards",
      description: "Inspect completed submissions, automated testcase scores, pass/fail status, and AI feedback breakdowns.",
      action: "View My Results",
      path: "/results",
      icon: "📊",
      tag: "AI Evaluations"
    },
    {
      title: "Public Developer Portfolio & Recruiter Proofs",
      description: "Showcase your verified profile, contest ratings, 20-D cognitive radar charts, and badges to recruiters.",
      action: "Manage Portfolio",
      path: "/profile",
      icon: "👤",
      tag: "Public /u/id"
    },
    {
      title: "Autonomous Assessment Handbook & Rules",
      description: "Understand AI grading standards, compiler watchdog limits, permitted IDE features, and integrity policies.",
      action: "Read Guidelines",
      path: "/rules",
      icon: "🛡️",
      tag: "Handbook & Rules"
    }
  ];

  const coordinatorActions = [
    {
      title: "Create New Examination",
      desc: "Configure timing, marks auto-split, instructions, and choose manual or AI question authoring.",
      label: isApproved ? "Create Exam" : "🔒 Locked (Approval Required)",
      path: "/admin/create-exam",
      icon: "✍️",
      locked: !isApproved
    },
    {
      title: "Live Control Room",
      desc: "Supervise active sessions in real time (5s heartbeat ticker), issue prompts, or pause/terminate attempts.",
      label: isApproved ? "Open Control Room" : "🔒 Locked (Approval Required)",
      path: "/admin/monitor",
      icon: "📡",
      locked: !isApproved
    },
    {
      title: "Exam History & Submissions",
      desc: "Inspect authored examination rounds, total student turnout, awarded score breakdown, and public profile links.",
      label: isApproved ? "View Exam History" : "🔒 Locked (Approval Required)",
      path: "/admin/exam-history",
      icon: "📊",
      locked: !isApproved
    },
    {
      title: "Malpractice & Action Audit",
      desc: "Review timestamped candidate infractions (tab switches, phone detections) and coordinator interventions.",
      label: isApproved ? "View Audit Logs" : "🔒 Locked (Approval Required)",
      path: "/admin/malpractice",
      icon: "🔍",
      locked: !isApproved
    },
    {
      title: "Compiler Engines & Settings",
      desc: "Configure primary coding compiler (Local Sandbox / Judge0 / JDoodle), run live latency diagnostics, and verify failover.",
      label: isApproved ? "Manage Compilers" : "🔒 Locked (Approval Required)",
      path: "/admin/compiler-settings",
      icon: "⚡",
      locked: !isApproved
    },
    {
      title: "Faculty Profile & Verification",
      desc: "Manage academic designation, university department details, and public verification status.",
      label: "Edit Profile",
      path: "/profile",
      icon: "👤"
    }
  ];

  const collegeAdminActions = [
    {
      title: "Institutional Seat Quotas & PhonePe Billing",
      desc: "Upgrade candidate seats, subscribe to institutional packages, and view PhonePe payment transactions.",
      label: "Manage Billing & Quota",
      path: "/admin/billing",
      icon: "💳",
      highlight: true
    },
    {
      title: "Faculty Coordinator & Candidate Verification",
      desc: "Verify departmental coordinators and students registered under your institution.",
      label: "Review Coordinators",
      path: "/admin/approve",
      icon: "👥",
      highlight: true
    },
    {
      title: "Campus Live Control Room",
      desc: "Supervise active exams across all academic departments with live proctoring telemetry.",
      label: "Open Control Room",
      path: "/admin/monitor",
      icon: "📡"
    },
    {
      title: "Institutional Exam History & Submissions",
      desc: "Inspect student turnout, passing ratios, and candidate performance across all college exams.",
      label: "View Campus History",
      path: "/admin/exam-history",
      icon: "📊"
    },
    {
      title: "Malpractice & Infraction Audit",
      desc: "Inspect campus-wide security infractions, multi-face detections, and coordinator actions.",
      label: "View Audit Trail",
      path: "/admin/malpractice",
      icon: "🔍"
    },
    {
      title: "Institution Profile & Authority",
      desc: "Configure institutional branding, college verification credentials, and admin contacts.",
      label: "Edit Institution",
      path: "/profile",
      icon: "🏛️"
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
      title: "Adaptive Coach & Skill Radar",
      desc: "Monitor institutional learner vectors, diagnostic rubrics, and dynamic problem generators.",
      label: "Open Adaptive Coach",
      path: "/adaptive-coach",
      icon: "🎯",
      highlight: true
    },
    {
      title: "Adaptive AI Laboratory & Sandbox",
      desc: "Test Groq LLM generations, live 20-D vector sliders, WASM multi-compiler executions, and real-time Bayesian recalibrations.",
      label: "Launch AI Lab 🔬",
      path: "/admin/adaptive-tester",
      icon: "🔬",
      highlight: true
    },
    {
      title: "Compiler Engines & Execution",
      desc: "Select default primary compiler (Local Sandbox / JDoodle), monitor engine health, and manage automatic failover.",
      label: "Manage Compilers",
      path: "/admin/compiler-settings",
      icon: "⚡",
      highlight: true
    },
    {
      title: "Institutional Billing & Gateways",
      desc: "Supervise all tenant subscriptions, quota allocations, and PhonePe payment transactions.",
      label: "Manage Billing",
      path: "/admin/billing",
      icon: "💳"
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
      title: "Exam History & Submissions",
      desc: "Inspect all authored examinations, candidate attendances, scores, and candidate public portfolios.",
      label: "View Exam History",
      path: "/admin/exam-history",
      icon: "📊"
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
          {/* Section 1: AI Practice Arena & Algorithmic Training */}
          <section className="section">
            <div className="section-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.4rem" }}>💻</span>
                <div>
                  <h3 style={{ margin: 0 }}>AI Practice Arena & Algorithmic Training</h3>
                  <p className="section-subtitle" style={{ margin: "2px 0 0" }}>
                    Algorithmic coding challenges evaluated in real time by AI with multi-language WebAssembly compiler execution.
                  </p>
                </div>
              </div>
            </div>
            <div className="section-grid">
              {practiceCards.map((card) => (
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

          {/* Section 2: Scheduled Examinations & Contests */}
          <section className="section">
            <div className="section-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.4rem" }}>⚡</span>
                <div>
                  <h3 style={{ margin: 0 }}>Official Scheduled Assessments</h3>
                  <p className="section-subtitle" style={{ margin: "2px 0 0" }}>
                    {isApproved
                      ? "Access today's scheduled institutional tests or review future upcoming exam dates."
                      : "Official examinations unlock once your account is verified by your faculty/institution."}
                  </p>
                </div>
              </div>
            </div>
            <div className="section-grid">
              {examCards.map((card) => (
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

          {/* Section 3: AI Evaluations, Portfolio & Handbook */}
          <section className="section">
            <div className="section-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.4rem" }}>📊</span>
                <div>
                  <h3 style={{ margin: 0 }}>AI Evaluations, Portfolio & Handbook</h3>
                  <p className="section-subtitle" style={{ margin: "2px 0 0" }}>
                    Review detailed AI score breakdowns, showcase your verified public portfolio, and inspect platform guidelines.
                  </p>
                </div>
              </div>
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

      {role === "COLLEGE_ADMIN" && (
        <section className="section">
          <div className="section-header">
            <h3>College & Institutional Governance</h3>
            <p className="section-subtitle">
              Manage departmental coordinators, scale student quota licenses with PhonePe, and oversee campus-wide exams.
            </p>
          </div>

          <div className="section-grid">
            {collegeAdminActions.map((action) => (
              <div
                key={action.title}
                className="card dashboard-card"
                style={action.highlight ? { borderColor: "var(--border-focus)", boxShadow: "0 0 15px rgba(255, 255, 255, 0.08)" } : {}}
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

      {(role === "ADMIN" || role === "SUPER_ADMIN") && (
        <section className="section">
          <div className="section-header">
            <h3>Super Administrator Master Operations</h3>
            <p className="section-subtitle">Manage user approvals, author exams, supervise AI pipelines, and monitor global operations.</p>
          </div>

          <div className="section-grid">
            {adminActions.map((action) => (
              <div
                key={action.title}
                className="card dashboard-card"
                style={action.highlight ? { borderColor: "var(--border-focus)", boxShadow: "0 0 20px rgba(255, 255, 255, 0.08)" } : {}}
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
