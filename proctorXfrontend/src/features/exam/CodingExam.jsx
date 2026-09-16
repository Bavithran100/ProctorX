import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Client from "../../shared/api/Client";
import CountDownTimer from "./CountDownTimer";
import Logo from "../../shared/components/Logo";
import "../../App.css";

const ProctoringOverlay = lazy(() => import("../proctoring/ProctoringOverlay"));

export default function CodingExam() {
  const autoSubmittedRef = useRef(false);
  const scoreRef = useRef(0);
  const { examId } = useParams();
  const navigate = useNavigate();

  const BOILER_CODE = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        // ===== READ INPUT =====


        // ===== SOLUTION LOGIC =====


        // ===== STANDARD OUTPUT =====


    }
}
`;

  const [questions, setQuestions] = useState([]);
  const [exam, setExam] = useState(null);
  const [current, setCurrent] = useState(0);
  const codeRef = useRef(BOILER_CODE);
  const [results, setResults] = useState([]);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [activeTab, setActiveTab] = useState("description"); // "description" or "testcases"

  const submitExam = useCallback(async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const res = await Client.post(`/student/exams/${examId}/coding-submit`, {
        score: scoreRef.current
      });

      alert(`Coding assessment submitted successfully!\nFinal Score: ${res.data.score}`);
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Unable to submit coding exam. Please verify your connection.");
    } finally {
      setSubmitting(false);
    }
  }, [examId, navigate, submitting]);

  // Sync score state
  useEffect(() => {
    scoreRef.current = score;
    if (exam) {
      Client.post(`/student/exams/${examId}/coding-progress`, { score }).catch(() => {});
    }
  }, [exam, examId, score]);

  // Load Exam and Questions
  useEffect(() => {
    async function startCodingExam() {
      try {
        const startResponse = await Client.get(`/student/exams/${examId}/start`);
        const questionsResponse = await Client.get(`/student/exams/${examId}/coding-questions`);
        setExam(startResponse.data.exam);
        setRemainingSeconds(startResponse.data.remainingSeconds);
        setQuestions(questionsResponse.data || []);
      } catch (error) {
        console.error(error);
        if (error.response?.data === "SESSION_WAITING") {
          alert("You are in the waiting state. Contact your coordinator to continue this exam.");
        } else if (error.response?.data === "EXAM_TERMINATED_BY_COORDINATOR") {
          alert("Your exam was submitted by the coordinator.");
        } else if (
          error.response?.data === "EXAM_INACTIVE_SUBMITTED" ||
          error.response?.data === "EXAM_TIME_OVER_SUBMITTED"
        ) {
          alert("Your exam has been submitted using your saved progress.");
        } else {
          alert("Unable to start coding exam.");
        }
        navigate("/dashboard");
      }
    }

    startCodingExam();
  }, [examId, navigate]);

  // Anti-Cheat Malpractice Listeners
  useEffect(() => {
    if (!exam) return;

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
    const onContextMenu = (event) => {
      event.preventDefault();
      logEvent("RIGHT_CLICK");
    };
    const onPageHide = () => logEvent("PAGE_REFRESH");

    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [exam]);

  // Heartbeat Poller
  useEffect(() => {
    if (!exam) return;

    const sendHeartbeat = () => {
      Client.post(`/student/exams/${exam.id}/heartbeat`)
        .then((response) => {
          if (response.headers["x-exam-warning"]) {
            alert("⚠️ Warning from Coordinator: " + response.data);
          }
        })
        .catch((error) => {
          if (
            error.response?.data === "EXAM_TIME_OVER_SUBMITTED" &&
            !autoSubmittedRef.current
          ) {
            autoSubmittedRef.current = true;
            alert("⏱ Time finished. Auto-submitting coding exam...");
            navigate("/dashboard");
          } else if (error.response?.data === "EXAM_INACTIVE_SUBMITTED") {
            alert("Your exam was inactive for more than 10 minutes. Your saved progress was submitted.");
            navigate("/dashboard");
          } else if (error.response?.data === "SESSION_WAITING") {
            alert("The coordinator has moved you to the waiting list. Contact your coordinator.");
            navigate("/dashboard");
          } else if (error.response?.data === "EXAM_TERMINATED_BY_COORDINATOR") {
            alert("Your exam was submitted by the coordinator.");
            navigate("/dashboard");
          } else if (error.response?.status === 403) {
            alert("Your exam session was stopped by admin");
            navigate("/dashboard");
          }
        });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [exam, navigate, submitExam]);

  const q = questions[current];

  async function runCode(input) {
    const cleanedCode = (codeRef.current || "").trim();
    const res = await Client.post("/code-execution/generate-output", {
      script: cleanedCode,
      stdin: input
    });
    return res.data.stdout;
  }

  async function runTests() {
    if (!q || !q.testCases || q.testCases.length === 0) {
      alert("No test cases defined for this problem.");
      return;
    }

    try {
      setExecuting(true);
      let passed = 0;
      let res = [];

      for (let t of q.testCases) {
        const out = await runCode(t.input);
        const actual = out?.trim() || "";
        const expected = t.expectedOutput?.trim() || "";
        const ok = actual === expected;

        if (ok) passed++;

        res.push({
          input: t.input,
          expected,
          actual,
          passed: ok
        });
      }

      setResults(res);

      if (passed === q.testCases.length) {
        setScore((prev) => prev + (q.marks || 0));
        alert(`🎉 All ${passed} test cases passed! +${q.marks || 0} marks awarded.`);
      }
    } catch (err) {
      console.error("Test execution failed", err);
      alert("Code execution judge error. Check syntax and compilation errors.");
    } finally {
      setExecuting(false);
    }
  }

  function nextQuestion() {
    setCurrent(current + 1);
    setResults([]);
    codeRef.current = BOILER_CODE;
  }

  if (!q || !exam) {
    return (
      <div className="page">
        <div className="card loading-card" style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div className="hero-badge">IDE Environment Setup</div>
          <h2>Loading Coding Assessment...</h2>
          <p className="subtitle">Syncing Java execution engine and testcase suites.</p>
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="landing-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Background AI Proctoring Overlay */}
      <Suspense fallback={null}>
        <ProctoringOverlay examId={exam.id} onTerminate={submitExam} />
      </Suspense>

      {/* Top Navigation Bar */}
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
            <h1 className="topbar-title" style={{ fontSize: "1.05rem" }}>{exam.title}</h1>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Problem {current + 1} of {questions.length} · Score: {score} Marks
            </span>
          </div>
        </div>

        {/* Problem Switcher Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {questions.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCurrent(idx);
                setResults([]);
                codeRef.current = BOILER_CODE;
              }}
              className={`status-chip ${idx === current ? "approved" : ""}`}
              style={{
                cursor: "pointer",
                padding: "4px 10px",
                fontSize: "0.75rem",
                fontWeight: 700
              }}
            >
              P{idx + 1}
            </button>
          ))}
        </div>

        <div className="topbar-right">
          <CountDownTimer
            durationMinutes={exam.duration}
            remainingSeconds={remainingSeconds}
            onTimeUp={() => {
              if (!autoSubmittedRef.current) {
                autoSubmittedRef.current = true;
                alert("⏱ Examination duration has finished. Submitting coding assessment...");
                submitExam();
              }
            }}
          />

          <button
            className="submit-btn"
            style={{ padding: "8px 18px", fontSize: "0.85rem" }}
            onClick={submitExam}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Examination"}
          </button>
        </div>
      </header>

      {/* Main IDE Workspace Split Area */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: 16,
          padding: "16px 20px",
          minHeight: 0
        }}
      >
        {/* Left Pane: Problem Description & Sample Cases */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "calc(100vh - 100px)" }}>
          <div className="card" style={{ flex: 1, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span className="status-chip approved">Problem {current + 1}</span>
              <span className="status-chip" style={{ background: "var(--bg-surface-1)", color: "var(--primary-light)" }}>
                Worth: {q.marks || 0} Marks
              </span>
            </div>

            <h2 style={{ fontSize: "1.4rem", color: "var(--text-primary)", marginBottom: 12 }}>
              {q.title}
            </h2>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                className={`info-tab ${activeTab === "description" ? "active-tab" : ""}`}
                onClick={() => setActiveTab("description")}
                style={{ padding: "6px 14px", fontSize: "0.8rem" }}
              >
                Problem Statement
              </button>
              <button
                type="button"
                className={`info-tab ${activeTab === "testcases" ? "active-tab" : ""}`}
                onClick={() => setActiveTab("testcases")}
                style={{ padding: "6px 14px", fontSize: "0.8rem" }}
              >
                Sample Test Cases ({(q.testCases || []).length})
              </button>
            </div>

            {activeTab === "description" ? (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6 }}>
                <p style={{ whiteSpace: "pre-line", marginBottom: 16 }}>{q.description}</p>
                <div className="card" style={{ background: "var(--bg-surface-1)", padding: 14 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Language & Standard Input
                  </span>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginTop: 4 }}>
                    Use standard <code>Scanner(System.in)</code> to read inputs and <code>System.out.println()</code> for outputs.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(q.testCases || []).map((t, i) => (
                  <div key={i} className="testcase-card">
                    <span className="status-chip" style={{ fontSize: "0.7rem", marginBottom: 6 }}>
                      Sample Case #{i + 1}
                    </span>
                    <span className="label">Input</span>
                    <pre>{t.input}</pre>
                    <span className="label">Expected Output</span>
                    <pre>{t.expectedOutput}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Monaco Java Editor & Execution Console */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Monaco Code Editor Shell */}
          <div className="editor-shell" style={{ margin: 0, display: "flex", flexDirection: "column", flex: 1 }}>
            <div className="editor-toolbar">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                <strong>Java 17 Compiler</strong>
              </div>
              <div className="button-row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ padding: "5px 14px", fontSize: "0.8rem" }}
                  onClick={runTests}
                  disabled={executing}
                >
                  {executing ? "Compiling & Running..." : "▶ Run All Test Cases"}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 380 }}>
              <Editor
                key={current}
                height="100%"
                defaultLanguage="java"
                defaultValue={codeRef.current}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "var(--font-mono)",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: "on",
                  tabSize: 4
                }}
                onChange={(v) => {
                  codeRef.current = v || "";
                }}
              />
            </div>
          </div>

          {/* Test Case Execution Output Console */}
          {results.length > 0 && (
            <div
              className="card"
              style={{
                maxHeight: 240,
                overflowY: "auto",
                padding: 16,
                background: "var(--bg-surface-1)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ fontSize: "0.95rem" }}>
                  Execution Results: {passedCount} / {results.length} Passed
                </h4>
                <span className={`status-chip ${passedCount === results.length ? "approved" : "fail"}`}>
                  {passedCount === results.length ? "✓ All Passed" : "✕ Test Failures"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {results.map((r, i) => (
                  <div key={i} className={`result-card ${r.passed ? "pass" : "fail"}`} style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <strong style={{ fontSize: "0.85rem" }}>Test Case {i + 1}</strong>
                      <span className={`result-status ${r.passed ? "pass" : "fail"}`} style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                        {r.passed ? "PASS" : "FAIL"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: "0.75rem" }}>
                      <div>
                        <span className="label">Input</span>
                        <pre style={{ margin: 0, padding: 4 }}>{r.input}</pre>
                      </div>
                      <div>
                        <span className="label">Expected</span>
                        <pre style={{ margin: 0, padding: 4 }}>{r.expected}</pre>
                      </div>
                      <div>
                        <span className="label">Your Output</span>
                        <pre style={{ margin: 0, padding: 4, color: r.passed ? "#34D399" : "#F87171" }}>{r.actual}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="button-row" style={{ justifyContent: "flex-end" }}>
            {current < questions.length - 1 ? (
              <button
                type="button"
                className="secondary-btn"
                onClick={nextQuestion}
              >
                Proceed to Problem {current + 2} →
              </button>
            ) : (
              <button
                type="button"
                className="submit-btn"
                onClick={submitExam}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Entire Examination"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
