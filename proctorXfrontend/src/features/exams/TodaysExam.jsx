import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Client, { formatApiError } from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function TodayExams() {
  const [activeTab, setActiveTab] = useState("live"); // "live", "attended", "missed"
  const [liveExams, setLiveExams] = useState([]);
  const [attendedExams, setAttendedExams] = useState([]);
  const [missedExams, setMissedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  // Filters
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterSearch, setFilterSearch] = useState("");

  const approved = useSelector((state) => state.auth.approved);
  const navigate = useNavigate();

  // Load all 3 streams on mount & when filters change
  useEffect(() => {
    if (approved === false) {
      setIsLocked(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    // Live exams with query params
    const liveParams = {};
    if (filterDate) liveParams.date = filterDate;
    if (filterType !== "ALL") liveParams.type = filterType;
    if (filterSearch.trim()) liveParams.search = filterSearch.trim();

    Promise.allSettled([
      Client.get("/student/exams/live", { params: liveParams }),
      Client.get("/student/exams/attended"),
      Client.get("/student/exams/missed")
    ])
      .then(([liveRes, attendedRes, missedRes]) => {
        if (liveRes.status === "fulfilled") {
          setLiveExams(liveRes.value.data || []);
        } else if (liveRes.reason?.response?.status === 403) {
          setIsLocked(true);
        }
        if (attendedRes.status === "fulfilled") {
          setAttendedExams(attendedRes.value.data || []);
        }
        if (missedRes.status === "fulfilled") {
          setMissedExams(missedRes.value.data || []);
        }
      })
      .catch((err) => {
        const msg = formatApiError(err);
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [approved, filterDate, filterType, filterSearch]);

  // Client-side filtering for Attended & Missed exams
  const filteredAttended = useMemo(() => {
    return attendedExams.filter((exam) => {
      if (filterType !== "ALL" && exam.examType !== filterType) return false;
      if (filterDate) {
        try {
          const examDate = new Date(exam.startTime).toISOString().split("T")[0];
          if (examDate !== filterDate) return false;
        } catch {}
      }
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase().trim();
        const matchTitle = exam.title?.toLowerCase().includes(q);
        const matchCoord = exam.coordinatorName?.toLowerCase().includes(q);
        const matchDesc = exam.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchCoord && !matchDesc) return false;
      }
      return true;
    });
  }, [attendedExams, filterType, filterDate, filterSearch]);

  const filteredMissed = useMemo(() => {
    return missedExams.filter((exam) => {
      if (filterType !== "ALL" && exam.examType !== filterType) return false;
      if (filterDate) {
        try {
          const examDate = new Date(exam.startTime).toISOString().split("T")[0];
          if (examDate !== filterDate) return false;
        } catch {}
      }
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase().trim();
        const matchTitle = exam.title?.toLowerCase().includes(q);
        const matchCoord = exam.coordinatorName?.toLowerCase().includes(q);
        const matchDesc = exam.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchCoord && !matchDesc) return false;
      }
      return true;
    });
  }, [missedExams, filterType, filterDate, filterSearch]);

  const now = new Date();

  function formatAllowedWindow(startStr, endStr) {
    if (!startStr || !endStr) return "Schedule details unavailable";
    const start = new Date(startStr);
    const end = new Date(endStr.endsWith("Z") ? endStr : endStr + "Z");
    const dateFormatted = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const startTime = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endTime = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${dateFormatted} • ${startTime} – ${endTime}`;
  }

  function getLiveButtonState(exam) {
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime.endsWith("Z") ? exam.endTime : exam.endTime + "Z");

    if (now < start) {
      return {
        text: "Opens at " + start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        disabled: true,
        statusClass: "pending",
        statusText: "Scheduled Today"
      };
    }
    if (now > end) {
      return {
        text: "Window Closed",
        disabled: true,
        statusClass: "fail",
        statusText: "Concluded"
      };
    }

    return {
      text: "Enter Exam Security Check →",
      disabled: false,
      statusClass: "approved",
      statusText: "Active Window"
    };
  }

  const hasActiveFilters = filterDate !== "" || filterType !== "ALL" || filterSearch !== "";

  const clearFilters = () => {
    setFilterDate("");
    setFilterType("ALL");
    setFilterSearch("");
  };

  return (
    <AppShell
      title="Live & Past Examinations"
      subtitle="Participate in live assessments or sharpen your skills with proctored Virtual Contests on past exams."
      activeNav="/exams/today"
    >
      <div className="exam-container">
        {/* Banner */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, var(--bg-surface-2), rgba(99, 102, 241, 0.08))",
            borderColor: "var(--border-medium)",
            marginBottom: 24
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div className="hero-badge">
                <span className="badge-dot" /> Examination Hub
              </div>
              <h3 style={{ fontSize: "1.25rem", margin: "6px 0 4px" }}>Candidate Assessment & Simulation Center</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, maxWidth: 650 }}>
                Take active official examinations, or practice past and missed assessments via <strong>Virtual Contests</strong> with authentic timer and on-device AI proctoring.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="status-chip approved">
                Today: {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: 8,
            borderBottom: "1px solid var(--border-medium)",
            paddingBottom: 12,
            marginBottom: 20,
            overflowX: "auto"
          }}
        >
          <button
            onClick={() => setActiveTab("live")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              border: activeTab === "live" ? "1px solid var(--primary)" : "1px solid transparent",
              background: activeTab === "live" ? "rgba(99, 102, 241, 0.15)" : "var(--bg-surface-1)",
              color: activeTab === "live" ? "var(--primary-light)" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <span>⚡ Live Active Exams</span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 7px",
                borderRadius: "var(--radius-pill)",
                background: activeTab === "live" ? "var(--primary)" : "var(--bg-surface-2)",
                color: "#FFF"
              }}
            >
              {liveExams.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("attended")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              border: activeTab === "attended" ? "1px solid #34D399" : "1px solid transparent",
              background: activeTab === "attended" ? "rgba(52, 211, 153, 0.12)" : "var(--bg-surface-1)",
              color: activeTab === "attended" ? "#34D399" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <span>🎯 Attended Exams</span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 7px",
                borderRadius: "var(--radius-pill)",
                background: activeTab === "attended" ? "#10B981" : "var(--bg-surface-2)",
                color: "#FFF"
              }}
            >
              {attendedExams.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("missed")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              border: activeTab === "missed" ? "1px solid #F87171" : "1px solid transparent",
              background: activeTab === "missed" ? "rgba(248, 113, 113, 0.12)" : "var(--bg-surface-1)",
              color: activeTab === "missed" ? "#F87171" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <span>⏳ Missed Exams</span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 7px",
                borderRadius: "var(--radius-pill)",
                background: activeTab === "missed" ? "#EF4444" : "var(--bg-surface-2)",
                color: "#FFF"
              }}
            >
              {missedExams.length}
            </span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div
          className="card"
          style={{
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface-1)",
            borderColor: "var(--border-subtle)"
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", flex: 1, minWidth: 280 }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <input
                type="text"
                placeholder="Search by title, coordinator, keywords..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  fontSize: "0.85rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)"
                }}
              />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                🔍
              </span>
            </div>

            {/* Type Selector */}
            <div style={{ minWidth: 150 }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "0.85rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)"
                }}
              >
                <option value="ALL">All Assessment Types</option>
                <option value="MCQ">📝 Multiple Choice (MCQ)</option>
                <option value="CODING">💻 Coding IDE</option>
              </select>
            </div>

            {/* Date Selector */}
            <div style={{ minWidth: 160 }}>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                title="Filter by exam date"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "0.85rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)"
                }}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              className="ghost-btn"
              onClick={clearFilters}
              style={{ fontSize: "0.82rem", padding: "6px 12px" }}
            >
              ✕ Reset Filters
            </button>
          )}
        </div>

        {/* Locked State if Account Unapproved */}
        {isLocked ? (
          <div className="card" style={{ padding: "48px 32px", textAlign: "center", maxWidth: 640, margin: "32px auto" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔒</div>
            <div className="hero-badge" style={{ color: "#FBBF24", borderColor: "rgba(245, 158, 11, 0.3)", marginBottom: 16 }}>
              Verification Required
            </div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: 10 }}>Examination Access Locked</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
              Your student account is currently awaiting verification by an administrator or institution coordinator. Active assessment entry is restricted until your profile is approved.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="primary-btn" onClick={() => navigate("/profile")}>
                Complete Profile Details →
              </button>
              <button className="ghost-btn" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div className="hero-badge">Loading Assessments</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : (
          <>
            {/* 1. LIVE ACTIVE EXAMS TAB */}
            {activeTab === "live" && (
              <>
                {liveExams.length === 0 ? (
                  <div className="empty-state">
                    <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Live Active Examinations</h4>
                    <p>There are no live exams matching your filters at this moment.</p>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
                      {hasActiveFilters && (
                        <button className="ghost-btn" onClick={clearFilters}>
                          Clear Filter Parameters
                        </button>
                      )}
                      <button className="secondary-btn" onClick={() => navigate("/exams/upcoming")}>
                        View Upcoming Schedule →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="section-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
                    {liveExams.map((exam) => {
                      const btn = getLiveButtonState(exam);
                      const coordinator = exam.coordinatorName || "Faculty Coordinator";

                      return (
                        <div
                          key={exam.id}
                          className="card exam-card"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            borderLeft: "4px solid var(--primary)"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                              <span className={`status-chip ${btn.statusClass}`}>
                                <span className="badge-dot" /> {btn.statusText}
                              </span>
                              <span className="status-chip" style={{ background: "var(--bg-surface-1)", color: "var(--cyan)" }}>
                                {exam.examType === "CODING" ? "💻 Coding IDE" : "📝 MCQ Test"}
                              </span>
                            </div>

                            <h3 style={{ fontSize: "1.2rem", marginBottom: 8, color: "var(--text-primary)" }}>
                              {exam.title}
                            </h3>

                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 14, minHeight: 38 }}>
                              {exam.description || "Comprehensive proctored assessment with automated scoring."}
                            </p>

                            {/* Coordinator Attribution */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                background: "var(--bg-surface-2)",
                                borderRadius: "var(--radius-sm)",
                                marginBottom: 14,
                                border: "1px solid var(--border-subtle)",
                                fontSize: "0.82rem"
                              }}
                            >
                              <span style={{ fontSize: "1rem" }}>👤</span>
                              <span style={{ color: "var(--text-secondary)" }}>
                                Coordinator: <strong style={{ color: "var(--text-primary)" }}>{coordinator}</strong>
                              </span>
                            </div>

                            <div className="meta-grid" style={{ marginBottom: 14 }}>
                              <div className="meta-item">
                                <span>Duration</span>
                                <strong>{exam.duration} mins</strong>
                              </div>
                              <div className="meta-item">
                                <span>Total Marks</span>
                                <strong>{exam.totalMarks || 100} Marks</strong>
                              </div>
                              <div className="meta-item" style={{ gridColumn: "span 2" }}>
                                <span>Allowed Entry Window</span>
                                <strong style={{ fontSize: "0.78rem", color: "var(--primary-light)" }}>
                                  {formatAllowedWindow(exam.startTime, exam.endTime)}
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
              </>
            )}

            {/* 2. ATTENDED EXAMS TAB */}
            {activeTab === "attended" && (
              <>
                {filteredAttended.length === 0 ? (
                  <div className="empty-state">
                    <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Attended Examinations</h4>
                    <p>You haven't completed any assessments matching the current filter.</p>
                  </div>
                ) : (
                  <div className="section-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
                    {filteredAttended.map((exam) => {
                      const coordinator = exam.coordinatorName || "Faculty Coordinator";
                      const isPass = exam.isPass ?? exam.score >= (exam.totalMarks / 2);

                      return (
                        <div
                          key={exam.submissionId || exam.examId}
                          className="card exam-card"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            borderLeft: "4px solid #34D399"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                              <span className="status-chip approved">
                                ✓ Official Score: {exam.score} / {exam.totalMarks} ({exam.percentage}%)
                              </span>
                              <span className="status-chip" style={{ background: "var(--bg-surface-1)", color: "var(--cyan)" }}>
                                {exam.examType === "CODING" ? "💻 Coding IDE" : "📝 MCQ Test"}
                              </span>
                            </div>

                            <h3 style={{ fontSize: "1.2rem", marginBottom: 8, color: "var(--text-primary)" }}>
                              {exam.title}
                            </h3>

                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 14, minHeight: 38 }}>
                              {exam.description || "Completed examination. Review your verified grade or practice again."}
                            </p>

                            {/* Coordinator Attribution */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                background: "var(--bg-surface-2)",
                                borderRadius: "var(--radius-sm)",
                                marginBottom: 14,
                                border: "1px solid var(--border-subtle)",
                                fontSize: "0.82rem"
                              }}
                            >
                              <span style={{ fontSize: "1rem" }}>👤</span>
                              <span style={{ color: "var(--text-secondary)" }}>
                                Coordinator: <strong style={{ color: "var(--text-primary)" }}>{coordinator}</strong>
                              </span>
                            </div>

                            <div className="meta-grid" style={{ marginBottom: 14 }}>
                              <div className="meta-item">
                                <span>Duration</span>
                                <strong>{exam.duration} mins</strong>
                              </div>
                              <div className="meta-item">
                                <span>Standing</span>
                                <strong style={{ color: isPass ? "#34D399" : "#F87171" }}>
                                  {isPass ? "Passed" : "Needs Review"}
                                </strong>
                              </div>
                              <div className="meta-item" style={{ gridColumn: "span 2" }}>
                                <span>Submission Timestamp</span>
                                <strong style={{ fontSize: "0.78rem" }}>
                                  {exam.submittedAt
                                    ? new Date(exam.submittedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                                    : "Recorded"}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <div className="card-footer" style={{ borderTop: "none", paddingTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                            <button
                              className="secondary-btn"
                              style={{ width: "100%", borderColor: "rgba(52, 211, 153, 0.4)", color: "#34D399" }}
                              onClick={() => navigate(`/exam/${exam.examId}/security?virtual=true`)}
                            >
                              Attend Virtual Contest 🚀 (Practice Mode)
                            </button>
                            <small style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                              Simulate exam under proctored timer. Score will not alter your official grade.
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* 3. MISSED EXAMS TAB */}
            {activeTab === "missed" && (
              <>
                {filteredMissed.length === 0 ? (
                  <div className="empty-state">
                    <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>No Missed Examinations</h4>
                    <p>Great job! You haven't missed any examination deadlines.</p>
                  </div>
                ) : (
                  <div className="section-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
                    {filteredMissed.map((exam) => {
                      const coordinator = exam.coordinatorName || "Faculty Coordinator";

                      return (
                        <div
                          key={exam.id}
                          className="card exam-card"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            borderLeft: "4px solid #F87171"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                              <span className="status-chip" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#F87171", borderColor: "rgba(239, 68, 68, 0.25)" }}>
                                ⏳ Window Expired
                              </span>
                              <span className="status-chip" style={{ background: "var(--bg-surface-1)", color: "var(--cyan)" }}>
                                {exam.examType === "CODING" ? "💻 Coding IDE" : "📝 MCQ Test"}
                              </span>
                            </div>

                            <h3 style={{ fontSize: "1.2rem", marginBottom: 8, color: "var(--text-primary)" }}>
                              {exam.title}
                            </h3>

                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 14, minHeight: 38 }}>
                              {exam.description || "The official entry deadline for this assessment has passed. Take it as a Virtual Contest."}
                            </p>

                            {/* Coordinator Attribution */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                background: "var(--bg-surface-2)",
                                borderRadius: "var(--radius-sm)",
                                marginBottom: 14,
                                border: "1px solid var(--border-subtle)",
                                fontSize: "0.82rem"
                              }}
                            >
                              <span style={{ fontSize: "1rem" }}>👤</span>
                              <span style={{ color: "var(--text-secondary)" }}>
                                Coordinator: <strong style={{ color: "var(--text-primary)" }}>{coordinator}</strong>
                              </span>
                            </div>

                            <div className="meta-grid" style={{ marginBottom: 14 }}>
                              <div className="meta-item">
                                <span>Duration</span>
                                <strong>{exam.duration} mins</strong>
                              </div>
                              <div className="meta-item">
                                <span>Total Marks</span>
                                <strong>{exam.totalMarks || 100} Marks</strong>
                              </div>
                              <div className="meta-item" style={{ gridColumn: "span 2" }}>
                                <span>Concluded On</span>
                                <strong style={{ fontSize: "0.78rem", color: "#FCA5A5" }}>
                                  {formatAllowedWindow(exam.startTime, exam.endTime)}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <div className="card-footer" style={{ borderTop: "none", paddingTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                            <button
                              className="secondary-btn"
                              style={{ width: "100%", borderColor: "rgba(248, 113, 113, 0.4)", color: "#FCA5A5" }}
                              onClick={() => navigate(`/exam/${exam.id}/security?virtual=true`)}
                            >
                              Attend Virtual Contest 🚀 (Practice Mode)
                            </button>
                            <small style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                              Practice under real exam conditions. Result is evaluated for practice and not submitted to gradebook.
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
