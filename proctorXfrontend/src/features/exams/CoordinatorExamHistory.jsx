import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../AdminMonitoring.css";
import "../../App.css";

const formatDateTime = (dateVal) => {
  if (!dateVal) return "TBD";
  try {
    const str = String(dateVal);
    const date = new Date(str.endsWith("Z") ? str : str + "Z");
    return isNaN(date.getTime()) ? str : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(dateVal);
  }
};

export default function CoordinatorExamHistory() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadExamHistory = () => {
    Client.get("/admin/monitor/exam-history")
      .then((res) => {
        setExams(res.data || []);
        if (res.data && res.data.length > 0 && !expandedExamId) {
          setExpandedExamId(res.data[0].examId);
        }
      })
      .catch((err) => console.error("Failed to load exam history", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExamHistory();
  }, []);

  const handleResetAttempt = async (sub, examId) => {
    if (!sub) return;
    const candidateName = sub.studentName || sub.username || "Candidate";
    if (!window.confirm(`Completely reset exam attempt for candidate ${candidateName}? This will grant a fresh countdown timer starting now with full duration, wipe previous recorded answers, and permit a fresh retake.`)) {
      return;
    }
    try {
      if (sub.sessionId) {
        await Client.post(`/admin/actions/${sub.sessionId}/reset`);
      } else if (examId && sub.studentId) {
        await Client.post(`/admin/actions/exam/${examId}/student/${sub.studentId}/reset`);
      } else {
        alert("Unable to identify candidate record for reset.");
        return;
      }
      alert(`Candidate exam attempt reset successfully with fresh full duration! ${candidateName} can start anew.`);
      loadExamHistory();
    } catch (error) {
      alert(error.response?.data?.message || error.response?.data || "Failed to reset exam attempt.");
    }
  };

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if (typeFilter !== "ALL" && exam.examType !== typeFilter) return false;
      if (statusFilter !== "ALL" && exam.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = exam.title?.toLowerCase().includes(q);
        const matchDesc = exam.description?.toLowerCase().includes(q);
        const matchAttendee = exam.submissions?.some((s) =>
          s.studentName?.toLowerCase().includes(q) ||
          s.studentEmail?.toLowerCase().includes(q) ||
          s.username?.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchDesc && !matchAttendee) return false;
      }

      return true;
    });
  }, [exams, typeFilter, statusFilter, searchQuery]);

  // Overall KPI statistics
  const totalExamsCreated = exams.length;
  const totalSubmissions = exams.reduce((sum, e) => sum + (e.totalAttended || 0), 0);
  const allSubmissions = exams.flatMap((e) => e.submissions || []);
  const totalPassed = allSubmissions.filter((s) => s.isPass).length;
  const overallPassRate = allSubmissions.length > 0 ? Math.round((totalPassed / allSubmissions.length) * 100) : 0;

  function toggleExpand(examId) {
    setExpandedExamId((prev) => (prev === examId ? null : examId));
  }

  return (
    <AppShell
      title="Examination History & Candidate Submissions"
      subtitle="Inspect authored assessment rounds, verify attended candidates, review scores, and visit candidate portfolios."
      activeNav="/admin/exam-history"
    >
      <div className="admin-container" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* KPI Performance Summary */}
        <div className="monitor-summary-grid">
          <div className="monitor-stat">
            <span>Authored Examinations</span>
            <strong>{totalExamsCreated}</strong>
            <small>Configured assessment rounds</small>
          </div>
          <div className="monitor-stat">
            <span>Total Attending Candidates</span>
            <strong style={{ color: "var(--primary-light)" }}>{totalSubmissions}</strong>
            <small>Evaluated student submissions</small>
          </div>
          <div className="monitor-stat">
            <span>Candidate Pass Rate</span>
            <strong style={{ color: "#34D399" }}>{overallPassRate}%</strong>
            <small>{totalPassed} of {allSubmissions.length} candidates cleared</small>
          </div>
          <div className="monitor-stat">
            <span>Platform Standing</span>
            <strong style={{ color: "var(--cyan)" }}>Active</strong>
            <small>Gradebook records verified</small>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div
          className="card"
          style={{
            padding: "14px 18px",
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
              placeholder="Search exam title, description, or student candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "6px 12px",
                fontSize: "0.85rem",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-medium)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                minWidth: 260,
                flex: "1 1 220px"
              }}
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                fontSize: "0.85rem",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-medium)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)"
              }}
            >
              <option value="ALL">All Formats</option>
              <option value="MCQ">📝 MCQ Test</option>
              <option value="CODING">💻 Coding IDE</option>
            </select>

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
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published Only</option>
              <option value="DRAFT">Draft Only</option>
            </select>
          </div>

          {(searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              className="ghost-btn"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("ALL");
                setStatusFilter("ALL");
              }}
              style={{ fontSize: "0.8rem", padding: "4px 10px" }}
            >
              ✕ Reset Filters
            </button>
          )}
        </div>

        {/* Content List */}
        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div className="hero-badge">Loading Examination History</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="empty-state">
            <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Examinations Found</h4>
            <p>You haven't authored any examinations matching your active filters.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {filteredExams.map((exam) => {
              const isExpanded = expandedExamId === exam.examId;
              const submissions = exam.submissions || [];

              return (
                <div
                  key={exam.examId}
                  className="card"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    borderLeft: `4px solid ${exam.examType === "CODING" ? "var(--cyan)" : "var(--primary)"}`
                  }}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleExpand(exam.examId)}
                    style={{
                      padding: "20px 24px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 16,
                      background: isExpanded ? "var(--bg-surface-2)" : "var(--bg-surface-1)",
                      transition: "background 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 280 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className="status-chip" style={{ background: "var(--bg-surface-3)", color: "var(--cyan)", fontSize: "0.75rem" }}>
                          {exam.examType === "CODING" ? "💻 Coding IDE" : "📝 MCQ Test"}
                        </span>
                        <span className={`status-chip ${exam.status === "PUBLISHED" ? "approved" : "pending"}`} style={{ fontSize: "0.75rem" }}>
                          {exam.status}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          ID: #{exam.examId}
                        </span>
                      </div>

                      <h3 style={{ fontSize: "1.2rem", margin: "2px 0", color: "var(--text-primary)" }}>
                        {exam.title}
                      </h3>

                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                        {exam.description || "Institutional assessment round."}
                      </p>
                    </div>

                    {/* Quick Metadata Stats */}
                    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                          Candidates
                        </span>
                        <strong style={{ fontSize: "1.1rem", color: "var(--primary-light)" }}>
                          {exam.totalAttended}
                        </strong>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                          Average Score
                        </span>
                        <strong style={{ fontSize: "1.1rem", color: "#34D399" }}>
                          {exam.averageScore} / {exam.totalMarks}
                        </strong>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                          Duration
                        </span>
                        <strong style={{ fontSize: "1rem" }}>
                          {exam.duration}m
                        </strong>
                      </div>

                      <button
                        className="ghost-btn"
                        style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(exam.examId);
                        }}
                      >
                        {isExpanded ? "▲ Hide Submissions" : "▼ View Candidate Results"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Submissions Table */}
                  {isExpanded && (
                    <div style={{ padding: "0 24px 24px", borderTop: "1px solid var(--border-medium)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 12px" }}>
                        <h4 style={{ fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>
                          Student Candidate Submissions & Gradebook ({submissions.length} Total)
                        </h4>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          Window: {formatDateTime(exam.startTime)} – {formatDateTime(exam.endTime)}
                        </span>
                      </div>

                      {submissions.length === 0 ? (
                        <div className="card" style={{ padding: 24, textAlign: "center", background: "var(--bg-surface-2)" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                            No candidates have submitted this examination yet.
                          </span>
                        </div>
                      ) : (
                        <div className="table-shell">
                          <table>
                            <thead>
                              <tr>
                                <th>Candidate Details</th>
                                <th>Institution & Dept</th>
                                <th>Status</th>
                                <th>Awarded Score</th>
                                <th>Percentage</th>
                                <th>Timestamp</th>
                                <th>Outcome</th>
                                <th>Public Portfolio</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {submissions.map((sub, idx) => (
                                <tr key={sub.submissionId || sub.sessionId || sub.studentId || idx}>
                                  <td>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                      <strong style={{ color: "var(--text-primary)", fontSize: "0.92rem" }}>
                                        {sub.studentName}
                                      </strong>
                                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                        {sub.studentEmail}
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                                      {sub.institution ? `${sub.institution}` : "Verified Student"}
                                      {sub.department ? ` • ${sub.department}` : ""}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      className="status-chip"
                                      style={{
                                        fontSize: "0.72rem",
                                        background: sub.status === "SUBMITTED" ? "rgba(16, 185, 129, 0.15)" : sub.status === "ACTIVE" ? "rgba(6, 182, 212, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                        color: sub.status === "SUBMITTED" ? "#34D399" : sub.status === "ACTIVE" ? "#38BDF8" : "#FBBF24"
                                      }}
                                    >
                                      {sub.status || "SUBMITTED"}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.92rem" }}>
                                      {sub.score} <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>/ {sub.totalMarks}</span>
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: sub.isPass ? "#34D399" : "#F87171" }}>
                                      {sub.percentage}%
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                      {formatDateTime(sub.submittedAt)}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`status-chip ${sub.isPass ? "approved" : "status-chip fail"}`} style={!sub.isPass ? { background: "var(--danger-bg)", color: "#F87171", borderColor: "var(--danger-border)" } : {}}>
                                      {sub.isPass ? "✓ Pass" : "✕ Needs Review"}
                                    </span>
                                  </td>
                                  <td>
                                    {sub.username ? (
                                      <Link
                                        to={`/u/${sub.username}`}
                                        target="_blank"
                                        className="secondary-btn"
                                        style={{ fontSize: "0.75rem", padding: "4px 10px", textDecoration: "none" }}
                                      >
                                        @{sub.username} ↗
                                      </Link>
                                    ) : (
                                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Private</span>
                                    )}
                                  </td>
                                  <td>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                      <button
                                        className="ghost-btn"
                                        style={{
                                          fontSize: "0.72rem",
                                          padding: "4px 8px",
                                          color: "var(--cyan)",
                                          borderColor: "rgba(6, 182, 212, 0.35)",
                                          borderRadius: "var(--radius-sm)",
                                          cursor: "pointer",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3
                                        }}
                                        title="Reset candidate attempt with fresh full countdown timer"
                                        onClick={() => handleResetAttempt(sub, exam.examId)}
                                      >
                                        ⏱️ Reset Attempt
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
