import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import Client from "../../shared/api/Client";
import { isWasmCached, getDetailedCacheStats, precacheLanguage } from "../exam/wasm/wasmCacheService";
import { executeWasmOrFallback, warmupWasmRuntimes } from "../exam/wasm/wasmRunner";
import AppShell from "../../shared/components/AppShell";
import usePageMeta from "../../shared/hooks/usePageMeta";
import "./adaptive.css";

// 20-D Clean Matrix Taxonomy
const CONCEPTS_LIST = [
  "ARRAYS_STRINGS", "HASH_TABLES", "LINKED_LISTS",
  "STACKS_QUEUES", "TREES_BST", "GRAPHS",
  "RECURSION_BACKTRACKING", "DYNAMIC_PROGRAMMING"
];

const PATTERNS_LIST = [
  "TWO_POINTERS", "SLIDING_WINDOW", "BINARY_SEARCH",
  "BFS_DFS", "MONOTONIC_QUEUE_STACK", "TOP_K_HEAP",
  "UNION_FIND", "INTERVALS_GREEDY"
];

const COMPETENCIES_LIST = [
  "ALGORITHMIC_EFFICIENCY", "EDGE_CASE_RESILIENCE",
  "CODE_RELIABILITY", "IMPLEMENTATION_FLUENCY"
];

const ERROR_PROFILES_LIST = [
  "OFF_BY_ONE", "NULL_EMPTY_COLLECTION",
  "TIME_LIMIT_EXCEEDED", "STATE_CORRUPTION"
];

// Directed Prerequisite DAG Map
const PREREQUISITE_DAG = {
  TWO_POINTERS: ["ARRAYS_STRINGS"],
  SLIDING_WINDOW: ["ARRAYS_STRINGS", "HASH_TABLES", "TWO_POINTERS"],
  BINARY_SEARCH: ["ARRAYS_STRINGS"],
  LINKED_LISTS: ["ARRAYS_STRINGS"],
  STACKS_QUEUES: ["ARRAYS_STRINGS"],
  MONOTONIC_QUEUE_STACK: ["STACKS_QUEUES", "ARRAYS_STRINGS"],
  RECURSION_BACKTRACKING: ["STACKS_QUEUES"],
  TREES_BST: ["RECURSION_BACKTRACKING", "STACKS_QUEUES"],
  BFS_DFS: ["TREES_BST", "STACKS_QUEUES", "RECURSION_BACKTRACKING"],
  GRAPHS: ["BFS_DFS", "HASH_TABLES"],
  TOP_K_HEAP: ["TREES_BST", "ARRAYS_STRINGS"],
  UNION_FIND: ["GRAPHS", "ARRAYS_STRINGS"],
  INTERVALS_GREEDY: ["ARRAYS_STRINGS", "TWO_POINTERS"],
  DYNAMIC_PROGRAMMING: ["RECURSION_BACKTRACKING", "ARRAYS_STRINGS"]
};

// Remediation Targets on Defect / Failure
const REMEDIATION_DAG = {
  SLIDING_WINDOW: ["TWO_POINTERS", "ARRAYS_STRINGS"],
  DYNAMIC_PROGRAMMING: ["RECURSION_BACKTRACKING"],
  BFS_DFS: ["TREES_BST", "STACKS_QUEUES"],
  UNION_FIND: ["GRAPHS"],
  MONOTONIC_QUEUE_STACK: ["STACKS_QUEUES"],
  TOP_K_HEAP: ["TREES_BST"],
  TWO_POINTERS: ["ARRAYS_STRINGS"],
  INTERVALS_GREEDY: ["ARRAYS_STRINGS"],
  TREES_BST: ["RECURSION_BACKTRACKING", "STACKS_QUEUES"],
  GRAPHS: ["BFS_DFS", "HASH_TABLES"],
  STACKS_QUEUES: ["ARRAYS_STRINGS"],
  LINKED_LISTS: ["ARRAYS_STRINGS"],
  HASH_TABLES: ["ARRAYS_STRINGS"],
  RECURSION_BACKTRACKING: ["STACKS_QUEUES"]
};

// Recommended default patterns when user switches topics
const TOPIC_RECOMMENDED_PATTERNS = {
  ARRAYS_STRINGS: "TWO_POINTERS",
  HASH_TABLES: "SLIDING_WINDOW",
  LINKED_LISTS: "TWO_POINTERS",
  STACKS_QUEUES: "MONOTONIC_QUEUE_STACK",
  TREES_BST: "BFS_DFS",
  GRAPHS: "BFS_DFS",
  RECURSION_BACKTRACKING: "BFS_DFS",
  DYNAMIC_PROGRAMMING: "SLIDING_WINDOW"
};

// Lateral Isomorphic Pattern Transfers
const LATERAL_TRANSFER_MAP = {
  TWO_POINTERS: ["LINKED_LISTS", "INTERVALS_GREEDY"],
  BFS_DFS: ["GRAPHS", "TREES_BST"],
  SLIDING_WINDOW: ["HASH_TABLES", "TWO_POINTERS"],
  MONOTONIC_QUEUE_STACK: ["TWO_POINTERS", "SLIDING_WINDOW"],
  BINARY_SEARCH: ["INTERVALS_GREEDY"]
};

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

