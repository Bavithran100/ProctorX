import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Client from "../../shared/api/Client";
import { isWasmCached, precacheLanguage, getDetailedCacheStats, clearWasmCache } from "../exam/wasm/wasmCacheService";
import { executeWasmOrFallback, warmupWasmRuntimes } from "../exam/wasm/wasmRunner";
import ResizableTestcaseSplitter from "../exam/components/ResizableTestcaseSplitter";
import ProctoringOverlay from "../proctoring/ProctoringOverlay";
import Logo from "../../shared/components/Logo";
import "./adaptive.css";

const BOILERPLATES = {
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // Read input and implement your solution
        
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
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Read input and implement your solution

    return 0;
}
`,
  c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Read input and implement your solution
    return 0;
}
`,
  python: `import sys

def main():
    # Read input and implement your solution
    pass

if __name__ == '__main__':
    main()
`
};

export default function AdaptiveTrainingExam() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const [sessionData, setSessionData] = useState(location.state?.session || null);
  const [questions, setQuestions] = useState(location.state?.session?.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [language, setLanguage] = useState("java");
  const [codePerQuestion, setCodePerQuestion] = useState({});
  const [languagePerQuestion, setLanguagePerQuestion] = useState({});
  const [submittedPerQuestion, setSubmittedPerQuestion] = useState({});
  const [testResults, setTestResults] = useState({});
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState({});
  const [totalSessionSeconds, setTotalSessionSeconds] = useState(0);
  const [loading, setLoading] = useState(!sessionData);
  const [executing, setExecuting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [resultsPanelHeight, setResultsPanelHeight] = useState(240);
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmProgress, setWasmProgress] = useState(0);
  const [wasmStats, setWasmStats] = useState(null);
  const [wasmMessage, setWasmMessage] = useState("Checking in-browser WASM compilers...");

  const attemptsPerQuestion = useRef({});
  const proctorViolationsRef = useRef(0);

  const getSessionKey = (sId) => sId || sessionData?.sessionId || sessionId || "active";
  const getDraftKey = (qId, sId) => `proctorx_draft_${getSessionKey(sId)}_${qId}`;
  const getSessionStateKey = (sId) => `proctorx_session_state_${getSessionKey(sId)}`;

  const [malpracticeHalted, setMalpracticeHalted] = useState(null);

  const currentQ = questions[currentIndex] || null;

  // Per-Question Live Timer & Freezing Loop (Ticks ONLY for active question)
  useEffect(() => {
    if (!currentQ || showCelebration || malpracticeHalted) return;
    const interval = setInterval(() => {
      setTimeSpentPerQuestion((prev) => {
        const next = {
          ...prev,
          [currentQ.id]: (prev[currentQ.id] || 0) + 1,
        };
        try {
          const sKey = getSessionStateKey();
          const raw = localStorage.getItem(sKey);
          const parsed = raw ? JSON.parse(raw) : {};
          localStorage.setItem(sKey, JSON.stringify({ ...parsed, timeSpentPerQuestion: next }));
        } catch {}
        return next;
      });
      setTotalSessionSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQ?.id, showCelebration, malpracticeHalted]);

  useEffect(() => {
    if (questions[currentIndex]) {
      const qId = questions[currentIndex].id;
      const qLang = languagePerQuestion[qId] || "java";
      setLanguage(qLang);
    }
  }, [currentIndex, questions]);

  async function initWasmEngine() {
    try {
      const cached = await isWasmCached("all");
      const stats = await getDetailedCacheStats();
      setWasmStats(stats);

      if (cached && stats?.python?.isCached && stats?.java?.isCached && stats?.cpp?.isCached) {
        setWasmReady(true);
        setWasmProgress(100);
        setWasmMessage(`✓ In-Browser Compilers Active (Total: ${stats.total.sizeMB} Cached Locally)`);
      } else {
        setWasmMessage("⚡ Pre-caching In-Browser Compilers (Python, Java, C++)...");
        await precacheLanguage("all", (percent, msg) => {
          setWasmProgress(percent);
          setWasmMessage(msg);
        });
        const updatedStats = await getDetailedCacheStats();
        setWasmStats(updatedStats);
        setWasmReady(true);
        setWasmMessage(`✓ In-Browser Compilers Cached (${updatedStats.total.sizeMB})`);
      }
      warmupWasmRuntimes();
    } catch (err) {
      console.warn("WASM Engine initialization notice:", err);
      setWasmReady(true);
      setWasmMessage("⚡ Direct Hybrid Execution Mode Active");
    }
  }

  async function handleManualPrecache() {
    setWasmReady(false);
    setWasmProgress(0);
    setWasmMessage("Downloading all compiler packages to local cache (~57MB)...");
    await precacheLanguage("all", (percent, msg) => {
      setWasmProgress(percent);
      setWasmMessage(msg);
      if (percent === 100) setWasmReady(true);
    });
    const finalStats = await getDetailedCacheStats();
    setWasmStats(finalStats);
    warmupWasmRuntimes().catch(() => {});
  }

  useEffect(() => {
    initWasmEngine();
    const params = new URLSearchParams(window.location.search);
    const isResume = params.get("resume") === "true";
    const targetSessionId = params.get("sessionId") || sessionId;

    if (targetSessionId && (isResume || sessionId)) {
      resumeSession(targetSessionId);
    } else if (!sessionData) {
      // Start training session if not passed via state
      const chosenTopic = params.get("topic") || "AUTO";
      startSession(chosenTopic);
    } else {
      initQuestionCodes(sessionData.questions, sessionData.sessionId);
    }
  }, []);

  async function resumeSession(sId) {
    try {
      setLoading(true);
      const res = await Client.post("/adaptive/training/reconnect", { sessionId: sId });
      setSessionData(res.data);
      const qList = res.data.questions || [];
      setQuestions(qList);
      initQuestionCodes(qList, res.data.sessionId || sId);
    } catch (err) {
      console.error("Failed to resume session:", err);
      alert(err.response?.data?.message || "Failed to resume session. It may have expired beyond the 30-minute grace period.");
      navigate("/adaptive-coach");
    } finally {
      setLoading(false);
    }
  }

  async function startSession(topic) {
    try {
      setLoading(true);
      const res = await Client.post("/adaptive/training/start", { topic });
      setSessionData(res.data);
      const qList = res.data.questions || [];
      setQuestions(qList);
      initQuestionCodes(qList, res.data.sessionId);
    } catch (err) {
      console.error("Failed to start adaptive session:", err);
      alert("Failed to initialize session: " + (err.response?.data?.message || err.message));
      navigate("/adaptive-coach");
    } finally {
      setLoading(false);
    }
  }

  const handleProctorTerminate = async (reason) => {
    const sId = sessionData?.sessionId || sessionId;
    try {
      if (sId) {
        await Client.post("/adaptive/training/terminate-malpractice", {
          sessionId: sId,
          violations: proctorViolationsRef.current || 3,
        });
      }
    } catch (err) {
      console.error("Failed to record malpractice termination:", err);
    }

    try {
      localStorage.removeItem(getSessionStateKey(sId));
    } catch {}

    setMalpracticeHalted({
      reason: reason || "Repeated security violations detected (Tab switch / Full-screen exit / Face violation).",
      topic: sessionData?.targetSkill || "DSA",
    });
  };

  function formatTimer(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function initQuestionCodes(qList, currentSessionId) {
    const sKey = getSessionStateKey(currentSessionId);
    const initialCodes = {};
    const initialLangs = {};
    
    (qList || []).forEach((q) => {
      const cached = localStorage.getItem(getDraftKey(q.id, currentSessionId));
      const cachedLang = localStorage.getItem(`${getDraftKey(q.id, currentSessionId)}_lang`);
      initialCodes[q.id] = cached || BOILERPLATES.java;
      if (cachedLang) initialLangs[q.id] = cachedLang;
    });
    setCodePerQuestion(initialCodes);
    if (Object.keys(initialLangs).length > 0) {
      setLanguagePerQuestion((prev) => ({ ...prev, ...initialLangs }));
    }

    // Restore submitted progress & testcase results from local session state
    try {
      const rawState = localStorage.getItem(sKey);
      if (rawState) {
        const saved = JSON.parse(rawState);
        if (saved.submittedPerQuestion) {
          setSubmittedPerQuestion(saved.submittedPerQuestion);
        }
        if (saved.testResults) {
          setTestResults(saved.testResults);
        }
        if (saved.timeSpentPerQuestion) {
          setTimeSpentPerQuestion(saved.timeSpentPerQuestion);
        }

        // Auto-navigate to first uncompleted question
        if (saved.submittedPerQuestion && qList?.length) {
          const firstUnsubmitted = qList.findIndex((q) => !saved.submittedPerQuestion[q.id]);
          if (firstUnsubmitted !== -1) {
            setCurrentIndex(firstUnsubmitted);
          }
        }
      }
    } catch (e) {
      console.warn("Session state restoration note:", e);
    }
  }

  const currentCode = currentQ ? (codePerQuestion[currentQ.id] || BOILERPLATES[language]) : "";

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (currentQ) {
      setLanguagePerQuestion((prev) => ({ ...prev, [currentQ.id]: newLang }));
      setCodePerQuestion((prev) => ({
        ...prev,
        [currentQ.id]: BOILERPLATES[newLang] || "",
      }));
      try {
        localStorage.setItem(`${getDraftKey(currentQ.id)}_lang`, newLang);
        localStorage.setItem(getDraftKey(currentQ.id), BOILERPLATES[newLang] || "");
      } catch {}
    }
  };

  const handleCodeChange = (newVal) => {
    if (currentQ) {
      setCodePerQuestion((prev) => ({
        ...prev,
        [currentQ.id]: newVal,
      }));
      try {
        localStorage.setItem(getDraftKey(currentQ.id), newVal);
      } catch {}
    }
  };

  const runTestCases = async () => {
    if (!currentQ || executing) return;
    setExecuting(true);
    attemptsPerQuestion.current[currentQ.id] = (attemptsPerQuestion.current[currentQ.id] || 0) + 1;
    const qResults = [];

    const testCases = currentQ.testCases || [];
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const out = await executeWasmOrFallback(
          currentCode,
          tc.input || "",
          language
        );

        const actual = (out.output || out.stdout || "").trim();
        const expected = (tc.expectedOutput || "").trim();
        const passed = actual === expected;

        qResults.push({
          index: i + 1,
          sample: tc.sample,
          passed,
          input: tc.input,
          expected,
          actual: out.output || out.stdout || (out.error ? `Error: ${out.error}` : "(empty)"),
          executionType: out.executionType,
          error: out.error,
        });
      } catch (err) {
        qResults.push({
          index: i + 1,
          sample: tc.sample,
          passed: false,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: `Execution Exception: ${err.message}`,
          error: err.message,
        });
      }
    }

    setTestResults((prev) => ({
      ...prev,
      [currentQ.id]: qResults,
    }));
    setExecuting(false);
    return qResults;
  };

  const handleSaveAndSubmitQuestion = async () => {
    if (!currentQ || executing) return;
    let results = testResults[currentQ.id];
    if (!results || results.length === 0) {
      results = await runTestCases();
    }
    const updatedSubmitted = {
      ...submittedPerQuestion,
      [currentQ.id]: true,
    };
    setSubmittedPerQuestion(updatedSubmitted);

    try {
      const sKey = getSessionStateKey();
      const raw = localStorage.getItem(sKey);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        sKey,
        JSON.stringify({
          ...parsed,
          submittedPerQuestion: updatedSubmitted,
          testResults: { ...testResults, [currentQ.id]: results },
          timeSpentPerQuestion,
          currentIndex: Math.min(currentIndex + 1, questions.length - 1),
        })
      );
    } catch {}

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const submitTrainingSession = async () => {
    if (submitting || !sessionData) return;
    try {
      setSubmitting(true);
      const answers = questions.map((q) => {
        const duration = timeSpentPerQuestion[q.id] ? Math.max(5, timeSpentPerQuestion[q.id]) : 60;
        const qResults = testResults[q.id] || [];
        const passedCount = qResults.filter((r) => r.passed).length;
        const errorsDetected = [];
        qResults.forEach((r) => {
          if (r.error) {
            const errLower = (r.error || "").toLowerCase();
            if (errLower.includes("timeout") || errLower.includes("tle")) errorsDetected.push("TLE");
            else if (errLower.includes("memory") || errLower.includes("heap")) errorsDetected.push("MLE");
            else if (errLower.includes("nullpointer") || errLower.includes("cannot read property") || errLower.includes("none")) errorsDetected.push("NULL_EMPTY_HANDLING");
            else if (errLower.includes("indexoutofbounds") || errLower.includes("index error")) errorsDetected.push("OFF_BY_ONE");
            else if (errLower.includes("syntax") || errLower.includes("compile")) errorsDetected.push("COMPILATION_SYNTAX_ERROR");
          }
        });

        return {
          questionId: q.id,
          code: codePerQuestion[q.id] || "",
          language: languagePerQuestion[q.id] || language || "java",
          attempts: attemptsPerQuestion.current[q.id] || 1,
          durationSeconds: duration,
          proctorViolations: proctorViolationsRef.current || 0,
          passedCount: passedCount,
          totalTestCases: (q.testCases || []).length || 3,
          detectedErrors: errorsDetected
        };
      });

      const res = await Client.post("/adaptive/training/submit", {
        sessionId: sessionData.sessionId,
        answers,
      });

      // Wipe local draft and session cache on successful submission
      try {
        localStorage.removeItem(getSessionStateKey(sessionData.sessionId));
      } catch {}
      questions.forEach((q) => {
        try {
          localStorage.removeItem(getDraftKey(q.id, sessionData.sessionId));
          localStorage.removeItem(`${getDraftKey(q.id, sessionData.sessionId)}_lang`);
        } catch {}
      });

      setSubmitResult(res.data);
      setShowCelebration(true);
    } catch (err) {
      console.error("Failed to submit training session:", err);
      alert("Submission failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="adaptive-session-container" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🤖</div>
          <h3 style={{ color: "#F8FAFC", margin: 0 }}>Generating Targeted Adaptive Questions...</h3>
          <p style={{ color: "#94A3B8", fontSize: "14px", marginTop: "6px" }}>
            Groq AI is assembling 3 problems tuned to your exact skill frontier
          </p>
        </div>
      </div>
    );
  }

  const currentQResults = currentQ ? (testResults[currentQ.id] || []) : [];
  const allCurrentPassed = currentQResults.length > 0 && currentQResults.every((r) => r.passed);

  return (
    <div className="adaptive-session-container">
      {/* Autonomous AI Proctoring Overlay */}
      <ProctoringOverlay
        examId={`adaptive_session_${sessionData?.sessionId || sessionId || "practice"}`}
        onViolation={() => {
          proctorViolationsRef.current = (proctorViolationsRef.current || 0) + 1;
        }}
        onTerminate={(reason) => {
          handleProctorTerminate(reason);
        }}
      />
      {/* Header Bar */}
      <div className="session-header-bar">
        <div className="session-header-left">
          <Link to="/adaptive-coach" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <Logo size={28} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 className="session-title">
                {sessionData?.targetSkill} Training Session
              </h2>
              <span className="adaptive-badge-ai">{sessionData?.difficulty || "ADAPTIVE"}</span>
            </div>
            <span style={{ fontSize: "11px", color: "#94A3B8" }}>
              {sessionData?.learningObjective || "Master algorithmic decomposition"}
            </span>
          </div>
        </div>

        {/* Step Tabs */}
        <div className="session-step-tabs">
          {questions.map((q, idx) => {
            const hasResults = testResults[q.id] && testResults[q.id].length > 0;
            const passedCount = hasResults ? testResults[q.id].filter((r) => r.passed).length : 0;
            const totalCount = (q.testCases || []).length || 3;
            const isPassed = hasResults && passedCount === totalCount;
            const isSubmitted = Boolean(submittedPerQuestion[q.id]);

            return (
              <button
                key={q.id}
                className={`step-tab-btn ${currentIndex === idx ? "active" : ""} ${isSubmitted ? (isPassed ? "passed" : "partial") : ""}`}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                Problem {idx + 1}
                {hasResults ? (
                  <span style={{ fontSize: "10px", fontWeight: "700", color: isPassed ? "#34D399" : "#FBBF24" }}>
                    ({passedCount}/{totalCount})
                  </span>
                ) : isSubmitted ? (
                  <span>✓</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Live Per-Question Timer & Session Elapsed */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "10px",
            padding: "6px 14px",
            fontSize: "12px",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
          }}
        >
          <span style={{ color: "#38BDF8", fontWeight: "700" }}>
            ⏱️ Q{currentIndex + 1}: {formatTimer(timeSpentPerQuestion[currentQ?.id] || 0)}
          </span>
          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>
          <span style={{ color: "#94A3B8" }}>
            ⌛ Total: {formatTimer(totalSessionSeconds)}
          </span>
        </div>

        <button
          className="btn-primary-gradient"
          style={{ padding: "8px 20px", fontSize: "13px" }}
          onClick={submitTrainingSession}
          disabled={submitting}
        >
          {submitting ? "Analyzing..." : "Complete Session"}
        </button>
      </div>

      {/* WASM In-Browser Compiler Status Banner */}
      <div
        style={{
          background: wasmReady ? "rgba(16, 185, 129, 0.08)" : "rgba(99, 102, 241, 0.12)",
          borderBottom: `1px solid ${wasmReady ? "rgba(16, 185, 129, 0.25)" : "rgba(99, 102, 241, 0.3)"}`,
          padding: "6px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: wasmReady ? "#34D399" : "#E2E8F0"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span>{wasmReady ? "⚡" : "📦"}</span>
          <span>{wasmMessage}</span>
          {wasmStats && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "3px", background: wasmStats.python?.isCached ? "rgba(52, 211, 153, 0.18)" : "rgba(251, 191, 36, 0.18)", color: wasmStats.python?.isCached ? "#34D399" : "#FBBF24", fontWeight: 600 }}>
                🐍 Python {wasmStats.python?.isCached ? `(${wasmStats.python.sizeMB})` : "(~15MB)"}
              </span>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "3px", background: wasmStats.java?.isCached ? "rgba(52, 211, 153, 0.18)" : "rgba(251, 191, 36, 0.18)", color: wasmStats.java?.isCached ? "#34D399" : "#FBBF24", fontWeight: 600 }}>
                ☕ Java {wasmStats.java?.isCached ? `(${wasmStats.java.sizeMB})` : "(~22MB)"}
              </span>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "3px", background: wasmStats.cpp?.isCached ? "rgba(52, 211, 153, 0.18)" : "rgba(251, 191, 36, 0.18)", color: wasmStats.cpp?.isCached ? "#34D399" : "#FBBF24", fontWeight: 600 }}>
                ⚡ C++ {wasmStats.cpp?.isCached ? `(${wasmStats.cpp.sizeMB})` : "(~20MB)"}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!wasmReady && (
            <span style={{ fontFamily: "monospace", color: "#818CF8", fontWeight: "700" }}>
              {wasmProgress}%
            </span>
          )}
          <button
            type="button"
            onClick={handleManualPrecache}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#CBD5E1",
              borderRadius: "4px",
              padding: "3px 10px",
              fontSize: "11px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            {wasmReady ? "🔄 Re-download All (~57MB)" : "⚡ Download All (~57MB)"}
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      {currentQ && (
        <div className="session-main-split">
          {/* Left Problem Pane */}
          <div className="session-problem-pane">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "rgba(6, 182, 212, 0.15)",
                  color: "#38BDF8",
                }}
              >
                {sessionData?.targetSkill}
              </span>
              {currentQ.pattern && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "rgba(99, 102, 241, 0.15)",
                    color: "#818CF8",
                  }}
                >
                  {currentQ.pattern}
                </span>
              )}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34D399",
                }}
              >
                {currentQ.difficulty || sessionData?.difficulty || "ADAPTIVE"}
              </span>
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 16px", color: "#F8FAFC" }}>
              {currentQ.title}
            </h2>

            <div
              style={{
                fontSize: "14px",
                lineHeight: "1.7",
                color: "#CBD5E1",
                whiteSpace: "pre-wrap",
                marginBottom: "24px",
              }}
            >
              {currentQ.description || currentQ.problemStatement}
            </div>

            {/* Test Cases Overview */}
            <div style={{ marginTop: "24px" }}>
              <h4 style={{ fontSize: "14px", color: "#94A3B8", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Test Cases (3 Total)
              </h4>
              {(currentQ.testCases || []).map((tc, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(30, 41, 59, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    marginBottom: "10px",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: "700", color: "#E2E8F0" }}>Test Case {idx + 1}</span>
                    <span style={{ color: tc.sample ? "#38BDF8" : "#A78BFA", fontSize: "11px" }}>
                      {tc.sample ? "Sample" : "Hidden Evaluation"}
                    </span>
                  </div>
                  <div style={{ fontFamily: "monospace", color: "#94A3B8" }}>
                    <div><strong>Input:</strong> {tc.input?.replace(/\n/g, " \\n ")}</div>
                    <div><strong>Expected:</strong> {tc.expectedOutput}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Code Editor Pane */}
          <div className="session-editor-pane">
            <div className="editor-toolbar">
              <select
                className="language-selector"
                value={language}
                onChange={handleLanguageChange}
              >
                <option value="java">Java 17 (OpenJDK)</option>
                <option value="python">Python 3.11 (Pyodide WASM)</option>
                <option value="cpp">C++ (GCC/Clang)</option>
                <option value="c">C (GCC)</option>
              </select>

              <div className="editor-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  className="btn-run-code"
                  onClick={runTestCases}
                  disabled={executing}
                >
                  {executing ? (
                    <>Running 3 Test Cases...</>
                  ) : (
                    <>
                      <span>▶</span> Run Code
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndSubmitQuestion}
                  disabled={executing}
                  style={{
                    background: submittedPerQuestion[currentQ.id]
                      ? "rgba(16, 185, 129, 0.18)"
                      : "linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)",
                    color: submittedPerQuestion[currentQ.id] ? "#34D399" : "#FFFFFF",
                    border: `1px solid ${submittedPerQuestion[currentQ.id] ? "rgba(16, 185, 129, 0.4)" : "transparent"}`,
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                  }}
                >
                  {submittedPerQuestion[currentQ.id]
                    ? "✓ Solution Submitted"
                    : currentIndex < questions.length - 1
                    ? "Submit Problem & Next →"
                    : "Submit Solution ✓"}
                </button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div style={{ flex: 1, position: "relative" }}>
              <Editor
                height="100%"
                language={language === "cpp" || language === "c" ? "cpp" : language}
                theme="vs-dark"
                value={currentCode}
                onChange={handleCodeChange}
                options={{
                  fontSize: 13,
                  fontFamily: "'Fira Code', 'Courier New', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                }}
              />
            </div>

            {/* Resizable Splitter */}
            <ResizableTestcaseSplitter
              height={resultsPanelHeight}
              onHeightChange={setResultsPanelHeight}
              minHeight={140}
              maxHeight={560}
              label="Execution Results (3 Test Cases)"
            />

            {/* Test Results Output Panel */}
            <div
              className="test-results-panel"
              style={{
                height: `${resultsPanelHeight}px`,
                maxHeight: `${resultsPanelHeight}px`,
                overflowY: "auto"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase" }}>
                  Execution Results {currentQResults.length > 0 && `(${currentQResults.filter((r) => r.passed).length}/3 Passed)`}
                </span>
                {allCurrentPassed && (
                  <span style={{ fontSize: "12px", color: "#34D399", fontWeight: "700" }}>
                    ✓ All 3 Test Cases Passed!
                  </span>
                )}
              </div>

              {currentQResults.length === 0 ? (
                <div style={{ color: "#64748B", fontSize: "12px", padding: "10px 0" }}>
                  Click <strong>Run Code</strong> or <strong>Submit Problem</strong> to execute test cases.
                </div>
              ) : (
                currentQResults.map((res) => (
                  <div key={res.index} className={`testcase-card ${res.passed ? "passed" : "failed"}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "600", color: res.passed ? "#34D399" : "#F43F5E" }}>
                        {res.passed ? "✓ Test Case " + res.index + " Passed" : "✕ Test Case " + res.index + " Failed"} ({res.sample ? "Sample" : "Hidden"})
                      </span>
                      {res.executionType && (
                        <span style={{ fontSize: "10px", color: "#64748B" }}>{res.executionType}</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "monospace", color: "#CBD5E1", fontSize: "11px" }}>
                      <div><strong>Expected:</strong> {res.expected}</div>
                      <div><strong>Your Output:</strong> {res.actual}</div>
                    </div>
                  </div>
                ))
              )}

              {/* Problem Navigation & Confirmation Action Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)"
                }}
              >
                <div>
                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex(currentIndex - 1)}
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#CBD5E1",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      ← Previous Problem
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={handleSaveAndSubmitQuestion}
                    style={{
                      background: submittedPerQuestion[currentQ.id] ? "rgba(16, 185, 129, 0.2)" : "rgba(6, 182, 212, 0.2)",
                      border: `1px solid ${submittedPerQuestion[currentQ.id] ? "#34D399" : "#38BDF8"}`,
                      color: submittedPerQuestion[currentQ.id] ? "#34D399" : "#38BDF8",
                      padding: "6px 16px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {submittedPerQuestion[currentQ.id] ? "✓ Problem Submitted" : "Save & Record Solution"}
                  </button>

                  {currentIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex(currentIndex + 1)}
                      style={{
                        background: "linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)",
                        border: "none",
                        color: "#FFFFFF",
                        padding: "6px 16px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Next Problem →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submitTrainingSession}
                      disabled={submitting}
                      style={{
                        background: "linear-gradient(135deg, #10B981 0%, #06B6D4 100%)",
                        border: "none",
                        color: "#FFFFFF",
                        padding: "6px 18px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {submitting ? "Evaluating..." : "Finish & Submit Entire Session 🚀"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mastery Delta Celebration Modal */}
      {showCelebration && submitResult && (
        <div className="modal-overlay">
          <div className="celebration-modal">
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
              {submitResult.masteryDelta >= 0 ? "🚀" : "📈"}
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#F8FAFC", margin: "0 0 8px" }}>
              Training Session Complete!
            </h2>
            <p style={{ color: "#94A3B8", fontSize: "14px", margin: "0 0 16px" }}>
              You solved {submitResult.passedQuestions} of {submitResult.totalQuestions} questions in {submitResult.targetSkill}.
            </p>

            <div className="delta-pill">
              {submitResult.targetSkill} Mastery: {Math.round(submitResult.oldMastery * 100)}% → {Math.round(submitResult.newMastery * 100)}%
              <span style={{ color: submitResult.masteryDelta >= 0 ? "#34D399" : "#F43F5E", marginLeft: "6px" }}>
                ({submitResult.masteryDelta >= 0 ? "+" : ""}{Math.round(submitResult.masteryDelta * 100)}%)
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
              <button
                className="btn-primary-gradient"
                onClick={() => {
                  setShowCelebration(false);
                  startSession(submitResult.targetSkill);
                }}
              >
                Train {submitResult.targetSkill} Again 🔁
              </button>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#CBD5E1",
                  borderRadius: "12px",
                  padding: "12px 20px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/adaptive-coach")}
              >
                Back to Adaptive Coach Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Malpractice Termination Warning Modal */}
      {malpracticeHalted && (
        <div className="modal-overlay" style={{ background: "rgba(15, 23, 42, 0.92)", backdropFilter: "blur(12px)", zIndex: 99999 }}>
          <div
            className="celebration-modal"
            style={{
              borderColor: "rgba(244, 63, 94, 0.4)",
              background: "linear-gradient(135deg, rgba(30, 27, 46, 0.95), rgba(76, 5, 25, 0.4))",
              boxShadow: "0 25px 50px -12px rgba(244, 63, 94, 0.25)"
            }}
          >
            <div style={{ fontSize: "52px", marginBottom: "12px" }}>🚨</div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#FDA4AF", margin: "0 0 8px" }}>
              Exam Terminated Due to Proctor Violations
            </h2>
            <p style={{ color: "#CBD5E1", fontSize: "13px", lineHeight: "1.6", margin: "0 0 16px" }}>
              {malpracticeHalted.reason}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                margin: "16px 0",
                background: "rgba(0, 0, 0, 0.3)",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid rgba(244, 63, 94, 0.2)",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase" }}>Rank XP Penalty</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#F43F5E" }}>-150 XP</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase" }}>{malpracticeHalted.topic} Competency</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#F43F5E" }}>-10% Drop</div>
              </div>
            </div>

            <p style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "20px" }}>
              Malpractice attempts severely degrade learning accuracy. Your score history and topic leaderboard rank have been updated accordingly.
            </p>

            <button
              className="btn-primary-gradient"
              style={{ background: "linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)", width: "100%" }}
              onClick={() => {
                setMalpracticeHalted(null);
                navigate("/adaptive-coach");
              }}
            >
              Acknowledge & Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
