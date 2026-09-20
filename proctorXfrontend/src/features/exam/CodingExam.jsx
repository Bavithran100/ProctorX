import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Client from "../../shared/api/Client";
import CountDownTimer from "./CountDownTimer";
import { executeWasmOrFallback } from "./wasm/wasmRunner";
import ResizableTestcaseSplitter from "./components/ResizableTestcaseSplitter";
import Logo from "../../shared/components/Logo";
import "../../App.css";

const ProctoringOverlay = lazy(() => import("../proctoring/ProctoringOverlay"));

const BOILERPLATES = {
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        // ===== 1. READ INPUT FROM STDIN =====
        // Examples:
        // if (!sc.hasNext()) return;
        // int n = sc.nextInt();
        // String line = sc.hasNextLine() ? sc.nextLine() : "";

        // ===== 2. YOUR SOLUTION LOGIC =====


        // ===== 3. PRINT OUTPUT TO STDOUT =====

        sc.close();
    }
}
`,
  cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    // Fast I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // ===== 1. READ INPUT FROM STDIN =====


    // ===== 2. YOUR SOLUTION LOGIC =====


    // ===== 3. PRINT OUTPUT TO STDOUT =====

    return 0;
}
`,
  c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // ===== 1. READ INPUT FROM STDIN =====


    // ===== 2. YOUR SOLUTION LOGIC =====


    // ===== 3. PRINT OUTPUT TO STDOUT =====

    return 0;
}
`,
  python: `import sys

def main():
    # ===== 1. READ INPUT FROM STDIN =====
    # raw_input = sys.stdin.read().split()
    # if not raw_input:
    #     return

    # ===== 2. YOUR SOLUTION LOGIC =====


    # ===== 3. PRINT OUTPUT TO STDOUT =====
    pass

if __name__ == '__main__':
    main()
