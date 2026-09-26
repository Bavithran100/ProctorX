import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Client from "../../shared/api/Client";
import { isWasmCached, precacheWasmChunks, getWasmCacheStats } from "../exam/wasm/wasmCacheService";
import { executeWasmOrFallback, warmupWasmRuntimes } from "../exam/wasm/wasmRunner";
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

export default function DiagnosticExam() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [language, setLanguage] = useState("java");
  const [codePerQuestion, setCodePerQuestion] = useState({});
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [resultsPanelHeight, setResultsPanelHeight] = useState(240);
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmProgress, setWasmProgress] = useState(0);
  const [wasmMessage, setWasmMessage] = useState("Checking in-browser WASM compilers...");

  useEffect(() => {
    fetchDiagnosticQuestions();
    initWasmEngine();
  }, []);

  async function initWasmEngine() {
    try {
      const cached = await isWasmCached();
      if (cached) {
        const stats = await getWasmCacheStats();
        setWasmReady(true);
        setWasmProgress(100);
        setWasmMessage(`✓ In-Browser Compilers Active (Python 🐍, C++ ⚡, Java ☕) - ${stats.sizeMB} Cached Locally`);
      } else {
        setWasmMessage("⚡ Downloading & Pre-caching In-Browser Compilers (Python, C++, Java)...");
        await precacheWasmChunks((percent, msg) => {
          setWasmProgress(percent);
          setWasmMessage(msg);
          if (percent === 100) setWasmReady(true);
        });
      }
      warmupWasmRuntimes().catch(() => {});
    } catch (err) {
      console.warn("WASM init note:", err);
    }
  }

  async function handleManualPrecache() {
    setWasmReady(false);
    setWasmProgress(0);
    setWasmMessage("Downloading compiler chunks to local disk...");
    await precacheWasmChunks((percent, msg) => {
      setWasmProgress(percent);
      setWasmMessage(msg);
      if (percent === 100) setWasmReady(true);
    });
    warmupWasmRuntimes().catch(() => {});
  }

  async function fetchDiagnosticQuestions() {
    try {
      setLoading(true);
      const res = await Client.get("/adaptive/diagnostic/questions");
      const qList = res.data || [];
      setQuestions(qList);

      const initialCodes = {};
      qList.forEach((q) => {
        initialCodes[q.id] = BOILERPLATES.java;
      });
      setCodePerQuestion(initialCodes);
    } catch (err) {
      console.error("Failed to fetch diagnostic questions:", err);
    } finally {
      setLoading(false);
    }
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

  const submitAssessment = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const submissions = questions.map((q) => ({
        questionId: q.id,
        code: codePerQuestion[q.id] || "",
        language: language,
      }));

      const res = await Client.post("/adaptive/diagnostic/submit", { submissions });
      setDiagnosticResult(res.data);
      setShowCelebration(true);
    } catch (err) {
      console.error("Failed to submit diagnostic assessment:", err);
      alert("Submission error: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="adaptive-session-container" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚡</div>
          <h3 style={{ color: "#F8FAFC", margin: 0 }}>Initializing Diagnostic Calibration...</h3>
          <p style={{ color: "#94A3B8", fontSize: "14px", marginTop: "6px" }}>
            Preparing 6 curated algorithmic problems across the DSA spectrum
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
              <h2 className="session-title">Diagnostic Calibration Assessment</h2>
              <span className="adaptive-badge-ai">Baseline Engine</span>
            </div>
            <span style={{ fontSize: "11px", color: "#94A3B8" }}>
              Question {currentIndex + 1} of {questions.length} • 3 Test Cases Each
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
                Q{idx + 1}
                {isPassed && <span>✓</span>}
              </button>
            );
          })}
        </div>

        <button
          className="btn-primary-gradient"
          style={{ padding: "8px 20px", fontSize: "13px" }}
          onClick={submitAssessment}
          disabled={submitting}
        >
          {submitting ? "Evaluating..." : "Submit Diagnostic"}
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>{wasmReady ? "⚡" : "📦"}</span>
          <span>{wasmMessage}</span>
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
              padding: "2px 8px",
              fontSize: "11px",
              cursor: "pointer"
            }}
          >
            {wasmReady ? "🔄 Re-cache Compilers" : "⚡ Cache Now"}
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
                {currentQ.primaryTopic}
              </span>
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
                Pattern: {currentQ.pattern}
              </span>
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
                {currentQ.difficulty}
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
              {currentQ.description}
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
                      {tc.sample ? "Sample" : "Evaluation"}
                    </span>
                  </div>
                  <div style={{ fontFamily: "monospace", color: "#94A3B8" }}>
                    <div><strong>Input:</strong> {tc.input.replace(/\n/g, " \\n ")}</div>
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

      {/* Celebration & Unlock Modal */}
      {showCelebration && diagnosticResult && (
        <div className="modal-overlay">
          <div className="celebration-modal">
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎯</div>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#F8FAFC", margin: "0 0 8px" }}>
              Diagnostic Calibration Complete!
            </h2>
            <p style={{ color: "#94A3B8", fontSize: "14px", margin: "0 0 20px", lineHeight: "1.6" }}>
              Your 17-dimension competency profile has been mathematically calibrated. Your personalized Adaptive Coach radar is now live!
            </p>

            <div className="delta-pill">
              Overall Readiness: {Math.round((diagnosticResult.overallReadiness || 0.45) * 100)}%
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "20px" }}>
              <button
                className="btn-primary-gradient"
                onClick={() => navigate("/adaptive-coach")}
              >
                Launch Adaptive Coach Radar ⚡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
