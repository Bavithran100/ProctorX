import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Client from "../../shared/api/Client";
import { executeWasmOrFallback } from "../exam/wasm/wasmRunner";
import ResizableTestcaseSplitter from "../exam/components/ResizableTestcaseSplitter";
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
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(!sessionData);
  const [executing, setExecuting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [resultsPanelHeight, setResultsPanelHeight] = useState(240);

  useEffect(() => {
    if (!sessionData) {
      // Start training session if not passed via state
      const chosenTopic = new URLSearchParams(window.location.search).get("topic") || "AUTO";
      startSession(chosenTopic);
    } else {
      initQuestionCodes(sessionData.questions);
    }
  }, []);

  async function startSession(topic) {
    try {
      setLoading(true);
      const res = await Client.post("/adaptive/training/start", { topic });
      setSessionData(res.data);
      setQuestions(res.data.questions || []);
      initQuestionCodes(res.data.questions || []);
    } catch (err) {
      console.error("Failed to start adaptive session:", err);
      alert("Failed to initialize session: " + (err.response?.data?.message || err.message));
      navigate("/adaptive-coach");
    } finally {
      setLoading(false);
    }
  }

  function initQuestionCodes(qList) {
    const initialCodes = {};
    (qList || []).forEach((q) => {
      initialCodes[q.id] = BOILERPLATES.java;
    });
    setCodePerQuestion(initialCodes);
  }

  const currentQ = questions[currentIndex] || null;
  const currentCode = currentQ ? (codePerQuestion[currentQ.id] || BOILERPLATES[language]) : "";

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (currentQ) {
      setCodePerQuestion((prev) => ({
        ...prev,
        [currentQ.id]: BOILERPLATES[newLang] || "",
      }));
    }
  };

  const handleCodeChange = (newVal) => {
    if (currentQ) {
      setCodePerQuestion((prev) => ({
        ...prev,
        [currentQ.id]: newVal,
      }));
    }
  };

  const runTestCases = async () => {
    if (!currentQ || executing) return;
    setExecuting(true);
    const qResults = [];

    const testCases = currentQ.testCases || [];
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const out = await executeWasmOrFallback(
          currentCode,
          tc.input || "",
          language,
          "WASM-LOCAL"
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
        });
      } catch (err) {
        qResults.push({
          index: i + 1,
          sample: tc.sample,
          passed: false,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: `Execution Exception: ${err.message}`,
        });
      }
    }

    setTestResults((prev) => ({
      ...prev,
      [currentQ.id]: qResults,
    }));
    setExecuting(false);
  };

  const submitTrainingSession = async () => {
    if (submitting || !sessionData) return;
    try {
      setSubmitting(true);
      const answers = questions.map((q) => ({
        questionId: q.id,
        code: codePerQuestion[q.id] || "",
        language: language,
      }));

      const res = await Client.post("/adaptive/training/submit", {
        sessionId: sessionData.sessionId,
        answers,
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
            const isPassed = hasResults && testResults[q.id].every((r) => r.passed);
            return (
              <button
                key={q.id}
                className={`step-tab-btn ${currentIndex === idx ? "active" : ""} ${isPassed ? "passed" : ""}`}
                onClick={() => setCurrentIndex(idx)}
              >
                Problem {idx + 1}
                {isPassed && <span>✓</span>}
              </button>
            );
          })}
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

              <div className="editor-actions">
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
                  Click <strong>Run Code</strong> to test your solution against the 3 test cases.
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
    </div>
  );
}