`
};

export default function CodingExam() {
  const autoSubmittedRef = useRef(false);
  const scoreRef = useRef(0);
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const isVirtual = searchParams.get("virtual") === "true";

  const navigate = useNavigate();

  const [language, setLanguage] = useState("java"); // "java", "cpp", "c", "python"
  const [questions, setQuestions] = useState([]);
  const [exam, setExam] = useState(null);
  const [current, setCurrent] = useState(0);
  const codeRef = useRef(BOILERPLATES.java);
  const [results, setResults] = useState([]);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [activeTab, setActiveTab] = useState("description"); // "description" or "testcases"
  const [virtualResult, setVirtualResult] = useState(null);
  const [resultsPanelHeight, setResultsPanelHeight] = useState(280);

  // 60-Second Alt+Tab / Window Blur Grace Timer
  const [awaySecondsLeft, setAwaySecondsLeft] = useState(null);
  const awayTimerRef = useRef(null);

  const submitExam = useCallback(async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      if (isVirtual) {
        const res = await Client.post(`/student/exams/${examId}/virtual-submit`, {
          score: scoreRef.current
        });
        setVirtualResult(res.data);
      } else {
        const res = await Client.post(`/student/exams/${examId}/coding-submit`, {
          score: scoreRef.current
        });

        alert(`Coding assessment submitted successfully!\nFinal Score: ${res.data.score}\nA score evaluation report has been dispatched to your email.`);
        navigate("/results");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to submit coding exam. Please verify your connection.");
    } finally {
      setSubmitting(false);
    }
  }, [examId, navigate, submitting, isVirtual]);

  // Sync score state
  useEffect(() => {
    scoreRef.current = score;
    if (exam && !isVirtual) {
      Client.post(`/student/exams/${examId}/coding-progress`, { score }).catch(() => {});
    }
  }, [exam, examId, score, isVirtual]);

  // Load Exam and Questions
  useEffect(() => {
    async function startCodingExam() {
      try {
        if (isVirtual) {
          const startResponse = await Client.get(`/student/exams/${examId}/virtual-start`);
          const questionsResponse = await Client.get(`/student/exams/${examId}/coding-questions?virtual=true`);
          setExam(startResponse.data.exam);
          setRemainingSeconds(startResponse.data.remainingSeconds);
          setQuestions(questionsResponse.data || []);
        } else {
          const startResponse = await Client.get(`/student/exams/${examId}/start`);
          const questionsResponse = await Client.get(`/student/exams/${examId}/coding-questions`);
          setExam(startResponse.data.exam);
          setRemainingSeconds(startResponse.data.remainingSeconds);
          setQuestions(questionsResponse.data || []);
        }
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
  }, [examId, navigate, isVirtual]);

  // Alt+Tab / Window Blur 60-Second Auto-Submit Grace Timer
  useEffect(() => {
    if (!exam) return;

    function handleLeave() {
      if (awayTimerRef.current) return;

      let count = 60;
      setAwaySecondsLeft(60);

      if (!isVirtual) {
        Client.post(`/student/exams/${exam.id}/malpractice`, null, {
          params: { event: "TAB_SWITCH" }
        }).catch(() => {});
      }

      awayTimerRef.current = setInterval(() => {
        count -= 1;
        setAwaySecondsLeft(count);
        if (count <= 0) {
          clearInterval(awayTimerRef.current);
          awayTimerRef.current = null;
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            alert("⏱ You were away from the examination window for more than 60 seconds. Your exam has been automatically submitted.");
            submitExam();
          }
        }
      }, 1000);
    }

    function handleReturn() {
      if (awayTimerRef.current) {
        clearInterval(awayTimerRef.current);
        awayTimerRef.current = null;
        setAwaySecondsLeft(null);
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleLeave();
      } else {
        handleReturn();
      }
    };

    const onBlur = () => handleLeave();
    const onFocus = () => handleReturn();

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (awayTimerRef.current) {
        clearInterval(awayTimerRef.current);
      }
    };
  }, [exam, isVirtual, submitExam]);

  // Anti-Cheat Right-Click / Copy / Paste Restrictions
  useEffect(() => {
    if (!exam || isVirtual) return;

    function logEvent(event) {
      Client.post(`/student/exams/${exam.id}/malpractice`, null, {
        params: { event }
      }).catch(() => {});
    }

    const onCopy = () => logEvent("COPY");
    const onPaste = () => logEvent("PASTE");
    const onContextMenu = (event) => {
      event.preventDefault();
      logEvent("RIGHT_CLICK");
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [exam, isVirtual]);

  // Heartbeat Poller (only for live session)
  useEffect(() => {
    if (!exam || isVirtual) return;

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
  }, [exam, navigate, submitExam, isVirtual]);

  const q = questions[current];

  // Handle language switch
  function handleLanguageChange(newLang) {
    setLanguage(newLang);
    codeRef.current = BOILERPLATES[newLang] || BOILERPLATES.java;
    setResults([]);
  }

  function normalizeInputString(str) {
    if (str == null) return "";
    return String(str)
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }

  function normalizeOutputForComparison(str) {
    if (str == null) return "";
    return String(str)
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
  }

  async function runCode(input) {
    const cleanedCode = (codeRef.current || "").trim();
    const normalizedStdin = normalizeInputString(input);
    return await executeWasmOrFallback(cleanedCode, normalizedStdin, language);
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

      for (let i = 0; i < q.testCases.length; i++) {
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        const t = q.testCases[i];
        const rawInputVal = t.input != null ? t.input : "";
        const inputVal = normalizeInputString(rawInputVal);
        const expectedVal = normalizeOutputForComparison(t.expectedOutput || t.output || "");

        try {
          const execData = await runCode(inputVal);
          const rawStdout = execData?.stdout || execData?.output || "";
          const rawError = execData?.error || "";
          const statusCode = String(execData?.statusCode || "200");
          const actualVal = normalizeOutputForComparison(rawStdout);

          const hasFatalError =
            rawError &&
            (rawError.toLowerCase().includes("error") ||
             rawError.toLowerCase().includes("exception") ||
             rawError.toLowerCase().includes("fatal"));

          // Detect compilation or runtime errors
          const isCrash =
            statusCode !== "200" ||
            rawStdout.includes("Exception in thread") ||
            rawStdout.includes("NoSuchElementException") ||
            rawStdout.includes("NullPointerException") ||
            rawStdout.includes("Traceback (most recent call last)") ||
            rawStdout.includes("Segmentation fault") ||
            rawStdout.includes("core dumped") ||
            (hasFatalError && expectedVal !== "" && !actualVal);

          const ok = !isCrash && actualVal === expectedVal;
          if (ok) passed++;

          let statusType = "PASS";
          if (isCrash) {
            statusType = "RUNTIME_ERROR";
          } else if (!ok) {
            statusType = "WRONG_ANSWER";
          }

          res.push({
            caseNum: i + 1,
            isSample: t.sample !== false,
            input: inputVal,
            expected: expectedVal !== "" ? expectedVal : "(empty)",
            actual: isCrash ? (rawStdout || rawError || "Runtime Error (Crash)") : (actualVal !== "" ? actualVal : "(empty)"),
            status: statusType,
            passed: ok,
            provider: execData?.providerUsed || ""
          });
        } catch (err) {
          const errMsg = err?.response?.data?.message || err?.userMessage || err?.message || "Execution / Compilation Error";
          const isRateLimit = String(errMsg).includes("429") || String(errMsg).toLowerCase().includes("limit");
          res.push({
            caseNum: i + 1,
            isSample: t.sample !== false,
            input: inputVal,
            expected: expectedVal !== "" ? expectedVal : "(empty)",
            actual: isRateLimit ? "⚠️ Daily API Limit Reached (429)" : errMsg,
            status: "ERROR",
            passed: false
          });
        }
      }

      setResults(res);

      if (passed === q.testCases.length) {
        setScore((prev) => prev + (q.marks || 0));
      }
    } catch (err) {
      console.error("Test execution failed", err);
    } finally {
      setExecuting(false);
    }
  }

  function nextQuestion() {
    setCurrent(current + 1);
    setResults([]);
    codeRef.current = BOILERPLATES[language] || BOILERPLATES.java;
  }

  if (!q || !exam) {
    return (
      <div className="page">
        <div className="card loading-card" style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div className="hero-badge">IDE Environment Setup</div>
          <h2>{isVirtual ? "Loading Virtual Contest IDE..." : "Loading Coding Assessment..."}</h2>
          <p className="subtitle">Syncing multi-language execution engine and testcase suites.</p>
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  const passedCount = results.filter((r) => r.passed).length;
  const monacoLang = language === "cpp" ? "cpp" : language === "c" ? "c" : language === "python" ? "python" : "java";

  return (
    <div className="landing-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Background AI Proctoring Overlay */}
      <Suspense fallback={null}>
        <ProctoringOverlay examId={exam.id} onTerminate={submitExam} />
      </Suspense>

      {/* Alt+Tab Away Warning Banner */}
      {awaySecondsLeft !== null && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            backgroundColor: "#EF4444",
            color: "#FFF",
            padding: "12px 24px",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 30px rgba(239, 68, 68, 0.5)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontWeight: 700,
            fontSize: "0.95rem",
            animation: "pulse 1s infinite"
          }}
        >
          <span>⚠️ WINDOW FOCUS LOST! Return to exam window. Auto-submission in:</span>
          <span style={{ fontSize: "1.2rem", padding: "2px 8px", background: "rgba(0,0,0,0.3)", borderRadius: 4 }}>
            {awaySecondsLeft}s
          </span>
        </div>
      )}

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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 className="topbar-title" style={{ fontSize: "1.05rem" }}>{exam.title}</h1>
              {isVirtual && (
                <span className="status-chip" style={{ background: "rgba(99, 102, 241, 0.2)", color: "var(--primary-light)", borderColor: "var(--primary)", fontSize: "0.75rem" }}>
                  🚀 Virtual Contest Simulation
                </span>
              )}
            </div>
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
                codeRef.current = BOILERPLATES[language] || BOILERPLATES.java;
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
            {submitting ? "Submitting..." : isVirtual ? "Complete Virtual Contest" : "Submit Examination"}
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
                <div style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, marginBottom: 16 }}>
                  {q.description}
                </div>
                <div className="card" style={{ background: "var(--bg-surface-1)", padding: 14 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Multi-Language Execution Environment
                  </span>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginTop: 4 }}>
                    Write your solution in <strong>Java 17</strong>, <strong>C++ (C++17)</strong>, <strong>C</strong>, or <strong>Python 3.11</strong>. Ensure standard input is read correctly as specified in the Input Format section.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(q.testCases || []).map((t, i) => (
                  <div key={i} className="testcase-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span className="status-chip" style={{ fontSize: "0.7rem" }}>
                        Sample Case #{i + 1}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {t.sample !== false ? "Visible Case" : "Evaluation Case"}
                      </span>
                    </div>
                    <span className="label">Input (stdin)</span>
                    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{normalizeInputString(t.input) !== "" ? normalizeInputString(t.input) : "(empty string)"}</pre>
                    <span className="label">Expected Output (stdout)</span>
                    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{normalizeInputString(t.expectedOutput || t.output || "")}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Monaco Editor & Multi-Language Selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Monaco Code Editor Shell */}
          <div className="editor-shell" style={{ margin: 0, display: "flex", flexDirection: "column", flex: 1 }}>
            <div className="editor-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px" }}>
              {/* Language Selector Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  style={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-medium)",
                    color: "var(--text-primary)",
                    padding: "4px 10px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <option value="java">☕ Java 17 (JDK)</option>
                  <option value="cpp">⚡ C++ (GCC / C++17)</option>
                  <option value="c">⚙️ C (GCC 11.1)</option>
                  <option value="python">🐍 Python 3.11</option>
                </select>
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
                key={`${current}-${language}`}
                height="100%"
                language={monacoLang}
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
            <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
              <ResizableTestcaseSplitter
                height={resultsPanelHeight}
                onHeightChange={setResultsPanelHeight}
                minHeight={150}
                maxHeight={600}
                label="Execution Results & Diff Console"
              />
              <div
                className="card"
                style={{
                  height: `${resultsPanelHeight}px`,
                  maxHeight: `${resultsPanelHeight}px`,
                  overflowY: "auto",
                  padding: 16,
                  background: "var(--bg-surface-1)",
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0
                }}
              >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>Execution Results: {passedCount} / {results.length} Passed ({language.toUpperCase()})</span>
                  {results[0]?.provider && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "var(--bg-surface-2)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-subtle)",
                        fontWeight: 600
                      }}
                    >
                      ⚡ {results[0].provider.toUpperCase()}
                    </span>
                  )}
                </h4>
                <span className={`status-chip ${passedCount === results.length ? "approved" : "fail"}`}>
                  {passedCount === results.length ? "✓ All Passed (+100%)" : `${passedCount}/${results.length} Passed`}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {results.map((r, i) => (
                  <div key={i} className={`result-card ${r.passed ? "pass" : "fail"}`} style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: "0.85rem" }}>Test Case {r.caseNum || i + 1}</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {r.isSample ? "(Sample)" : "(Evaluation)"}
                        </span>
                      </div>
                      <span
                        className={`result-status ${r.passed ? "pass" : "fail"}`}
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          background: r.passed
                            ? "rgba(16, 185, 129, 0.15)"
                            : r.status === "RUNTIME_ERROR"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                          color: r.passed
                            ? "#10B981"
                            : r.status === "RUNTIME_ERROR"
                            ? "#F59E0B"
                            : "#EF4444"
                        }}
                      >
                        {r.passed ? "✓ PASS" : r.status === "RUNTIME_ERROR" ? "⚠️ RUNTIME ERROR" : "✕ WRONG ANSWER"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: "0.75rem" }}>
                      <div>
                        <span className="label">Input (stdin)</span>
                        <pre style={{ margin: 0, padding: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {r.input !== "" ? r.input : "(empty)"}
                        </pre>
                      </div>
                      <div>
                        <span className="label">Expected Output</span>
                        <pre style={{ margin: 0, padding: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {r.expected}
                        </pre>
                      </div>
                      <div>
                        <span className="label">Your Output</span>
                        <pre
                          style={{
                            margin: 0,
                            padding: 6,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            color: r.passed ? "#34D399" : "#F87171"
                          }}
                        >
                          {r.actual || "(no output produced)"}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                {submitting ? "Evaluating..." : isVirtual ? "Finish Virtual Contest" : "Submit Entire Examination"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Virtual Contest Result Modal */}
      {virtualResult && (
        <div className="proctor-violation-modal">
          <div className="card" style={{ maxWidth: 520, width: "100%", padding: 36, textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 10 }}>
              {virtualResult.isPass ? "🎉" : "💻"}
            </div>
            <div className="hero-badge" style={{ color: "#34D399", borderColor: "rgba(52, 211, 153, 0.3)", marginBottom: 12 }}>
              Virtual Coding Contest Complete
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
                  {virtualResult.isPass ? "Passed" : "Needs Practice"}
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
