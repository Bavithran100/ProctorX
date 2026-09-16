import { useEffect, useMemo, useState } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../AdminMonitoring.css";
import "../../App.css";

const isAttending = (status) => status === "ACTIVE" || status === "WAITING";
const isCompleted = (status) => status === "SUBMITTED" || status === "TERMINATED";

export default function AdminLiveMonitor() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const loadSessions = () => {
    Client.get("/admin/monitor/live-sessions")
      .then((res) => {
        setSessions(res.data || []);
        setLoading(false);
        setLastRefreshed(new Date());
      })
      .catch((err) => {
        console.error("Failed to load live monitoring data", err);
      });
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const exams = useMemo(() => {
    const grouped = new Map();
    sessions.forEach((session) => {
      if (!grouped.has(session.examId)) {
        grouped.set(session.examId, {
          id: session.examId,
          title: session.examTitle,
          sessions: []
        });
      }
      grouped.get(session.examId).sessions.push(session);
    });

    return [...grouped.values()]
      .map((exam) => ({
        ...exam,
        attending: exam.sessions.filter((session) => isAttending(session.status)).length,
        completed: exam.sessions.filter((session) => isCompleted(session.status)).length,
        inactive: exam.sessions.filter((session) => session.inactive).length,
        videoRisk: exam.sessions.reduce((sum, session) => sum + (session.videoRiskCount || 0), 0)
      }))
      .sort((a, b) => b.attending - a.attending || a.title.localeCompare(b.title));
  }, [sessions]);

  const selectedExam =
    exams.find((exam) => exam.id === selectedExamId) ||
    exams.find((exam) => exam.attending > 0) ||
    exams[0];

  const liveExamCount = exams.filter((exam) => exam.attending > 0).length;
  const attendingCount = sessions.filter((session) => isAttending(session.status)).length;
  const completedCount = sessions.filter((session) => isCompleted(session.status)).length;
  const flaggedCount = sessions.filter((session) => session.inactive || (session.riskScore || 0) >= 4).length;

  const takeAction = async (sessionId, action) => {
    let remark = "";
    if (action === "WARN") {
      remark = prompt("Enter prompt/warning message to broadcast to this candidate's screen:");
      if (!remark) return;
    }
    if (action === "TERMINATE" && !window.confirm("Submit this student's current progress and force-terminate the exam?")) {
      return;
    }
    try {
      await Client.post(`/admin/actions/${sessionId}`, null, {
        params: { action, remark }
      });
      loadSessions();
    } catch (error) {
      alert(error.response?.data || "Coordinator action failed. Please check the session status.");
    }
  };

  const riskClass = (score = 0) => (score >= 7 ? "risk-high" : score >= 4 ? "risk-mid" : "risk-low");
  const formatTime = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <AppShell
      title="Mission Control: Live Examination Monitor"
      subtitle="Real-time candidate telemetry, heartbeat monitors, automated risk scores, and active intervention triggers."
      activeNav="/admin/monitor"
    >
      <div className="admin-container">
        {/* Real-time KPI Cards */}
        <section className="monitor-summary-grid">
          <div className="monitor-stat">
            <span>Live Exams</span>
            <strong>{liveExamCount}</strong>
            <small>With active attending candidates</small>
          </div>
          <div className="monitor-stat">
            <span>Candidates Attending</span>
            <strong style={{ color: "#34D399" }}>{attendingCount}</strong>
            <small>Active heartbeat sessions</small>
          </div>
          <div className="monitor-stat">
            <span>Completed Submissions</span>
            <strong style={{ color: "var(--primary-light)" }}>{completedCount}</strong>
            <small>Submitted or concluded</small>
          </div>
          <div className="monitor-stat danger">
            <span>Needs Attention / High Risk</span>
            <strong>{flaggedCount}</strong>
            <small>Elevated risk or inactive</small>
          </div>
        </section>

        {/* Exam Selection Strip */}
        <section className="exam-overview-section">
          <div className="section-heading">
            <div>
              <h3>Active Examination Rounds</h3>
              <span>{exams.length} exams with active session history · Refreshed {lastRefreshed.toLocaleTimeString()}</span>
            </div>
            <span className="system-telemetry-badge">
              <span className="telemetry-pulse-dot" /> Auto-Polling 5s
            </span>
          </div>

          {exams.length === 0 ? (
            <div className="empty-state">
              No examination sessions have been initiated by students yet.
            </div>
          ) : (
            <div className="exam-monitor-grid">
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  className={`exam-monitor-card ${selectedExam?.id === exam.id ? "selected" : ""}`}
                  onClick={() => setSelectedExamId(exam.id)}
                >
                  <span className="exam-card-title">{exam.title}</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span><b>{exam.attending}</b> attending</span>
                    <span><b>{exam.completed}</b> completed</span>
                  </div>
                  <footer>
                    {exam.inactive} inactive · {exam.videoRisk} AI risk flags
                  </footer>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Selected Exam Student Sessions Table */}
        {selectedExam && (
          <section className="student-session-section">
            <div className="section-heading" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>{selectedExam.title}</h3>
                <span>Candidate Live Telemetry & Control Actions</span>
              </div>
              <span className="exam-attendance-chip">
                {selectedExam.attending} attending / {selectedExam.completed} completed
              </span>
            </div>

            <div className="table-shell">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Session State</th>
                    <th>Remaining Time</th>
                    <th>Current Score</th>
                    <th>Reconnects</th>
                    <th>Risk Index</th>
                    <th>Recorded Events</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExam.sessions.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                        No candidate sessions recorded for this examination.
                      </td>
                    </tr>
                  ) : (
                    selectedExam.sessions.map((session) => (
                      <tr key={session.sessionId}>
                        <td>
                          <strong>{session.studentName}</strong>
                          <small className="row-meta">ID: #{session.studentId}</small>
                        </td>
                        <td>
                          <span className={`session-status ${session.status.toLowerCase()}`}>
                            {session.status}
                          </span>
                          <small className="row-meta">
                            {session.inactive ? "⚠️ Inactive >10m" : "● Heartbeat Live"}
                          </small>
                        </td>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                            {formatTime(session.remainingSeconds)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                            {session.currentScore || 0}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", color: session.disconnectCount >= 2 ? "#F87171" : "inherit" }}>
                            {session.disconnectCount || 0} / 3
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className={riskClass(session.riskScore)}>
                              {session.riskScore || 0}
                            </span>
                            <small className="row-meta">
                              Video: {session.videoRiskCount || 0} · Flags: {session.malpracticeCount || 0}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="event-pills">
                            {Object.entries(session.events || {}).length > 0 ? (
                              Object.entries(session.events).map(([type, count]) => (
                                <span key={type}>
                                  {type.replaceAll("_", " ")}: {count}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "var(--text-dim)" }}>None</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {isAttending(session.status) ? (
                            <div className="action-stack">
                              <button
                                className="action-btn warn"
                                title="Broadcast Warning/Prompt"
                                onClick={() => takeAction(session.sessionId, "WARN")}
                              >
                                !
                              </button>
                              {session.status === "WAITING" ? (
                                <button
                                  className="action-btn resume"
                                  title="Resume Candidate Session"
                                  onClick={() => takeAction(session.sessionId, "NORMAL")}
                                >
                                  ✓
                                </button>
                              ) : (
                                <button
                                  className="action-btn waiting"
                                  title="Move Candidate to Waiting"
                                  onClick={() => takeAction(session.sessionId, "WAITING")}
                                >
                                  W
                                </button>
                              )}
                              <button
                                className="action-btn terminate"
                                title="Force Submit & Terminate"
                                onClick={() => takeAction(session.sessionId, "TERMINATE")}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Closed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
