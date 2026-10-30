import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Client from "../../shared/api/Client";
import { isWasmCached, getDetailedCacheStats, precacheLanguage } from "../exam/wasm/wasmCacheService";
import { executeWasmOrFallback, warmupWasmRuntimes } from "../exam/wasm/wasmRunner";
import AppShell from "../../shared/components/AppShell";
import usePageMeta from "../../shared/hooks/usePageMeta";
import "./adaptive.css";

const CONCEPTS_LIST = [
  "ARRAYS", "STRINGS", "HASHING", "LINKED_LISTS",
  "STACKS", "QUEUES", "TREES", "GRAPHS",
  "GREEDY", "BACKTRACKING", "DYNAMIC_PROGRAMMING", "BINARY_SEARCH"
];

const PATTERNS_LIST = [
  "TWO_POINTERS", "SLIDING_WINDOW", "PREFIX_SUM",
  "BINARY_SEARCH_PATTERN", "DFS", "BFS",
  "MONOTONIC_STACK", "HEAP", "UNION_FIND"
];

const COMPETENCIES_LIST = [
  "IMPLEMENTATION", "DEBUGGING", "COMPLEXITY_REASONING",
  "EDGE_CASE_HANDLING", "CODE_ORGANIZATION"
];

const ERROR_PROFILES_LIST = [
  "OFF_BY_ONE", "BOUNDARY_CONDITION", "INCORRECT_POINTER_UPDATE",
  "NULL_EMPTY_HANDLING", "WRONG_RECURRENCE", "INCORRECT_STATE_TRANSITION",
  "TLE", "MLE", "COMPILATION_SYNTAX_ERROR"
];

const BOILERPLATES = {
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) return;
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) {
            arr[i] = sc.nextInt();
        }
        
        // Write your solution logic here
        int result = 0;
        for (int x : arr) {
            if (x > 0) result++;
        }
        System.out.println(result);
        sc.close();
    }
}
`,
  python: `import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    arr = [int(x) for x in input_data[1:n+1]]
    
    # Write solution here
    res = sum(1 for x in arr if x > 0)
    print(res)

if __name__ == '__main__':
    main()