function cleanDisplayText(text) {
  if (!text) return "";
  let s = String(text);
  // Decode literal unicode escapes like \u2264 -> ≤, \u2265 -> ≥
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  // Decode literal escaped linebreaks and tabs
  s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "    ");
  return s;
}

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

  // Vector Configuration State (20-D Matrix)
  const [irtTheta, setIrtTheta] = useState(0.25);
  const [bktMastery, setBktMastery] = useState(0.55);
  const [bktPrior, setBktPrior] = useState(0.40);
  const [confidence, setConfidence] = useState(0.80);
  const [targetSkill, setTargetSkill] = useState("ARRAYS_STRINGS");
  const [pattern, setPattern] = useState("TWO_POINTERS");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [errorFocus, setErrorFocus] = useState("OFF_BY_ONE");
  const [activeVectorTab, setActiveVectorTab] = useState("concepts"); // concepts, patterns, competencies, errors

  // 20-D Matrix State
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
  const [compilerTarget, setCompilerTarget] = useState("local-sandbox");

  // Recalibration & DAG Result State
  const [recalibrationResult, setRecalibrationResult] = useState(null);
  const [vectorChainedToast, setVectorChainedToast] = useState(null);

  // AI Diagnostic Inspector State
  const [diagnosing, setDiagnosing] = useState(false);
  const [defectDiagnosis, setDefectDiagnosis] = useState(null);

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

  // Preset Configurations for 20-D Matrix & DAG Testing
  function applyPreset(type) {
    if (type === "ABSOLUTE_BEGINNER") {
      setIrtTheta(-1.80);
      setBktMastery(0.18);
      setBktPrior(0.15);
      setDifficulty("EASY");
      setTargetSkill("ARRAYS_STRINGS");
      setPattern("TWO_POINTERS");
      setErrorFocus("OFF_BY_ONE");
      setErrorsMap((prev) => ({ ...prev, OFF_BY_ONE: 0.40, NULL_EMPTY_COLLECTION: 0.35 }));
      setConceptsMap(() => {
        const m = {};
        CONCEPTS_LIST.forEach(c => { m[c] = (c === "ARRAYS_STRINGS" ? 0.18 : 0.12); });
        return m;
      });
      setPatternsMap(() => {
        const m = {};
        PATTERNS_LIST.forEach(p => { m[p] = (p === "TWO_POINTERS" ? 0.15 : 0.10); });
        return m;
      });
      setCompetenciesMap(() => {
        const m = {};
        COMPETENCIES_LIST.forEach(c => { m[c] = 0.20; });
        return m;
      });
    } else if (type === "BEGINNER_OFF_BY_ONE") {
      setIrtTheta(-0.60);
      setBktMastery(0.35);
      setBktPrior(0.30);
      setDifficulty("EASY_MEDIUM");
      setTargetSkill("ARRAYS_STRINGS");
      setPattern("TWO_POINTERS");
      setErrorFocus("OFF_BY_ONE");
      setErrorsMap((prev) => ({ ...prev, OFF_BY_ONE: 0.70, NULL_EMPTY_COLLECTION: 0.45 }));
      setConceptsMap(() => {
        const m = {};
        CONCEPTS_LIST.forEach(c => { m[c] = (c === "ARRAYS_STRINGS" ? 0.35 : 0.25); });
        return m;
      });
      setPatternsMap(() => {
        const m = {};
        PATTERNS_LIST.forEach(p => { m[p] = (p === "TWO_POINTERS" ? 0.30 : 0.20); });
        return m;
      });
      setCompetenciesMap(() => {
        const m = {};
        COMPETENCIES_LIST.forEach(c => { m[c] = 0.35; });
        return m;
      });
    } else if (type === "INTERMEDIATE_STRESS") {
      setIrtTheta(0.40);
      setBktMastery(0.65);
      setBktPrior(0.60);
      setDifficulty("MEDIUM");
      setTargetSkill("ARRAYS_STRINGS");
      setPattern("SLIDING_WINDOW");
      setErrorFocus("TIME_LIMIT_EXCEEDED");
      setErrorsMap((prev) => ({ ...prev, TIME_LIMIT_EXCEEDED: 0.75, STATE_CORRUPTION: 0.40 }));
      setConceptsMap(() => {
        const m = {};
        CONCEPTS_LIST.forEach(c => { m[c] = (c === "ARRAYS_STRINGS" ? 0.65 : 0.55); });
        return m;
      });
      setPatternsMap(() => {
        const m = {};
        PATTERNS_LIST.forEach(p => { m[p] = (p === "SLIDING_WINDOW" ? 0.60 : 0.50); });
        return m;
      });
      setCompetenciesMap(() => {
        const m = {};
        COMPETENCIES_LIST.forEach(c => { m[c] = 0.65; });
        return m;
      });
    } else if (type === "ADVANCED_RECURSION_DAG") {
      setIrtTheta(1.85);
      setBktMastery(0.88);
      setBktPrior(0.82);
      setDifficulty("HARD");
      setTargetSkill("DYNAMIC_PROGRAMMING");
      setPattern("BFS_DFS");
      setErrorFocus("STATE_CORRUPTION");
      setErrorsMap((prev) => ({ ...prev, STATE_CORRUPTION: 0.65, TIME_LIMIT_EXCEEDED: 0.30 }));
      setConceptsMap(() => {
        const m = {};
        CONCEPTS_LIST.forEach(c => { m[c] = (c === "DYNAMIC_PROGRAMMING" ? 0.88 : 0.80); });
        return m;
      });
      setPatternsMap(() => {
        const m = {};
        PATTERNS_LIST.forEach(p => { m[p] = (p === "BFS_DFS" ? 0.85 : 0.75); });
        return m;
      });
      setCompetenciesMap(() => {
        const m = {};
        COMPETENCIES_LIST.forEach(c => { m[c] = 0.85; });
        return m;
      });
    } else {
      // Default reset
      setIrtTheta(0.25);
      setBktMastery(0.55);
      setBktPrior(0.40);
      setDifficulty("MEDIUM");
      setTargetSkill("ARRAYS_STRINGS");
      setPattern("TWO_POINTERS");
      setErrorFocus("OFF_BY_ONE");
      setConceptsMap(() => {
        const m = {};
        CONCEPTS_LIST.forEach(c => { m[c] = 0.50; });
        return m;
      });
      setPatternsMap(() => {
        const m = {};
        PATTERNS_LIST.forEach(p => { m[p] = 0.50; });
        return m;
      });
      setCompetenciesMap(() => {
        const m = {};
        COMPETENCIES_LIST.forEach(c => { m[c] = 0.50; });
        return m;
      });
    }
  }

  // Handle Dynamic Question Generation (5 Calibrated Test Cases + Sandbox Verification)
  async function handleGenerateQuestion() {
    try {
      setGenerating(true);
      setRecalibrationResult(null);
      setTestResults([]);
      setDefectDiagnosis(null);

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
        temperature: 0.3,
        language
      };

      const res = await Client.post("/admin/adaptive-tester/generate-question", payload);
      const data = res.data;
      if (data) {
        setPromptDebug(data);
        if (data.question) {
          setCurrentQuestion(data.question);
          if (data.question.canonicalSolution) {
            setCode(sanitizeCodeString(data.question.canonicalSolution, language) || BOILERPLATES[language] || "");
            setSolutionMeta({
              timeComplexity: "Optimal",
              spaceComplexity: "Optimal",
              approach: data.question.solutionOutline || "100% Verified AI Canonical Reference Solution"
            });
          } else {
            setCode(BOILERPLATES[language] || "");
          }
        }
      }
    } catch (err) {
      console.error("Failed to generate test question:", err);
      alert("Question generation failed. Check Groq API connectivity.");
    } finally {
      setGenerating(false);
    }
  }

  // Handle Test Case Execution & Multi-Signal Telemetry Loop
  async function handleRunTestCases() {
    if (!currentQuestion || executing) return;
    setExecuting(true);
    setTestResults([]);
    setDefectDiagnosis(null);
    const startTime = performance.now();

    const tcs = currentQuestion.testCases || [];
    const results = [];
    let combinedOutput = "";
    let combinedError = "";
    let passedCount = 0;

    for (let i = 0; i < tcs.length; i++) {
      const tc = tcs[i];
      try {
        const out = await executeWasmOrFallback(code, tc.input || "", language, compilerTarget);
        const actual = (out.output || out.stdout || "").trim();
        const expected = (tc.expectedOutput || "").trim();
        const passed = actual === expected;
        if (passed) passedCount++;

        combinedOutput += " " + (out.output || out.stdout || "");
        if (out.error) combinedError += " " + out.error;

        results.push({
          index: i + 1,
          category: tc.category || (tc.sample ? "SAMPLE" : "EVALUATION"),
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
          category: tc.category || "EVALUATION",
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

    // Identify isolated telemetry signals
    const boundaryResult = results.find(r => r.category === "BOUNDARY");
    const stressResult = results.find(r => r.category === "STRESS");
    const boundaryPassed = boundaryResult ? boundaryResult.passed : (passedCount >= 3);
    const stressPassed = stressResult ? stressResult.passed : (passedCount >= 4);

    // Call Sandbox Simulation with DAG Knowledge Propagation
    try {
      const simPayload = {
        targetSkill,
        pattern,
        difficulty,
        currentMastery: Number(bktMastery),
        bktPrior: Number(bktPrior),
        irtTheta: Number(irtTheta),
        currentErrorRisk: errorsMap[errorFocus] || 0.35,
        errorFocus,
        passedTcs: passedCount,
        totalTcs: tcs.length,
        boundaryPassed,
        stressPassed,
        executionTimeMs: elapsed,
        attempts: 1,
        durationSeconds: 30,
        output: combinedOutput,
        error: combinedError,
        code,
        problemTitle: currentQuestion.title,
        problemDescription: currentQuestion.description || currentQuestion.problemStatement,
        language,
        model: selectedModel
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

  // AI Deep Code Diagnostic Inspector: Identify exact defect, line number, and pedagogical fix
  async function handleDiagnoseDefect() {
    if (!currentQuestion || testResults.length === 0) return;
    const failedResult = testResults.find(r => !r.passed) || testResults[0] || {};
    try {
      setDiagnosing(true);
      setDefectDiagnosis(null);
      const res = await Client.post("/admin/adaptive-tester/diagnose-defect", {
        model: selectedModel,
        code,
        language,
        problemStatement: currentQuestion.description || currentQuestion.problemStatement,
        failedInput: failedResult.input || "",
        expectedOutput: failedResult.expected || "",
        actualOutput: failedResult.actual || "",
        errorTrace: failedResult.error || (testResults.find(r => r.error)?.error || "")
      });
      if (res.data) {
        setDefectDiagnosis(res.data);
      }
    } catch (err) {
      console.error("Failed to diagnose code defect:", err);
      alert("AI code diagnosis failed. Check Groq API connectivity.");
    } finally {
      setDiagnosing(false);
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

  // Fast restore of verified canonical solution or on-demand synthesis
  function handleLoadOrSynthesizeSolution() {
    if (!currentQuestion) {
      alert("Please generate or select a question first.");
      return;
    }
    if (currentQuestion.canonicalSolution) {
      const cleanCode = sanitizeCodeString(currentQuestion.canonicalSolution, language);
      setCode(cleanCode);
      setSolutionMeta({
        timeComplexity: "Optimal",
        spaceComplexity: "Optimal",
        approach: currentQuestion.solutionOutline || "100% Verified AI Canonical Reference Solution"
      });
      return;
    }
    handleGenerateAiSolution();
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

    const nm = recalibrationResult.newMastery !== undefined
      ? Number(recalibrationResult.newMastery.toFixed(2))
      : Number(bktMastery);
    const newTheta = recalibrationResult.updatedIrtTheta !== undefined
      ? Number(recalibrationResult.updatedIrtTheta.toFixed(2))
      : Number(irtTheta);

    // 1. Update active target's BKT Mastery & Prior in state & conceptsMap
    setBktMastery(nm);
    setBktPrior(nm);
    setConceptsMap(prev => ({ ...prev, [targetSkill]: nm }));

    // 2. Update IRT Latent Ability
    setIrtTheta(newTheta);

    // 3. Update Difficulty to next ZPD
    if (recalibrationResult.nextZpd) {
      setDifficulty(recalibrationResult.nextZpd);
    }

    // 4. Update Error Risk for active defect focus
    if (recalibrationResult.newErrorRisk !== undefined) {
      setErrorsMap(prev => ({ ...prev, [errorFocus]: recalibrationResult.newErrorRisk }));
    }

    // 5. Ripple across 20-D Matrix from allUpdates
    const updatesList = recalibrationResult.allUpdates || recalibrationResult.all35VectorUpdates || [];
    if (Array.isArray(updatesList) && updatesList.length > 0) {
      setConceptsMap(prev => {
        const next = { ...prev, [targetSkill]: nm };
        updatesList.forEach(up => {
          if (up.dimension !== targetSkill) {
            if (up.type === "PRIMARY_TARGET" || up.type === "TOP_DOWN_REMEDIATION" || up.type === "CONCEPT") {
              const cur = next[up.dimension] ?? 0.50;
              next[up.dimension] = Math.max(0.05, Math.min(0.98, Number((cur + (up.delta || 0)).toFixed(2))));
            }
          }
        });
        return next;
      });

      setPatternsMap(prev => {
        const next = { ...prev };
        updatesList.forEach(up => {
          if (up.type === "PATTERN" || up.type === "LATERAL_TRANSFER") {
            const cur = next[up.dimension] ?? 0.45;
            next[up.dimension] = Math.max(0.05, Math.min(0.98, Number((cur + (up.delta || 0)).toFixed(2))));
          }
        });
        return next;
      });

      setCompetenciesMap(prev => {
        const next = { ...prev };
        updatesList.forEach(up => {
          if (up.type === "COMPETENCY") {
            const cur = next[up.dimension] ?? 0.60;
            next[up.dimension] = Math.max(0.05, Math.min(0.95, Number((cur + (up.delta || 0)).toFixed(2))));
          }
        });
        return next;
      });

      setErrorsMap(prev => {
        const next = { ...prev };
        updatesList.forEach(up => {
          if (up.type === "ERROR_PROFILE") {
            const cur = next[up.dimension] ?? 0.30;
            next[up.dimension] = Math.max(0.05, Math.min(0.95, Number((cur + (up.delta || 0)).toFixed(2))));
          }
        });
        return next;
      });
    }

    setVectorChainedToast(`✨ Vector Chained Successfully! ${targetSkill} mastery calibrated to ${(nm * 100).toFixed(0)}% (θ = ${newTheta > 0 ? "+" + newTheta : newTheta}, ZPD '${recalibrationResult.nextZpd || difficulty}'). Ready to generate next progressive challenge!`);
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
                onChange={(e) => {
                  const newTopic = e.target.value;
                  setTargetSkill(newTopic);
                  if (TOPIC_RECOMMENDED_PATTERNS[newTopic]) {
                    setPattern(TOPIC_RECOMMENDED_PATTERNS[newTopic]);
                  }
                  const topicM = conceptsMap[newTopic] !== undefined ? conceptsMap[newTopic] : 0.50;
                  setBktMastery(topicM);
                  setBktPrior(topicM);
                  const computedTheta = Math.round(Math.log(Math.max(0.01, topicM) / Math.max(0.01, 1.0 - topicM)) * 100) / 100;
                  setIrtTheta(Math.max(-3.0, Math.min(3.0, computedTheta)));
                }}
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
              ⚡ Adaptive DAG Presets
            </label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => applyPreset("ABSOLUTE_BEGINNER")}
                style={{
                  fontSize: "11px",
                  padding: "6px 9px",
                  borderRadius: "6px",
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  color: "#38BDF8",
                  cursor: "pointer"
                }}
              >
                🌱 Novice (Print/Loop)
              </button>
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
                ⚠️ Off-by-One Trap
              </button>
              <button
                type="button"
                onClick={() => applyPreset("INTERMEDIATE_STRESS")}
                style={{
                  fontSize: "11px",
                  padding: "6px 9px",
                  borderRadius: "6px",
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.35)",
                  color: "#C084FC",
                  cursor: "pointer"
                }}
              >
                ⚡ Scale / Stress (O(N))
              </button>
              <button
                type="button"
                onClick={() => applyPreset("ADVANCED_RECURSION_DAG")}
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
                🌲 Tree / DP DAG
              </button>
            </div>
          </div>
        </div>

        {/* Main Split Grid: Left = 20-D Vector Matrix & DAG Controls | Right = Problem & IDE */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(380px, 42%) 1fr", gap: "20px", alignItems: "start" }}>
          
          {/* LEFT COLUMN: 20-Dimensional Vector Matrix & DAG Prerequisite Suite */}
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
                  20-D Cognitive Vector Matrix & DAG Routing
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
                STEP 1 & 2 LIVE
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
                  onChange={(e) => {
                    const newTheta = parseFloat(e.target.value);
                    setIrtTheta(newTheta);
                    const newM = Math.round((1.0 / (1.0 + Math.exp(-newTheta))) * 100) / 100;
                    setBktMastery(newM);
                    setConceptsMap(prev => ({ ...prev, [targetSkill]: newM }));
                  }}
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
                  onChange={(e) => {
                    const newM = parseFloat(e.target.value);
                    setBktMastery(newM);
                    setConceptsMap(prev => ({ ...prev, [targetSkill]: newM }));
                    const th = Math.round(Math.log(Math.max(0.01, newM) / Math.max(0.01, 1.0 - newM)) * 100) / 100;
                    setIrtTheta(Math.max(-3.0, Math.min(3.0, th)));
                  }}
                  style={{ width: "100%", accentColor: "#7C3AED" }}
                />
              </div>

              {/* Inoculation Error Profile Focus */}
              <div style={{ marginBottom: "12px" }}>
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
                  <option value="OFF_BY_ONE">OFF_BY_ONE (Array Bounds & Indexing)</option>
                  <option value="NULL_EMPTY_COLLECTION">NULL_EMPTY_COLLECTION (Missing Null/Empty Checks)</option>
                  <option value="TIME_LIMIT_EXCEEDED">TIME_LIMIT_EXCEEDED (Asymptotic Inefficiency O(N^2))</option>
                  <option value="STATE_CORRUPTION">STATE_CORRUPTION (Pointers / State Mutation / Recurrence)</option>
                </select>
              </div>

              {/* DAG Knowledge Routing Indicator (Dynamic Topic + Pattern) */}
              <div style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "11px",
                color: "#94A3B8"
              }}>
                <div style={{ color: "#60A5FA", fontWeight: "700", marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>🕸️ DAG Routing: Topic [<strong>{targetSkill}</strong>] & Pattern [<strong>{pattern}</strong>]</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div><strong>Topic Prerequisites:</strong> <span style={{ color: "#E2E8F0" }}>{(PREREQUISITE_DAG[targetSkill] || []).join(", ") || "Foundational Root Node"}</span></div>
                  <div><strong>Pattern Prerequisites:</strong> <span style={{ color: "#E2E8F0" }}>{(PREREQUISITE_DAG[pattern] || []).join(", ") || "Direct Application"}</span></div>
                  <div><strong>Remediation Target:</strong> <span style={{ color: "#FBBF24" }}>{(REMEDIATION_DAG[pattern] || REMEDIATION_DAG[targetSkill] || []).join(", ") || "Self-Repair"}</span></div>
                  <div><strong>Lateral Transfer:</strong> <span style={{ color: "#34D399" }}>{(LATERAL_TRANSFER_MAP[pattern] || LATERAL_TRANSFER_MAP[targetSkill] || []).join(", ") || "None"}</span></div>
                </div>
              </div>
            </div>

            {/* 4 Cognitive Layers Tabs (20-D Matrix) */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "14px" }}>
              {[
                { id: "concepts", label: "8 Concepts", count: 8 },
                { id: "patterns", label: "8 Patterns", count: 8 },
                { id: "competencies", label: "4 Competencies", count: 4 },
                { id: "errors", label: "4 Defect Profiles", count: 4 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveVectorTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
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
                        value={conceptsMap[c] !== undefined ? conceptsMap[c] : 0.5}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setConceptsMap(prev => ({ ...prev, [c]: val }));
                          if (c === targetSkill) {
                            setBktMastery(val);
                            const th = Math.round(Math.log(Math.max(0.01, val) / Math.max(0.01, 1.0 - val)) * 100) / 100;
                            setIrtTheta(Math.max(-3.0, Math.min(3.0, th)));
                          }
                        }}
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

                  {currentQuestion.criticStatus && (
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#A5B4FC" }}>
                      🤖 {currentQuestion.criticStatus === "STAGE_2_CRITIC_VERIFIED" ? "Critic Verified" : currentQuestion.criticStatus}
                    </span>
                  )}

                  {currentQuestion.sandboxVerified ? (
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#34D399" }}>
                      🛡️ 100% Native Sandbox Grounded ({currentQuestion.verifiedCount || 5}/5 Passed)
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#FBBF24" }}>
                      ⚡ Pre-flight Verified ({currentQuestion.verifiedCount || 0}/5 Passed)
                    </span>
                  )}
                </div>

                <h2 style={{ fontSize: "18px", fontWeight: "700", margin: "0 0 10px", color: "#F8FAFC" }}>
                  {currentQuestion.title}
                </h2>

                {currentQuestion.criticNotes && (
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "12px", background: "rgba(99, 102, 241, 0.1)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
                    <strong style={{ color: "#A5B4FC" }}>🤖 Stage 2 Critic Note: </strong>{currentQuestion.criticNotes}
                  </div>
                )}

                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: "1.65",
                    color: "#CBD5E1",
                    whiteSpace: "pre-wrap",
                    marginBottom: "16px"
                  }}
                >
                  {cleanDisplayText(currentQuestion.description)}
                </div>

                {/* Solution outline accordion */}
                {currentQuestion.solutionOutline && (
                  <details style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#94A3B8", marginBottom: "12px" }}>
                    <summary style={{ cursor: "pointer", fontWeight: "600", color: "#CBD5E1" }}>
                      💡 Algorithmic Blueprint & Inoculation Rationale
                    </summary>
                    <div style={{ marginTop: "8px", color: "#E2E8F0", whiteSpace: "pre-wrap" }}>
                      {cleanDisplayText(currentQuestion.solutionOutline)}
                    </div>
                  </details>
                )}

                {/* 5-Test Case Matrix Suite Inspector (All 5 Generated & Calibrated Cases) */}
                {currentQuestion.testCases && currentQuestion.testCases.length > 0 && (
                  <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#F8FAFC" }}>
                        🧪 5 Calibrated Test Cases Suite ({currentQuestion.testCases.length} generated & sandbox verified)
                      </span>
                      <span style={{ fontSize: "10px", color: "#34D399", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                        {currentQuestion.verificationDetails || "100% Native Sandbox Calibrated"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "8px" }}>
                      {currentQuestion.testCases.map((tc, idx) => {
                        const cat = tc.category || (tc.sample ? "SAMPLE" : "EVALUATION");
                        const isTrap = cat === "DEFECT_TRAP";
                        const isBoundary = cat === "BOUNDARY";
                        const isStress = cat === "STRESS";
                        const isSample = tc.sample || cat.startsWith("SAMPLE");

                        const badgeColor = isTrap ? "#F43F5E" : (isBoundary ? "#F59E0B" : (isStress ? "#8B5CF6" : "#10B981"));
                        const badgeBg = isTrap ? "rgba(244, 63, 94, 0.15)" : (isBoundary ? "rgba(245, 158, 11, 0.15)" : (isStress ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)"));
                        const badgeBorder = isTrap ? "rgba(244, 63, 94, 0.35)" : (isBoundary ? "rgba(245, 158, 11, 0.35)" : (isStress ? "rgba(139, 92, 246, 0.35)" : "rgba(16, 185, 129, 0.35)"));

                        return (
                          <div
                            key={idx}
                            style={{
                              background: "rgba(15, 23, 42, 0.7)",
                              border: `1px solid ${badgeBorder}`,
                              borderRadius: "8px",
                              padding: "8px 10px",
                              fontSize: "11px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                              <span style={{ fontWeight: "700", color: badgeColor, background: badgeBg, padding: "1px 6px", borderRadius: "4px", fontSize: "10px" }}>
                                Case {idx + 1}: {cat} {isSample ? "(Sample)" : "(Hidden Inoculation)"}
                              </span>
                              <span style={{ fontSize: "10px", color: "#94A3B8" }}>
                                {isTrap ? "🎯 Defect Trap" : (isBoundary ? "⚠️ Edge Limits" : (isStress ? "⚡ Scale O(N)" : "✓ Baseline"))}
                              </span>
                            </div>
                            <div style={{ color: "#94A3B8", marginTop: "2px" }}>
                              <span style={{ color: "#64748B" }}>Input: </span>
                              <code style={{ color: "#E2E8F0", background: "rgba(0,0,0,0.3)", padding: "1px 4px", borderRadius: "3px" }}>
                                {tc.input && tc.input.length > 35 ? tc.input.substring(0, 35) + "..." : (tc.input || "(empty)")}
                              </code>
                            </div>
                            <div style={{ color: "#94A3B8", marginTop: "2px" }}>
                              <span style={{ color: "#64748B" }}>Expected: </span>
                              <code style={{ color: "#34D399", background: "rgba(0,0,0,0.3)", padding: "1px 4px", borderRadius: "3px" }}>
                                {tc.expectedOutput && tc.expectedOutput.length > 35 ? tc.expectedOutput.substring(0, 35) + "..." : tc.expectedOutput}
                              </code>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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

                  <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(15, 23, 42, 0.8)", padding: "2px 4px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <button
                      type="button"
                      onClick={() => setCompilerTarget("local-sandbox")}
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                        background: compilerTarget === "local-sandbox" ? "rgba(16, 185, 129, 0.25)" : "transparent",
                        color: compilerTarget === "local-sandbox" ? "#34D399" : "#64748B"
                      }}
                    >
                      ⚡ Native Server Sandbox (JVM/Python/GCC)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompilerTarget("wasm-local")}
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                        background: compilerTarget === "wasm-local" ? "rgba(99, 102, 241, 0.25)" : "transparent",
                        color: compilerTarget === "wasm-local" ? "#818CF8" : "#64748B"
                      }}
                    >
                      🌐 In-Browser WASM
                    </button>
                  </div>
                </div>

                {/* Dynamic AI Code Generators: Optimal Solution & Fault Injections */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleLoadOrSynthesizeSolution}
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
                    {generatingSolution ? "⏳ Synthesizing Solution..." : (currentQuestion?.canonicalSolution ? "⚡ AI Canonical Solution" : "✨ AI Optimal Solution")}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "13px", color: "#F8FAFC", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Execution Evaluation Results ({testResults.filter(r => r.passed).length}/{testResults.length} Passed)
                  </h4>

                  <button
                    type="button"
                    onClick={handleDiagnoseDefect}
                    disabled={diagnosing}
                    style={{
                      padding: "6px 14px",
                      background: diagnosing ? "rgba(245, 158, 11, 0.2)" : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                      border: "none",
                      borderRadius: "6px",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: diagnosing ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
                    }}
                  >
                    {diagnosing ? "🔍 Diagnosing with AI..." : "🔍 Deep Diagnose Mistakes with AI"}
                  </button>
                </div>

                {/* AI Code Diagnostic Card */}
                {defectDiagnosis && (
                  <div
                    style={{
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      marginBottom: "14px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "800", color: "#FBBF24" }}>
                        🎯 AI Cognitive Diagnostic: {defectDiagnosis.detectedDefect} {defectDiagnosis.faultyLine > 0 ? `(Line ${defectDiagnosis.faultyLine})` : ""}
                      </span>
                      <span style={{ fontSize: "10px", color: "#FDE68A", background: "rgba(245, 158, 11, 0.2)", padding: "2px 8px", borderRadius: "4px" }}>
                        ROOT CAUSE IDENTIFIED
                      </span>
                    </div>

                    <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#E2E8F0", lineHeight: "1.5" }}>
                      {defectDiagnosis.diagnosticExplanation}
                    </p>

                    {defectDiagnosis.pedagogicalRemediationTip && (
                      <div style={{ fontSize: "11px", color: "#FCD34D", marginBottom: "6px" }}>
                        💡 <strong>Learning Tip:</strong> {defectDiagnosis.pedagogicalRemediationTip}
                      </div>
                    )}

                    {defectDiagnosis.suggestedFixSnippet && (
                      <div style={{ background: "#07090E", padding: "8px 12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "11px", color: "#A7F3D0" }}>
                        <code>{defectDiagnosis.suggestedFixSnippet}</code>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {testResults.map((r) => {
                    const categoryLabel = r.category === "BOUNDARY"
                      ? "Boundary Edge Case"
                      : (r.category === "STRESS"
                        ? "Scale / Stress (O(N))"
                        : (r.category === "DEFECT_TRAP"
                          ? "Defect Inoculation Trap"
                          : (r.sample ? "Sample Case" : "Evaluation Case")));

                    return (
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
                          <span style={{ fontSize: "10px", fontWeight: "700", color: "#CBD5E1", background: "rgba(255, 255, 255, 0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                            {categoryLabel}
                          </span>
                        </div>
                        <div style={{ fontFamily: "monospace", color: "#94A3B8", fontSize: "11px" }}>
                          <div><strong>Input:</strong> {r.input.replace(/\n/g, " ")}</div>
                          <div><strong>Expected:</strong> {r.expected}</div>
                          <div><strong>Actual:</strong> <span style={{ color: r.passed ? "#34D399" : "#F87171" }}>{r.actual}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Real-Time Recalibration Delta Bar with DAG Updates */}
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
                    Bayesian Knowledge Tracing (BKT) & DAG Recalibration Delta
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

                {/* DAG Propagation Updates */}
                {recalibrationResult.dagUpdates && recalibrationResult.dagUpdates.length > 0 && (
                  <div style={{ marginTop: "14px", fontSize: "11px", color: "#E2E8F0" }}>
                    <strong style={{ color: "#34D399" }}>🕸️ DAG Propagation & Knowledge Graph Shifts: </strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                      {recalibrationResult.dagUpdates.map((dag, idx) => (
                        <span key={idx} style={{
                          background: dag.type === "TOP_DOWN_REMEDIATION"
                            ? "rgba(245, 158, 11, 0.15)"
                            : (dag.type === "LATERAL_TRANSFER"
                              ? "rgba(16, 185, 129, 0.15)"
                              : (dag.type === "PREREQUISITE_GATING"
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(124, 58, 237, 0.2)")),
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          padding: "3px 8px",
                          borderRadius: "4px"
                        }}>
                          <strong>{dag.dimension}</strong>: {dag.delta >= 0 ? `+${dag.delta}` : dag.delta} <span style={{ opacity: 0.8, fontSize: "10px" }}>({dag.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4 Empirical Telemetry Competencies */}
                {recalibrationResult.competencyUpdates && recalibrationResult.competencyUpdates.length > 0 && (
                  <div style={{ marginTop: "10px", fontSize: "11px", color: "#94A3B8" }}>
                    <strong style={{ color: "#60A5FA" }}>📊 4 Empirical Telemetry Competencies: </strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                      {recalibrationResult.competencyUpdates.map((comp, idx) => (
                        <span key={idx} style={{ background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "3px 8px", borderRadius: "4px", color: "#93C5FD" }}>
                          {comp.dimension}: {comp.delta >= 0 ? `+${comp.delta}` : comp.delta} <span style={{ opacity: 0.75, fontSize: "10px" }}>({comp.impact})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Semantic Code Review (Hybrid Assessment Engine) */}
                {recalibrationResult.semanticReview && (
                  <div style={{ marginTop: "14px", background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(99, 102, 241, 0.35)", borderRadius: "8px", padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: "#A5B4FC" }}>
                          🧠 AI Semantic Code Review:
                        </span>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: recalibrationResult.semanticReview.verdict === "OPTIMAL_PATTERN"
                            ? "rgba(16, 185, 129, 0.2)"
                            : (recalibrationResult.semanticReview.verdict === "HARDCODED_SUSPECT"
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(245, 158, 11, 0.2)"),
                          color: recalibrationResult.semanticReview.verdict === "OPTIMAL_PATTERN"
                            ? "#34D399"
                            : (recalibrationResult.semanticReview.verdict === "HARDCODED_SUSPECT"
                              ? "#F87171"
                              : "#FBBF24")
                        }}>
                          {recalibrationResult.semanticReview.verdict}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: "700", color: (recalibrationResult.semanticMultiplier ?? 1.0) >= 1.0 ? "#34D399" : "#F87171" }}>
                        Evidence Multiplier μ: ×{(recalibrationResult.semanticMultiplier ?? 1.0).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "8px" }}>
                      <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "6px 8px", borderRadius: "6px", fontSize: "11px" }}>
                        <span style={{ color: "#94A3B8" }}>Pattern Fidelity: </span>
                        <strong style={{ color: "#38BDF8" }}>{Math.round((recalibrationResult.semanticReview.patternFidelityScore ?? 0.8) * 100)}%</strong>
                      </div>
                      <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "6px 8px", borderRadius: "6px", fontSize: "11px" }}>
                        <span style={{ color: "#94A3B8" }}>Anti-Hardcoding: </span>
                        <strong style={{ color: "#34D399" }}>{Math.round((recalibrationResult.semanticReview.antiHardcodingScore ?? 0.9) * 100)}%</strong>
                      </div>
                      <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "6px 8px", borderRadius: "6px", fontSize: "11px" }}>
                        <span style={{ color: "#94A3B8" }}>Asymptotic Bound: </span>
                        <strong style={{ color: "#A78BFA" }}>{Math.round((recalibrationResult.semanticReview.asymptoticOptimalityScore ?? 0.8) * 100)}%</strong>
                      </div>
                    </div>

                    {recalibrationResult.semanticReview.feedback && (
                      <div style={{ fontSize: "11px", color: "#CBD5E1", fontStyle: "italic" }}>
                        "{recalibrationResult.semanticReview.feedback}"
                      </div>
                    )}
                  </div>
                )}

                {/* Closed-Loop Chaining Action Bar */}
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ fontSize: "12px", color: "#94A3B8", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span>Next Recommended Concept:</span>
                    <strong style={{ color: "#60A5FA" }}>{recalibrationResult.nextSuggestedConcept || targetSkill}</strong>
                    <span style={{ color: "#94A3B8" }}>({recalibrationResult.nextZpd})</span>
                    {recalibrationResult.nextSuggestedConcept && recalibrationResult.nextSuggestedConcept !== targetSkill && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextConcept = recalibrationResult.nextSuggestedConcept;
                          setTargetSkill(nextConcept);
                          if (TOPIC_RECOMMENDED_PATTERNS[nextConcept]) {
                            setPattern(TOPIC_RECOMMENDED_PATTERNS[nextConcept]);
                          }
                          const topicM = conceptsMap[nextConcept] !== undefined ? conceptsMap[nextConcept] : 0.50;
                          setBktMastery(topicM);
                          setBktPrior(topicM);
                          const th = Math.round(Math.log(Math.max(0.01, topicM) / Math.max(0.01, 1.0 - topicM)) * 100) / 100;
                          setIrtTheta(Math.max(-3.0, Math.min(3.0, th)));
                        }}
                        style={{
                          background: "rgba(59, 130, 246, 0.2)",
                          border: "1px solid rgba(59, 130, 246, 0.4)",
                          color: "#93C5FD",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >
                        Switch to {recalibrationResult.nextSuggestedConcept} →
                      </button>
                    )}
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
                    🔄 Apply Resulting Vector to {targetSkill}
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
