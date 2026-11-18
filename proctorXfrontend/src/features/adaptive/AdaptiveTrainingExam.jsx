import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Client from "../../shared/api/Client";
import { isWasmCached, precacheLanguage, getDetailedCacheStats, clearWasmCache } from "../exam/wasm/wasmCacheService";
import { executeWasmOrFallback, warmupWasmRuntimes } from "../exam/wasm/wasmRunner";
import ResizableTestcaseSplitter from "../exam/components/ResizableTestcaseSplitter";
import ProctoringOverlay from "../proctoring/ProctoringOverlay";
import ActiveExamGuard, { releaseGlobalActiveExamLock } from "../exam/ActiveExamGuard";
import Logo from "../../shared/components/Logo";
import AdaptiveOfflineScreen from "./components/AdaptiveOfflineScreen";
import usePageMeta from "../../shared/hooks/usePageMeta";
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

  usePageMeta({
    title: sessionData?.targetSkill ? `Targeted Practice Loop — ${sessionData.targetSkill}` : "Targeted Algorithmic Practice Loop",
    description: "Multi-language interactive coding assessment evaluated live by Dual-AI Semantic Review on AlgoCortex.",
    noindex: true
  });

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
  const [examTerminated, setExamTerminated] = useState(false);
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

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [malpracticeHalted, setMalpracticeHalted] = useState(null);
  const [activeReviewTab, setActiveReviewTab] = useState(0);

  const currentQ = questions[currentIndex] || null;

  // Network Offline / Online Monitor & Local Safe-Cache
  useEffect(() => {
    function handleOfflineDrop() {
      if (currentQ) {
        try {
          const sId = sessionData?.sessionId || sessionId;
          const draftKey = getDraftKey(currentQ.id, sId);
          const currentCode = codePerQuestion[currentQ.id] || "";
          localStorage.setItem(draftKey, currentCode);
          localStorage.setItem(`${draftKey}_lang`, language);
        } catch {}
      }
      setIsOffline(true);
    }

    function handleOnlineRestore() {
      // Let the offline screen detect connectivity and allow smooth continuation
    }

    window.addEventListener("offline", handleOfflineDrop);
    window.addEventListener("online", handleOnlineRestore);

    return () => {
      window.removeEventListener("offline", handleOfflineDrop);
      window.removeEventListener("online", handleOnlineRestore);
    };
  }, [currentQ, codePerQuestion, language, sessionData, sessionId]);

  // Per-Question Live Timer & Freezing Loop (Ticks ONLY for active question, freezes when offline or terminated)
  useEffect(() => {
    if (!currentQ || showCelebration || malpracticeHalted || isOffline || examTerminated) return;
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
      setTotalSessionSeconds((prev) => {
        const nextTotal = prev + 1;
        try {
          const sKey = getSessionStateKey();
          const raw = localStorage.getItem(sKey);
          const parsed = raw ? JSON.parse(raw) : {};
          localStorage.setItem(sKey, JSON.stringify({ ...parsed, totalSessionSeconds: nextTotal }));
        } catch {}
        if (nextTotal >= 1800) {
          clearInterval(interval);
          alert("⏱ 30-Minute Grace Window expired. Submitting adaptive training session...");
          submitTrainingSession();
        }
        return nextTotal;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQ?.id, showCelebration, malpracticeHalted, isOffline]);

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

    if (targetSessionId) {
      const isFin = localStorage.getItem(`proctorx_exam_finalized_adaptive_session_${targetSessionId}`);
      if (isFin) {
        alert("This adaptive training session has already been finalized or terminated.");
        navigate("/adaptive-coach");
        return;
      }
    }

    if (targetSessionId && (isResume || sessionId)) {
      resumeSession(targetSessionId);
    } else if (!sessionData) {
      // Start training session if not passed via state
      const chosenTopic = params.get("topic") || "AUTO";
      const chosenPattern = params.get("pattern") || "AUTO";
      const chosenModality = params.get("modality") || "AUTO";
      startSession(chosenTopic, chosenPattern, chosenModality);
    } else {
      if (sessionData?.remainingSeconds != null) {
        setTotalSessionSeconds(Math.max(0, 1800 - sessionData.remainingSeconds));
      }
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
      if (res.data.remainingSeconds != null) {
        setTotalSessionSeconds(Math.max(0, 1800 - res.data.remainingSeconds));
      }
      initQuestionCodes(qList, res.data.sessionId || sId);
    } catch (err) {
      console.error("Failed to resume session:", err);
      alert(err.response?.data?.message || "Failed to resume session. It may have expired beyond the 30-minute grace period.");
      navigate("/adaptive-coach");
    } finally {
      setLoading(false);
    }
  }

  async function startSession(topic, pattern = "AUTO", modality = "AUTO") {
    try {
      setLoading(true);
      const res = await Client.post("/adaptive/training/start", { topic, pattern, modality }, { timeout: 120000 });
      setSessionData(res.data);
      const qList = res.data.questions || [];
      setQuestions(qList);
      if (res.data.remainingSeconds != null) {
        setTotalSessionSeconds(Math.max(0, 1800 - res.data.remainingSeconds));
      }
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
    if (sId) {
      try {
        localStorage.setItem(`proctorx_exam_finalized_adaptive_session_${sId}`, "FINALIZED");
      } catch {}
    }

    let penaltyData = null;
    try {
      if (sId) {
        const res = await Client.post("/adaptive/training/terminate-malpractice", {
          sessionId: sId,
          violations: proctorViolationsRef.current || 3,
        });
        penaltyData = res.data;
      }
    } catch (err) {
      console.error("Failed to record malpractice termination:", err);
    }

    try {
      releaseGlobalActiveExamLock();
      localStorage.removeItem(getSessionStateKey(sId));
      localStorage.removeItem(`proctorx_tab_heartbeat_adaptive_session_${sId}`);
      localStorage.removeItem(`proctorx_active_tab_adaptive_session_${sId}`);
      (questions || []).forEach((q) => {
        localStorage.removeItem(getDraftKey(q.id, sId));
        localStorage.removeItem(`${getDraftKey(q.id, sId)}_lang`);
      });
    } catch {}

    setMalpracticeHalted({
      reason: reason || "Repeated security violations detected (Tab switch / Full-screen exit / Face violation).",
      topic: penaltyData?.targetSkill || sessionData?.targetSkill || "DSA",
      xpPenalty: penaltyData?.rankXpPenalty != null ? penaltyData.rankXpPenalty : 0,
      masteryPenalty: penaltyData?.masteryPenalty != null ? penaltyData.masteryPenalty : -0.10,
      vectorUpdates: penaltyData?.vectorUpdates || [],
      overallReadiness: penaltyData?.overallReadiness
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
        if (saved.totalSessionSeconds != null) {
          setTotalSessionSeconds((prev) => Math.max(prev, saved.totalSessionSeconds));
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
    let qResults = [];

    try {
      const res = await Client.post("/adaptive/training/run-and-save", {
        sessionId: sessionData?.sessionId || sessionId,
        questionId: currentQ.id,
        code: currentCode,
        language: language,
        timeSpentSeconds: timeSpentPerQuestion[currentQ.id] || 0,
        violations: proctorViolationsRef.current || 0,
      });

      if (res.data && res.data.testCaseResults && res.data.testCaseResults.length > 0) {
        qResults = res.data.testCaseResults.map((r, idx) => ({
          index: r.index || idx + 1,
          category: r.category || `TC_${idx + 1}`,
          sample: r.sample,
          passed: r.passed,
          status: r.status,
          input: r.input,
          expected: r.expected,
          actual: r.actual,
          runtimeMs: r.runtimeMs,
          error: r.error,
          executionType: "SANDBOX",
        }));
      }
    } catch (serverErr) {
      console.warn("Backend run-and-save failed, falling back to local runner:", serverErr);
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
            category: tc.category || (tc.sample ? `SAMPLE_${i + 1}` : "EVALUATION"),
            sample: tc.sample,
            passed,
            status: passed ? "PASSED" : "FAILED",
            input: tc.input,
            expected,
            actual: out.output || out.stdout || (out.error ? `Error: ${out.error}` : "(empty)"),
            executionType: out.executionType,
            error: out.error,
          });
        } catch (err) {
          qResults.push({
            index: i + 1,
            category: tc.category || "EVALUATION",
            sample: tc.sample,
            passed: false,
            status: "RUNTIME_ERROR",
            input: tc.input,
            expected: tc.expectedOutput,
            actual: `Execution Exception: ${err.message}`,
            error: err.message,
          });
        }
      }
    }

    setTestResults((prev) => ({
      ...prev,
      [currentQ.id]: qResults,
    }));
    setExecuting(false);
    return qResults;
  };

  const handleSaveAnswer = () => {
    if (!currentQ) return;
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
          testResults,
          timeSpentPerQuestion,
          codePerQuestion,
          languagePerQuestion
        })
      );
    } catch {}

    try {
      const sId = sessionData?.sessionId || sessionId;
      localStorage.setItem(getDraftKey(currentQ.id, sId), codePerQuestion[currentQ.id] || "");
      localStorage.setItem(`${getDraftKey(currentQ.id, sId)}_lang`, language);
    } catch {}
  };

  const handleSaveAndSubmitQuestion = handleSaveAnswer;

  const submitTrainingSession = async () => {
    if (submitting || !sessionData) return;

    // Check if any question has not been saved/attempted
    const unattempted = questions.filter((q) => !(codePerQuestion[q.id] || "").trim());
    if (unattempted.length > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unattempted.length} unattempted problem(s). Are you sure you want to finalize and submit the exam for Bayesian calibration?`
      );
      if (!confirmSubmit) return;
    }

    try {
      setExamTerminated(true);
      setSubmitting(true);

      const sId = sessionData.sessionId;
      try {
        localStorage.setItem(`proctorx_exam_finalized_adaptive_session_${sId}`, "FINALIZED");
      } catch {}

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
        releaseGlobalActiveExamLock();
        localStorage.removeItem(getSessionStateKey(sId));
        localStorage.removeItem(`proctorx_strikes_adaptive_session_${sId}`);
        localStorage.removeItem(`proctorx_tab_heartbeat_adaptive_session_${sId}`);
      } catch {}
      questions.forEach((q) => {
        try {
          localStorage.removeItem(getDraftKey(q.id, sId));
          localStorage.removeItem(`${getDraftKey(q.id, sId)}_lang`);
        } catch {}
      });

      setSubmitResult(res.data);
      setShowCelebration(true);
    } catch (err) {
      console.error("Failed to submit training session:", err);
      setExamTerminated(false);
      alert("Submission failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="adaptive-session-container" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0B0F19", position: "relative", overflow: "hidden" }}>
        {/* Ambient background glows */}
        <div style={{ position: "absolute", width: "450px", height: "450px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)", top: "20%", left: "30%", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: "350px", height: "350px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)", bottom: "20%", right: "25%", filter: "blur(60px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "560px", width: "90%", textAlign: "center", zIndex: 10, background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "20px", padding: "40px 32px", boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7)", backdropFilter: "blur(12px)" }}>
          {/* Animated Brain / Orb Icon */}
          <div style={{ position: "relative", width: "80px", height: "80px", margin: "0 auto 24px" }}>
            <div style={{ position: "absolute", inset: "-4px", borderRadius: "50%", border: "2px solid rgba(99, 102, 241, 0.4)", animation: "spin 8s linear infinite" }} />
            <div style={{ position: "absolute", inset: "-10px", borderRadius: "50%", border: "2px dashed rgba(52, 211, 153, 0.4)", animation: "spin-reverse 12s linear infinite" }} />
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(16, 185, 129, 0.3) 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", boxShadow: "0 0 25px rgba(99, 102, 241, 0.35)" }}>
              ⚡
            </div>
          </div>

          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#F8FAFC", margin: "0 0 10px", letterSpacing: "-0.01em" }}>
            Synthesizing Targeted Challenges
          </h2>
          <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: "1.6", margin: "0 0 28px" }}>
            AlgoCortex Cognitive Engine is calibrating 3 progressive algorithmic problems tuned to your Bayesian Skill Frontier.
          </p>

          {/* Stepper Progress */}
          <div style={{ textAlign: "left", background: "rgba(0, 0, 0, 0.35)", borderRadius: "12px", padding: "16px 20px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#10B981", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold" }}>✓</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#F1F5F9" }}>ZPD & Error Focus Profiling</div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Bayesian Knowledge Tracing (BKT) & IRT θ calibrated</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#6366F1", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold" }}>⏳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#818CF8" }}>Sequential 1-by-1 Problem Synthesis</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>Groq AI Llama-3.3-70B assembling Warmup → Core Pattern → Defect Inoculation</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(255, 255, 255, 0.1)", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>⚙️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#94A3B8" }}>Ground-Truth Sandbox Verification</div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Executing canonical solutions & synthesizing N=25,000 scale stress tests</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#34D399" }} />
            Please wait 15–30 seconds for physical sandbox compilation & test verification...
          </div>
        </div>
      </div>
    );
  }

  if ((submitting || examTerminated) && !showCelebration) {
    return (
      <div className="adaptive-session-container" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0B0F19", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, transparent 70%)", top: "15%", left: "25%", filter: "blur(70px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)", bottom: "15%", right: "20%", filter: "blur(70px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "580px", width: "90%", textAlign: "center", zIndex: 10, background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(124, 58, 237, 0.3)", borderRadius: "20px", padding: "42px 36px", boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8)", backdropFilter: "blur(14px)" }}>
          {/* Animated Pulse Ring */}
          <div style={{ position: "relative", width: "88px", height: "88px", margin: "0 auto 24px" }}>
            <div style={{ position: "absolute", inset: "-6px", borderRadius: "50%", border: "2px solid rgba(168, 85, 247, 0.4)", animation: "spin 6s linear infinite" }} />
            <div style={{ position: "absolute", inset: "-14px", borderRadius: "50%", border: "2px dashed rgba(52, 211, 153, 0.4)", animation: "spin-reverse 10s linear infinite" }} />
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED 0%, #10B981 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "38px", boxShadow: "0 0 30px rgba(124, 58, 237, 0.4)" }}>
              🧬
            </div>
          </div>

          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#F8FAFC", margin: "0 0 10px", letterSpacing: "-0.01em" }}>
            Calibrating Cognitive Vectors
          </h2>
          <p style={{ color: "#CBD5E1", fontSize: "14px", lineHeight: "1.6", margin: "0 0 28px" }}>
            Exam interaction finalized. The AlgoCortex engine is executing full hidden test suites and performing sequential Bayesian knowledge updates.
          </p>

          {/* Real-time Stepper Progress */}
          <div style={{ textAlign: "left", background: "rgba(0, 0, 0, 0.35)", borderRadius: "12px", padding: "18px 22px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#10B981", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>✓</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#F1F5F9" }}>Exam Session Finalized</div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Code snapshots, time telemetry & proctor integrity sealed</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#6366F1", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>⚡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#818CF8" }}>Sequential Sandboxed Test Suite Execution</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>Running all 5 test cases per problem (including scale stress N=25,000)</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(168, 85, 247, 0.35)", color: "#C084FC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>🤖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#C084FC" }}>Dual-AI Semantic Review</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>Verifying pattern fidelity, asymptotic optimality & anti-hardcoding</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(52, 211, 153, 0.3)", color: "#34D399", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>📈</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#34D399" }}>Bayesian Knowledge Tracing (BKT + IRT) Update</div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>Calculating Markov transition probabilities & skill mastery posteriors</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#818CF8" }} />
            Evaluating solutions across sandboxes... Please do not close this window.
          </div>
        </div>
      </div>
    );
  }

  const currentQResults = currentQ ? (testResults[currentQ.id] || []) : [];
  const allCurrentPassed = currentQResults.length > 0 && currentQResults.every((r) => r.passed);

  return (
    <ActiveExamGuard
      examId={sessionData?.sessionId || sessionId || "adaptive"}
      examType="ADAPTIVE_TRAINING"
      title={`${sessionData?.targetSkill || "DSA"} Adaptive Training`}
    >
      <div className="adaptive-session-container">
      {/* Autonomous AI Proctoring Overlay */}
      {!examTerminated && !showCelebration && (
        <ProctoringOverlay
          examId={`adaptive_session_${sessionData?.sessionId || sessionId || "practice"}`}
          onViolation={() => {
            proctorViolationsRef.current = (proctorViolationsRef.current || 0) + 1;
          }}
          onTerminate={(reason) => {
            handleProctorTerminate(reason);
          }}
        />
      )}
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

        {/* Reconnect Attempts Counter Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: (sessionData?.reconnectCount || 0) >= 3 ? "rgba(239, 68, 68, 0.2)" : "rgba(30, 41, 59, 0.8)",
            border: `1px solid ${(sessionData?.reconnectCount || 0) >= 3 ? "#EF4444" : "rgba(255, 255, 255, 0.12)"}`,
            borderRadius: "10px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "700",
            color: (sessionData?.reconnectCount || 0) >= 3 ? "#FCA5A5" : "#CBD5E1"
          }}
        >
          <span>🔄 Re-entry: <strong>{sessionData?.reconnectCount || 1} / 3</strong></span>
          {(sessionData?.reconnectCount || 0) >= 3 && (
            <span style={{ color: "#EF4444", fontSize: "11px", fontWeight: 800 }}>⚠️ FINAL</span>
          )}
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
          <span style={{ color: "#A78BFA", fontWeight: "700" }}>
            ⏱️ Q{currentIndex + 1}: {formatTimer(timeSpentPerQuestion[currentQ?.id] || 0)}
          </span>
          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>
          <span style={{ color: "#94A3B8" }}>
            ⌛ Elapsed: {formatTimer(totalSessionSeconds)}
          </span>
          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>
          <span style={{ color: totalSessionSeconds >= 1500 ? "#EF4444" : "#FBBF24", fontWeight: "600" }}>
            ⏳ Left: {formatTimer(Math.max(0, 1800 - totalSessionSeconds))}
          </span>
        </div>

        <button
          className="btn-primary-gradient"
          style={{ padding: "8px 20px", fontSize: "13px", fontWeight: 700 }}
          onClick={submitTrainingSession}
          disabled={submitting}
        >
          {submitting ? "Calibrating..." : "🚀 Submit Exam"}
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
              {/* Question Origin Badge (AI Generated vs Curated Backup) */}
              {currentQ.generationSource === "CURATED_BACKUP" ? (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    color: "#FBBF24",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  title="Served from verified institutional problem benchmark bank."
                >
                  <span>🛡️ Curated Benchmark Bank</span>
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, rgba(124, 58, 237, 0.22) 0%, rgba(16, 185, 129, 0.22) 100%)",
                    border: "1px solid rgba(52, 211, 153, 0.45)",
                    color: "#34D399",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.15)"
                  }}
                  title={`AI Engine: ${currentQ.modelName || 'openai/gpt-oss-120b'} | Calibrated with Bayesian Knowledge Tracing (BKT) & Item Response Theory (IRT)`}
                >
                  <span>✨ AI Generated</span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: "800",
                      background: "rgba(0, 0, 0, 0.35)",
                      color: "#A7F3D0",
                      padding: "2px 5px",
                      borderRadius: "4px",
                      letterSpacing: "0.04em"
                    }}
                  >
                    BKT VECTOR CALIBRATED
                  </span>
                </span>
              )}

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "rgba(124, 58, 237, 0.15)",
                  color: "#A78BFA",
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

            {/* Bayesian Vector Calibration Strip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "rgba(15, 23, 42, 0.65)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "11px",
                color: "#94A3B8",
                flexWrap: "wrap",
                gap: "8px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "#34D399" }}>🧠 Cognitive Vector:</span>
                <span>
                  BKT Mastery: <strong style={{ color: "#F1F5F9" }}>{Math.round((currentQ.targetBktMastery != null ? currentQ.targetBktMastery : (sessionData?.oldMastery || 0.25)) * 100)}%</strong>
                </span>
                <span style={{ opacity: 0.4 }}>•</span>
                <span>
                  IRT Latent Ability: <strong style={{ color: "#818CF8" }}>θ = {currentQ.targetIrtTheta != null ? currentQ.targetIrtTheta.toFixed(2) : "-1.40"}</strong>
                </span>
                {currentQ.calibratedErrorFocus && currentQ.calibratedErrorFocus !== "GENERAL_BOUNDARY_RESILIENCE" && (
                  <>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <span style={{ color: "#FBBF24" }}>
                      Targeted Defect: <strong>{currentQ.calibratedErrorFocus}</strong>
                    </span>
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Engine: <code style={{ color: "#CBD5E1", fontSize: "10px" }}>{currentQ.modelName || "openai/gpt-oss-120b"}</code></span>
              </div>
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
              {(currentQ.description || currentQ.problemStatement || "")
                .replace(/\\r\\n/g, "\n")
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "    ")}
            </div>

            {/* Test Cases Overview */}
            <div style={{ marginTop: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ fontSize: "14px", color: "#94A3B8", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Test Cases ({(currentQ.testCases || []).length} Total)
                </h4>
                <span style={{ fontSize: "11px", color: "#64748B" }}>5-Case Calibrated Suite</span>
              </div>
              {(currentQ.testCases || []).map((tc, idx) => {
                const cat = (tc.category || "").toUpperCase();
                const isStress = cat === "STRESS";
                const isTrap = cat === "DEFECT_TRAP";
                const isBoundary = cat === "BOUNDARY";

                return (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(30, 41, 59, 0.7)",
                      border: `1px solid ${isStress ? "rgba(245, 158, 11, 0.3)" : (isTrap ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.08)")}`,
                      borderRadius: "10px",
                      padding: "12px 16px",
                      marginBottom: "10px",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontWeight: "700", color: "#E2E8F0" }}>
                        Test Case {idx + 1}
                        {cat && (
                          <span style={{
                            marginLeft: "8px",
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: 700,
                            background: isStress ? "rgba(245, 158, 11, 0.2)" : (isTrap ? "rgba(239, 68, 68, 0.2)" : (isBoundary ? "rgba(168, 85, 247, 0.2)" : "rgba(16, 185, 129, 0.2)")),
                            color: isStress ? "#FBBF24" : (isTrap ? "#F87171" : (isBoundary ? "#C084FC" : "#34D399"))
                          }}>
                            {cat}
                          </span>
                        )}
                      </span>
                      <span style={{ color: tc.sample ? "#10B981" : "#A78BFA", fontSize: "11px" }}>
                        {tc.sample ? "Sample" : "Hidden Evaluation"}
                      </span>
                    </div>
                    <div style={{ marginTop: "6px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: "2px" }}>Input:</div>
                      <pre
                        style={{
                          margin: "0 0 6px",
                          padding: "6px 10px",
                          background: "rgba(0, 0, 0, 0.4)",
                          borderRadius: "6px",
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          fontSize: "12px",
                          color: "#E2E8F0"
                        }}
                      >
                        {tc.input && tc.input.length > 200
                          ? tc.input.substring(0, 200) + " ... [scaled N=" + tc.input.length + "]"
                          : (tc.input || "(empty)")}
                      </pre>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: "2px" }}>Expected Output:</div>
                      <pre
                        style={{
                          margin: "0",
                          padding: "6px 10px",
                          background: "rgba(0, 0, 0, 0.4)",
                          borderRadius: "6px",
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          fontSize: "12px",
                          color: "#34D399"
                        }}
                      >
                        {tc.expectedOutput || "(empty)"}
                      </pre>
                    </div>
                  </div>
                );
              })}
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
                  onClick={handleSaveAnswer}
                  disabled={executing}
                  style={{
                    background: submittedPerQuestion[currentQ.id]
                      ? "rgba(16, 185, 129, 0.18)"
                      : "rgba(255, 255, 255, 0.08)",
                    color: submittedPerQuestion[currentQ.id] ? "#34D399" : "#E2E8F0",
                    border: `1px solid ${submittedPerQuestion[currentQ.id] ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.15)"}`,
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
                  <span>💾</span>
                  {submittedPerQuestion[currentQ.id] ? "Answer Saved ✓" : "Save Answer"}
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
              label={`Execution Results (${(currentQ?.testCases || []).length || 5} Test Cases)`}
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
                  Execution Results {currentQResults.length > 0 && `(${currentQResults.filter((r) => r.passed).length}/${currentQResults.length} Passed)`}
                </span>
                {allCurrentPassed && (
                  <span style={{ fontSize: "12px", color: "#34D399", fontWeight: "700" }}>
                    ✓ All {currentQResults.length} Test Cases Passed!
                  </span>
                )}
              </div>

              {currentQResults.length === 0 ? (
                <div style={{ color: "#64748B", fontSize: "12px", padding: "10px 0" }}>
                  Click <strong>Run Code</strong> to execute and save your solution against all 5 calibrated test cases (including scale stress).
                </div>
              ) : (
                currentQResults.map((res) => {
                  const isTle = res.status === "TIME_LIMIT_EXCEEDED" || (res.runtimeMs != null && res.runtimeMs >= 3000);
                  const cat = (res.category || "").toUpperCase();
                  const isStress = cat === "STRESS";
                  const isTrap = cat === "DEFECT_TRAP";
                  const isBoundary = cat === "BOUNDARY";

                  return (
                    <div
                      key={res.index}
                      className={`testcase-card ${res.passed ? "passed" : "failed"}`}
                      style={{
                        borderColor: isTle ? "rgba(245, 158, 11, 0.5)" : undefined,
                        background: isTle ? "rgba(245, 158, 11, 0.08)" : undefined
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "700", color: isTle ? "#FBBF24" : (res.passed ? "#34D399" : "#F43F5E") }}>
                            {res.passed ? `✓ Test Case ${res.index} Passed` : isTle ? `⏳ Test Case ${res.index} TLE` : `✕ Test Case ${res.index} Failed`}
                          </span>
                          {cat && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "700",
                                background: isStress ? "rgba(245, 158, 11, 0.2)" : (isTrap ? "rgba(239, 68, 68, 0.2)" : (isBoundary ? "rgba(168, 85, 247, 0.2)" : "rgba(16, 185, 129, 0.2)")),
                                color: isStress ? "#FBBF24" : (isTrap ? "#F87171" : (isBoundary ? "#C084FC" : "#34D399"))
                              }}
                            >
                              {cat}
                            </span>
                          )}
                          {isTle && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "800",
                                background: "#B45309",
                                color: "#FEF3C7",
                                padding: "2px 8px",
                                borderRadius: "4px"
                              }}
                            >
                              ⏳ 408 TLE (Time Limit Exceeded)
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#94A3B8" }}>
                          {res.runtimeMs != null && (
                            <span style={{ color: res.runtimeMs >= 3000 ? "#F59E0B" : "#94A3B8" }}>
                              ⚡ {res.runtimeMs}ms
                            </span>
                          )}
                          <span>{res.sample ? "Sample" : "Hidden"}</span>
                        </div>
                      </div>
                      <div style={{ fontFamily: "monospace", color: "#CBD5E1", fontSize: "11px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {res.input && (
                          <div>
                            <strong style={{ color: "#94A3B8" }}>Input:</strong>{" "}
                            {res.input.length > 100 ? res.input.substring(0, 100) + " ... [scaled]" : res.input.replace(/\n/g, " \\n ")}
                          </div>
                        )}
                        <div><strong style={{ color: "#94A3B8" }}>Expected:</strong> {res.expected}</div>
                        <div>
                          <strong style={{ color: "#94A3B8" }}>Your Output:</strong>{" "}
                          <span style={{ color: isTle ? "#FBBF24" : (res.passed ? "#34D399" : "#F87171") }}>
                            {isTle ? "Timed Out (>3000ms CPU execution cap)" : (res.actual || "(empty)")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
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
                  {currentIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex(currentIndex + 1)}
                      style={{
                        background: "#FFFFFF",
                        border: "none",
                        color: "#07090E",
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
                        background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                        border: "none",
                        color: "#FFFFFF",
                        padding: "6px 18px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {submitting ? "Calibrating..." : "🚀 Submit Exam"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Evaluated Results & Semantic Code Review Modal */}
      {showCelebration && submitResult && (
        <div className="modal-overlay" style={{ background: "rgba(10, 14, 23, 0.94)", backdropFilter: "blur(14px)", zIndex: 99999 }}>
          <div
            className="celebration-modal"
            style={{
              maxWidth: "920px",
              width: "95%",
              maxHeight: "92vh",
              overflowY: "auto",
              textAlign: "left",
              padding: "28px 32px",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.98))",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.15)"
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "44px", marginBottom: "8px" }}>
                {submitResult.masteryDelta >= 0 ? "🚀" : "📈"}
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#F8FAFC", margin: "0 0 6px" }}>
                Training Session Evaluated & Calibrated!
              </h2>
              <p style={{ color: "#94A3B8", fontSize: "14px", margin: "0 0 14px" }}>
                Solved {submitResult.passedQuestions} of {submitResult.totalQuestions} questions in {submitResult.targetSkill}
              </p>

              <div className="delta-pill">
                {submitResult.targetSkill} Mastery: {Math.round(submitResult.oldMastery * 100)}% → {Math.round(submitResult.newMastery * 100)}%
                <span style={{ color: submitResult.masteryDelta >= 0 ? "#34D399" : "#F43F5E", marginLeft: "6px" }}>
                  ({submitResult.masteryDelta >= 0 ? "+" : ""}{Math.round(submitResult.masteryDelta * 100)}%)
                </span>
              </div>
            </div>

            {/* Proctoring Integrity Banner */}
            <div
              style={{
                background: submitResult.integrityStatus === "FORGIVEN" || (submitResult.integrityFactor || 1) >= 1.0
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(245, 158, 11, 0.12)",
                border: `1px solid ${submitResult.integrityStatus === "FORGIVEN" || (submitResult.integrityFactor || 1) >= 1.0 ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                borderRadius: "10px",
                padding: "10px 14px",
                marginBottom: "20px",
                fontSize: "12px",
                color: submitResult.integrityStatus === "FORGIVEN" || (submitResult.integrityFactor || 1) >= 1.0 ? "#34D399" : "#FBBF24",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "16px" }}>
                {submitResult.integrityStatus === "FORGIVEN" || (submitResult.integrityFactor || 1) >= 1.0 ? "🛡️" : "⚠️"}
              </span>
              <div>
                <strong>
                  Proctor Integrity: {Math.round((submitResult.integrityFactor || 1.0) * 100)}%
                </strong>
                {" — "}
                {submitResult.integrityStatus === "FORGIVEN" || (submitResult.integrityFactor || 1) >= 1.0
                  ? "Minor tab switches and glances were forgiven (0% penalty). Full Bayesian cognitive update awarded."
                  : "Gentle damping applied due to minor window focus events."}
              </div>
            </div>

            {/* Sequential Markovian Trajectory */}
            {submitResult.cognitiveTrajectory && submitResult.cognitiveTrajectory.length > 0 && (
              <div style={{ marginBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    🧬 Sequential Markovian Cognitive Trajectory (Chain: Q1 → Q2 → Q3)
                  </div>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>
                    Each problem sequentially calibrates from the previous question's posterior
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: `repeat(${submitResult.cognitiveTrajectory.length}, 1fr)`, gap: "12px" }}>
                  {submitResult.cognitiveTrajectory.map((step, sIdx) => {
                    const stepDeltaPct = Math.round((step.stepDelta || 0) * 100);
                    const priorPct = Math.round((step.priorMastery != null ? step.priorMastery : submitResult.oldMastery) * 100);
                    const postPct = Math.round((step.intermediateMastery != null ? step.intermediateMastery : (priorPct / 100 + (step.stepDelta || 0))) * 100);
                    const isSelected = activeReviewTab === sIdx;

                    return (
                      <div
                        key={sIdx}
                        style={{
                          background: isSelected ? "rgba(30, 41, 59, 0.95)" : "rgba(30, 41, 59, 0.55)",
                          border: isSelected ? "1px solid #38BDF8" : "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          padding: "14px",
                          fontSize: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected ? "0 4px 20px rgba(56, 189, 248, 0.2)" : "none"
                        }}
                        onClick={() => setActiveReviewTab(sIdx)}
                        title="Click to view full test execution & AI review"
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontWeight: "700", color: "#38BDF8", fontSize: "12px" }}>
                            Step {step.step}: Problem {step.step}
                          </span>
                          <span
                            style={{
                              color: stepDeltaPct > 0 ? "#34D399" : (stepDeltaPct < 0 ? "#F87171" : "#94A3B8"),
                              fontWeight: "700",
                              fontSize: "11px",
                              background: stepDeltaPct > 0 ? "rgba(16, 185, 129, 0.15)" : (stepDeltaPct < 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.06)"),
                              padding: "2px 6px",
                              borderRadius: "4px"
                            }}
                          >
                            {stepDeltaPct > 0 ? `+${stepDeltaPct}%` : `${stepDeltaPct}%`}
                          </span>
                        </div>

                        <div style={{ color: "#F1F5F9", fontSize: "12px", fontWeight: "600", marginBottom: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {step.title}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94A3B8", fontSize: "11px", marginBottom: "10px" }}>
                          <span>Passed: <strong style={{ color: step.passedCount === step.totalCount ? "#34D399" : "#FBBF24" }}>{step.passedCount}/{step.totalCount}</strong></span>
                          <span style={{ fontSize: "10px", color: "#64748B" }}>
                            {sIdx < submitResult.cognitiveTrajectory.length - 1 ? "Chains to Step " + (sIdx + 2) + " ➔" : "Final State"}
                          </span>
                        </div>

                        {/* Explicit Prior -> Posterior Markov Transition */}
                        <div
                          style={{
                            background: "rgba(0, 0, 0, 0.45)",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "11px"
                          }}
                        >
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: "9px", color: "#64748B", textTransform: "uppercase" }}>Prior</div>
                            <div style={{ fontWeight: "700", color: "#CBD5E1" }}>{priorPct}%</div>
                          </div>
                          <div style={{ textAlign: "center", color: stepDeltaPct > 0 ? "#34D399" : (stepDeltaPct < 0 ? "#F87171" : "#94A3B8"), fontWeight: 700, fontSize: "10px" }}>
                            <span>──[ {stepDeltaPct > 0 ? `+${stepDeltaPct}%` : `${stepDeltaPct}%`} ]──▶</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "9px", color: "#64748B", textTransform: "uppercase" }}>Posterior</div>
                            <div style={{ fontWeight: "700", color: "#38BDF8" }}>{postPct}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Question Evaluator Breakdown Tabs */}
            {submitResult.questionEvaluations && submitResult.questionEvaluations.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "8px", marginBottom: "14px" }}>
                  {submitResult.questionEvaluations.map((qe, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => setActiveReviewTab(qIdx)}
                      style={{
                        background: activeReviewTab === qIdx ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
                        border: `1px solid ${activeReviewTab === qIdx ? "#38BDF8" : "transparent"}`,
                        color: activeReviewTab === qIdx ? "#38BDF8" : "#94A3B8",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      Problem {qIdx + 1} Review ({qe.passedCount}/{qe.totalCount})
                    </button>
                  ))}
                </div>

                {/* Active Question Content */}
                {(() => {
                  const qData = submitResult.questionEvaluations[activeReviewTab] || submitResult.questionEvaluations[0];
                  if (!qData) return null;
                  const sem = qData.semanticReview || {};
                  const tStep = (submitResult.cognitiveTrajectory || [])[activeReviewTab];
                  const pPrior = Math.round((tStep?.priorMastery != null ? tStep.priorMastery : (qData.priorMastery != null ? qData.priorMastery : submitResult.oldMastery)) * 100);
                  const pPost = Math.round((tStep?.intermediateMastery != null ? tStep.intermediateMastery : (qData.intermediateMastery != null ? qData.intermediateMastery : (pPrior / 100 + (qData.stepDelta || 0)))) * 100);
                  const pDelta = Math.round((qData.stepDelta || 0) * 100);

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Title & Metadata */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#F8FAFC" }}>{qData.title}</h3>
                          <div style={{ display: "flex", gap: "8px", fontSize: "11px", alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ color: "#38BDF8" }}>Pattern: {qData.pattern}</span>
                            <span style={{ color: "#94A3B8" }}>•</span>
                            <span style={{ color: "#FBBF24" }}>Difficulty: {qData.difficulty}</span>
                            <span style={{ color: "#94A3B8" }}>•</span>
                            <span
                              style={{
                                background: pDelta > 0 ? "rgba(16, 185, 129, 0.15)" : (pDelta < 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.08)"),
                                border: `1px solid ${pDelta > 0 ? "rgba(16, 185, 129, 0.35)" : (pDelta < 0 ? "rgba(239, 68, 68, 0.35)" : "rgba(255, 255, 255, 0.15)")}`,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                color: pDelta > 0 ? "#34D399" : (pDelta < 0 ? "#F87171" : "#CBD5E1"),
                                fontWeight: "700"
                              }}
                            >
                              Markov Shift: {pPrior}% → {pPost}% ({pDelta > 0 ? `+${pDelta}%` : `${pDelta}%`})
                            </span>
                          </div>
                        </div>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontWeight: "700",
                          fontSize: "12px",
                          background: qData.passedCount === qData.totalCount ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          color: qData.passedCount === qData.totalCount ? "#34D399" : "#FBBF24"
                        }}>
                          {qData.passedCount === qData.totalCount ? "✓ All Passed" : `${qData.passedCount}/${qData.totalCount} Passed`}
                        </span>
                      </div>

                      {/* Dual-AI Semantic Code Review Card */}
                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.8)",
                          border: "1px solid rgba(56, 189, 248, 0.25)",
                          borderRadius: "12px",
                          padding: "16px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "700", color: "#38BDF8", display: "flex", alignItems: "center", gap: "6px" }}>
                            🤖 Dual-AI Semantic Code Review
                          </span>
                          <span style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontWeight: "700",
                            background: sem.verdict === "NO_IMPLEMENTATION" ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.15)",
                            color: sem.verdict === "NO_IMPLEMENTATION" ? "#EF4444" : "#38BDF8"
                          }}>
                            {sem.verdict || "VERIFIED"}
                          </span>
                        </div>

                        {/* Semantic Score Metrics */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px" }}>
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: "8px", textAlign: "center" }}>
                            <div style={{ fontSize: "10px", color: "#94A3B8" }}>Pattern Fidelity</div>
                            <div style={{ fontSize: "14px", fontWeight: "800", color: (sem.patternFidelityScore ?? 0) >= 0.7 ? "#34D399" : ((sem.patternFidelityScore ?? 0) > 0 ? "#FBBF24" : "#EF4444") }}>
                              {Math.round((sem.patternFidelityScore ?? 0.0) * 100)}%
                            </div>
                          </div>
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: "8px", textAlign: "center" }}>
                            <div style={{ fontSize: "10px", color: "#94A3B8" }}>Asymptotic Optimality</div>
                            <div style={{ fontSize: "14px", fontWeight: "800", color: (sem.asymptoticOptimalityScore ?? 0) >= 0.7 ? "#38BDF8" : ((sem.asymptoticOptimalityScore ?? 0) > 0 ? "#FBBF24" : "#EF4444") }}>
                              {Math.round((sem.asymptoticOptimalityScore ?? 0.0) * 100)}%
                            </div>
                          </div>
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: "8px", textAlign: "center" }}>
                            <div style={{ fontSize: "10px", color: "#94A3B8" }}>Anti-Hardcoding</div>
                            <div style={{ fontSize: "14px", fontWeight: "800", color: (sem.antiHardcodingScore ?? 0) >= 0.7 ? "#A78BFA" : ((sem.antiHardcodingScore ?? 0) > 0 ? "#FBBF24" : "#EF4444") }}>
                              {Math.round((sem.antiHardcodingScore ?? 0.0) * 100)}%
                            </div>
                          </div>
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: "8px", textAlign: "center" }}>
                            <div style={{ fontSize: "10px", color: "#94A3B8" }}>Semantic Multiplier</div>
                            <div style={{ fontSize: "14px", fontWeight: "800", color: (sem.semanticMultiplier ?? 0) >= 0.9 ? "#FBBF24" : ((sem.semanticMultiplier ?? 0) > 0 ? "#F59E0B" : "#EF4444") }}>
                              {sem.semanticMultiplier ?? 0.0}x
                            </div>
                          </div>
                        </div>

                        {/* Syntax Slip Shield Callout */}
                        {sem.isIsolatedSyntaxSlip && (
                          <div style={{
                            background: "rgba(59, 130, 246, 0.15)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            fontSize: "11px",
                            color: "#93C5FD",
                            marginBottom: "10px"
                          }}>
                            🛡️ <strong>Syntax Slip Shield Active:</strong> Algorithmic blueprint was sound ({Math.round((sem.patternFidelityScore ?? 0.9) * 100)}% fidelity). The error was recognized as an isolated typographical slip, shielding your core concept mastery.
                          </div>
                        )}

                        {/* Constructive Pedagogical Feedback */}
                        {sem.feedback && (
                          <div style={{ fontSize: "12px", color: "#CBD5E1", lineHeight: "1.5", fontStyle: "italic" }}>
                            "{sem.feedback}"
                          </div>
                        )}
                      </div>

                      {/* All 5 Test Cases Output Table */}
                      <div>
                        <h4 style={{ fontSize: "12px", color: "#94A3B8", textTransform: "uppercase", margin: "0 0 8px" }}>
                          Test Cases Execution Outputs (5 Cases)
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {(qData.testCaseResults || []).map((tc, tcIdx) => {
                            const isTle = tc.status === "TIME_LIMIT_EXCEEDED" || (tc.runtimeMs != null && tc.runtimeMs >= 3000);
                            const cat = (tc.category || `TC_${tcIdx + 1}`).toUpperCase();
                            const isPassed = tc.passed || tc.status === "PASSED";

                            return (
                              <div
                                key={tcIdx}
                                style={{
                                  background: "rgba(30, 41, 59, 0.5)",
                                  border: `1px solid ${isTle ? "rgba(245, 158, 11, 0.4)" : (isPassed ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)")}`,
                                  borderRadius: "8px",
                                  padding: "10px 14px",
                                  fontSize: "11px"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontWeight: "700", color: isTle ? "#FBBF24" : (isPassed ? "#34D399" : "#F43F5E") }}>
                                      {isPassed ? `✓ Case ${tcIdx + 1}` : isTle ? `⏳ Case ${tcIdx + 1} TLE` : `✕ Case ${tcIdx + 1} Failed`}
                                    </span>
                                    <span style={{
                                      fontSize: "10px",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      fontWeight: 700,
                                      background: cat === "STRESS" ? "rgba(245, 158, 11, 0.2)" : (cat === "DEFECT_TRAP" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.1)"),
                                      color: cat === "STRESS" ? "#FBBF24" : (cat === "DEFECT_TRAP" ? "#F87171" : "#E2E8F0")
                                    }}>
                                      {cat}
                                    </span>
                                    {isTle && (
                                      <span style={{ fontSize: "10px", fontWeight: "800", background: "#B45309", color: "#FEF3C7", padding: "1px 6px", borderRadius: "4px" }}>
                                        ⏳ 408 TLE
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ color: "#94A3B8" }}>
                                    {tc.runtimeMs != null && `⚡ ${tc.runtimeMs}ms`} ({tc.sample ? "Sample" : "Hidden"})
                                  </span>
                                </div>
                                <div style={{ fontFamily: "monospace", color: "#94A3B8", display: "flex", flexDirection: "column", gap: "2px" }}>
                                  {tc.input && (
                                    <div><strong>Input:</strong> {tc.input.length > 80 ? tc.input.substring(0, 80) + " ... [scaled]" : tc.input.replace(/\n/g, " \\n ")}</div>
                                  )}
                                  <div><strong>Expected:</strong> <span style={{ color: "#E2E8F0" }}>{tc.expected}</span></div>
                                  <div><strong>Output:</strong> <span style={{ color: isPassed ? "#34D399" : (isTle ? "#FBBF24" : "#F87171") }}>{isTle ? "Timed Out (>3000ms CPU cap)" : (tc.actual || "(empty)")}</span></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Impacted Vectors Breakdown */}
            {submitResult.vectorUpdates && submitResult.vectorUpdates.length > 0 && (
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  marginBottom: "20px"
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#CBD5E1", marginBottom: "8px" }}>
                  🧬 20-D Multi-Hop Knowledge Graph Updates ({submitResult.vectorUpdates.length} Dimensions):
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {submitResult.vectorUpdates.map((v, vIdx) => {
                    const deltaPct = Math.round((v.delta || 0) * 100);
                    const oldPct = Math.round((v.oldMastery || 0) * 100);
                    const newPct = Math.round((v.newMastery || 0) * 100);
                    return (
                      <div key={vIdx} style={{ fontSize: "11px", display: "flex", justifyContent: "space-between", color: "#94A3B8" }}>
                        <span style={{ color: "#F8FAFC", fontWeight: "600" }}>
                          {v.type === "PATTERN" ? "⚡ " : (v.type === "COMPETENCY" ? "🧠 " : (v.type === "ERROR_PROFILE" ? "⚠️ " : "📌 "))}
                          {(v.dimension || "").replace(/_/g, " ")}
                        </span>
                        <span>
                          {oldPct}% → <strong style={{ color: deltaPct < 0 ? "#F87171" : "#34D399" }}>{newPct}%</strong> ({deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation Action Buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                className="btn-primary-gradient"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowCelebration(false);
                  startSession(submitResult.targetSkill);
                }}
              >
                Train {submitResult.targetSkill} Again 🔁
              </button>
              <button
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
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
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#F43F5E" }}>
                  {malpracticeHalted.xpPenalty > 0 ? `-${malpracticeHalted.xpPenalty} XP` : "0 XP (Already at 0 XP Floor)"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase" }}>{malpracticeHalted.topic} Competency</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#F43F5E" }}>
                  {malpracticeHalted.masteryPenalty < 0
                    ? `${Math.round(malpracticeHalted.masteryPenalty * 100)}% Drop`
                    : "0% (Floor 10% Reached)"}
                </div>
              </div>
            </div>

            {/* Impacted Vectors Breakdown if present */}
            {malpracticeHalted.vectorUpdates && malpracticeHalted.vectorUpdates.length > 0 && (
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  margin: "12px 0",
                  textAlign: "left",
                  maxHeight: "160px",
                  overflowY: "auto"
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#CBD5E1", marginBottom: "6px" }}>
                  🧬 Impacted Competency Vectors ({malpracticeHalted.vectorUpdates.length}):
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {malpracticeHalted.vectorUpdates.map((v, vIdx) => {
                    const deltaPct = Math.round((v.delta || 0) * 100);
                    const oldPct = Math.round((v.oldMastery || 0) * 100);
                    const newPct = Math.round((v.newMastery || 0) * 100);
                    return (
                      <div key={vIdx} style={{ fontSize: "11px", display: "flex", justifyContent: "space-between", color: "#94A3B8" }}>
                        <span style={{ color: "#F8FAFC", fontWeight: "600" }}>
                          {v.type === "COMPETENCY" ? "🧠 " : "⚡ "}
                          {(v.dimension || "").replace(/_/g, " ")}
                        </span>
                        <span>
                          {oldPct}% → <strong style={{ color: deltaPct < 0 ? "#F87171" : "#34D399" }}>{newPct}%</strong> ({deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

      {/* Offline Safe Screen Overlay */}
      {isOffline && (
        <AdaptiveOfflineScreen
          sessionData={sessionData}
          currentQuestionNumber={currentIndex + 1}
          onReconnect={async () => {
            const sId = sessionData?.sessionId || sessionId;
            if (sId) {
              await resumeSession(sId);
            }
            setIsOffline(false);
          }}
          onExitToHub={() => navigate("/adaptive-coach")}
        />
      )}
      </div>
    </ActiveExamGuard>
  );
}
