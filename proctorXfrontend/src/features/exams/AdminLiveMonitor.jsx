import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../AdminMonitoring.css";
import "../../App.css";

const isAttending = (status) => status === "ACTIVE";

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
        // Exclude officially submitted / closed sessions (they belong in Submission History)
        const liveOnly = (res.data || []).filter((s) => s.status !== "SUBMITTED");
        setSessions(liveOnly);
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
        attending: exam.sessions.filter((session) => session.status === "ACTIVE" && !session.inactive).length,
        inactive: exam.sessions.filter((session) => session.inactive || session.status === "TERMINATED" || session.status === "LOCKED").length,
        waiting: exam.sessions.filter((session) => session.status === "WAITING").length,
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
      if (statusFilter === "ATTENDING" && (session.status !== "ACTIVE" || session.inactive)) return false;
      if (statusFilter === "INACTIVE" && !session.inactive && session.status !== "TERMINATED") return false;
      if (statusFilter === "WAITING" && session.status !== "WAITING") return false;
      if (statusFilter === "TERMINATED" && session.status !== "TERMINATED" && session.status !== "LOCKED") return false;

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

  const liveExamCount = exams.length;
  const attendingCount = sessions.filter((session) => session.status === "ACTIVE" && !session.inactive).length;
  const haltedCount = sessions.filter((session) => session.status === "TERMINATED" || session.status === "LOCKED").length;
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
      alert(error.response?.data?.message || error.response?.data || "Coordinator action failed. Please check session status.");
    }
  };

  const handleRevokeSubmission = async (sessionId, candidateName) => {
    if (!window.confirm(`Revoke premature/automatic submission for candidate ${candidateName || ""}? This will restore their session to ACTIVE, clear lockouts, and allow them to re-enter and continue.`)) {
      return;
    }
    try {
      await Client.post(`/admin/actions/${sessionId}/revoke`);
      alert(`Candidate session reopened successfully! ${candidateName || "Candidate"} can now resume their examination.`);
      loadSessions();
    } catch (error) {
      alert(error.response?.data?.message || error.response?.data || "Failed to reopen candidate session.");
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
            <span>Halted / Interrupted</span>
            <strong style={{ color: "#FBBF24" }}>{haltedCount}</strong>
            <small>Pending coordinator review/reopen</small>
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
              <h3>Active Live Examination Rounds</h3>
              <span>{exams.length} rounds with live candidate activity · Refreshed {lastRefreshed.toLocaleTimeString()}</span>
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
              <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Live Exam Sessions</h4>
              <p>No candidates are currently taking exams. When students enter an assessment, live telemetry will appear here.</p>
              <Link to="/admin/exam-history" className="primary-btn" style={{ marginTop: 14, display: "inline-block", fontSize: "0.85rem" }}>
                View Submission History & Gradebook →
              </Link>
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
                    <span style={{ color: "#34D399" }}><b>{exam.attending}</b> live attending</span>
                    <span><b>{exam.inactive}</b> halted/inactive</span>
                  </div>
                  <footer>
                    {exam.videoRisk} AI risk flags
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
                {selectedExam.attending} live attending · {selectedExam.inactive} halted
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
                  <option value="ALL">All Live Candidate Sessions</option>
                  <option value="ATTENDING">🟢 Attending (Heartbeat Active)</option>
                  <option value="INACTIVE">🟡 Inactive / Away (&gt;30s)</option>
                  <option value="WAITING">🟠 Waiting Queue</option>
                  <option value="TERMINATED">🔴 Halted / Reopen Pending</option>
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
                    <th>Actions & Interventions</th>
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
                    filteredSessions.map((session) => {
                      const isSessionInactive = session.inactive;
                      const isLocked = session.status === "LOCKED";
                      const isSubmittedOrEnded = session.status === "SUBMITTED" || session.status === "TERMINATED";

                      return (
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
                            {session.status === "ACTIVE" && isSessionInactive ? (
                              <>
                                <span className="session-status waiting" style={{ borderColor: "rgba(245, 158, 11, 0.4)", color: "#FBBF24" }}>
                                  INACTIVE
                                </span>
                                <small className="row-meta" style={{ color: "#FBBF24" }}>
                                  ⚠️ No Heartbeat (&gt;30s)
                                </small>
                              </>
                            ) : (
                              <>
                                <span className={`session-status ${session.status.toLowerCase()}`}>
                                  {session.status}
                                </span>
                                <small className="row-meta">
                                  {session.status === "ACTIVE" ? "🟢 Heartbeat Live" : session.status === "WAITING" ? "🟠 Queue Hold" : session.status === "LOCKED" ? "🔒 Infraction Lock" : "Completed"}
                                </small>
                              </>
                            )}
                          </td>
                          <td>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                              {isSubmittedOrEnded ? "--:--" : formatTime(session.remainingSeconds)}
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
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              {isAttending(session.status) && (
                                <>
                                  <button
                                    className="action-btn warn"
                                    title="Broadcast Warning/Prompt to Candidate Screen"
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
                                      title="Move Candidate to Waiting Queue"
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
                                </>
                              )}

                              {(isSubmittedOrEnded || isLocked) && (
                                  <button
                                    className="primary-btn"
                                    style={{
                                      fontSize: "0.72rem",
                                      padding: "4px 8px",
                                      background: "rgba(16, 185, 129, 0.15)",
                                      color: "#34D399",
                                      border: "1px solid rgba(16, 185, 129, 0.35)",
                                      borderRadius: "var(--radius-sm)",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3
                                    }}
                                    title="Revoke premature/auto-submission or proctoring halt and restore candidate session to ACTIVE"
                                    onClick={() => handleRevokeSubmission(session.sessionId, session.studentName)}
                                  >
                                    🔄 Reopen
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