`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    int res = 0;
    for (int i = 0; i < n; i++) {
        cin >> arr[i];
        if (arr[i] > 0) res++;
    }
    cout << res << "\n";
    return 0;
}
`,
  c: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int res = 0;
    for (int i = 0; i < n; i++) {
        int x;
        scanf("%d", &x);
        if (x > 0) res++;
    }
    printf("%d\\n", res);
    return 0;
}
`
};

export default function AdaptiveTester() {
  usePageMeta("Adaptive AI Laboratory & Vector Engine Sandbox | ProctorX Admin", "Isolated administration sandbox to test vector calibration, Groq LLM generations, and multi-compiler execution without proctoring constraints.");

  // Model & Server Config State
  const [groqModels, setGroqModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-120b");
  const [modelSource, setModelSource] = useState("LOADING");
  const [loadingModels, setLoadingModels] = useState(false);

  // Student Loader State
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Vector Configuration State
  const [irtTheta, setIrtTheta] = useState(0.25);
  const [bktMastery, setBktMastery] = useState(0.55);
  const [bktPrior, setBktPrior] = useState(0.40);
  const [confidence, setConfidence] = useState(0.80);
  const [targetSkill, setTargetSkill] = useState("ARRAYS");
  const [pattern, setPattern] = useState("TWO_POINTERS");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [errorFocus, setErrorFocus] = useState("OFF_BY_ONE, BOUNDARY_CONDITION");
  const [activeVectorTab, setActiveVectorTab] = useState("concepts"); // concepts, patterns, competencies, errors

  // 35 Individual Dimensions Vector State
  const [conceptsMap, setConceptsMap] = useState(() => {
    const init = {};
    CONCEPTS_LIST.forEach((c) => { init[c] = 0.50; });
    return init;
  });

  const [patternsMap, setPatternsMap] = useState(() => {
    const init = {};
    PATTERNS_LIST.forEach((p) => { init[p] = 0.45; });
    return init;
  });

  const [competenciesMap, setCompetenciesMap] = useState(() => {
    const init = {};
    COMPETENCIES_LIST.forEach((comp) => { init[comp] = 0.60; });
    return init;
  });

  const [errorsMap, setErrorsMap] = useState(() => {
    const init = {};
    ERROR_PROFILES_LIST.forEach((err) => { init[err] = 0.30; });
    return init;
  });

  // Generation & Question State
  const [generating, setGenerating] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [promptDebug, setPromptDebug] = useState(null);
  const [showPromptInspector, setShowPromptInspector] = useState(false);

  // Compiler & Code Execution State
  const [language, setLanguage] = useState("java");
  const [code, setCode] = useState(BOILERPLATES.java);
  const [executing, setExecuting] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [execTimeMs, setExecTimeMs] = useState(null);
  const [wasmStats, setWasmStats] = useState(null);
  const [wasmReady, setWasmReady] = useState(false);

  // Recalibration Result State
  const [recalibrationResult, setRecalibrationResult] = useState(null);
  const [vectorChainedToast, setVectorChainedToast] = useState(null);

  // AI Solution & Bug Injection State
  const [generatingSolution, setGeneratingSolution] = useState(false);
  const [generatingBug, setGeneratingBug] = useState(false);
  const [selectedBugType, setSelectedBugType] = useState("OFF_BY_ONE");
  const [solutionMeta, setSolutionMeta] = useState(null);
  const [bugMeta, setBugMeta] = useState(null);

  // Mount effect: Fetch Groq models, students list, and initialize WASM
  useEffect(() => {
    fetchGroqModels();
    fetchStudentsList();
    initWasm();
  }, []);

  async function initWasm() {
    try {
      const stats = await getDetailedCacheStats();
      setWasmStats(stats);
      const cached = await isWasmCached("all");
      if (cached && stats.python?.isCached && stats.java?.isCached && stats.cpp?.isCached) {
        setWasmReady(true);
      }
      warmupWasmRuntimes().catch(() => {});
    } catch (err) {
      console.warn("WASM sandbox init note:", err);
    }
  }

  async function fetchGroqModels() {
    try {
      setLoadingModels(true);
      const res = await Client.get("/admin/adaptive-tester/groq-models");
      const models = res.data?.models || [];
      setGroqModels(models);
      setModelSource(res.data?.source || "FALLBACK");
      if (res.data?.activeModel && models.includes(res.data.activeModel)) {
        setSelectedModel(res.data.activeModel);
      } else if (models.length > 0) {
        setSelectedModel(models[0]);
      }
    } catch (err) {
      console.error("Failed to load Groq models:", err);
      setModelSource("FALLBACK");
      setGroqModels(["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen-2.5-coder-32b"]);
    } finally {
      setLoadingModels(false);
    }
  }

  async function fetchStudentsList() {
    try {
      setLoadingStudents(true);
      const res = await Client.get("/admin/adaptive-tester/students");
      setStudentsList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoadingStudents(false);
    }
  }

  async function handleStudentSelect(e) {
    const learnerModelId = e.target.value;
    setSelectedStudentId(learnerModelId);
    if (!learnerModelId) return;

    try {
      const res = await Client.get(`/admin/adaptive-tester/student-vector/${learnerModelId}`);
      const data = res.data;
      if (!data) return;

      // Update global parameters
      if (data.overallReadiness !== undefined) setBktMastery(data.overallReadiness);

      // Populate concepts
      if (data.concepts && Array.isArray(data.concepts)) {
        const cMap = {};
        data.concepts.forEach((c) => {
          cMap[c.key] = c.mastery;
        });
        setConceptsMap((prev) => ({ ...prev, ...cMap }));
      }

      // Populate patterns
      if (data.patterns && Array.isArray(data.patterns)) {
        const pMap = {};
        data.patterns.forEach((p) => {
          pMap[p.key] = p.mastery;
        });
        setPatternsMap((prev) => ({ ...prev, ...pMap }));
      }

      // Populate competencies
      if (data.competencies && Array.isArray(data.competencies)) {
        const compMap = {};
        data.competencies.forEach((comp) => {
          compMap[comp.key] = comp.mastery;
        });
        setCompetenciesMap((prev) => ({ ...prev, ...compMap }));
      }

      // Populate error profiles
      if (data.errorProfiles && Array.isArray(data.errorProfiles)) {
        const eMap = {};
        data.errorProfiles.forEach((ep) => {
          eMap[ep.key] = ep.errorRisk || ep.mastery;
        });
        setErrorsMap((prev) => ({ ...prev, ...eMap }));
      }
    } catch (err) {
      console.error("Failed to load student vector:", err);
    }
  }

  // Preset Configurations
  function applyPreset(type) {
    if (type === "BEGINNER_OFF_BY_ONE") {
      setIrtTheta(-1.10);
      setBktMastery(0.28);
      setBktPrior(0.25);
      setDifficulty("EASY_MEDIUM");
      setTargetSkill("ARRAYS");
      setPattern("TWO_POINTERS");
      setErrorFocus("OFF_BY_ONE, BOUNDARY_CONDITION");
      setErrorsMap((prev) => ({ ...prev, OFF_BY_ONE: 0.65, BOUNDARY_CONDITION: 0.55 }));
    } else if (type === "INTERMEDIATE_TLE") {
      setIrtTheta(0.35);
      setBktMastery(0.62);
      setBktPrior(0.55);
      setDifficulty("MEDIUM");
      setTargetSkill("DYNAMIC_PROGRAMMING");
      setPattern("SLIDING_WINDOW");
      setErrorFocus("TLE, WRONG_RECURRENCE");
      setErrorsMap((prev) => ({ ...prev, TLE: 0.70, WRONG_RECURRENCE: 0.50 }));
    } else if (type === "ADVANCED_GRAPH") {
      setIrtTheta(1.85);
      setBktMastery(0.88);
      setBktPrior(0.82);
      setDifficulty("HARD");
      setTargetSkill("GRAPHS");
      setPattern("DFS");
      setErrorFocus("INCORRECT_STATE_TRANSITION");
      setErrorsMap((prev) => ({ ...prev, TLE: 0.20, OFF_BY_ONE: 0.15 }));
    } else {
      // Default reset
      setIrtTheta(0.25);
      setBktMastery(0.55);
      setBktPrior(0.40);
      setDifficulty("MEDIUM");
      setTargetSkill("ARRAYS");
      setPattern("TWO_POINTERS");
      setErrorFocus("OFF_BY_ONE, BOUNDARY_CONDITION");
    }
  }

  // Handle Question Generation
  async function handleGenerateQuestion() {
    try {
      setGenerating(true);
      setRecalibrationResult(null);
      setTestResults([]);

      const payload = {
        model: selectedModel,
        targetSkill,
        pattern,
        difficulty,
        irtTheta: Number(irtTheta),
        bktMastery: Number(bktMastery),
        bktPrior: Number(bktPrior),
        confidence: Number(confidence),
        errorFocus,
        temperature: 0.3
      };

      const res = await Client.post("/admin/adaptive-tester/generate-question", payload);
      const data = res.data;
      if (data) {
        setPromptDebug(data);
        if (data.question) {
          setCurrentQuestion(data.question);
          // Set appropriate boilerplate or sample code
          setCode(BOILERPLATES[language] || "");
        }
      }
    } catch (err) {
      console.error("Failed to generate test question:", err);
      alert("Question generation failed. Check Groq API connectivity.");
    } finally {
      setGenerating(false);
    }
  }

  // Handle Test Case Execution & Sandbox Looping
  async function handleRunTestCases() {
    if (!currentQuestion || executing) return;
    setExecuting(true);
    setTestResults([]);
    const startTime = performance.now();

    const tcs = currentQuestion.testCases || [];
    const results = [];
    let combinedOutput = "";
    let combinedError = "";
    let passedCount = 0;

    for (let i = 0; i < tcs.length; i++) {
      const tc = tcs[i];
      try {
        const out = await executeWasmOrFallback(code, tc.input || "", language);
        const actual = (out.output || out.stdout || "").trim();
        const expected = (tc.expectedOutput || "").trim();
        const passed = actual === expected;
        if (passed) passedCount++;

        combinedOutput += " " + (out.output || out.stdout || "");
        if (out.error) combinedError += " " + out.error;

        results.push({
          index: i + 1,
          sample: tc.sample,
          input: tc.input,
          expected,
          actual: actual || (out.error ? `Error: ${out.error}` : "(empty)"),
          passed,
          executionType: out.executionType || "WASM",
          error: out.error
        });
      } catch (err) {
        combinedError += " " + String(err);
        results.push({
          index: i + 1,
          sample: tc.sample,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: `Crash: ${err.message}`,
          passed: false,
          executionType: "WASM",
          error: err.message
        });
      }
    }

    const elapsed = Math.round(performance.now() - startTime);
    setExecTimeMs(elapsed);
    setTestResults(results);

    // Call Sandbox Simulation Endpoint to compute real-time Bayesian / IRT vector update (Full 35-Feature Pipeline)
    try {
      const simPayload = {
        targetSkill,
        pattern,
        difficulty,
        currentMastery: Number(bktMastery),
        bktPrior: Number(bktPrior),
        irtTheta: Number(irtTheta),
        currentErrorRisk: errorsMap[errorFocus.split(",")[0].trim()] || 0.35,
        errorFocus: errorFocus.split(",")[0].trim(),
        passedTcs: passedCount,
        totalTcs: tcs.length,
        executionTimeMs: elapsed,
        attempts: 1,
        durationSeconds: 30,
        output: combinedOutput,
        error: combinedError
      };

      const simRes = await Client.post("/admin/adaptive-tester/simulate-eval", simPayload);
      if (simRes.data) {
        setRecalibrationResult(simRes.data);
      }
    } catch (simErr) {
      console.error("Simulation eval failed:", simErr);
    } finally {
      setExecuting(false);
    }
  }

  // Auto-beautifier and formatter for minified or collapsed single-line code
  function formatCodeIfMinified(src, lang = "java") {
    if (!src) return "";
    const l = (lang || "").toLowerCase();
    if (l.includes("python") || l === "py") return src;

    const lines = src.split(/\r?\n/);
    if (lines.length > 5 && lines.every(line => line.length < 160)) {
      return src;
    }

    let formatted = "";
    let indent = 0;
    let inForHeader = false;
    let inString = false;
    let inChar = false;
    let parenDepth = 0;

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      const prev = i > 0 ? src[i - 1] : "";

      if (ch === '"' && prev !== "\\" && !inChar) {
        inString = !inString;
        formatted += ch;
        continue;
      }
      if (ch === "'" && prev !== "\\" && !inString) {
        inChar = !inChar;
        formatted += ch;
        continue;
      }
      if (inString || inChar) {
        formatted += ch;
        continue;
      }

      if (ch === "(") {
        parenDepth++;
        formatted += ch;
        const before = src.slice(Math.max(0, i - 10), i).trim();
        if (before.endsWith("for") || before.endsWith("for(")) {
          inForHeader = true;
        }
        continue;
      }
      if (ch === ")") {
        parenDepth--;
        if (parenDepth <= 0) {
          parenDepth = 0;
          inForHeader = false;
        }
        formatted += ch;
        continue;
      }

      if (ch === "{") {
        indent++;
        formatted += " {\n" + "    ".repeat(indent);
        continue;
      }

      if (ch === "}") {
        indent = Math.max(0, indent - 1);
        formatted = formatted.trimEnd();
        formatted += "\n" + "    ".repeat(indent) + "}\n" + "    ".repeat(indent);
        continue;
      }

      if (ch === ";" && !inForHeader) {
        formatted += ";\n" + "    ".repeat(indent);
        continue;
      }

      if (ch === " " && prev === " ") {
        continue;
      }

      formatted += ch;
    }

    return formatted
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter((line, idx, arr) => !(line.trim() === "" && arr[idx - 1]?.trim() === ""))
      .join("\n")
      .trim();
  }

  // Helper to sanitize incoming code from AI: unescape literal \n, strip markdown, repair fragments, and auto-beautify
  function sanitizeCodeString(raw, lang) {
    if (!raw) return "";
    let clean = String(raw).trim();
    // Strip markdown code fences
    clean = clean.replace(/^```[a-zA-Z]*\r?\n?/, "").replace(/\r?\n?```$/, "");
    if (clean.includes("```")) {
      clean = clean.replace(/```[a-zA-Z]*\r?\n?/g, "").replace(/```/g, "");
    }
    // Unescape literal \n, \r, \t, \"
    if (clean.includes("\\n")) {
      clean = clean
        .replace(/\\r\\n/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "    ")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    // Strip accidental starting fragment syntax (e.g. '} else {')
    if (clean.startsWith("}") || clean.startsWith("else") || clean.startsWith("catch")) {
      clean = clean.replace(/^[\}\s;]+(else\s*\{)?/, "").trim();
    }
    // Auto-beautify if collapsed on one line
    clean = formatCodeIfMinified(clean, lang || language);
    return clean.trim();
  }

  // 1. Dedicated AI Optimal Reference Solution Generator
  async function handleGenerateAiSolution() {
    if (!currentQuestion) {
      alert("Please generate or select a question first.");
      return;
    }
    try {
      setGeneratingSolution(true);
      setSolutionMeta(null);
      setBugMeta(null);
      const res = await Client.post("/admin/adaptive-tester/generate-solution", {
        model: selectedModel,
        title: currentQuestion.title,
        problemStatement: currentQuestion.description || currentQuestion.problemStatement,
        language,
        targetSkill,
        pattern,
        testCases: currentQuestion.testCases || []
      });
      if (res.data?.solutionCode) {
        const cleanCode = sanitizeCodeString(res.data.solutionCode, language);
        setCode(cleanCode);
        setSolutionMeta({
          timeComplexity: res.data.timeComplexity,
          spaceComplexity: res.data.spaceComplexity,
          approach: res.data.approach
        });
      } else {
        alert("Solution generation did not return valid code. Check Groq API connectivity.");
      }
    } catch (err) {
      console.error("AI solution generation failed:", err);
      alert("Failed to generate AI solution: " + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingSolution(false);
    }
  }

  // 2. Dedicated AI Defect Injector (Real-time subtle bugs per error taxonomy)
  async function handleInjectAiBug(bugType) {
    if (!currentQuestion) {
      alert("Please generate or select a question first.");
      return;
    }
    const typeToInject = bugType || selectedBugType;
    try {
      setGeneratingBug(true);
      setBugMeta(null);
      const res = await Client.post("/admin/adaptive-tester/generate-buggy-code", {
        model: selectedModel,
        title: currentQuestion.title,
        problemStatement: currentQuestion.description || currentQuestion.problemStatement,
        language,
        code,
        errorType: typeToInject
      });
      if (res.data?.buggyCode) {
        const cleanCode = sanitizeCodeString(res.data.buggyCode, language);
        setCode(cleanCode);
        setBugMeta({
          errorType: res.data.errorType || typeToInject,
          bugLocation: res.data.bugLocation,
          explanation: res.data.explanation
        });
      } else {
        alert("AI bug injection did not return code.");
      }
    } catch (err) {
      console.error("AI bug injection failed:", err);
      alert("Failed to inject AI bug: " + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingBug(false);
    }
  }

  // 3. Closed-Loop Vector Chaining: Feed Resulting Vector into Next Iteration
  function handleApplyVectorToNextQuestion() {
    if (!recalibrationResult) return;

    if (recalibrationResult.newMastery !== undefined) {
      const nm = Number(recalibrationResult.newMastery.toFixed(2));
      setBktMastery(nm);
      setBktPrior(nm);
    }
    if (recalibrationResult.updatedIrtTheta !== undefined) {
      setIrtTheta(Number(recalibrationResult.updatedIrtTheta.toFixed(2)));
    }
    if (recalibrationResult.nextZpd) {
      setDifficulty(recalibrationResult.nextZpd);
    }
    if (recalibrationResult.nextSuggestedConcept) {
      setTargetSkill(recalibrationResult.nextSuggestedConcept);
    }

    // Ripple across live 35 dimensions in state
    if (recalibrationResult.all35VectorUpdates && Array.isArray(recalibrationResult.all35VectorUpdates)) {
      setConceptsMap((prev) => {
        const next = { ...prev };
        recalibrationResult.all35VectorUpdates.forEach((up) => {
          if (up.type === "CONCEPT" || up.type === "CONCEPT_RIPPLE") {
            const cur = next[up.dimension] ?? 0.50;
            next[up.dimension] = Math.max(0.10, Math.min(0.98, Number((cur + (up.delta || 0)).toFixed(2))));
          }
        });
        return next;
      });

      setPatternsMap((prev) => {
        const next = { ...prev };
        recalibrationResult.all35VectorUpdates.forEach((up) => {
          if (up.type === "PATTERN") {
            const cur = next[up.dimension] ?? 0.45;
            next[up.dimension] = Math.max(0.10, Math.min(0.98, Number((cur + (up.delta || 0)).toFixed(2))));
          }
        });
        return next;
      });

      setCompetenciesMap((prev) => {
        const next = { ...prev };
        recalibrationResult.all35VectorUpdates.forEach((up) => {
          if (up.type === "COMPETENCY") {
            const cur = next[up.dimension] ?? 0.60;
            next[up.dimension] = Math.max(0.10, Math.min(0.95, Number((cur + (up.delta || 0)).toFixed(2))));
          }
        });
        return next;
      });

      setErrorsMap((prev) => {
        const next = { ...prev };
        recalibrationResult.all35VectorUpdates.forEach((up) => {
          if (up.type === "ERROR_PROFILE") {
            const cur = next[up.dimension] ?? 0.30;
            next[up.dimension] = Math.max(0.05, Math.min(0.95, Number((cur + (up.delta || 0)).toFixed(2))));
          }
        });
        return next;
      });
    }

    setVectorChainedToast(`Vector successfully chained! Dials updated: BKT ${(recalibrationResult.newMastery * 100).toFixed(0)}%, Theta ${recalibrationResult.updatedIrtTheta}, ZPD '${recalibrationResult.nextZpd}'. Click 'Generate Question' to see the adaptive transition.`);
    setTimeout(() => setVectorChainedToast(null), 8000);
  }

  // Quick fallback starter
  function insertSampleSolution(type) {
    if (type === "CORRECT") {
      handleGenerateAiSolution();
    } else {
      handleInjectAiBug(type);
    }
  }

  return (
    <AppShell activeNav="/admin/adaptive-tester">
      <div className="adaptive-hub-container" style={{ maxWidth: "1680px", padding: "16px 24px 60px" }}>
        
        {/* Lab Top Header */}
        <div
          style={{
            background: "#0B0E17",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            padding: "20px 24px",
            marginBottom: "20px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, #10B981 0%, #7C3AED 50%, #34D399 100%)"
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                <span style={{ fontSize: "24px" }}>🔬</span>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#F8FAFC" }}>
                  Adaptive AI Laboratory & Vector Engine Sandbox
                </h1>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    color: "#34D399",
                    letterSpacing: "0.06em"
                  }}
                >
                  ADMIN SANDBOX • NO PROCTORING
                </span>
              </div>
              <p style={{ margin: 0, color: "#94A3B8", fontSize: "13px" }}>
                Stress-test real-time Bayesian Knowledge Tracing (BKT), IRT Latent Ability ($\theta$), multi-compiler WASM execution, and Groq LLM generations across all 35 cognitive dimensions.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link
                to="/adaptive-coach"
                className="btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "8px 14px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#E2E8F0",
                  borderRadius: "8px",
                  textDecoration: "none"
                }}
              >
                ← Adaptive Coach Radar
              </Link>
              <Link
                to="/admin/compiler-settings"
                className="btn-secondary"
                style={{
                  fontSize: "12px",
                  padding: "8px 14px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#E2E8F0",
                  borderRadius: "8px",
                  textDecoration: "none"
                }}
              >
                ⚙️ Compiler Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Global Control Bar: Groq Model, Student Import & Presets */}
        <div
          style={{
            background: "#0B0E17",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            alignItems: "end"
          }}
        >
          {/* Dynamic Groq Model Selector */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#CBD5E1" }}>
                🤖 Groq LLM Engine
              </label>
              <span style={{ fontSize: "10px", color: modelSource === "LIVE_API" ? "#34D399" : "#FBBF24" }}>
                {loadingModels ? "Loading..." : (modelSource === "LIVE_API" ? "● Live API Sync" : "● Fallback Catalog")}
              </span>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                width: "100%",
                background: "#07090E",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#F8FAFC",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "13px",
                fontFamily: "monospace"
              }}
            >
              {groqModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Student Profile Importer */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#CBD5E1", marginBottom: "6px" }}>
              👤 Load Live Student Vector
            </label>
            <select
              value={selectedStudentId}
              onChange={handleStudentSelect}
              style={{
                width: "100%",
                background: "#07090E",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#F8FAFC",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "13px"
              }}
            >
              <option value="">-- Manual Sandbox Custom Mode --</option>
              {studentsList.map((s) => (
                <option key={s.learnerModelId} value={s.learnerModelId}>
                  {s.username} (Readiness: {Math.round(s.overallReadiness * 100)}%, Solved: {s.totalQuestionsSolved})
                </option>
              ))}
            </select>
          </div>

          {/* Target Skill & Pattern */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#CBD5E1", marginBottom: "6px" }}>
              🎯 Target Topic & Pattern
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                value={targetSkill}
                onChange={(e) => setTargetSkill(e.target.value)}
                style={{
                  flex: 1,
                  background: "#07090E",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#F8FAFC",
                  borderRadius: "8px",
                  padding: "8px",
                  fontSize: "12px"
                }}
              >
                {CONCEPTS_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                style={{
                  flex: 1,
                  background: "#07090E",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#F8FAFC",
                  borderRadius: "8px",
                  padding: "8px",
                  fontSize: "12px"
                }}
              >
                {PATTERNS_LIST.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#CBD5E1", marginBottom: "6px" }}>
              ⚡ Vector Simulation Presets
            </label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => applyPreset("BEGINNER_OFF_BY_ONE")}
                style={{
                  fontSize: "11px",
                  padding: "6px 9px",
                  borderRadius: "6px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  color: "#FBBF24",
                  cursor: "pointer"
                }}
              >
                Beginner (Off-by-One)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("INTERMEDIATE_TLE")}
                style={{
                  fontSize: "11px",
                  padding: "6px 9px",
                  borderRadius: "6px",
                  background: "rgba(124, 58, 237, 0.15)",
                  border: "1px solid rgba(124, 58, 237, 0.35)",
                  color: "#C4B5FD",
                  cursor: "pointer"
                }}
              >
                Intermediate (TLE)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("ADVANCED_GRAPH")}
                style={{
                  fontSize: "11px",
                  padding: "6px 9px",
                  borderRadius: "6px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "#34D399",
                  cursor: "pointer"
                }}
              >
                Advanced (Graph)
              </button>
            </div>
          </div>
        </div>

        {/* Main Split Grid: Left = 35D Vector Matrix & Controls | Right = Problem & IDE */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(380px, 42%) 1fr", gap: "20px", alignItems: "start" }}>
          
          {/* LEFT COLUMN: 35-Dimensional Vector Matrix & Calibration Suite */}
          <div
            style={{
              background: "#0B0E17",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "20px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🧬</span>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#F8FAFC" }}>
                  35-Dimensional Cognitive Vector Matrix
                </h3>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34D399"
                }}
              >
                LIVE PARAMETRIC DIAL
              </span>
            </div>

            {/* Core Ability Dials: IRT Theta, BKT Mastery, Confidence */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "10px",
                padding: "14px 16px",
                marginBottom: "16px"
              }}
            >
              {/* IRT Theta Slider */}
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#CBD5E1", fontWeight: "600" }}>
                    IRT Latent Ability ($\theta$):
                  </span>
                  <span style={{ color: "#34D399", fontWeight: "800", fontFamily: "monospace" }}>
                    {irtTheta > 0 ? `+${Number(irtTheta).toFixed(2)}` : Number(irtTheta).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.05"
                  value={irtTheta}
                  onChange={(e) => setIrtTheta(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#10B981" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748B" }}>
                  <span>Novice (-3.0)</span>
                  <span>Median (0.0)</span>
                  <span>Expert (+3.0)</span>
                </div>
              </div>

              {/* BKT Mastery Slider */}
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#CBD5E1", fontWeight: "600" }}>
                    BKT Knowledge State $P(L_t)$:
                  </span>
                  <span style={{ color: "#A78BFA", fontWeight: "800", fontFamily: "monospace" }}>
                    {(bktMastery * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.98"
                  step="0.01"
                  value={bktMastery}
                  onChange={(e) => setBktMastery(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#7C3AED" }}
                />
              </div>

              {/* Inoculation Error Profile Focus */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#CBD5E1", fontWeight: "600" }}>
                    Calibrated Error Inoculation Target:
                  </span>
                </div>
                <select
                  value={errorFocus}
                  onChange={(e) => setErrorFocus(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#07090E",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    color: "#FBBF24",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}
                >
                  <option value="OFF_BY_ONE, BOUNDARY_CONDITION">OFF_BY_ONE, BOUNDARY_CONDITION</option>
                  <option value="TLE">TLE (Time Limit Exceeded)</option>
                  <option value="NULL_EMPTY_HANDLING">NULL_EMPTY_HANDLING</option>
                  <option value="WRONG_RECURRENCE">WRONG_RECURRENCE (DP Subproblem)</option>
                  <option value="INCORRECT_POINTER_UPDATE">INCORRECT_POINTER_UPDATE</option>
                  <option value="MLE">MLE (Memory & Stack Depth)</option>
                </select>
              </div>
            </div>

            {/* 4 Cognitive Layers Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "14px" }}>
              {[
                { id: "concepts", label: "12 Concepts", count: 12 },
                { id: "patterns", label: "9 Patterns", count: 9 },
                { id: "competencies", label: "5 Competencies", count: 5 },
                { id: "errors", label: "9 Defect Risks", count: 9 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveVectorTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    fontSize: "11px",
                    fontWeight: activeVectorTab === tab.id ? "700" : "500",
                    color: activeVectorTab === tab.id ? "#34D399" : "#94A3B8",
                    background: "transparent",
                    border: "none",
                    borderBottom: activeVectorTab === tab.id ? "2px solid #10B981" : "2px solid transparent",
                    cursor: "pointer"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents: Sliders per dimension */}
            <div style={{ maxHeight: "320px", overflowY: "auto", paddingRight: "6px" }}>
              {activeVectorTab === "concepts" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {CONCEPTS_LIST.map((c) => (
                    <div key={c}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
                        <span style={{ color: targetSkill === c ? "#34D399" : "#CBD5E1", fontWeight: targetSkill === c ? "700" : "500" }}>
                          {c} {targetSkill === c ? "🎯" : ""}
                        </span>
                        <span style={{ color: "#94A3B8", fontFamily: "monospace" }}>
                          {Math.round((conceptsMap[c] || 0.5) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={conceptsMap[c] || 0.5}
                        onChange={(e) => setConceptsMap({ ...conceptsMap, [c]: parseFloat(e.target.value) })}
                        style={{ width: "100%", accentColor: targetSkill === c ? "#10B981" : "#64748B" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeVectorTab === "patterns" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {PATTERNS_LIST.map((p) => (
                    <div key={p}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
                        <span style={{ color: pattern === p ? "#A78BFA" : "#CBD5E1", fontWeight: pattern === p ? "700" : "500" }}>
                          {p} {pattern === p ? "🎯" : ""}
                        </span>
                        <span style={{ color: "#94A3B8", fontFamily: "monospace" }}>
                          {Math.round((patternsMap[p] || 0.45) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={patternsMap[p] || 0.45}
                        onChange={(e) => setPatternsMap({ ...patternsMap, [p]: parseFloat(e.target.value) })}
                        style={{ width: "100%", accentColor: pattern === p ? "#7C3AED" : "#64748B" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeVectorTab === "competencies" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {COMPETENCIES_LIST.map((comp) => (
                    <div key={comp}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
                        <span style={{ color: "#CBD5E1", fontWeight: "500" }}>{comp}</span>
                        <span style={{ color: "#94A3B8", fontFamily: "monospace" }}>
                          {Math.round((competenciesMap[comp] || 0.6) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={competenciesMap[comp] || 0.6}
                        onChange={(e) => setCompetenciesMap({ ...competenciesMap, [comp]: parseFloat(e.target.value) })}
                        style={{ width: "100%", accentColor: "#3B82F6" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeVectorTab === "errors" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {ERROR_PROFILES_LIST.map((err) => (
                    <div key={err}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
                        <span style={{ color: errorFocus.includes(err) ? "#FBBF24" : "#CBD5E1", fontWeight: errorFocus.includes(err) ? "700" : "500" }}>
                          {err} {errorFocus.includes(err) ? "⚠️" : ""}
                        </span>
                        <span style={{ color: "#FBBF24", fontFamily: "monospace" }}>
                          Risk: {Math.round((errorsMap[err] || 0.3) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={errorsMap[err] || 0.3}
                        onChange={(e) => setErrorsMap({ ...errorsMap, [err]: parseFloat(e.target.value) })}
                        style={{ width: "100%", accentColor: errorFocus.includes(err) ? "#F59E0B" : "#64748B" }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generation Trigger Button */}
            <button
              type="button"
              onClick={handleGenerateQuestion}
              disabled={generating}
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "12px",
                background: generating
                  ? "rgba(16, 185, 129, 0.2)"
                  : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                border: "none",
                borderRadius: "8px",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: "700",
                cursor: generating ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {generating ? "⚡ Prompting Groq Engine with Vector..." : "⚡ Generate Vector-Calibrated Question"}
            </button>

            {/* Prompt Inspector Toggle */}
            {promptDebug && (
              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setShowPromptInspector(!showPromptInspector)}
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px dashed rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    color: "#94A3B8",
                    padding: "6px 10px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  {showPromptInspector ? "Hide Raw Prompt & Token Telemetry ▲" : "View Raw Prompt & Token Telemetry ▼"}
                </button>

                {showPromptInspector && (
                  <div
                    style={{
                      marginTop: "8px",
                      background: "#07090E",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      padding: "10px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "#A7F3D0",
                      maxHeight: "220px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    <div><strong>Latency:</strong> {promptDebug.latencyMs} ms</div>
                    <div><strong>Model:</strong> {promptDebug.modelUsed}</div>
                    <div><strong>Status:</strong> {promptDebug.status}</div>
                    <hr style={{ borderColor: "rgba(255, 255, 255, 0.1)", margin: "8px 0" }} />
                    <div><strong>Prompt Sent:</strong></div>
                    {promptDebug.promptSent}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Question Workbench, Monaco Code Editor, & Multi-Compiler Runner */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Question Specification Banner */}
            {currentQuestion ? (
              <div
                style={{
                  background: "#0B0E17",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                  {/* Origin Badge */}
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: currentQuestion.generationSource === "AI_GENERATED"
                        ? "linear-gradient(135deg, rgba(124, 58, 237, 0.22) 0%, rgba(16, 185, 129, 0.22) 100%)"
                        : "rgba(245, 158, 11, 0.15)",
                      border: currentQuestion.generationSource === "AI_GENERATED"
                        ? "1px solid rgba(52, 211, 153, 0.45)"
                        : "1px solid rgba(245, 158, 11, 0.4)",
                      color: currentQuestion.generationSource === "AI_GENERATED" ? "#34D399" : "#FBBF24",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <span>{currentQuestion.generationSource === "AI_GENERATED" ? "✨ AI Generated" : "🛡️ Curated Backup Bank"}</span>
                    <span style={{ fontSize: "9px", background: "rgba(0, 0, 0, 0.3)", padding: "1px 5px", borderRadius: "3px" }}>
                      BKT VECTOR CALIBRATED
                    </span>
                  </span>

                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "6px", background: "rgba(124, 58, 237, 0.15)", color: "#A78BFA" }}>
                    {currentQuestion.topic}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.15)", color: "#818CF8" }}>
                    Pattern: {currentQuestion.pattern}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", color: "#34D399" }}>
                    {currentQuestion.difficulty}
                  </span>
                </div>

                <h2 style={{ fontSize: "18px", fontWeight: "700", margin: "0 0 12px", color: "#F8FAFC" }}>
                  {currentQuestion.title}
                </h2>

                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: "1.65",
                    color: "#CBD5E1",
                    whiteSpace: "pre-wrap",
                    marginBottom: "16px"
                  }}
                >
                  {currentQuestion.description}
                </div>

                {/* Solution outline accordion */}
                {currentQuestion.solutionOutline && (
                  <details style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#94A3B8" }}>
                    <summary style={{ cursor: "pointer", fontWeight: "600", color: "#CBD5E1" }}>
                      💡 Algorithmic Blueprint & Inoculation Rationale
                    </summary>
                    <div style={{ marginTop: "8px", color: "#E2E8F0" }}>
                      {currentQuestion.solutionOutline}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div
                style={{
                  background: "#0B0E17",
                  border: "1px dashed rgba(255, 255, 255, 0.15)",
                  borderRadius: "14px",
                  padding: "36px",
                  textAlign: "center",
                  color: "#94A3B8"
                }}
              >
                <span style={{ fontSize: "36px", display: "block", marginBottom: "12px" }}>🧬</span>
                <h3 style={{ margin: "0 0 6px", color: "#F8FAFC", fontSize: "16px" }}>No Problem Generated Yet</h3>
                <p style={{ margin: 0, fontSize: "13px" }}>
                  Adjust the 35-D vector sliders on the left or choose a preset, then click <strong>"Generate Vector-Calibrated Question"</strong>.
                </p>
              </div>
            )}

            {/* Monaco Code Editor & Compiler Suite */}
            <div
              style={{
                background: "#0B0E17",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)"
              }}
            >
              {/* Editor Toolbar */}
              <div
                style={{
                  padding: "10px 16px",
                  background: "rgba(15, 23, 42, 0.8)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <select
                    value={language}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setLanguage(newLang);
                      setCode(BOILERPLATES[newLang] || "");
                    }}
                    style={{
                      background: "#07090E",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#F8FAFC",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "12px"
                    }}
                  >
                    <option value="java">Java (TeaVM/Cheerpj WASM)</option>
                    <option value="python">Python (Pyodide WASM)</option>
                    <option value="cpp">C++ (Clang WASM)</option>
                    <option value="c">C (WASM/Native)</option>
                  </select>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: wasmReady ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color: wasmReady ? "#34D399" : "#FBBF24"
                    }}
                  >
                    {wasmReady ? "✓ In-Browser Compilers Ready" : "⚡ Cloud Compiler Failover"}
                  </span>
                </div>

                {/* Dynamic AI Code Generators: Optimal Solution & Fault Injections */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleGenerateAiSolution}
                    disabled={generatingSolution || !currentQuestion}
                    style={{
                      fontSize: "11px",
                      padding: "5px 12px",
                      background: generatingSolution ? "rgba(16, 185, 129, 0.3)" : "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.25) 100%)",
                      border: "1px solid rgba(52, 211, 153, 0.45)",
                      color: "#34D399",
                      borderRadius: "6px",
                      cursor: currentQuestion && !generatingSolution ? "pointer" : "not-allowed",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    {generatingSolution ? "⏳ Synthesizing Solution..." : "✨ AI Optimal Solution"}
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <select
                      value={selectedBugType}
                      onChange={(e) => setSelectedBugType(e.target.value)}
                      style={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        color: "#FBBF24",
                        fontSize: "11px",
                        padding: "5px 8px",
                        borderRadius: "6px",
                        outline: "none"
                      }}
                    >
                      <option value="OFF_BY_ONE">Off-by-One Loop Error</option>
                      <option value="BOUNDARY_CONDITION">Boundary Case Missing</option>
                      <option value="NULL_EMPTY_HANDLING">Null Pointer / Empty Case</option>
                      <option value="INCORRECT_POINTER_UPDATE">Pointer Update Mistake</option>
                      <option value="TLE">Time Limit (TLE Inefficiency)</option>
                      <option value="COMPILATION_SYNTAX_ERROR">Syntax / Compile Error</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleInjectAiBug()}
                      disabled={generatingBug || !currentQuestion}
                      style={{
                        fontSize: "11px",
                        padding: "5px 10px",
                        background: generatingBug ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.18)",
                        border: "1px solid rgba(245, 158, 11, 0.45)",
                        color: "#FBBF24",
                        borderRadius: "6px",
                        cursor: currentQuestion && !generatingBug ? "pointer" : "not-allowed",
                        fontWeight: "700"
                      }}
                    >
                      {generatingBug ? "⏳ Injecting Bug..." : "🐛 Inject AI Bug"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Solution / Bug Feedback Metadata */}
              {solutionMeta && (
                <div style={{
                  padding: "8px 16px",
                  background: "rgba(16, 185, 129, 0.12)",
                  borderBottom: "1px solid rgba(52, 211, 153, 0.25)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#A7F3D0"
                }}>
                  <span><strong>AI Strategy:</strong> {solutionMeta.approach}</span>
                  <span><strong>Complexity:</strong> Time: {solutionMeta.timeComplexity} | Space: {solutionMeta.spaceComplexity}</span>
                </div>
              )}

              {bugMeta && (
                <div style={{
                  padding: "8px 16px",
                  background: "rgba(245, 158, 11, 0.12)",
                  borderBottom: "1px solid rgba(245, 158, 11, 0.25)",
                  fontSize: "11px",
                  color: "#FDE68A"
                }}>
                  <strong>Injected Defect ({bugMeta.errorType}):</strong> {bugMeta.explanation} <span style={{ opacity: 0.85 }}>({bugMeta.bugLocation})</span>
                </div>
              )}

              {/* Monaco Editor */}
              <div style={{ height: "340px" }}>
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={language === "cpp" || language === "c" ? "cpp" : language}
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: "on",
                    tabSize: 4
                  }}
                />
              </div>

              {/* Run Test Cases Bar */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(15, 23, 42, 0.8)",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                  {execTimeMs !== null ? `Last execution time: ${execTimeMs} ms` : "Ready to evaluate test cases"}
                </div>

                <button
                  type="button"
                  onClick={handleRunTestCases}
                  disabled={executing || !currentQuestion}
                  style={{
                    padding: "8px 20px",
                    background: executing ? "rgba(124, 58, 237, 0.2)" : "linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: executing || !currentQuestion ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {executing ? "▶ Executing via WASM Compiler..." : "▶ Run Against Test Cases"}
                </button>
              </div>
            </div>

            {/* Test Case Execution Output Panel */}
            {testResults.length > 0 && (
              <div
                style={{
                  background: "#0B0E17",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "16px 20px"
                }}
              >
                <h4 style={{ margin: "0 0 12px", fontSize: "13px", color: "#F8FAFC", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Execution Evaluation Results ({testResults.filter(r => r.passed).length}/{testResults.length} Passed)
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {testResults.map((r) => (
                    <div
                      key={r.index}
                      style={{
                        background: r.passed ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                        border: r.passed ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "12px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontWeight: "700", color: r.passed ? "#34D399" : "#F87171" }}>
                          Test Case #{r.index} {r.passed ? "✓ PASSED" : "✗ FAILED"}
                        </span>
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                          {r.sample ? "Sample Case" : "Evaluation Case"} • {r.executionType}
                        </span>
                      </div>
                      <div style={{ fontFamily: "monospace", color: "#94A3B8", fontSize: "11px" }}>
                        <div><strong>Input:</strong> {r.input.replace(/\n/g, " ")}</div>
                        <div><strong>Expected:</strong> {r.expected}</div>
                        <div><strong>Actual:</strong> <span style={{ color: r.passed ? "#34D399" : "#F87171" }}>{r.actual}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real-Time Recalibration Delta Bar */}
            {recalibrationResult && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(124, 58, 237, 0.12) 100%)",
                  border: "1px solid rgba(52, 211, 153, 0.35)",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "18px" }}>📈</span>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#F8FAFC" }}>
                    Bayesian Knowledge Tracing (BKT) & IRT $\theta$ Recalibration Delta
                  </h4>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                  {/* BKT Delta */}
                  <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "10px 12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>BKT Mastery Shift</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#A78BFA", marginTop: "2px" }}>
                      {(recalibrationResult.priorMastery * 100).toFixed(1)}% → {(recalibrationResult.newMastery * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "11px", color: recalibrationResult.masteryDelta >= 0 ? "#34D399" : "#F87171" }}>
                      {recalibrationResult.masteryDelta >= 0 ? `+${(recalibrationResult.masteryDelta * 100).toFixed(1)}%` : `${(recalibrationResult.masteryDelta * 100).toFixed(1)}%`}
                    </div>
                  </div>

                  {/* IRT Theta Delta */}
                  <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "10px 12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>IRT Ability $\theta$ Delta</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#34D399", marginTop: "2px" }}>
                      {recalibrationResult.priorIrtTheta} → {recalibrationResult.updatedIrtTheta}
                    </div>
                    <div style={{ fontSize: "11px", color: recalibrationResult.thetaDelta >= 0 ? "#34D399" : "#F87171" }}>
                      $\Delta\theta$: {recalibrationResult.thetaDelta >= 0 ? `+${recalibrationResult.thetaDelta}` : recalibrationResult.thetaDelta}
                    </div>
                  </div>

                  {/* Defect Risk Delta */}
                  <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "10px 12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>Error Vulnerability Risk</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#FBBF24", marginTop: "2px" }}>
                      {(recalibrationResult.priorErrorRisk * 100).toFixed(1)}% → {(recalibrationResult.newErrorRisk * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "11px", color: recalibrationResult.errorRiskDelta <= 0 ? "#34D399" : "#F87171" }}>
                      {recalibrationResult.errorRiskDelta <= 0 ? "🛡️ Risk Inoculated" : "⚠️ Bug Pattern Reinforced"}
                    </div>
                  </div>

                  {/* Next ZPD Recommendation */}
                  <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "10px 12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>Next ZPD Target</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#60A5FA", marginTop: "2px" }}>
                      {recalibrationResult.nextZpd}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                      Calibrated for growth
                    </div>
                  </div>

                  {/* Rank XP & Tier Progression */}
                  <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "10px 12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>Rank Tier & XP</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#F472B6", marginTop: "2px" }}>
                      {recalibrationResult.priorTier || "BRONZE"} → {recalibrationResult.newTier || "BRONZE"}
                    </div>
                    <div style={{ fontSize: "11px", color: (recalibrationResult.rankXpDelta ?? 0) >= 0 ? "#34D399" : "#F87171" }}>
                      {(recalibrationResult.rankXpDelta ?? 0) >= 0 ? `+${recalibrationResult.rankXpDelta || 0} XP` : `${recalibrationResult.rankXpDelta} XP`} ({recalibrationResult.newRankXp || 0} Total)
                    </div>
                  </div>
                </div>

                {/* Algorithmic Pattern Reflections (50% Explicit + 35% Linked) */}
                {recalibrationResult.patternUpdates && recalibrationResult.patternUpdates.length > 0 && (
                  <div style={{ marginTop: "12px", fontSize: "11px", color: "#E2E8F0" }}>
                    <strong>Algorithmic Pattern Reflections: </strong>
                    {recalibrationResult.patternUpdates.map((pat, idx) => (
                      <span key={idx} style={{ marginRight: "8px", background: "rgba(124, 58, 237, 0.2)", border: "1px solid rgba(124, 58, 237, 0.4)", padding: "2px 6px", borderRadius: "4px" }}>
                        {pat.dimension}: {pat.delta >= 0 ? `+${pat.delta}` : pat.delta} <span style={{ opacity: 0.75, fontSize: "10px" }}>({pat.impact})</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Graph Neighbor Ripples (18% Concept Ripple) */}
                {recalibrationResult.ripples && recalibrationResult.ripples.length > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#CBD5E1" }}>
                    <strong>Multi-Hop Concept Ripples (18%): </strong>
                    {recalibrationResult.ripples.map((rip, idx) => (
                      <span key={idx} style={{ marginRight: "8px", background: "rgba(255, 255, 255, 0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                        {rip.dimension}: {rip.delta >= 0 ? `+${rip.delta}` : rip.delta}
                      </span>
                    ))}
                  </div>
                )}

                {/* 5 Engineering Competencies */}
                {recalibrationResult.competencyUpdates && recalibrationResult.competencyUpdates.length > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#94A3B8" }}>
                    <strong style={{ color: "#E2E8F0" }}>Cognitive Competencies: </strong>
                    {recalibrationResult.competencyUpdates.map((comp, idx) => (
                      <span key={idx} style={{ marginRight: "6px", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "2px 6px", borderRadius: "4px", color: "#93C5FD" }}>
                        {comp.dimension}: {comp.delta >= 0 ? `+${comp.delta}` : comp.delta}
                      </span>
                    ))}
                  </div>
                )}

                {/* Closed-Loop Chaining Action Bar */}
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                    Next Recommended Concept: <strong style={{ color: "#60A5FA" }}>{recalibrationResult.nextSuggestedConcept || targetSkill}</strong> ({recalibrationResult.nextZpd})
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyVectorToNextQuestion}
                    style={{
                      padding: "8px 18px",
                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      border: "none",
                      color: "#FFFFFF",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
                    }}
                  >
                    🔄 Apply Resulting Vector as Input for Next Question
                  </button>
                </div>

                {/* Chained Toast Banner */}
                {vectorChainedToast && (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)",
                    color: "#FFFFFF",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    marginTop: "12px",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span>✓</span>
                    <span>{vectorChainedToast}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
