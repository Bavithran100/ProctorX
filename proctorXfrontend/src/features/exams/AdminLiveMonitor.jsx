import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  const [candidateSearch, setCandidateSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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
          coordinatorName: session.coordinatorName,
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

  const filteredSessions = useMemo(() => {
    if (!selectedExam) return [];
    return selectedExam.sessions.filter((session) => {
      if (statusFilter === "ATTENDING" && !isAttending(session.status)) return false;
      if (statusFilter === "WAITING" && session.status !== "WAITING") return false;
      if (statusFilter === "COMPLETED" && !isCompleted(session.status)) return false;

      if (candidateSearch.trim()) {
        const q = candidateSearch.toLowerCase().trim();
        const matchName = session.studentName?.toLowerCase().includes(q);
        const matchEmail = session.studentEmail?.toLowerCase().includes(q);
        const matchUser = session.username?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchUser) return false;
      }

      return true;
    });
  }, [selectedExam, statusFilter, candidateSearch]);

  const liveExamCount = exams.filter((exam) => exam.attending > 0).length;
  const attendingCount = sessions.filter((session) => isAttending(session.status)).length;
  const completedCount = sessions.filter((session) => isCompleted(session.status)).length;
  const flaggedCount = sessions.filter((session) => session.inactive || (session.riskScore || 0) >= 4).length;

  const takeAction = async (sessionId, action) => {
    let remark = "";
    if (action === "WARN") {
      remark = prompt("Enter warning/instruction prompt to broadcast to this candidate's screen:");
      if (!remark) return;
    }
    if (action === "TERMINATE" && !window.confirm("Submit this student's current progress and force-terminate their exam session?")) {
      return;
    }
    try {
      await Client.post(`/admin/actions/${sessionId}`, null, {
        params: { action, remark }
      });
      loadSessions();
    } catch (error) {
      alert(error.response?.data || "Coordinator action failed. Please check session status.");
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
        {/* Real-time KPI Summary Grid */}
        <section className="monitor-summary-grid">
          <div className="monitor-stat">
            <span>Live Rounds</span>
            <strong>{liveExamCount}</strong>
            <small>Authored examinations with active candidates</small>
          </div>
          <div className="monitor-stat">
            <span>Candidates Attending</span>
            <strong style={{ color: "#34D399" }}>{attendingCount}</strong>
            <small>Active heartbeat telemetry</small>
          </div>
          <div className="monitor-stat">
            <span>Completed Submissions</span>
            <strong style={{ color: "var(--primary-light)" }}>{completedCount}</strong>
            <small>Evaluated and recorded</small>
          </div>
          <div className="monitor-stat danger">
            <span>Needs Attention / High Risk</span>
            <strong>{flaggedCount}</strong>
            <small>Elevated risk flags or inactive sessions</small>
          </div>
        </section>

        {/* Exam Selection Strip */}
        <section className="exam-overview-section">
          <div className="section-heading">
            <div>
              <h3>Active Examination Rounds</h3>
              <span>{exams.length} rounds with session history · Refreshed {lastRefreshed.toLocaleTimeString()}</span>
            </div>
            <span className="system-telemetry-badge">
              <span className="telemetry-pulse-dot" /> Auto-Polling 5s
            </span>
          </div>

          {loading ? (
            <div className="card" style={{ padding: 32, textAlign: "center" }}>
              <div className="hero-badge">Loading Live Telemetry</div>
              <div className="skeleton-card" />
            </div>
          ) : exams.length === 0 ? (
            <div className="empty-state">
              <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Active Exam Sessions</h4>
              <p>No candidates are currently attending your examinations. When students start an exam, live telemetry will appear here.</p>
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
                    <span style={{ color: "#34D399" }}><b>{exam.attending}</b> attending</span>
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
          <section className="student-session-section" style={{ marginTop: 24 }}>
            <div className="section-heading" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>{selectedExam.title}</h3>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Candidate Live Telemetry & Control Actions · Coordinator: <strong>{selectedExam.coordinatorName || "Faculty Coordinator"}</strong>
                </span>
              </div>
              <span className="exam-attendance-chip">
                {selectedExam.attending} attending / {selectedExam.completed} completed
              </span>
            </div>

            {/* Candidate Search & Filter Toolbar */}
            <div
              className="card"
              style={{
                padding: "12px 18px",
                marginBottom: 16,
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-surface-1)",
                borderColor: "var(--border-subtle)"
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flex: 1, minWidth: 260 }}>
                <input
                  type="text"
                  placeholder="Search candidate name, email, or username..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.85rem",
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    minWidth: 240,
                    flex: "1 1 200px"
                  }}
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.85rem",
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)"
                  }}
                >
                  <option value="ALL">All Session States</option>
                  <option value="ATTENDING">Attending Only (Active / Waiting)</option>
                  <option value="WAITING">Waiting Queue Only</option>
                  <option value="COMPLETED">Completed Only</option>
                </select>
              </div>

              {(candidateSearch || statusFilter !== "ALL") && (
                <button
                  className="ghost-btn"
                  onClick={() => {
                    setCandidateSearch("");
                    setStatusFilter("ALL");
                  }}
                  style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                >
                  ✕ Reset
                </button>
              )}
            </div>

            <div className="table-shell">
              <table className="monitor-table">
                <thead>
                  <tr>
                    <th>Candidate Details</th>
                    <th>Session State</th>
                    <th>Remaining Time</th>
                    <th>Current Score</th>
                    <th>Reconnects</th>
                    <th>Risk Index</th>
                    <th>Malpractice Events</th>
                    <th>Coordinator Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                        No candidate sessions match the active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session) => (
                      <tr key={session.sessionId}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>
                              {session.studentName}
                            </strong>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                              {session.studentEmail}
                            </span>
                            {session.username && (
                              <Link
                                to={`/u/${session.username}`}
                                target="_blank"
                                style={{ fontSize: "0.75rem", color: "var(--primary-light)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                              >
                                @{session.username} ↗
                              </Link>
                            )}
                            {session.institution && (
                              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                                {session.institution} {session.department ? `• ${session.department}` : ""}
                              </span>
                            )}
                          </div>
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
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
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
                                <span key={type} className={type.includes("BLUR") || type.includes("TAB") ? "event-blur" : ""}>
                                  {type.replaceAll("_", " ")}: {count}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>None</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {isAttending(session.status) ? (
                            <div className="action-stack">
                              <button
                                className="action-btn warn"
                                title="Broadcast Warning/Prompt to Candidate"
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
                                  title="Move Candidate to Waiting List"
                                  onClick={() => takeAction(session.sessionId, "WAITING")}
                                >
                                  W
                                </button>
                              )}
                              <button
                                className="action-btn terminate"
                                title="Force Submit & Terminate Candidate Attempt"
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
