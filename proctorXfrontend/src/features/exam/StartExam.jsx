import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Client from "../../shared/api/Client";
import CountDownTimer from "./CountDownTimer";
import Logo from "../../shared/components/Logo";
import "../../App.css";

const ProctoringOverlay = lazy(() => import("../proctoring/ProctoringOverlay"));

export default function StartExam() {
  const autoSubmittedRef = useRef(false);
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const isVirtual = searchParams.get("virtual") === "true";

  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [virtualResult, setVirtualResult] = useState(null);

  // 1. Anti-Cheat & Malpractice Event Listeners (for realistic simulation & live integrity)
  useEffect(() => {
    if (!exam || isVirtual) return;

    function logEvent(event) {
      Client.post(`/student/exams/${exam.id}/malpractice`, null, {
        params: { event }
      }).catch(() => {});
    }

    const onBlur = () => logEvent("WINDOW_BLUR");
    const onVisibilityChange = () => {
      if (document.hidden) logEvent("TAB_SWITCH");
    };
    const onCopy = () => logEvent("COPY");
    const onPaste = () => logEvent("PASTE");
    const onContextMenu = (e) => {
      e.preventDefault();
      logEvent("RIGHT_CLICK");
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [exam, isVirtual]);

  // 2. 5s Heartbeat Poller (only for live session)
  useEffect(() => {
    if (!exam || isVirtual) return;

    const sendHeartbeat = () => {
      Client.post(`/student/exams/${exam.id}/heartbeat`)
        .then((res) => {
          if (res.headers["x-exam-warning"]) {
            alert("⚠️ WARNING: " + res.data);
          }
        })
        .catch((err) => {
          if (
            err.response?.data === "EXAM_TIME_OVER_SUBMITTED" &&
            !autoSubmittedRef.current
          ) {
            autoSubmittedRef.current = true;
            alert("⏱ Time finished! Auto submitting exam...");
            navigate("/dashboard");
          } else if (err.response?.data === "EXAM_INACTIVE_SUBMITTED") {
            alert("Your exam was inactive for more than 10 minutes. Your saved progress was submitted.");
            navigate("/dashboard");
          } else if (err.response?.data === "SESSION_WAITING") {
            alert("The coordinator has moved you to the waiting list. You are not allowed to continue this exam. Contact your coordinator.");
            navigate("/dashboard");
          } else if (err.response?.data === "EXAM_TERMINATED_BY_COORDINATOR") {
            alert("Your exam was submitted by the coordinator.");
            navigate("/dashboard");
          } else if (err.response?.status === 403) {
            alert("Your exam session was stopped by admin");
            navigate("/dashboard");
          }
        });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [exam, navigate, isVirtual]);

  // 3. Load Exam Session
  useEffect(() => {
    if (isVirtual) {
      Client.get(`/student/exams/${examId}/virtual-start`)
        .then((res) => {
          setExam(res.data.exam);
          setRemainingSeconds(res.data.remainingSeconds);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Virtual exam load error", err);
          alert("Unable to load virtual contest assessment.");
          navigate("/exams/today");
        });
    } else {
      Client.get(`/student/exams/${examId}/start`)
        .then((res) => {
          setExam(res.data.exam);
          setRemainingSeconds(res.data.remainingSeconds);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Exam load error", err);
          if (err.response?.data === "SESSION_WAITING") {
            alert("You are in the waiting state. Contact your coordinator to continue this exam.");
          } else if (err.response?.data === "EXAM_TERMINATED_BY_COORDINATOR") {
            alert("Your exam was submitted by the coordinator.");
          } else if (
            err.response?.data === "EXAM_INACTIVE_SUBMITTED" ||
            err.response?.data === "EXAM_TIME_OVER_SUBMITTED"
          ) {
            alert("Your exam has been submitted using your saved progress.");
          } else {
            alert("Unable to load exam or exam already submitted.");
          }
          navigate("/dashboard");
        });
    }
  }, [examId, navigate, isVirtual]);

  function handleOptionChange(questionId, option) {
    setAnswers((prev) => {
      const nextAnswers = { ...prev, [questionId]: option };
      if (!isVirtual) {
        Client.post(`/student/exams/${examId}/progress`, { answers: nextAnswers }).catch(() => {});
      }
      return nextAnswers;
    });
  }

  async function handleSubmit() {
    setShowSubmitModal(false);

    if (Object.keys(answers).length !== (exam?.questions || []).length) {
      if (autoSubmittedRef.current === true) {
        // Auto submit bypasses confirmation
      } else {
        const confirmIncomplete = window.confirm(
          `You have answered ${Object.keys(answers).length} out of ${exam?.questions?.length} questions. Are you sure you want to submit?`
        );
        if (!confirmIncomplete) return;
      }
    }

    try {
      setSubmitting(true);

      if (isVirtual) {
        const res = await Client.post(`/student/exams/${exam.id}/virtual-submit`, {
          answers
        });
        setVirtualResult(res.data);
      } else {
        const payload = {
          answers: Object.keys(answers).map((qId) => ({
            question: { id: Number(qId) },
            selectedOption: answers[qId]
          }))
        };

        const res = await Client.post(`/student/exams/${exam.id}/submit`, payload);
        alert(`Assessment submitted successfully!\nAwarded Score: ${res.data.score}\nA score evaluation report has been dispatched to your email.`);
        navigate("/results");
      }
    } catch (err) {
      console.error(err);
      alert("Submission failed or you have already submitted this exam.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card loading-card" style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div className="hero-badge">Exam Session Initialization</div>
          <h2>{isVirtual ? "Preparing Virtual Contest Workspace..." : "Preparing Exam Workspace..."}</h2>
          <p className="subtitle">Configuring anti-cheat filters and loading question catalog.</p>
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  if (!exam || !exam.questions || exam.questions.length === 0) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
          <h2>Exam Questions Unavailable</h2>
          <p className="subtitle">The questions for this examination have not been published yet.</p>
          <button className="secondary-btn" onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = exam.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = exam.questions.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="landing-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Background AI Proctoring Overlay */}
      <Suspense fallback={null}>
        <ProctoringOverlay
          examId={exam.id}
          onTerminate={() => {
            autoSubmittedRef.current = true;
            handleSubmit();
          }}
        />
      </Suspense>

      {/* Sticky Workspace Topbar */}
      <header
        className="proctorx-topbar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          borderBottom: "1px solid var(--border-medium)",
          backgroundColor: "rgba(15, 17, 23, 0.95)"
        }}
      >
        <div className="topbar-left">
          <Logo size="sm" />
          <div className="topbar-context desktop-only">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 className="topbar-title" style={{ fontSize: "1.1rem" }}>{exam.title}</h1>
              {isVirtual && (
                <span className="status-chip" style={{ background: "rgba(99, 102, 241, 0.2)", color: "var(--primary-light)", borderColor: "var(--primary)", fontSize: "0.75rem" }}>
                  🚀 Virtual Contest Simulation
                </span>
              )}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {answeredCount} of {totalQuestions} answered ({progressPercent}%)
            </span>
          </div>
        </div>

        <div className="topbar-right">
          <CountDownTimer
            durationMinutes={exam.duration}
            remainingSeconds={remainingSeconds}
            onTimeUp={() => {
              alert("⏱ Examination time has elapsed! Auto-submitting current answers...");
              handleSubmit();
            }}
          />

          <button
            className="submit-btn"
            style={{ padding: "8px 18px", fontSize: "0.85rem" }}
            onClick={() => setShowSubmitModal(true)}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : isVirtual ? "Complete Virtual Contest" : "Submit Examination"}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div style={{ flex: 1, padding: "28px 24px", maxWidth: 1300, width: "100%", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        {/* Left / Center: Question & Options Focus Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card question-card" style={{ padding: "32px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span className="status-chip approved">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="status-chip" style={{ background: "var(--bg-surface-1)" }}>
                {answers[currentQ.id] ? "✓ Answer Saved" : "Not Answered Yet"}
              </span>
            </div>

            <h3 style={{ fontSize: "1.25rem", lineHeight: 1.5, color: "var(--text-primary)", marginBottom: 24 }}>
              {currentQ.questionText}
            </h3>

            {/* Option Radio Selectors */}
            <div className="options-list">
              {[
                { key: "A", text: currentQ.optionA },
                { key: "B", text: currentQ.optionB },
                { key: "C", text: currentQ.optionC },
                { key: "D", text: currentQ.optionD }
              ].map((opt) => {
                const isSelected = answers[currentQ.id] === opt.key;
                return (
                  <label
                    key={opt.key}
                    className="option"
                    style={
                      isSelected
                        ? {
                            borderColor: "var(--primary)",
                            background: "var(--bg-surface-3)",
                            boxShadow: "0 0 15px var(--primary-glow)"
                          }
                        : {}
                    }
                  >
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      checked={isSelected}
                      onChange={() => handleOptionChange(currentQ.id, opt.key)}
                    />
                    <strong style={{ color: isSelected ? "var(--primary-light)" : "var(--text-muted)", minWidth: 20 }}>
                      {opt.key}.
                    </strong>
                    <span style={{ color: isSelected ? "#FFFFFF" : "var(--text-primary)", fontWeight: isSelected ? 600 : 400 }}>
                      {opt.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="button-row" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              ← Previous Question
            </button>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              >
                Next Question →
              </button>
            ) : (
              <button
                type="button"
                className="submit-btn"
                onClick={() => setShowSubmitModal(true)}
              >
                {isVirtual ? "Review & Finish Virtual Contest →" : "Review & Submit Examination →"}
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar: Question Matrix Navigator */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: "0.95rem", marginBottom: 12 }}>Question Navigator</h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {exam.questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isCurrent = idx === currentQuestionIndex;

                let btnBg = "var(--bg-surface-1)";
                let btnBorder = "var(--border-subtle)";
                let textColor = "var(--text-secondary)";

                if (isAnswered) {
                  btnBg = "var(--success-bg)";
                  btnBorder = "var(--success-border)";
                  textColor = "#34D399";
                }
                if (isCurrent) {
                  btnBorder = "var(--primary)";
                  textColor = "#FFFFFF";
                  btnBg = "var(--bg-surface-hover)";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    style={{
                      height: 42,
                      background: btnBg,
                      border: `1px solid ${btnBorder}`,
                      color: textColor,
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)"
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 6, fontSize: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--success-bg)", border: "1px solid var(--success-border)" }} />
                <span>Answered ({answeredCount})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--bg-surface-1)", border: "1px solid var(--border-subtle)" }} />
                <span>Unanswered ({totalQuestions - answeredCount})</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="proctor-violation-modal">
          <div className="card" style={{ maxWidth: 480, width: "100%", padding: 32, textAlign: "center" }}>
            <h3 style={{ fontSize: "1.4rem", marginBottom: 8 }}>
              {isVirtual ? "Complete Virtual Contest?" : "Confirm Final Submission"}
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 20 }}>
              You have answered <b>{answeredCount}</b> of <b>{totalQuestions}</b> questions.
              {isVirtual
                ? " Your practice score will be calculated immediately. This will not alter official gradebook submissions."
                : " Once submitted, your answers will be permanently evaluated and you cannot re-enter."}
            </p>

            <div className="button-row" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowSubmitModal(false)}
              >
                Return to Questions
              </button>

              <button
                type="button"
                className="submit-btn"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Evaluating..." : isVirtual ? "Evaluate Practice Score" : "Yes, Submit Exam"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Contest Result Modal */}
      {virtualResult && (
        <div className="proctor-violation-modal">
          <div className="card" style={{ maxWidth: 520, width: "100%", padding: 36, textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 10 }}>
              {virtualResult.isPass ? "🎉" : "📚"}
            </div>
            <div className="hero-badge" style={{ color: "#34D399", borderColor: "rgba(52, 211, 153, 0.3)", marginBottom: 12 }}>
              Virtual Contest Complete
            </div>
            <h2 style={{ fontSize: "1.6rem", marginBottom: 6 }}>Practice Performance Summary</h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: 24 }}>
              {virtualResult.message}
            </p>

            <div
              className="monitor-summary-grid"
              style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24, textAlign: "center" }}
            >
              <div className="monitor-stat">
                <span>Score</span>
                <strong>{virtualResult.score} / {virtualResult.totalMarks}</strong>
              </div>
              <div className="monitor-stat">
                <span>Percentage</span>
                <strong style={{ color: virtualResult.isPass ? "#34D399" : "#F87171" }}>
                  {virtualResult.percentage}%
                </strong>
              </div>
              <div className="monitor-stat">
                <span>Standing</span>
                <strong style={{ color: virtualResult.isPass ? "#34D399" : "#F87171" }}>
                  {virtualResult.isPass ? "Passed" : "Needs Review"}
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="primary-btn" onClick={() => navigate("/exams/today")}>
                Return to Exam Hub
              </button>
              <button className="ghost-btn" onClick={() => navigate("/dashboard")}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
