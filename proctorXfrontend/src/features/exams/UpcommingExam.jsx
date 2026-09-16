import { useEffect, useState } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function UpcomingExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Client.get("/student/exams/upcoming")
      .then((res) => setExams(res.data || []))
      .catch((err) => console.error("Failed to load upcoming exams", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell
      title="Upcoming Examination Timetable"
      subtitle="Preview scheduled assessment dates and prepare for future test windows."
      activeNav="/exams/upcoming"
    >
      <div className="exam-container">
        {/* Info Banner */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-surface-2), rgba(6, 182, 212, 0.06))" }}>
          <div className="hero-badge" style={{ color: "var(--cyan)", borderColor: "rgba(6, 182, 212, 0.3)" }}>
            Assessment Schedule
          </div>
          <h3 style={{ fontSize: "1.2rem", margin: "4px 0 8px" }}>Future Exam Schedule</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            These examinations are confirmed by your coordinators. On the scheduled date, entry links will activate automatically under Today's Exams.
          </p>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div className="hero-badge">Loading Schedule</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Upcoming Examinations Scheduled</h4>
            <p>You have no pending examinations on your schedule at this time.</p>
          </div>
        ) : (
          <div className="section-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
            {exams.map((exam) => (
              <div key={exam.id} className="card exam-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span className="status-chip pending">
                      Upcoming
                    </span>
                    <span className="status-chip" style={{ background: "var(--bg-surface-1)", color: "var(--cyan)" }}>
                      {exam.examType === "CODING" ? "💻 Coding IDE" : "📝 MCQ Test"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.2rem", marginBottom: 8, color: "var(--text-primary)" }}>
                    {exam.title}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                    {exam.description || "Scheduled institutional assessment."}
                  </p>

                  <div className="meta-grid">
                    <div className="meta-item">
                      <span>Duration</span>
                      <strong>{exam.duration} mins</strong>
                    </div>
                    <div className="meta-item">
                      <span>Starts At</span>
                      <strong style={{ fontSize: "0.78rem" }}>
                        {new Date(exam.startTime).toLocaleDateString([], { month: "short", day: "numeric" })},{" "}
                        {new Date(exam.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </strong>
                    </div>
                    <div className="meta-item" style={{ gridColumn: "span 2" }}>
                      <span>Closing Window</span>
                      <strong style={{ fontSize: "0.78rem" }}>
                        {new Date(exam.endTime.endsWith("Z") ? exam.endTime : exam.endTime + "Z").toLocaleDateString([], { month: "short", day: "numeric" })},{" "}
                        {new Date(exam.endTime.endsWith("Z") ? exam.endTime : exam.endTime + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="card-footer" style={{ borderTop: "none", paddingTop: 8 }}>
                  <button className="secondary-btn" style={{ width: "100%" }} disabled>
                    Scheduled · Opens on Date
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
