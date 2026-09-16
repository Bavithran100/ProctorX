import { useEffect, useState } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../AdminMonitoring.css";
import "../../App.css";

export default function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Client.get("/student/results")
      .then((res) => setResults(res.data || []))
      .catch((err) => console.error("Failed to load results", err))
      .finally(() => setLoading(false));
  }, []);

  const totalExams = results.length;
  const passedExams = results.filter((r) => r.score >= (r.totalMarks || 1) / 2).length;
  const totalScore = results.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const totalPossible = results.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0);
  const averagePercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

  return (
    <AppShell
      title="My Examination Results"
      subtitle="Review your submitted assessment scores, evaluation breakdowns, and pass/fail standings."
      activeNav="/results"
    >
      <div className="results-container">
        {/* KPI Score Cards */}
        {results.length > 0 && (
          <div className="monitor-summary-grid">
            <div className="monitor-stat">
              <span>Attempted Exams</span>
              <strong>{totalExams}</strong>
              <small>Submitted evaluations</small>
            </div>
            <div className="monitor-stat">
              <span>Passed Assessments</span>
              <strong style={{ color: "#34D399" }}>{passedExams} / {totalExams}</strong>
              <small>{totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0}% success rate</small>
            </div>
            <div className="monitor-stat">
              <span>Overall Average</span>
              <strong style={{ color: "var(--primary-light)" }}>{averagePercentage}%</strong>
              <small>{totalScore} / {totalPossible} total marks</small>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div className="hero-badge">Loading Performance Records</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Exam Submissions Found</h4>
            <p>You haven't completed any examinations yet. Check Today's Exams to start an active assessment.</p>
          </div>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Assessment Title</th>
                  <th>Awarded Score</th>
                  <th>Percentage</th>
                  <th>Submission Timestamp</th>
                  <th>Evaluation Outcome</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const maxMarks = r.totalMarks || 100;
                  const percent = Math.round(((r.score || 0) / maxMarks) * 100);
                  const isPass = (r.score || 0) >= maxMarks / 2;

                  return (
                    <tr key={i}>
                      <td>
                        <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>
                          {r.examTitle}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                          {r.score} <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>/ {r.totalMarks}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: isPass ? "#34D399" : "#F87171" }}>
                          {percent}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {new Date(r.submittedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      </td>
                      <td>
                        <span className={`status-chip ${isPass ? "approved" : "status-chip fail"}`} style={!isPass ? { background: "var(--danger-bg)", color: "#F87171", borderColor: "var(--danger-border)" } : {}}>
                          {isPass ? "✓ Pass" : "✕ Needs Improvement"}
                        </span>
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
