import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../AdminMonitoring.css";
import "../../App.css";

export default function Results() {
  const [data, setData] = useState({ student: null, results: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterOutcome, setFilterOutcome] = useState("ALL");

  const navigate = useNavigate();

  useEffect(() => {
    Client.get("/student/results")
      .then((res) => {
        if (Array.isArray(res.data)) {
          // Legacy array fallback
          const raw = res.data;
          const totalExams = raw.length;
          const passedExams = raw.filter((r) => (r.score || 0) >= (r.totalMarks || 1) / 2).length;
          const totalScore = raw.reduce((acc, curr) => acc + (curr.score || 0), 0);
          const totalPossible = raw.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0);
          const averagePercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

          setData({
            student: null,
            results: raw,
            stats: { totalExams, passedExams, totalScore, totalPossible, averagePercentage }
          });
        } else if (res.data) {
          setData({
            student: res.data.student || null,
            results: res.data.results || [],
            stats: res.data.stats || null
          });
        }
      })
      .catch((err) => console.error("Failed to load results", err))
      .finally(() => setLoading(false));
  }, []);

  const results = data.results || [];
  const student = data.student;

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (filterType !== "ALL" && r.examType !== filterType) return false;

      const isPass = r.isPass ?? (r.score || 0) >= (r.totalMarks || 1) / 2;
      if (filterOutcome === "PASS" && !isPass) return false;
      if (filterOutcome === "FAIL" && isPass) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (r.examTitle || r.title || "").toLowerCase().includes(q);
        const matchCoord = (r.coordinatorName || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCoord) return false;
      }

      return true;
    });
  }, [results, filterType, filterOutcome, searchQuery]);

  const totalExams = data.stats?.totalExams ?? results.length;
  const passedExams = data.stats?.passedExams ?? results.filter((r) => (r.score || 0) >= (r.totalMarks || 1) / 2).length;
  const totalScore = data.stats?.totalScore ?? results.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const totalPossible = data.stats?.totalPossible ?? results.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0);
  const averagePercentage = data.stats?.averagePercentage ?? (totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0);

  return (
    <AppShell
      title="Candidate Assessment Transcript"
      subtitle="Comprehensive record of completed examinations, performance analytics, and evaluated scores."
      activeNav="/results"
    >
      <div className="results-container" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Candidate Identity Profile Header */}
        {student && (
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, var(--bg-surface-2), rgba(99, 102, 241, 0.06))",
              borderColor: "var(--border-medium)",
              padding: "24px 28px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "var(--primary-glow)",
                    border: "2px solid var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "var(--primary-light)"
                  }}
                >
                  {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: "1.4rem", margin: 0, color: "var(--text-primary)" }}>
                      {student.name || "Student Candidate"}
                    </h2>
                    {student.username && (
                      <span className="status-chip" style={{ background: "var(--bg-surface-1)", color: "var(--primary-light)", fontSize: "0.75rem" }}>
                        @{student.username}
                      </span>
                    )}
                    <span className="status-chip approved" style={{ fontSize: "0.75rem" }}>
                      ✓ Verified Candidate
                    </span>
                  </div>

                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {student.institution ? `${student.institution}` : "Verified Institution"}
                    {student.department ? ` • ${student.department}` : ""}
                    {student.designation ? ` (${student.designation})` : ""}
                  </p>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {student.email}
                  </span>
                </div>
              </div>

              {student.username && (
                <Link
                  to={`/u/${student.username}`}
                  className="secondary-btn"
                  style={{ fontSize: "0.82rem", padding: "8px 14px", textDecoration: "none" }}
                  target="_blank"
                >
                  View Public Portfolio ↗
                </Link>
              )}
            </div>
          </div>
        )}

        {/* KPI Score Cards */}
        {results.length > 0 && (
          <div className="monitor-summary-grid">
            <div className="monitor-stat">
              <span>Attempted Evaluations</span>
              <strong>{totalExams}</strong>
              <small>Concluded exams</small>
            </div>
            <div className="monitor-stat">
              <span>Passed Assessments</span>
              <strong style={{ color: "#34D399" }}>{passedExams} / {totalExams}</strong>
              <small>{totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0}% clearance rate</small>
            </div>
            <div className="monitor-stat">
              <span>Cumulative Average</span>
              <strong style={{ color: "var(--primary-light)" }}>{averagePercentage}%</strong>
              <small>{totalScore} / {totalPossible} total marks</small>
            </div>
            <div className="monitor-stat">
              <span>Performance Standing</span>
              <strong style={{ color: averagePercentage >= 50 ? "#34D399" : "#FBBF24" }}>
                {averagePercentage >= 75 ? "Distinction" : averagePercentage >= 50 ? "Satisfactory" : "Needs Review"}
              </strong>
              <small>Proctored evaluation</small>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        {results.length > 0 && (
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
                placeholder="Filter by exam title or coordinator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.85rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  minWidth: 220,
                  flex: "1 1 200px"
                }}
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
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
                <option value="MCQ">📝 Multiple Choice</option>
                <option value="CODING">💻 Coding IDE</option>
              </select>

              <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.85rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)"
                }}
              >
                <option value="ALL">All Outcomes</option>
                <option value="PASS">✓ Passed Only</option>
                <option value="FAIL">✕ Needs Improvement</option>
              </select>
            </div>

            {(searchQuery || filterType !== "ALL" || filterOutcome !== "ALL") && (
              <button
                className="ghost-btn"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("ALL");
                  setFilterOutcome("ALL");
                }}
                style={{ fontSize: "0.8rem", padding: "4px 10px" }}
              >
                ✕ Reset Filters
              </button>
            )}
          </div>
        )}

        {/* Content View */}
        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div className="hero-badge">Loading Performance Records</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Exam Submissions Found</h4>
            <p>You haven't completed any examinations yet. Check Live Exams to participate in an assessment.</p>
            <button
              className="primary-btn"
              style={{ marginTop: 16 }}
              onClick={() => navigate("/exams/today")}
            >
              Explore Live Examinations →
            </button>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="empty-state">
            <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Matching Records</h4>
            <p>No assessment submissions match your active filter criteria.</p>
          </div>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Assessment Details</th>
                  <th>Faculty Coordinator</th>
                  <th>Awarded Score</th>
                  <th>Percentage</th>
                  <th>Submission Timestamp</th>
                  <th>Outcome</th>
                  <th>Simulation</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((r, i) => {
                  const maxMarks = r.totalMarks || 100;
                  const percent = r.percentage ?? Math.round(((r.score || 0) / maxMarks) * 100);
                  const isPass = r.isPass ?? (r.score || 0) >= maxMarks / 2;
                  const title = r.examTitle || r.title || "Assessment";
                  const examType = r.examType || "MCQ";
                  const coordinator = r.coordinatorName || "Faculty Coordinator";

                  return (
                    <tr key={r.submissionId || i}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>
                            {title}
                          </strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--cyan)" }}>
                            {examType === "CODING" ? "💻 Coding IDE Assessment" : "📝 Multiple Choice Exam"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          👤 {coordinator}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                          {r.score} <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>/ {maxMarks}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.88rem", fontWeight: 600, color: isPass ? "#34D399" : "#F87171" }}>
                          {percent}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {r.submittedAt
                            ? new Date(r.submittedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                            : "Recorded"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-chip ${isPass ? "approved" : "status-chip fail"}`} style={!isPass ? { background: "var(--danger-bg)", color: "#F87171", borderColor: "var(--danger-border)" } : {}}>
                          {isPass ? "✓ Pass" : "✕ Needs Improvement"}
                        </span>
                      </td>
                      <td>
                        {r.examId && (
                          <button
                            className="secondary-btn"
                            style={{ fontSize: "0.75rem", padding: "4px 10px", borderColor: "rgba(99, 102, 241, 0.4)", color: "var(--primary-light)" }}
                            onClick={() => navigate(`/exam/${r.examId}/security?virtual=true`)}
                            title="Re-attempt this exam in practice simulation mode without changing official score"
                          >
                            Virtual Contest 🚀
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
