import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function TodayExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Client.get("/student/exams/today")
      .then((res) => {
        setExams(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load today's exams", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const now = new Date();

  function getButtonState(exam) {
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime.endsWith("Z") ? exam.endTime : exam.endTime + "Z");

    if (now < start) {
      return { text: "Not Started Yet", disabled: true, statusClass: "pending", statusText: "Scheduled Today" };
    }
    if (now > end) {
      return { text: "Window Closed", disabled: true, statusClass: "fail", statusText: "Concluded" };
    }

    return { text: "Enter Exam Security Check →", disabled: false, statusClass: "approved", statusText: "Active Now" };
  }

  return (
    <AppShell
      title="Today's Active Examinations"
      subtitle="Join assessments scheduled for today. Verify camera readiness before launching the attempt."
      activeNav="/exams/today"
    >
      <div className="exam-container">
        {/* Info Banner */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-surface-2), rgba(99, 102, 241, 0.08))", borderColor: "var(--border-medium)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="hero-badge">
                <span className="badge-dot" /> Live Examination Window
              </div>
              <h3 style={{ fontSize: "1.2rem", margin: "4px 0" }}>Candidate Exam Portal</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Only enter when you are in a quiet, well-lit environment. The AI proctor requires camera & fullscreen verification.
              </p>
            </div>
            <span className="status-chip approved">
              Active Date: {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div className="hero-badge">Loading Assessments</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Active Exams Today</h4>
            <p>You have no examinations scheduled for today. Check your upcoming schedule below.</p>
            <button
              className="ghost-btn"
              style={{ marginTop: 16 }}
              onClick={() => navigate("/exams/upcoming")}
            >
              View Upcoming Schedule →
            </button>
          </div>
        ) : (
          <div className="section-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
            {exams.map((exam) => {
              const btn = getButtonState(exam);
              return (
                <div key={exam.id} className="card exam-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <span className={`status-chip ${btn.statusClass}`}>
                        {btn.statusText}
                      </span>
                      <span className="status-chip" style={{ background: "var(--bg-surface-1)", color: "var(--cyan)" }}>
                        {exam.examType === "CODING" ? "💻 Coding IDE" : "📝 MCQ Test"}
                      </span>
                    </div>

                    <h3 style={{ fontSize: "1.2rem", marginBottom: 8, color: "var(--text-primary)" }}>
                      {exam.title}
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                      {exam.description || "Comprehensive timed evaluation with automated proctoring."}
                    </p>

                    <div className="meta-grid">
                      <div className="meta-item">
                        <span>Duration</span>
                        <strong>{exam.duration} mins</strong>
                      </div>
                      <div className="meta-item">
                        <span>Total Marks</span>
                        <strong>{exam.totalMarks || "N/A"}</strong>
                      </div>
                      <div className="meta-item" style={{ gridColumn: "span 2" }}>
                        <span>Entry Window</span>
                        <strong style={{ fontSize: "0.78rem" }}>
                          {new Date(exam.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(exam.endTime.endsWith("Z") ? exam.endTime : exam.endTime + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer" style={{ borderTop: "none", paddingTop: 8 }}>
                    <button
                      className={btn.disabled ? "secondary-btn" : "primary-btn"}
                      style={{ width: "100%" }}
                      disabled={btn.disabled}
                      onClick={() => navigate(`/exam/${exam.id}/security`)}
                    >
                      {btn.text}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
