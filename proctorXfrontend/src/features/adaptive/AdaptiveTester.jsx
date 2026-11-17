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

// Curated 5 Foundational Algorithmic Pattern Probes (Strict 0% to 30% Bronze Calibration Suite)
const DEFAULT_DIAGNOSTIC_PROBES = [
  {
    id: "DIAG_01",
    title: "Pair With Target Sum",
    primaryConcept: "ARRAYS_STRINGS",
    pattern: "TWO_POINTERS",
    difficulty: "EASY",
    description: "Given a sorted array of integers and a target integer T, determine if there exists any pair of numbers that add up to T. Print YES if a pair exists, otherwise print NO.\\n\\nInput format:\\nFirst line contains integer N.\\nSecond line contains N space-separated sorted integers.\\nThird line contains target integer T.\\n\\nOutput format:\\nPrint YES or NO.",
    canonicalSolution: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) { System.out.println("NO"); return; }
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) if (sc.hasNextInt()) a[i] = sc.nextInt();
        int t = sc.hasNextInt() ? sc.nextInt() : 0;
        int l = 0, r = n - 1;
        while (l < r) {
            int sum = a[l] + a[r];
            if (sum == t) { System.out.println("YES"); return; }
            else if (sum < t) l++;
            else r--;
        }
        System.out.println("NO");
    }
}`,
    testCases: [
      { input: "4\\n2 7 11 15\\n9", expectedOutput: "YES" },
      { input: "5\\n1 2 3 4 6\\n10", expectedOutput: "YES" },
      { input: "3\\n1 2 5\\n10", expectedOutput: "NO" }
    ]
  },
  {
    id: "DIAG_02",
    title: "Move Zeroes to End",
    primaryConcept: "ARRAYS_STRINGS",
    pattern: "TWO_POINTERS",
    difficulty: "EASY",
    description: "Given an array of integers, rearrange the elements in-place so all non-zero numbers appear before zeroes while maintaining relative order.\\n\\nInput format:\\nFirst line contains integer N.\\nSecond line contains N space-separated integers.\\n\\nOutput format:\\nPrint the modified array with numbers separated by single spaces.",
    canonicalSolution: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) if (sc.hasNextInt()) a[i] = sc.nextInt();
        int w = 0;
        for (int r = 0; r < n; r++) {
            if (a[r] != 0) {
                int tmp = a[w]; a[w] = a[r]; a[r] = tmp;
                w++;
            }
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if (i > 0) sb.append(' ');
            sb.append(a[i]);
        }
        System.out.println(sb.toString());
    }
}`,
    testCases: [
      { input: "5\\n0 1 0 3 12", expectedOutput: "1 3 12 0 0" },
      { input: "4\\n0 0 0 1", expectedOutput: "1 0 0 0" },
      { input: "3\\n1 2 3", expectedOutput: "1 2 3" }
    ]
  },
  {
    id: "DIAG_03",
    title: "Maximum Sum Subarray of Size K",
    primaryConcept: "ARRAYS_STRINGS",
    pattern: "SLIDING_WINDOW",
    difficulty: "EASY",
    description: "Given an array of N integers and positive integer K (1 <= K <= N), calculate the maximum sum of any contiguous subarray of size K.\\n\\nInput format:\\nFirst line contains two integers N and K.\\nSecond line contains N space-separated integers.\\n\\nOutput format:\\nPrint a single integer representing the maximum sum.",
    canonicalSolution: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int k = sc.hasNextInt() ? sc.nextInt() : 1;
        int[] a = new int[n];
        for (int i = 0; i < n; i++) if (sc.hasNextInt()) a[i] = sc.nextInt();
        if (n < k || k <= 0) { System.out.println(0); return; }
        long cur = 0;
        for (int i = 0; i < k; i++) cur += a[i];
        long max = cur;
        for (int i = k; i < n; i++) {
            cur += a[i] - a[i - k];
            if (cur > max) max = cur;
        }
        System.out.println(max);
    }
}`,
    testCases: [
      { input: "7 3\\n2 1 5 1 3 2 1", expectedOutput: "9" },
      { input: "4 2\\n2 3 4 1", expectedOutput: "7" },
      { input: "5 1\\n10 20 30 40 50", expectedOutput: "50" }
    ]
  },
  {
    id: "DIAG_04",
    title: "Search Insert Position",
    primaryConcept: "ARRAYS_STRINGS",
    pattern: "BINARY_SEARCH",
    difficulty: "EASY",
    description: "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order in O(log N) time.\\n\\nInput format:\\nFirst line contains integer N.\\nSecond line contains N space-separated sorted integers.\\nThird line contains target integer.\\n\\nOutput format:\\nPrint the 0-based index.",
    canonicalSolution: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) if (sc.hasNextInt()) a[i] = sc.nextInt();
        int t = sc.hasNextInt() ? sc.nextInt() : 0;
        int l = 0, r = n - 1;
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (a[mid] == t) { System.out.println(mid); return; }
            else if (a[mid] < t) l = mid + 1;
            else r = mid - 1;
        }
        System.out.println(l);
    }
}`,
    testCases: [
      { input: "4\\n1 3 5 6\\n5", expectedOutput: "2" },
      { input: "4\\n1 3 5 6\\n2", expectedOutput: "1" },
      { input: "4\\n1 3 5 6\\n7", expectedOutput: "4" }
    ]
  },
  {
    id: "DIAG_05",
    title: "Valid Parentheses Sequence",
    primaryConcept: "STACKS_QUEUES",
    pattern: "MONOTONIC_QUEUE_STACK",
    difficulty: "EASY",
    description: "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Open brackets must be closed by the same type of brackets in the correct order.\\n\\nInput format:\\nA single string of brackets.\\n\\nOutput format:\\nPrint true if valid, otherwise false.",
    canonicalSolution: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) { System.out.println("true"); return; }
        String s = sc.next();
        Deque<Character> st = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') st.push(c);
            else {
                if (st.isEmpty()) { System.out.println("false"); return; }
                char top = st.pop();
                if (c == ')' && top != '(') { System.out.println("false"); return; }
                if (c == '}' && top != '{') { System.out.println("false"); return; }
                if (c == ']' && top != '[') { System.out.println("false"); return; }
            }
        }
        System.out.println(st.isEmpty() ? "true" : "false");
    }
}`,
    testCases: [
      { input: "()[]{}", expectedOutput: "true" },
      { input: "(]", expectedOutput: "false" },
      { input: "([{}])", expectedOutput: "true" }
    ]
  }
];

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
  const [generatingBruteforce, setGeneratingBruteforce] = useState(false);
  const [selectedBugType, setSelectedBugType] = useState("OFF_BY_ONE");
  const [solutionMeta, setSolutionMeta] = useState(null);
  const [bugMeta, setBugMeta] = useState(null);
  const [bruteforceMeta, setBruteforceMeta] = useState(null);

  // Testing Suite Mode: MODE_SINGLE (Single-Question Lab), MODE_DIAGNOSTIC (5-Probe Bronze Placement), MODE_REPLAY_3Q (3-Question Sequential Exam Replay)
  const [activeMode, setActiveMode] = useState("MODE_SINGLE");

  // Mode 2: 5-Probe Initial Diagnostic Assessment State
  const [diagnosticProbes, setDiagnosticProbes] = useState(DEFAULT_DIAGNOSTIC_PROBES);
  const [loadingProbes, setLoadingProbes] = useState(false);
  const [selectedProbeIdx, setSelectedProbeIdx] = useState(0);
  const [probeCodes, setProbeCodes] = useState(() => {
    const init = {};
    DEFAULT_DIAGNOSTIC_PROBES.forEach(p => { init[p.id] = p.canonicalSolution; });
    return init;
  });
  const [probeExecResults, setProbeExecResults] = useState({});
  const [diagnosticReport, setDiagnosticReport] = useState(() => ({
    passedCount: 3,
    totalProbes: 5,
    calibratedMastery: 0.20,
    calibratedTheta: -1.39,
    calibratedRankXp: 100,
    rankTier: "BRONZE",
    remainingQuestionsToSilver: 5,
    hasBypassProtection: true,
    competencies: {
      ALGORITHMIC_EFFICIENCY: 0.22,
      EDGE_CASE_RESILIENCE: 0.19,
      CODE_RELIABILITY: 0.27,
      IMPLEMENTATION_FLUENCY: 0.22
    },
    errorRisks: {
      OFF_BY_ONE: 0.15,
      NULL_EMPTY_COLLECTION: 0.14,
      TIME_LIMIT_EXCEEDED: 0.10,
      STATE_CORRUPTION: 0.15
    },
    summary: "Diagnostic calibration complete: 3/5 probes passed. Calibrated Bronze baseline at 20% (theta: -1.39). Strict graduation policy active: 5 more foundational questions required to unlock Silver tier."
  }));
  const [evaluatingDiagnostic, setEvaluatingDiagnostic] = useState(false);
  const [runningProbeId, setRunningProbeId] = useState(null);

  // Mode 3: 3-Question Sequential Exam Replay State
  const [replayInitialMastery, setReplayInitialMastery] = useState(0.20);
  const [replayInitialSolved, setReplayInitialSolved] = useState(0);
  const [replayQuestions, setReplayQuestions] = useState([
    { id: "Q1", title: "Two Pointers Convergence", difficulty: "EASY", passedTcs: 3, totalTcs: 3, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" },
    { id: "Q2", title: "Sliding Window Maximum Subarray", difficulty: "MEDIUM", passedTcs: 4, totalTcs: 5, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" },
    { id: "Q3", title: "Monotonic Stack Next Greater", difficulty: "HARD", passedTcs: 5, totalTcs: 5, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" }
  ]);
  const [replayRunning, setReplayRunning] = useState(false);
  const [replayResult, setReplayResult] = useState(null);

  async function fetchDiagnosticProbes() {
    try {
      setLoadingProbes(true);
      const res = await Client.get("/admin/adaptive-tester/diagnostic-probes");
      if (res.data && res.data.length > 0) {
        setDiagnosticProbes(res.data);
        const codes = {};
        res.data.forEach(p => {
          codes[p.id] = p.canonicalSolution || DEFAULT_DIAGNOSTIC_PROBES.find(d => d.id === p.id)?.canonicalSolution || "";
        });
        setProbeCodes(codes);
      }
    } catch (e) {
      console.warn("Failed to fetch dynamic diagnostic probes, using defaults:", e);
    } finally {
      setLoadingProbes(false);
    }
  }

  function handleLoadCanonicalProbe(probeId) {
    const probe = diagnosticProbes.find(p => p.id === probeId) || DEFAULT_DIAGNOSTIC_PROBES.find(p => p.id === probeId);
    if (probe) {
      setProbeCodes(prev => ({ ...prev, [probeId]: probe.canonicalSolution }));
      setVectorChainedToast(`Loaded canonical solution for ${probe.title}`);
      setTimeout(() => setVectorChainedToast(null), 3500);
    }
  }

  function handleInjectProbeSlip(probeId) {
    setProbeCodes(prev => {
      const cur = prev[probeId] || "";
      let modified = cur;
      if (probeId === "DIAG_01" && cur.includes("int sum = a[l] + a[r];")) {
        modified = cur.replace("int sum = a[l] + a[r];", "int sm = a[l] + a[r];");
      } else if (probeId === "DIAG_02" && cur.includes("int tmp = a[w];")) {
        modified = cur.replace("int tmp = a[w];", "int temp = a[w];\\n                a[w] = a[r];\\n                a[r] = tmp; // Typo: tmp instead of temp");
      } else if (probeId === "DIAG_03" && cur.includes("long max = cur;")) {
        modified = cur.replace("long max = cur;", "long mx = cur;\\n        // Typo: max used below");
      } else if (probeId === "DIAG_04" && cur.includes("int mid = l + (r - l) / 2;")) {
        modified = cur.replace("int mid = l + (r - l) / 2;", "int m = l + (r - l) / 2;\\n            // Typo: mid used below");
      } else if (probeId === "DIAG_05" && cur.includes("char top = st.pop();")) {
        modified = cur.replace("char top = st.pop();", "char tp = st.pop();\\n                // Typo: top used below");
      } else {
        modified = cur.replace("int n =", "int len =");
      }
      return { ...prev, [probeId]: modified };
    });
    setVectorChainedToast(`Injected variable typo slip into ${probeId} to test Dual-Gate Slip Shield!`);
    setTimeout(() => setVectorChainedToast(null), 3500);
  }

  async function handleRunSingleProbe(probe) {
    const userCode = probeCodes[probe.id];
    setRunningProbeId(probe.id);
    const tcs = probe.testCases || [];
    let passedCount = 0;
    let combinedError = "";
    const tcDetails = [];

    for (let i = 0; i < tcs.length; i++) {
      const tc = tcs[i];
      try {
        const out = await executeWasmOrFallback(userCode, tc.input || "", "java", compilerTarget);
        const actual = (out.output || out.stdout || "").trim();
        const expected = (tc.expectedOutput || "").trim();
        const passed = actual === expected;
        if (passed) passedCount++;
        if (out.error) combinedError += " " + out.error;
        tcDetails.push({ index: i + 1, input: tc.input, expected, actual: actual || out.error || "(empty)", passed, error: out.error });
      } catch (err) {
        combinedError += " " + String(err);
        tcDetails.push({ index: i + 1, input: tc.input, expected: tc.expectedOutput, actual: `Crash: ${err.message}`, passed: false, error: err.message });
      }
    }

    const isCompileError = combinedError.includes("error:") || combinedError.includes("cannot find symbol") || combinedError.includes("compilation failed");
    const isSlip = isCompileError && (userCode.includes("sm") || userCode.includes("Typo:") || userCode.includes("temp"));

    const newExecResult = {
      passed: passedCount === tcs.length && tcs.length > 0,
      passedTcs: passedCount,
      totalTcs: tcs.length,
      isCompileError,
      isIsolatedSlip: isSlip,
      error: combinedError,
      results: tcDetails
    };

    setProbeExecResults(prev => {
      const updated = { ...prev, [probe.id]: newExecResult };
      recalculateDiagnosticReport(updated);
      return updated;
    });

    setRunningProbeId(null);
  }

  async function recalculateDiagnosticReport(execResults) {
    try {
      setEvaluatingDiagnostic(true);
      const submissions = diagnosticProbes.map(p => {
        const exec = execResults[p.id] || {};
        return {
          questionId: p.id,
          passed: exec.passed || false,
          passedTcs: exec.passedTcs !== undefined ? exec.passedTcs : 0,
          totalTcs: p.testCases?.length || 3,
          isCompileError: exec.isCompileError || false,
          isIsolatedSlip: exec.isIsolatedSlip || false,
          error: exec.error || ""
        };
      });

      const res = await Client.post("/admin/adaptive-tester/simulate-diagnostic", { submissions });
      if (res.data) {
        setDiagnosticReport(res.data);
      }
    } catch (e) {
      console.error("Diagnostic simulation failed:", e);
    } finally {
      setEvaluatingDiagnostic(false);
    }
  }

  async function handleQuickDiagnosticSimulation(score) {
    try {
      setEvaluatingDiagnostic(true);
      const res = await Client.post("/admin/adaptive-tester/simulate-diagnostic", { score });
      if (res.data) {
        setDiagnosticReport(res.data);
        const newResults = {};
        diagnosticProbes.forEach((p, idx) => {
          const passed = idx < score;
          newResults[p.id] = {
            passed,
            passedTcs: passed ? (p.testCases?.length || 3) : 1,
            totalTcs: p.testCases?.length || 3,
            isCompileError: false,
            isIsolatedSlip: false,
            error: passed ? "" : "Simulated edge condition mismatch"
          };
        });
        setProbeExecResults(newResults);
      }
    } catch (e) {
      console.error("Quick score simulation failed:", e);
    } finally {
      setEvaluatingDiagnostic(false);
    }
  }

  function handleApplyDiagnosticVectorToLab() {
    if (!diagnosticReport) return;
    setBktMastery(diagnosticReport.calibratedMastery);
    setBktPrior(diagnosticReport.calibratedMastery);
    setIrtTheta(diagnosticReport.calibratedTheta);

    if (diagnosticReport.conceptsMap) {
      setConceptsMap(prev => ({ ...prev, ...diagnosticReport.conceptsMap }));
    }
    if (diagnosticReport.patternsMap) {
      setPatternsMap(prev => ({ ...prev, ...diagnosticReport.patternsMap }));
    }
    if (diagnosticReport.competencies) {
      setCompetenciesMap(prev => ({ ...prev, ...diagnosticReport.competencies }));
    }
    if (diagnosticReport.errorRisks) {
      setErrorsMap(prev => ({ ...prev, ...diagnosticReport.errorRisks }));
    }

    setVectorChainedToast(`🎯 Calibrated Bronze baseline applied to active Lab! Starting Mastery: ${Math.round(diagnosticReport.calibratedMastery * 100)}%, Remaining to Silver: ${diagnosticReport.remainingQuestionsToSilver} problems.`);
    setTimeout(() => setVectorChainedToast(null), 4500);
    setActiveMode("MODE_SINGLE");
  }

  function calculateTierFromSolved(xp, solved, mastery = 0) {
    if (mastery >= 0.95 || (xp >= 960 && solved >= 50)) return "OBSIDIAN";
    if (mastery >= 0.88 || (xp >= 880 && solved >= 35)) return "DIAMOND";
    if (mastery >= 0.75 || (xp >= 720 && solved >= 22)) return "PLATINUM";
    if (mastery >= 0.55 || (xp >= 480 && solved >= 14)) return "GOLD";
    if (mastery >= 0.30 || xp >= 250 || solved >= 8) return "SILVER";
    return "BRONZE";
  }

  async function handleRun3QuestionReplay() {
    try {
      setReplayRunning(true);
      const startingSolved = Number(replayInitialSolved);
      const startingMastery = Number(replayInitialMastery);
      const startingXp = Math.round(startingMastery * 500) + Math.min(500, Math.round((startingSolved / 60) * 500));
      const startingTier = calculateTierFromSolved(startingXp, startingSolved, startingMastery);

      const payload = {
        initialState: {
          mastery: startingMastery,
          priorIrtTheta: Math.round(Math.log(Math.max(0.01, startingMastery) / Math.max(0.01, 1.0 - startingMastery)) * 100) / 100,
          questionsSolved: startingSolved,
          rankXp: startingXp,
          rankTier: startingTier
        },
        questions: replayQuestions
      };

      const res = await Client.post("/admin/adaptive-tester/simulate-3q-replay", payload);
      if (res.data) {
        setReplayResult(res.data);
      }
    } catch (e) {
      console.error("Replay simulation failed:", e);
    } finally {
      setReplayRunning(false);
    }
  }

  function applyReplayPreset(presetKey) {
    if (presetKey === "EASY_CEILING_CAP") {
      setReplayInitialMastery(0.20);
      setReplayInitialSolved(0);
      setReplayQuestions([
        { id: "Q1", title: "Two Pointers Convergence", difficulty: "EASY", passedTcs: 3, totalTcs: 3, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" },
        { id: "Q2", title: "Move Zeroes Read/Write", difficulty: "EASY", passedTcs: 3, totalTcs: 3, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" },
        { id: "Q3", title: "Search Insert Halving", difficulty: "EASY", passedTcs: 3, totalTcs: 3, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" }
      ]);
    } else if (presetKey === "OPTION_B_SLIP") {
      setReplayInitialMastery(0.35);
      setReplayInitialSolved(2);
      setReplayQuestions([
        { id: "Q1", title: "Subarray Maximum Size K", difficulty: "EASY", passedTcs: 3, totalTcs: 3, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" },
        { id: "Q2", title: "Two Pointers Target Sum", difficulty: "MEDIUM", passedTcs: 0, totalTcs: 3, isCompileError: true, isIsolatedSlip: true, slipType: "IDENTIFIER_MISMATCH_SLIP" },
        { id: "Q3", title: "Monotonic Stack LIFO Sequence", difficulty: "MEDIUM", passedTcs: 3, totalTcs: 3, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" }
      ]);
    } else if (presetKey === "GRADUATION_THRESHOLD") {
      setReplayInitialMastery(0.40);
      setReplayInitialSolved(7);
      setReplayQuestions([
        { id: "Q1", title: "Valid Parentheses Verification", difficulty: "EASY", passedTcs: 3, totalTcs: 3, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" },
        { id: "Q2", title: "Sliding Window Dynamic Substring", difficulty: "MEDIUM", passedTcs: 5, totalTcs: 5, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" },
        { id: "Q3", title: "Binary Search Rotated Array", difficulty: "MEDIUM", passedTcs: 5, totalTcs: 5, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" }
      ]);
    } else if (presetKey === "PROGRESSIVE_ASCENT") {
      setReplayInitialMastery(0.20);
      setReplayInitialSolved(0);
      setReplayQuestions([
        { id: "Q1", title: "Foundational Convergence", difficulty: "EASY", passedTcs: 3, totalTcs: 3, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" },
        { id: "Q2", title: "Sliding Window Dynamic Boundary", difficulty: "MEDIUM", passedTcs: 4, totalTcs: 5, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" },
        { id: "Q3", title: "Monotonic Queue Optimal Sliding", difficulty: "HARD", passedTcs: 5, totalTcs: 5, isCompileError: false, isIsolatedSlip: false, slipType: "NONE" }
      ]);
    }
  }

  function updateReplayQuestion(idx, field, value) {
    setReplayQuestions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

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
    setBruteforceMeta(null);
    setBugMeta(null);
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

  // 1b. Dedicated AI Brute-Force Solution Generator (O(N^2) / Inefficient to test physical sandbox TLE)
  async function handleGenerateBruteforceSolution() {
    if (!currentQuestion) {
      alert("Please generate or select a question first.");
      return;
    }
    try {
      setGeneratingBruteforce(true);
      setBruteforceMeta(null);
      setSolutionMeta(null);
      setBugMeta(null);
      const canonical = currentQuestion.canonicalSolution || code || "";
      const res = await Client.post("/admin/adaptive-tester/generate-bruteforce-solution", {
        model: selectedModel,
        title: currentQuestion.title,
        problemStatement: currentQuestion.description || currentQuestion.problemStatement,
        language,
        targetSkill,
        pattern,
        canonicalSolution: canonical,
        testCases: currentQuestion.testCases || []
      });
      const rawCode = res.data?.bruteforceCode || res.data?.solutionCode || res.data?.code;
      if (rawCode) {
        const cleanCode = sanitizeCodeString(rawCode, language);
        setCode(cleanCode);
        setBruteforceMeta({
          timeComplexity: res.data.timeComplexity || "O(N²)",
          spaceComplexity: res.data.spaceComplexity || "O(1)",
          approach: res.data.approach || "Naive brute-force nested loop iteration",
          inefficiencyReason: res.data.inefficiencyReason || "Uses quadratic O(N²) time complexity. Expected to trigger 408 Time Limit Exceeded (TLE) on scale stress test case #4."
        });
      } else {
        alert("Brute-force solution generation did not return valid code. Check Groq API connectivity.");
      }
    } catch (err) {
      console.error("AI brute-force generation failed:", err);
      alert("Failed to generate AI brute-force solution: " + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingBruteforce(false);
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

        {/* Master Testing Suite Mode Selector */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "20px",
            background: "#0B0E17",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "8px 12px",
            flexWrap: "wrap",
            alignItems: "center"
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", paddingLeft: "8px" }}>
            TESTING SUITE MODES:
          </span>

          <button
            onClick={() => setActiveMode("MODE_SINGLE")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              border: activeMode === "MODE_SINGLE" ? "1px solid #10B981" : "1px solid rgba(255, 255, 255, 0.1)",
              background: activeMode === "MODE_SINGLE" ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.03)",
              color: activeMode === "MODE_SINGLE" ? "#34D399" : "#94A3B8",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease"
            }}
          >
            <span>🔬</span> Mode 1: Single-Question Deep Calibration & Slip Lab
          </button>

          <button
            onClick={() => {
              setActiveMode("MODE_DIAGNOSTIC");
              if (diagnosticProbes.length === 0) fetchDiagnosticProbes();
            }}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              border: activeMode === "MODE_DIAGNOSTIC" ? "1px solid #6366F1" : "1px solid rgba(255, 255, 255, 0.1)",
              background: activeMode === "MODE_DIAGNOSTIC" ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.03)",
              color: activeMode === "MODE_DIAGNOSTIC" ? "#818CF8" : "#94A3B8",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease"
            }}
          >
            <span>🎯</span> Mode 2: 5-Probe Initial Diagnostic Assessment (0%–30% Bronze Placement)
          </button>

          <button
            onClick={() => setActiveMode("MODE_REPLAY_3Q")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              border: activeMode === "MODE_REPLAY_3Q" ? "1px solid #F59E0B" : "1px solid rgba(255, 255, 255, 0.1)",
              background: activeMode === "MODE_REPLAY_3Q" ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.03)",
              color: activeMode === "MODE_REPLAY_3Q" ? "#FBBF24" : "#94A3B8",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease"
            }}
          >
            <span>🔄</span> Mode 3: 3-Question Sequential Exam Replay Simulator
          </button>
        </div>

        {/* MODE 1: Single-Question Deep Calibration & Slip Lab */}
        {activeMode === "MODE_SINGLE" && (
          <div>
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

                  <button
                    type="button"
                    onClick={handleGenerateBruteforceSolution}
                    disabled={generatingBruteforce || !currentQuestion}
                    style={{
                      fontSize: "11px",
                      padding: "5px 12px",
                      background: generatingBruteforce ? "rgba(239, 68, 68, 0.3)" : "linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(185, 28, 28, 0.22) 100%)",
                      border: "1px solid rgba(248, 113, 113, 0.45)",
                      color: "#F87171",
                      borderRadius: "6px",
                      cursor: currentQuestion && !generatingBruteforce ? "pointer" : "not-allowed",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                    title="Generate naive O(N²) brute-force solution to test physical sandbox Time Limit Exceeded (408 TLE)"
                  >
                    {generatingBruteforce ? "⏳ Synthesizing Brute-Force..." : "🐢 AI Brute-Force (O(N²))"}
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

              {bruteforceMeta && (
                <div style={{
                  padding: "8px 16px",
                  background: "rgba(239, 68, 68, 0.12)",
                  borderBottom: "1px solid rgba(248, 113, 113, 0.25)",
                  fontSize: "11px",
                  color: "#FECACA",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "6px"
                }}>
                  <div>
                    <strong style={{ color: "#F87171" }}>🐢 Naive Brute-Force Loaded:</strong> {bruteforceMeta.approach} (Time: <span style={{ fontFamily: "monospace", color: "#F87171", fontWeight: "700" }}>{bruteforceMeta.timeComplexity}</span> | Space: <span style={{ fontFamily: "monospace", color: "#60A5FA" }}>{bruteforceMeta.spaceComplexity}</span>)
                    <div style={{ fontSize: "10px", color: "#FCA5A5", marginTop: "2px" }}>
                      ⚠️ {bruteforceMeta.inefficiencyReason}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBruteforceMeta(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#94A3B8",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    ✕
                  </button>
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

                    const isTle = !r.passed && (
                      (r.actual && String(r.actual).toLowerCase().includes("time limit exceeded")) ||
                      (r.error && String(r.error).toLowerCase().includes("time limit exceeded")) ||
                      String(r.actual).includes("408")
                    );

                    return (
                      <div
                        key={r.index}
                        style={{
                          background: r.passed 
                            ? "rgba(16, 185, 129, 0.08)" 
                            : isTle 
                              ? "rgba(245, 158, 11, 0.12)" 
                              : "rgba(239, 68, 68, 0.08)",
                          border: r.passed 
                            ? "1px solid rgba(16, 185, 129, 0.25)" 
                            : isTle 
                              ? "1px solid rgba(245, 158, 11, 0.5)" 
                              : "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          fontSize: "12px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontWeight: "700", color: r.passed ? "#34D399" : isTle ? "#FBBF24" : "#F87171" }}>
                            Test Case #{r.index} {r.passed ? "✓ PASSED" : (isTle ? "⏳ TIME LIMIT EXCEEDED (408 TLE)" : "✗ FAILED")}
                          </span>
                          <span style={{ fontSize: "10px", fontWeight: "700", color: isTle ? "#FDE68A" : "#CBD5E1", background: isTle ? "rgba(245, 158, 11, 0.25)" : "rgba(255, 255, 255, 0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                            {isTle ? "Scale Stress TLE (3s Timeout)" : categoryLabel}
                          </span>
                        </div>
                        <div style={{ fontFamily: "monospace", color: "#94A3B8", fontSize: "11px" }}>
                          <div>
                            <strong>Input:</strong>{" "}
                            {r.input && r.input.length > 90
                              ? r.input.substring(0, 90).replace(/\n/g, " ") + `... [Scale Stress Input: ${r.input.length} chars / ${(r.input.trim().split(/\s+/).length)} items]`
                              : (r.input ? r.input.replace(/\n/g, " ") : "(empty)")}
                          </div>
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

                {/* Syntax Slip Shield Indicator */}
                {recalibrationResult.isIsolatedSlip && (
                  <div style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#34D399"
                  }}>
                    <span>
                      🛡️ <strong>Syntax Slip Shield Active:</strong> Algorithmic logic verified optimal by AI. Applied minimal -1.0% slip tap instead of failure penalty.
                    </span>
                    {recalibrationResult.slipType && (
                      <span style={{ fontSize: "10px", background: "rgba(16, 185, 129, 0.2)", padding: "2px 8px", borderRadius: "4px", color: "#A7F3D0", fontWeight: "700" }}>
                        {recalibrationResult.slipType}
                      </span>
                    )}
                  </div>
                )}

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
                    <div style={{ fontSize: "11px" }}>
                      {recalibrationResult.triggeredDefect && recalibrationResult.triggeredDefect !== errorFocus ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ color: "#34D399" }}>🛡️ {errorFocus}: Inoculated</span>
                          <span style={{ color: "#F87171", fontWeight: "600" }}>⚠️ {recalibrationResult.triggeredDefect}: +{Math.round(recalibrationResult.triggeredDefectDelta * 100)}%</span>
                        </div>
                      ) : (
                        <span style={{ color: recalibrationResult.errorRiskDelta < 0 ? "#34D399" : (recalibrationResult.errorRiskDelta > 0 ? "#F87171" : "#94A3B8") }}>
                          {recalibrationResult.errorRiskDelta < 0 ? "🛡️ Risk Inoculated" : (recalibrationResult.errorRiskDelta > 0 ? "⚠️ Defect Triggered" : "⏸️ Risk Unchanged (0%)")}
                        </span>
                      )}
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
    )}

    {/* MODE 2: 5-Probe Initial Diagnostic Assessment (0%–30% Bronze Placement) */}
    {activeMode === "MODE_DIAGNOSTIC" && (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Diagnostic Assessment Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            borderRadius: "14px",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "22px" }}>🎯</span>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#F8FAFC" }}>
                5-Probe Initial Diagnostic Assessment (Bronze Calibration Suite)
              </h2>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "800",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  background: "rgba(99, 102, 241, 0.2)",
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                  color: "#818CF8",
                  letterSpacing: "0.05em"
                }}
              >
                STRICT ZERO-BYPASS • BRONZE CALIBRATION (0% - 30%)
              </span>
            </div>
            <p style={{ margin: 0, color: "#94A3B8", fontSize: "13px", maxWidth: "900px", lineHeight: "1.5" }}>
              All incoming students begin with this 5-probe foundational assessment. Initial placement is strictly capped at 30% (Bronze tier). Even with a 5/5 score, students must solve at least 2 real training problems (minimum 8-10 problem volume quota) to officially cross into Silver.
            </p>
          </div>

          {/* Quick Calibration Simulator */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#CBD5E1" }}>
              ⚡ Fast Score Placement Simulator:
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[0, 1, 2, 3, 4, 5].map(score => {
                const masteryPct = Math.min(30, 5 + score * 5);
                const req = score === 5 ? 2 : (score === 4 ? 3 : (score === 3 ? 5 : (score === 2 ? 6 : (score === 1 ? 8 : 10))));
                return (
                  <button
                    key={score}
                    onClick={() => handleQuickDiagnosticSimulation(score)}
                    disabled={evaluatingDiagnostic}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      border: diagnosticReport?.passedCount === score ? "1px solid #818CF8" : "1px solid rgba(255, 255, 255, 0.12)",
                      background: diagnosticReport?.passedCount === score ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.04)",
                      color: diagnosticReport?.passedCount === score ? "#FFFFFF" : "#CBD5E1"
                    }}
                  >
                    {score}/5 ({masteryPct}% • {req} left)
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2-Column Diagnostic Split Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(420px, 58%) 1fr", gap: "20px", alignItems: "start" }}>
          
          {/* LEFT COLUMN: 5 Probes Suite & Interactive Sandbox */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Horizontal Probe Selection Pills */}
            <div
              style={{
                background: "#0B0E17",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "10px 14px",
                display: "flex",
                gap: "8px",
                overflowX: "auto"
              }}
            >
              {diagnosticProbes.map((probe, idx) => {
                const exec = probeExecResults[probe.id];
                const isSelected = selectedProbeIdx === idx;
                let statusBadge = "○ Untested";
                let badgeBg = "rgba(148, 163, 184, 0.1)";
                let badgeColor = "#94A3B8";

                if (exec) {
                  if (exec.passed) {
                    statusBadge = "✓ Passed (3/3)";
                    badgeBg = "rgba(16, 185, 129, 0.15)";
                    badgeColor = "#34D399";
                  } else if (exec.isIsolatedSlip) {
                    statusBadge = "🛡️ Slip Shield Active";
                    badgeBg = "rgba(245, 158, 11, 0.15)";
                    badgeColor = "#FBBF24";
                  } else if (exec.isCompileError) {
                    statusBadge = "✗ Compile Error";
                    badgeBg = "rgba(239, 68, 68, 0.15)";
                    badgeColor = "#F87171";
                  } else {
                    statusBadge = `✗ Failed (${exec.passedTcs}/${exec.totalTcs})`;
                    badgeBg = "rgba(239, 68, 68, 0.15)";
                    badgeColor = "#F87171";
                  }
                }

                return (
                  <button
                    key={probe.id}
                    onClick={() => setSelectedProbeIdx(idx)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left",
                      minWidth: "150px",
                      border: isSelected ? "1px solid #818CF8" : "1px solid rgba(255, 255, 255, 0.08)",
                      background: isSelected ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: isSelected ? "#A5B4FC" : "#CBD5E1" }}>
                        Probe #{idx + 1}
                      </span>
                      <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "4px", background: badgeBg, color: badgeColor, fontWeight: "700" }}>
                        {statusBadge}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#F8FAFC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {probe.title}
                    </span>
                    <span style={{ fontSize: "10px", color: "#64748B" }}>
                      {probe.pattern}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Probe Details & Editor */}
            {diagnosticProbes[selectedProbeIdx] && (() => {
              const probe = diagnosticProbes[selectedProbeIdx];
              const exec = probeExecResults[probe.id];
              const isRunning = runningProbeId === probe.id;

              return (
                <div
                  style={{
                    background: "#0B0E17",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                    padding: "20px 24px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: "#818CF8" }}>
                          PROBE #{selectedProbeIdx + 1} OF 5
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", background: "rgba(16, 185, 129, 0.15)", color: "#34D399" }}>
                          {probe.difficulty}
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", background: "rgba(99, 102, 241, 0.15)", color: "#A5B4FC" }}>
                          {probe.primaryConcept}
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", background: "rgba(245, 158, 11, 0.15)", color: "#FBBF24" }}>
                          {probe.pattern}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#F8FAFC" }}>
                        {probe.title}
                      </h3>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleLoadCanonicalProbe(probe.id)}
                        style={{
                          fontSize: "11px",
                          padding: "6px 12px",
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid rgba(16, 185, 129, 0.35)",
                          color: "#34D399",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "700"
                        }}
                      >
                        💡 Load Canonical Solution
                      </button>
                      <button
                        onClick={() => handleInjectProbeSlip(probe.id)}
                        style={{
                          fontSize: "11px",
                          padding: "6px 12px",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.35)",
                          color: "#FBBF24",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "700"
                        }}
                      >
                        🧪 Inject Variable Typo Slip
                      </button>
                      <button
                        onClick={() => handleRunSingleProbe(probe)}
                        disabled={isRunning}
                        style={{
                          fontSize: "11px",
                          padding: "6px 14px",
                          background: isRunning ? "rgba(99, 102, 241, 0.4)" : "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                          border: "none",
                          color: "#FFFFFF",
                          borderRadius: "6px",
                          cursor: isRunning ? "not-allowed" : "pointer",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        {isRunning ? "⏳ Executing..." : "🚀 Run Probe in Compiler"}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", padding: "12px 14px", fontSize: "12px", color: "#CBD5E1", whiteSpace: "pre-wrap", marginBottom: "14px", lineHeight: "1.5" }}>
                    {cleanDisplayText(probe.description)}
                  </div>

                  {/* Monaco Code Sandbox */}
                  <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.1)", marginBottom: "14px" }}>
                    <div style={{ background: "#05070B", padding: "6px 12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94A3B8" }}>
                      <span>Java Source Editor (Main.java)</span>
                      <span>Sandbox Multi-Compiler</span>
                    </div>
                    <Editor
                      height="260px"
                      theme="vs-dark"
                      language="java"
                      value={probeCodes[probe.id] || ""}
                      onChange={(val) => setProbeCodes(p => ({ ...p, [probe.id]: val || "" }))}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
                        scrollBeyondLastLine: false,
                        lineNumbers: "on",
                        tabSize: 4
                      }}
                    />
                  </div>

                  {/* Test Case Results Suite */}
                  {exec && exec.results && (
                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#F8FAFC" }}>
                          🧪 Test Suite Execution Results ({exec.passedTcs}/{exec.totalTcs} Passed)
                        </span>
                        {exec.isIsolatedSlip && (
                          <span style={{ fontSize: "11px", color: "#34D399", fontWeight: "700" }}>
                            🛡️ Dual-Gate Slip Shield Active (Conceptual Integrity Preserved)
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {exec.results.map((r) => (
                          <div
                            key={r.index}
                            style={{
                              background: r.passed ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                              border: r.passed ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
                              borderRadius: "8px",
                              padding: "8px 12px",
                              fontSize: "11px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: "700", color: r.passed ? "#34D399" : "#F87171", marginRight: "10px" }}>
                                Test #{r.index}: {r.passed ? "✓ PASSED" : "✗ FAILED"}
                              </span>
                              <span style={{ color: "#94A3B8", fontFamily: "monospace" }}>
                                Input: {cleanDisplayText(r.input?.replace(/\n/g, " | "))}
                              </span>
                            </div>
                            <div style={{ fontFamily: "monospace", fontSize: "11px" }}>
                              <span style={{ color: "#CBD5E1" }}>Expected: {cleanDisplayText(r.expected)}</span>
                              <span style={{ margin: "0 6px", color: "#64748B" }}>|</span>
                              <span style={{ color: r.passed ? "#34D399" : "#F87171" }}>Actual: {cleanDisplayText(r.actual)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* RIGHT COLUMN: Calibrated Baseline Report & Anti-Bypass Guard */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Core Calibration Card */}
            <div
              style={{
                background: "#0B0E17",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "14px",
                padding: "20px 24px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#818CF8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Student Placement Calibration
                </span>
                <span style={{ fontSize: "10px", fontWeight: "800", padding: "3px 10px", borderRadius: "999px", background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#FBBF24" }}>
                  TIER: {diagnosticReport?.rankTier || "BRONZE"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div style={{ background: "rgba(15, 23, 42, 0.7)", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>Probes Solved</span>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#F8FAFC", marginTop: "2px" }}>
                    {diagnosticReport?.passedCount || 0} / 5
                  </div>
                  <span style={{ fontSize: "10px", color: "#64748B" }}>Foundational Probes</span>
                </div>

                <div style={{ background: "rgba(15, 23, 42, 0.7)", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>Calibrated BKT Mastery</span>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#34D399", marginTop: "2px" }}>
                    {Math.round((diagnosticReport?.calibratedMastery || 0.05) * 100)}%
                  </div>
                  <span style={{ fontSize: "10px", color: "#64748B" }}>Strict Bronze Range (5% - 30%)</span>
                </div>

                <div style={{ background: "rgba(15, 23, 42, 0.7)", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>IRT Latent Ability (θ)</span>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#818CF8", marginTop: "2px" }}>
                    {diagnosticReport?.calibratedTheta || -2.94}
                  </div>
                  <span style={{ fontSize: "10px", color: "#64748B" }}>Logistic Scaled</span>
                </div>

                <div style={{ background: "rgba(15, 23, 42, 0.7)", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>Questions to Silver</span>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#FBBF24", marginTop: "2px" }}>
                    {diagnosticReport?.remainingQuestionsToSilver || 10}
                  </div>
                  <span style={{ fontSize: "10px", color: "#64748B" }}>Minimum Solves Remaining</span>
                </div>
              </div>

              {/* Anti-Bypass Banner */}
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "11px",
                  color: "#FDE68A",
                  lineHeight: "1.4",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px"
                }}
              >
                <span>🔒</span>
                <div>
                  <strong>Natural Tier Synchronization Active:</strong> Diagnostic placement is strictly capped in Bronze (&le; 26% BKT). To reach Silver, student must reach &ge; 30% BKT naturally by solving verified training problems.
                </div>
              </div>

              {/* 4 Empirical Telemetry Competencies */}
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>
                  Calibrated Baseline Competencies
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[
                    { key: "ALGORITHMIC_EFFICIENCY", label: "Algorithmic Efficiency", color: "#34D399" },
                    { key: "EDGE_CASE_RESILIENCE", label: "Edge Case Resilience", color: "#60A5FA" },
                    { key: "CODE_RELIABILITY", label: "Code Reliability", color: "#A78BFA" },
                    { key: "IMPLEMENTATION_FLUENCY", label: "Implementation Fluency", color: "#F472B6" }
                  ].map(c => {
                    const val = diagnosticReport?.competencies?.[c.key] || 0.15;
                    const pct = Math.round(val * 100);
                    return (
                      <div key={c.key} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px" }}>
                        <span style={{ width: "150px", color: "#CBD5E1" }}>{c.label}</span>
                        <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.08)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, background: c.color, height: "100%", borderRadius: "3px" }} />
                        </div>
                        <span style={{ width: "36px", textAlign: "right", fontWeight: "700", color: c.color }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Defect Vulnerability Radar */}
              <div style={{ marginBottom: "18px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>
                  Initial Defect Vulnerability Risks
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[
                    { key: "OFF_BY_ONE", label: "Off-by-One Risk" },
                    { key: "NULL_EMPTY_COLLECTION", label: "Null/Empty Risk" },
                    { key: "TIME_LIMIT_EXCEEDED", label: "Time Limit Risk" },
                    { key: "STATE_CORRUPTION", label: "Syntax/Corruption Risk" }
                  ].map(e => {
                    const risk = diagnosticReport?.errorRisks?.[e.key] || 0.15;
                    const pct = Math.round(risk * 100);
                    const color = pct >= 25 ? "#F87171" : (pct >= 18 ? "#FBBF24" : "#34D399");
                    return (
                      <div key={e.key} style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "6px", padding: "8px 10px", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94A3B8" }}>{e.label}</span>
                        <span style={{ fontWeight: "700", color }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action: Apply Calibrated Baseline to Lab */}
              <button
                onClick={handleApplyDiagnosticVectorToLab}
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 6px 18px rgba(16, 185, 129, 0.35)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>✨</span> Apply Calibrated Vector to Active Lab Sandbox
              </button>
            </div>

          </div>

        </div>
      </div>
    )}

    {/* MODE 3: 3-Question Sequential Exam Replay Simulator */}
    {activeMode === "MODE_REPLAY_3Q" && (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Header Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: "14px",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "22px" }}>🔄</span>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#F8FAFC" }}>
                3-Question Sequential Exam Replay Simulator
              </h2>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "800",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  background: "rgba(245, 158, 11, 0.2)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#FBBF24",
                  letterSpacing: "0.05em"
                }}
              >
                SEQUENTIAL MARKOV CHAIN • DIFFICULTY CEILINGS • VOLUME GATING
              </span>
            </div>
            <p style={{ margin: 0, color: "#94A3B8", fontSize: "13px", maxWidth: "900px", lineHeight: "1.5" }}>
              Replays multi-question exam sessions step-by-step (S0 &rarr; S1 &rarr; S2 &rarr; S3). Enforces psychometric ceilings (Easy &le; 45%, Medium &le; 72%, Hard &le; 98%) and natural Silver synchronization (BKT &ge; 30%).
            </p>
          </div>

          {/* Preset Toolbar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#CBD5E1" }}>
              ⚡ Scenario Presets:
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                onClick={() => applyReplayPreset("EASY_CEILING_CAP")}
                style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.12)", background: "rgba(255, 255, 255, 0.04)", color: "#CBD5E1" }}
              >
                🛡️ Easy Ceiling (Cap @ 45%)
              </button>
              <button
                onClick={() => applyReplayPreset("OPTION_B_SLIP")}
                style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.12)", background: "rgba(255, 255, 255, 0.04)", color: "#CBD5E1" }}
              >
                ⚡ Option B Slip Shield on Q2
              </button>
              <button
                onClick={() => applyReplayPreset("GRADUATION_THRESHOLD")}
                style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.12)", background: "rgba(255, 255, 255, 0.04)", color: "#CBD5E1" }}
              >
                🎓 Graduation Threshold (7 &rarr; 8 Solved)
              </button>
              <button
                onClick={() => applyReplayPreset("PROGRESSIVE_ASCENT")}
                style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "1px solid rgba(255, 255, 255, 0.12)", background: "rgba(255, 255, 255, 0.04)", color: "#CBD5E1" }}
              >
                🚀 Full Ascent (Easy &rarr; Med &rarr; Hard)
              </button>
            </div>
          </div>
        </div>

        {/* Starting State (S0) Configuration Bar */}
        <div
          style={{
            background: "#0B0E17",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#CBD5E1" }}>
                Student Starting Mastery (S0)
              </label>
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#34D399" }}>
                {Math.round(replayInitialMastery * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.85"
              step="0.01"
              value={replayInitialMastery}
              onChange={(e) => setReplayInitialMastery(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#34D399" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#CBD5E1", marginBottom: "6px" }}>
              Prior Solved Problems
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={replayInitialSolved}
              onChange={(e) => setReplayInitialSolved(parseInt(e.target.value) || 0)}
              style={{ width: "100%", background: "#07090E", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#F8FAFC", borderRadius: "8px", padding: "8px 12px", fontSize: "13px" }}
            />
          </div>

          <div>
            <span style={{ display: "block", fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>
              Starting Tier & XP
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#F8FAFC" }}>
                {calculateTierFromSolved(Math.round(replayInitialMastery * 500) + Math.min(500, Math.round((replayInitialSolved / 60) * 500)), replayInitialSolved, replayInitialMastery)}
              </span>
              <span style={{ fontSize: "11px", color: "#64748B" }}>
                ({Math.round(replayInitialMastery * 500) + Math.min(500, Math.round((replayInitialSolved / 60) * 500))} XP)
              </span>
            </div>
          </div>

          <div>
            <button
              onClick={handleRun3QuestionReplay}
              disabled={replayRunning}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                border: "none",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: "800",
                cursor: replayRunning ? "not-allowed" : "pointer",
                boxShadow: "0 6px 16px rgba(245, 158, 11, 0.35)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {replayRunning ? "⏳ Replaying Session..." : "🚀 Run 3-Question Sequential Markov Replay"}
            </button>
          </div>
        </div>

        {/* 3 Questions Configuration Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {replayQuestions.map((q, idx) => {
            return (
              <div
                key={q.id}
                style={{
                  background: "#0B0E17",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#FBBF24" }}>
                    QUESTION #{idx + 1} OF 3
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.08)", color: "#CBD5E1" }}>
                    {q.difficulty}
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94A3B8", marginBottom: "4px" }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={q.title}
                    onChange={(e) => updateReplayQuestion(idx, "title", e.target.value)}
                    style={{ width: "100%", background: "#07090E", border: "1px solid rgba(255, 255, 255, 0.12)", color: "#F8FAFC", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94A3B8", marginBottom: "4px" }}>
                    Difficulty & Ceiling
                  </label>
                  <select
                    value={q.difficulty}
                    onChange={(e) => updateReplayQuestion(idx, "difficulty", e.target.value)}
                    style={{ width: "100%", background: "#07090E", border: "1px solid rgba(255, 255, 255, 0.12)", color: "#F8FAFC", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }}
                  >
                    <option value="EASY">EASY (Ceiling: 45%)</option>
                    <option value="MEDIUM">MEDIUM (Ceiling: 72%)</option>
                    <option value="HARD">HARD (Ceiling: 98%)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94A3B8", marginBottom: "4px" }}>
                    Outcome Simulation
                  </label>
                  <select
                    value={q.isIsolatedSlip ? "SLIP" : (q.isCompileError ? "COMPILE_ERR" : (q.passedTcs < q.totalTcs ? "PARTIAL" : "PASSED"))}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "PASSED") {
                        updateReplayQuestion(idx, "isIsolatedSlip", false);
                        updateReplayQuestion(idx, "isCompileError", false);
                        updateReplayQuestion(idx, "passedTcs", q.totalTcs);
                      } else if (val === "SLIP") {
                        updateReplayQuestion(idx, "isIsolatedSlip", true);
                        updateReplayQuestion(idx, "isCompileError", true);
                        updateReplayQuestion(idx, "slipType", "IDENTIFIER_MISMATCH_SLIP");
                        updateReplayQuestion(idx, "passedTcs", 0);
                      } else if (val === "COMPILE_ERR") {
                        updateReplayQuestion(idx, "isIsolatedSlip", false);
                        updateReplayQuestion(idx, "isCompileError", true);
                        updateReplayQuestion(idx, "passedTcs", 0);
                      } else {
                        updateReplayQuestion(idx, "isIsolatedSlip", false);
                        updateReplayQuestion(idx, "isCompileError", false);
                        updateReplayQuestion(idx, "passedTcs", Math.max(1, q.totalTcs - 1));
                      }
                    }}
                    style={{ width: "100%", background: "#07090E", border: "1px solid rgba(255, 255, 255, 0.12)", color: "#F8FAFC", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }}
                  >
                    <option value="PASSED">✓ 100% Passed (Optimal Algorithm)</option>
                    <option value="SLIP">🛡️ Option B Syntax Slip (-1.0% Tap, Protected)</option>
                    <option value="PARTIAL">⚠️ Edge Failure ({Math.max(1, q.totalTcs - 1)}/{q.totalTcs} TCs)</option>
                    <option value="COMPILE_ERR">✗ Hard Compile Error (-4.0% Penalty)</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Replay Simulation Results */}
        {replayResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Step-by-Step Markov Transition Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {replayResult.steps?.map((step) => {
                return (
                  <div
                    key={step.stepIndex}
                    style={{
                      background: "#0B0E17",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748B", textTransform: "uppercase" }}>
                        STEP #{step.stepIndex}: {step.questionTitle}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.08)", color: "#CBD5E1" }}>
                        {step.difficulty}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "12px", color: "#94A3B8" }}>Mastery:</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "13px", color: "#94A3B8" }}>{Math.round(step.priorMastery * 100)}% &rarr; </span>
                        <span style={{ fontSize: "18px", fontWeight: "900", color: step.masteryDelta >= 0 ? "#34D399" : "#F87171" }}>
                          {Math.round(step.newMastery * 100)}%
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: "700", marginLeft: "4px", color: step.masteryDelta >= 0 ? "#34D399" : "#F87171" }}>
                          ({step.masteryDelta >= 0 ? `+${Math.round(step.masteryDelta * 100)}` : Math.round(step.masteryDelta * 100)}%)
                        </span>
                      </div>
                    </div>

                    {step.ceilingApplied && (
                      <div style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "6px", padding: "6px 8px", fontSize: "10px", color: "#FBBF24", fontWeight: "700" }}>
                        🛡️ CAPPED AT {Math.round(step.difficultyCeiling * 100)}% ({step.difficulty} CEILING)
                      </div>
                    )}

                    {step.isIsolatedSlip && (
                      <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", padding: "6px 8px", fontSize: "10px", color: "#34D399", fontWeight: "700" }}>
                        🛡️ SLIP SHIELD ACTIVE (-1.0% Controlled Tap, Protected)
                      </div>
                    )}

                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
                      <div>
                        <span style={{ color: "#64748B" }}>Solved: </span>
                        <span style={{ fontWeight: "700", color: "#F8FAFC" }}>{step.questionsSolved}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748B" }}>XP: </span>
                        <span style={{ fontWeight: "700", color: "#F8FAFC" }}>{step.newXp} ({step.xpDelta >= 0 ? `+${step.xpDelta}` : step.xpDelta})</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748B" }}>Tier: </span>
                        <span style={{ fontWeight: "700", color: "#CBD5E1" }}>{step.newTier}</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748B" }}>θ Ability: </span>
                        <span style={{ fontWeight: "700", color: "#818CF8" }}>{step.newTheta}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tier Promotion & Volume Gate Summary Card */}
            <div
              style={{
                background: "#0B0E17",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "14px",
                padding: "20px 24px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "#FBBF24" }}>
                  🏆 Session Graduation & Tier Audit Report
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#94A3B8" }}>
                  Transition: {replayResult.tierTransition}
                </span>
              </div>

              <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#E2E8F0", lineHeight: "1.5" }}>
                {replayResult.summaryAnalysis}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>Initial Solved &rarr; Final Solved</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#F8FAFC", marginTop: "2px" }}>
                    {replayResult.initialState?.questionsSolved} &rarr; {replayResult.finalState?.questionsSolved}
                  </div>
                </div>
                <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>Mastery Evolution</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#34D399", marginTop: "2px" }}>
                    {Math.round(replayResult.initialState?.mastery * 100)}% &rarr; {Math.round(replayResult.finalState?.mastery * 100)}% ({replayResult.totalMasteryDelta >= 0 ? `+${Math.round(replayResult.totalMasteryDelta * 100)}` : Math.round(replayResult.totalMasteryDelta * 100)}%)
                  </div>
                </div>
                <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>Rank XP Earned</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#FBBF24", marginTop: "2px" }}>
                    {replayResult.initialState?.rankXp} &rarr; {replayResult.finalState?.rankXp} (+{replayResult.totalXpDelta})
                  </div>
                </div>
                <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>Tier Milestone Gate</span>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: (replayResult.finalState?.mastery >= 0.30 || replayResult.finalState?.questionsSolved >= 8) ? "#34D399" : "#FBBF24", marginTop: "2px" }}>
                    {(replayResult.finalState?.mastery >= 0.30 || replayResult.finalState?.questionsSolved >= 8) ? "✓ Silver Unlocked (>= 30% BKT)" : `🔒 ${Math.round((replayResult.finalState?.mastery || 0) * 100)}%/30% BKT for Silver`}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    )}
      </div>
    </AppShell>
  );
}
