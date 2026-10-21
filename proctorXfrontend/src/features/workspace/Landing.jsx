import React, { useState } from "react";
import { useSelector } from "react-redux";
import { motion as Motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../../shared/components/Logo";
import CompetencyRadar from "../adaptive/components/CompetencyRadar";
import usePageMeta from "../../shared/hooks/usePageMeta";
import "./landing.css";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const SAMPLE_RADAR_DATA = [
  { skill: "ARRAY", mastery: 0.85, confidence: 0.9 },
  { skill: "HASHMAP", mastery: 0.78, confidence: 0.85 },
  { skill: "TWO_POINTER", mastery: 0.72, confidence: 0.8 },
  { skill: "SLIDING_WINDOW", mastery: 0.68, confidence: 0.75 },
  { skill: "SORTING", mastery: 0.82, confidence: 0.88 },
  { skill: "BINARY_SEARCH", mastery: 0.75, confidence: 0.8 },
  { skill: "STACK", mastery: 0.70, confidence: 0.78 },
  { skill: "QUEUE", mastery: 0.65, confidence: 0.7 },
  { skill: "TREE", mastery: 0.60, confidence: 0.68 },
  { skill: "GRAPH", mastery: 0.55, confidence: 0.62 },
  { skill: "GREEDY", mastery: 0.74, confidence: 0.8 },
  { skill: "DYNAMIC_PROGRAMMING", mastery: 0.58, confidence: 0.65 },
];

const PIPELINE_NODES = [
  {
    step: "STAGE 01",
    icon: "🛡️",
    title: "Edge AI Proctoring",
    headline: "Zero-Leak On-Device Neural Vision",
    desc: "YOLOv8 and FaceMesh run inside client WebAssembly workers directly on the candidate's browser. Unauthorized devices, multiple faces, and tab defocus are flagged in 15ms with zero video streaming to cloud servers.",
    chips: ["60 FPS Client Inference", "15ms Detection Latency", "0 Bytes Video Uploaded", "100% Privacy Preserved"],
    code: `// Client Web Worker (YOLOv8n + FaceMesh WebAssembly)
const edgeProctor = await EdgeAI.init({ model: "yolov8n-pose.onnx", runtime: "wasm+webgpu" });
const telemetry = edgeProctor.evaluateFrame(videoFrame);

// [TELEMETRY] Person: 99.4% · Cellphone: 0.0% · HeadYaw: -2° (Normal)
// Privacy Guarantee: Zero webcam frames leave the candidate device.`
  },
  {
    step: "STAGE 02",
    icon: "⚡",
    title: "1ms WASM Compiler",
    headline: "Instant In-Browser Code Sandbox",
    desc: "Multi-tier execution toolchain compiles Python, Java, C++, and C locally inside candidate browser WebAssembly workers. Eliminates cold starts, eliminates cloud infrastructure costs, and runs in 1.2ms.",
    chips: ["~1.2ms WASM Execution", "$0 Server Compute Cost", "Python (Pyodide) + Java (CheerpJ)", "5s Watchdog Sandbox"],
    code: `// Multi-Tier Execution Router
const result = await ExecutionRouter.dispatch({
  language: "PYTHON",
  sourceCode: candidateSubmission,
  tierPriority: ["wasm-worker", "ast-transpiler", "onecompiler-cloud"]
});

// [WASM] Executed in 1.2ms · 3/3 Hidden Edge Testcases Passed · $0 Cloud Cost`
  },
  {
    step: "STAGE 03",
    icon: "🧠",
    title: "Cognitive AI Taxonomy",
    headline: "12-Vector Cognitive Error Profiling",
    desc: "Goes beyond simple pass/fail tests. Evaluates algorithmic code against 12 DSA dimensions and 9 cognitive error classifications (e.g. asymptotic complexity blindness, boundary conditions, off-by-one slips).",
    chips: ["12 DSA Vectors", "9 Error Taxonomy Profiles", "Llama 3.3 / GPT-OSS Reasoning", "Continuous IRT Calibration"],
    code: `// Deep Cognitive Reasoning Engine (GPT-OSS / Llama 3.3)
const cognitiveProfile = await CognitiveEngine.diagnose({
  vector: "DYNAMIC_PROGRAMMING",
  candidateAST: parsedAST,
  runtimeTraces: executionTrace
});

// [DIAGNOSIS] Risk: Asymptotic Inefficiency O(2^N) detected in recursion
// [ACTION] Dynamic coach generated 3 targeted memoization challenges.`
  },
  {
    step: "STAGE 04",
    icon: "📡",
    title: "Mission Control Room",
    headline: "Realtime Coordinator WebSocket & Killswitch",
    desc: "University faculty and recruiters supervise 500+ active candidates concurrently with live 5s heartbeat telemetry, instant proctoring alerts, custom warning prompts, and remote session revocation.",
    chips: ["5s Heartbeat Ping", "Real-Time WebSocket", "Remote Killswitch Armed", "Immutable Tamper Audit"],
    code: `// Live Coordinator Command Center
const session = coordinatorSocket.subscribe("exam_room_409");
session.on("CANDIDATE_TAB_SWITCH", (event) => {
  coordinator.issueWarning(event.candidateId, "Unauthorized window defocus flagged");
});

// [KILLSWITCH] Remote invalidation armed for non-compliant attempts.`
  }
];

const INSTITUTIONAL_PILLARS = [
  {
    badge: "PRIVACY & SECURITY",
    title: "100% On-Device Edge AI",
    desc: "Passive webcam recording violates student privacy and invites GDPR liability. ProctorX processes all neural vision (YOLOv8 + FaceMesh) locally in client WebAssembly workers. Zero video frames leave the device.",
    diff: "Unlike LeetCode or legacy proctors, zero candidate video is stored or transmitted."
  },
  {
    badge: "ZERO CLOUD COST",
    title: "Zero-Latency 1ms WASM Sandbox",
    desc: "Running thousands of cloud container judge instances drives massive infrastructure bills. ProctorX executes code directly inside browser WebAssembly workers, giving candidates 1ms feedback with zero server cost.",
    diff: "Runs locally in browser workers without server queue bottlenecks or cold starts."
  },
  {
    badge: "COGNITIVE INTELLIGENCE",
    title: "12-Vector Cognitive Error Taxonomy",
    desc: "Binary pass/fail test cases don't explain why a candidate struggled. ProctorX diagnoses code against 12 DSA mathematical vectors and 9 cognitive bug patterns (asymptotic efficiency, boundary traps, off-by-one).",
    diff: "Provides deep pedagogical diagnosis rather than simple test case counts."
  },
  {
    badge: "INSTITUTIONAL CONTROL",
    title: "Realtime Control Room & Killswitch",
    desc: "Built specifically for university faculty and enterprise technical recruiters. Monitor live telemetry heartbeats across hundreds of simultaneous test takers, issue instant in-exam prompts, and revoke invalid sessions.",
    diff: "Realtime invigilation dashboard with remote session termination controls."
  },
  {
    badge: "CANDIDATE PROOF",
    title: "Cryptographically Verified Portfolios",
    desc: "Candidates earn tamper-proof public profiles (/u/username) displaying verified contest ratings, 12-vector competency radar charts, behavioral integrity indices, and timeline replays.",
    diff: "Recruiters receive verified evidence of authentic, proctored code authorship."
  }
];

const PLATFORM_FEATURES = [
  {
    id: "arena",
    badge: "Autonomous Cloud",
    icon: "💻",
    title: "Autonomous AI Algorithmic Assessment Arena",
    subtitle: "Real-Time Code Evaluation & Instant Edge-Case Feedback",
    description: "Evaluates candidates across 12 algorithmic topics with automated edge-case test suites, computational complexity audits, and constructive AI feedback on algorithmic structure.",
    tags: ["Autonomous Cloud", "Instant AI Evaluation", "Edge-Case Testcases", "Multi-Language IDE"]
  },
  {
    id: "adaptive",
    badge: "Edge Intelligence",
    icon: "🌐",
    title: "12-Vector Adaptive DSA Competency Radar",
    subtitle: "Continuous Mathematical Calibration Loop",
    description: "Evaluates candidates across 17 distinct mathematical dimensions (12 DSA vectors + 5 behavioral traits). Automatically detects weak frontiers and generates targeted 3-question training sessions to master complex algorithms.",
    tags: ["12-Vector Radar", "EMA Mastery Formula", "Diagnostic Calibration", "Targeted Training"]
  },
  {
    id: "diagnostics",
    badge: "Cognitive AI",
    icon: "🧠",
    title: "Cognitive Bug & Misconception Taxonomy",
    subtitle: "9 Error Taxonomy Vector Classifications",
    description: "Go beyond simple pass/fail. The AI evaluates solutions against 9 diagnostic bug patterns (Off-by-One, Boundary Conditions, Null Pointers, Time Exceeded) so candidates fix core algorithmic reasoning patterns.",
    tags: ["9 Error Taxonomy Profiles", "Cognitive Profiling", "Algorithmic Reasoning", "Root-Cause Feedback"]
  },
  {
    id: "compiler",
    badge: "Zero Latency",
    icon: "⚡",
    title: "Multi-Tier WASM & Cloud Compiler Toolchain",
    subtitle: "Web Worker WASM + JS Transpiler + OneCompiler + JDoodle",
    description: "Executes Python, Java, C++, and C locally inside candidate browsers via high-speed client WebAssembly and JS transpilation (~1ms latency). Seamlessly cascades to cloud container judges for full standard library execution.",
    tags: ["Browser WASM Toolchain", "1ms Client Transpiler", "OneCompiler Cloud", "JDoodle Enterprise"]
  },
  {
    id: "proctoring",
    badge: "Privacy First",
    icon: "🛡️",
    title: "On-Device YOLOv8 AI Proctoring & Virtual Contests",
    subtitle: "Real-Time Object & Presence Detection",
    description: "Runs edge-AI computer vision in client browser workers. Detects mobile devices, multiple individuals, candidate absence, and fullscreen tab-switching without streaming private webcam feeds to external servers.",
    tags: ["YOLOv8 Edge AI", "Mobile Phone Detection", "Virtual Contest Sim", "Fullscreen Lock"]
  },
  {
    id: "portfolio",
    badge: "Recruiter Proof",
    icon: "🎓",
    title: "Verified Public Portfolios & Recruiter Proofs",
    subtitle: "Showcase Verified Skills to Recruiters",
    description: "Every candidate receives a shareable public profile (e.g. /u/username) displaying verified contest ratings, 12-dimension competency radar charts, behavioral ratings, and integrity guarantees.",
    tags: ["Public Portfolio /u/id", "Interactive Radar Embed", "Integrity Guarantee", "Recruiter Shareable"]
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [activeTab, setActiveTab] = useState("arena");
  const [activePipelineStep, setActivePipelineStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("python");

  usePageMeta({
    title: "ProctorX | Autonomous AI Technical Assessment & High-Integrity Evaluation Cloud",
    description: "The autonomous technical assessment platform for universities and engineering teams. Features on-device AI proctoring, 1ms WebAssembly code execution, and 12-vector cognitive diagnostics."
  });

  const currentPipeline = PIPELINE_NODES[activePipelineStep];

  return (
    <div className="modern-landing">
      {/* Top Announcement Banner (Render.com Style) */}
      <div className="top-announcement-banner">
        <span className="announcement-badge">ANNOUNCING PROCTORX 2.0</span>
        <span>
          Instant In-Browser WebAssembly Engine & 12-Vector Cognitive AI Assessment Cloud.{" "}
          <a href="#pipeline">Inspect Architecture ↓</a>
        </span>
      </div>

      {/* Navigation Bar */}
      <header className="modern-nav">
        <Logo size="md" />
        <nav className="modern-nav-links">
          <a href="#pipeline">Architecture</a>
          <a href="#telemetry">Engine Telemetry</a>
          <a href="#pillars">Integrity Model</a>
          <a href="#features">Features</a>
          <a href="#benchmarks">Benchmarks</a>
          {isAuthenticated ? (
            <button className="btn-nav-primary" onClick={() => navigate("/dashboard")}>
              Go to Workspace →
            </button>
          ) : (
            <>
              <button className="btn-nav-ghost" onClick={() => navigate("/login")}>
                Sign In
              </button>
              <button className="btn-nav-primary" onClick={() => navigate("/register")}>
                Get Started Free
              </button>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* Hero Section (Render Style with High-Contrast White CTA) */}
        <section className="modern-hero">
          <Motion.div {...fadeUp}>
            <div className="hero-pill">
              <span className="hero-pill-dot" /> Autonomous Technical Assessment Cloud
            </div>

            <h1 className="hero-heading">
              The Autonomous Technical Assessment Cloud for{" "}
              <span className="hero-gradient-text">Every Developer & Institution</span>
            </h1>

            <p className="hero-subheading">
              Evaluate coding talent, administer high-integrity verified exams, and diagnose algorithmic mastery with on-device edge AI, instant WebAssembly compilers, and deep cognitive error profiling.
            </p>

            <div className="hero-cta-group">
              <button className="btn-hero-primary" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}>
                {isAuthenticated ? "Launch Developer Workspace →" : "Start Free Assessment →"}
              </button>
              <button className="btn-hero-secondary" onClick={() => navigate(isAuthenticated ? "/adaptive-coach" : "/login")}>
                Institution & Coordinator Access ↗
              </button>
            </div>

            <div className="hero-chips-bar">
              <span><b>🛡️</b> 100% On-Device Edge AI</span>
              <span><b>⚡</b> 1ms In-Browser WASM Sandbox</span>
              <span><b>🧠</b> 12-Vector Cognitive Error Taxonomy</span>
              <span><b>📡</b> Realtime Coordinator Control Room</span>
              <span><b>🎓</b> Cryptographically Verified Portfolios</span>
            </div>
          </Motion.div>
        </section>

        {/* Render-Style Interactive Architecture Pipeline Box */}
        <section id="pipeline" style={{ maxWidth: 1160, margin: "20px auto 70px", padding: "0 24px" }}>
          <Motion.div
            className="render-pipeline-container"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Terminal Header */}
            <div className="render-terminal-header">
              <div className="render-terminal-dots">
                <span className="render-terminal-dot red" />
                <span className="render-terminal-dot yellow" />
                <span className="render-terminal-dot green" />
              </div>
              <div className="render-terminal-cmd">
                <span>$</span> proctorx run --autonomous --zero-leak --wasm-sandbox
              </div>
              <div className="render-terminal-badge">
                ● PIPELINE OPERATIONAL
              </div>
            </div>

            {/* 4-Stage Horizontal Pipeline Flow Navigation */}
            <div className="pipeline-flow-nav">
              {PIPELINE_NODES.map((node, index) => (
                <button
                  key={node.step}
                  type="button"
                  className={`pipeline-node-tab ${activePipelineStep === index ? "active" : ""}`}
                  onClick={() => setActivePipelineStep(index)}
                >
                  <div className="pipeline-node-step">
                    <span>{node.icon}</span> {node.step}
                  </div>
                  <h4 className="pipeline-node-title">{node.title}</h4>
                </button>
              ))}
            </div>

            {/* Active Stage Details & Live Telemetry Code Preview */}
            <div className="pipeline-stage-view">
              <div className="pipeline-stage-info">
                <h4>{currentPipeline.headline}</h4>
                <p className="pipeline-stage-desc">{currentPipeline.desc}</p>
                <div className="pipeline-telemetry-strip">
                  {currentPipeline.chips.map((chip, idx) => (
                    <span key={chip} className={`pipeline-telemetry-chip ${idx === 0 ? "highlight" : ""}`}>
                      {chip}
                    </span>
                  ))}
                </div>
                <div>
                  <button
                    className="btn-render-primary"
                    style={{ fontSize: "13px", padding: "9px 18px" }}
                    onClick={() => navigate(isAuthenticated ? "/adaptive-coach" : "/login")}
                  >
                    Test {currentPipeline.title} Live →
                  </button>
                </div>
              </div>

              <div>
                <pre className="pipeline-code-preview">
                  {currentPipeline.code}
                </pre>
              </div>
            </div>
          </Motion.div>
        </section>

        {/* 5 Institutional Differentiators: Why ProctorX is NOT LeetCode */}
        <section id="pillars" className="institutional-pillars-section">
          <Motion.div className="pillars-header" {...fadeUp}>
            <div className="pillars-eyebrow">Institutional Integrity & Developer Truth</div>
            <h2 className="pillars-title">Why ProctorX is NOT LeetCode</h2>
            <p className="pillars-subtitle">
              LeetCode is a static catalog of practice problems. ProctorX is the autonomous high-integrity assessment cloud built for universities, coding bootcamps, and enterprise engineering recruiters.
            </p>
          </Motion.div>

          <div className="pillars-grid">
            {INSTITUTIONAL_PILLARS.map((pillar) => (
              <div key={pillar.title} className="pillar-card">
                <div className="pillar-top">
                  <span className="pillar-badge">{pillar.badge}</span>
                  <h4>{pillar.title}</h4>
                  <p>{pillar.desc}</p>
                </div>
                <div className="pillar-diff-box">
                  <b>Advantage:</b> {pillar.diff}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Feature Experience Center (Spacious Full-Width Container) */}
        <section id="telemetry" className="showcase-section">
          <Motion.div
            className="showcase-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Topbar with Switcher Tabs */}
            <div className="showcase-header">
              <div className="showcase-title-wrap">
                <Logo size="sm" showText={false} />
                <span className="showcase-title">ProctorX Interactive Engine Telemetry</span>
              </div>
              <div className="showcase-tabs">
                <button
                  type="button"
                  className={`showcase-tab-btn ${activeTab === "arena" ? "active" : ""}`}
                  onClick={() => setActiveTab("arena")}
                >
                  💻 AI Coding Arena
                </button>
                <button
                  type="button"
                  className={`showcase-tab-btn ${activeTab === "adaptive" ? "active" : ""}`}
                  onClick={() => setActiveTab("adaptive")}
                >
                  🌐 Adaptive Radar
                </button>
                <button
                  type="button"
                  className={`showcase-tab-btn ${activeTab === "compiler" ? "active" : ""}`}
                  onClick={() => setActiveTab("compiler")}
                >
                  ⚡ Multi-Compiler
                </button>
                <button
                  type="button"
                  className={`showcase-tab-btn ${activeTab === "proctoring" ? "active" : ""}`}
                  onClick={() => setActiveTab("proctoring")}
                >
                  🛡️ YOLO AI
                </button>
                <button
                  type="button"
                  className={`showcase-tab-btn ${activeTab === "ai-authoring" ? "active" : ""}`}
                  onClick={() => setActiveTab("ai-authoring")}
                >
                  🤖 Groq Synthesis
                </button>
              </div>
            </div>

            {/* Body Content by Active Tab */}
            <div className="showcase-body">
              {/* 0. LEETCODE-STYLE AI CODING ARENA SHOWCASE */}
              {activeTab === "arena" && (
                <div className="arena-showcase-grid">
                  {/* Left: Problem Statement & Constraints */}
                  <div className="arena-problem-card">
                    <div className="arena-problem-header">
                      <h3 className="arena-problem-title">923. 3Sum With Multiplicity</h3>
                      <span className="arena-difficulty-chip">Medium</span>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className="bento-tag">Array</span>
                      <span className="bento-tag">Two Pointers</span>
                      <span className="bento-tag">Sorting</span>
                      <span className="bento-tag">AI Evaluated</span>
                    </div>

                    <p className="arena-problem-desc">
                      Given an integer array <code style={{ color: "#A78BFA" }}>arr</code>, and an integer <code style={{ color: "#A78BFA" }}>target</code>, return the number of tuples <code style={{ color: "#F472B6" }}>i, j, k</code> such that <code style={{ color: "#F472B6" }}>i &lt; j &lt; k</code> and <code style={{ color: "#34D399" }}>arr[i] + arr[j] + arr[k] == target</code>.
                    </p>

                    <div className="arena-sample-box">
                      <div style={{ color: "#CBD5E1", fontWeight: 600, marginBottom: 2 }}>Sample Test Case:</div>
                      <div>Input: arr = [1,1,2,2,3,3,4,4,5,5], target = 8</div>
                      <div style={{ color: "#34D399" }}>Output: 20</div>
                    </div>

                    <div style={{ marginTop: "auto", paddingTop: 10 }}>
                      <button
                        className="btn-hero-primary"
                        style={{ padding: "10px 18px", fontSize: "13px", width: "100%" }}
                        onClick={() => navigate(isAuthenticated ? "/adaptive-coach/training" : "/login")}
                      >
                        ⚡ Practice Similar Problem in Arena →
                      </button>
                    </div>
                  </div>

                  {/* Right: Live Interactive IDE & AI Judge Preview */}
                  <div className="arena-ide-card">
                    <div className="arena-ide-topbar">
                      <div className="arena-lang-tabs">
                        {["python", "java", "cpp"].map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            className={`arena-lang-btn ${selectedLanguage === lang ? "active" : ""}`}
                            onClick={() => setSelectedLanguage(lang)}
                          >
                            {lang === "python" ? "🐍 Python 3" : lang === "java" ? "☕ Java 17" : "⚡ C++ 20"}
                          </button>
                        ))}
                      </div>
                      <span style={{ fontSize: "11px", color: "#34D399", fontWeight: 700 }}>
                        ● 3/3 Hidden Tests Passed
                      </span>
                    </div>

                    <pre className="arena-code-editor">
                      {selectedLanguage === "python" && (
`class Solution:
    def threeSumMulti(self, arr: list[int], target: int) -> int:
        MOD = 10**9 + 7
        count = collections.Counter(arr)
        keys = sorted(count)
        ans = 0
        # Two-pointer algorithmic sweep across sorted keys
        for i, x in enumerate(keys):
            T = target - x
            j, k = i, len(keys) - 1
            while j <= k:
                y, z = keys[j], keys[k]
                if y + z < T: j += 1
                elif y + z > T: k -= 1
                else:
                    # Combinatorial duplicate handling
                    if i < j < k: ans += count[x] * count[y] * count[z]
                    elif i == j < k: ans += count[x] * (count[x] - 1) // 2 * count[z]
                    elif i < j == k: ans += count[x] * count[y] * (count[y] - 1) // 2
                    else: ans += count[x] * (count[x] - 1) * (count[x] - 2) // 6
                    j += 1; k -= 1
        return ans % MOD`
                      )}
                      {selectedLanguage === "java" && (
`class Solution {
    public int threeSumMulti(int[] arr, int target) {
        long MOD = 1_000_000_007;
        long[] count = new long[101];
        for (int x : arr) count[x]++;
        long ans = 0;
        for (int i = 0; i <= 100; i++) {
            for (int j = i; j <= 100; j++) {
                int k = target - i - j;
                if (k < 0 || k > 100) continue;
                if (i == j && j == k) ans += count[i] * (count[i]-1) * (count[i]-2) / 6;
                else if (i == j && j < k) ans += count[i] * (count[i]-1) / 2 * count[k];
                else if (i < j && j < k) ans += count[i] * count[j] * count[k];
            }
        }
        return (int)(ans % MOD);
    }
}`
                      )}
                      {selectedLanguage === "cpp" && (
`class Solution {
public:
    int threeSumMulti(vector<int>& arr, int target) {
        long MOD = 1e9 + 7;
        vector<long> count(101, 0);
        for (int x : arr) count[x]++;
        long ans = 0;
        for (int i = 0; i <= 100; ++i) {
            for (int j = i; j <= 100; ++j) {
                int k = target - i - j;
                if (k < 0 || k > 100) continue;
                if (i == j && j == k) ans += count[i]*(count[i]-1)*(count[i]-2)/6;
                else if (i == j && j < k) ans += count[i]*(count[i]-1)/2 * count[k];
                else if (i < j && j < k) ans += count[i]*count[j]*count[k];
            }
        }
        return ans % MOD;
    }
};`
                      )}
                    </pre>

                    {/* AI Evaluation Box */}
                    <div className="arena-ai-eval-box">
                      <div className="arena-eval-header">
                        <span className="arena-eval-badge">
                          <span>✓</span> AI Evaluation Verdict: Optimal Solution
                        </span>
                        <span style={{ color: "#34D399", fontSize: "11px" }}>Execution: 1.2ms (Browser WASM)</span>
                      </div>
                      <div className="arena-eval-metrics">
                        <span>Time Complexity: <strong>O(N²)</strong></span>
                        <span>Space Complexity: <strong>O(1) Auxiliary</strong></span>
                        <span>Cognitive Risk: <strong style={{ color: "#34D399" }}>0.02 (Minimal)</strong></span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#94A3B8", lineHeight: 1.4 }}>
                        💡 <strong>AI Feedback:</strong> Optimal two-pointer frequency reduction algorithm. Correctly avoided boundary overflow by leveraging modular arithmetic. Zero off-by-one errors detected in key boundaries.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* 1. ADAPTIVE RADAR SHOWCASE */}
              {activeTab === "adaptive" && (
                <div className="radar-showcase-grid">
                  <div className="radar-info-box">
                    <div className="radar-eyebrow">Algorithmic Vector Analysis</div>
                    <h3 className="radar-heading">12-Dimension Competency Engine</h3>
                    <p className="radar-desc">
                      Continuous Bayesian calibration through our 6-question diagnostic baseline and 3-question targeted training loops. Skill vectors adjust dynamically using exponential moving averages.
                    </p>

                    <div className="radar-metrics-row">
                      <span className="radar-chip success">✓ 78% Overall Readiness</span>
                      <span className="radar-chip primary">12 Live DSA Vectors</span>
                      <span className="radar-chip warning">Target: Dynamic Prog (0.58)</span>
                    </div>

                    <div className="radar-formula-box">
                      <div style={{ color: "#A78BFA", fontWeight: 700, marginBottom: 4 }}>
                        Mastery Formula: M_new = α · Score + (1 - α) · M_old
                      </div>
                      <div style={{ color: "#94A3B8" }}>
                        Calibrated after every code execution against testcase accuracy & time complexity.
                      </div>
                    </div>

                    <div>
                      <button
                        className="btn-hero-primary"
                        style={{ padding: "10px 20px", fontSize: "13px" }}
                        onClick={() => navigate("/login")}
                      >
                        Start Diagnostic Assessment →
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <CompetencyRadar dsaMasteryVector={SAMPLE_RADAR_DATA} size={380} />
                  </div>
                </div>
              )}

              {/* 2. MULTI-TIER COMPILER SHOWCASE */}
              {activeTab === "compiler" && (
                <div className="compiler-showcase-grid">
                  <div className="compiler-header-row">
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: "1.3rem", color: "#F8FAFC" }}>
                        4-Tier WebAssembly, Transpiler & Cloud Execution System
                      </h3>
                      <p style={{ margin: 0, fontSize: "13px", color: "#94A3B8" }}>
                        Dedicated Web Worker JVM & Clang WASM toolchains with seamless Client Transpiler, OneCompiler, and JDoodle fallbacks.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className="radar-chip success">⚡ 2ms Python (Pyodide)</span>
                      <span className="radar-chip primary">☕ Java 17 (CheerpJ+ECJ)</span>
                    </div>
                  </div>

                  {/* 4 Tier Architecture Cards */}
                  <div className="compiler-tiers-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                    <div className="compiler-tier-card tier-1">
                      <div className="tier-badge">TIER 1 (WASM WORKERS)</div>
                      <div className="tier-title">Browser WASM Toolchain</div>
                      <div className="tier-meta">CheerpJ 3.0 (ECJ.jar) JVM & Pyodide running in isolated Web Workers with 5s watchdog.</div>
                      <span className="tier-latency">0ms Server · $0 Cost</span>
                    </div>

                    <div className="compiler-tier-card tier-1">
                      <div className="tier-badge">TIER 2 (JS TRANSPILER)</div>
                      <div className="tier-title">Client JS Transpiler</div>
                      <div className="tier-meta">Ultra-fast AST transpiler for Python, Java, C++, and C with strict syntax error validation.</div>
                      <span className="tier-latency">~1ms Ultra Low Latency</span>
                    </div>

                    <div className="compiler-tier-card tier-2">
                      <div className="tier-badge">TIER 3 (CONTAINER CLOUD)</div>
                      <div className="tier-title">OneCompiler Engine</div>
                      <div className="tier-meta">High-throughput isolated Linux containers with instant latency and full library support.</div>
                      <span className="tier-latency">19ms Cloud Judge</span>
                    </div>

                    <div className="compiler-tier-card tier-3">
                      <div className="tier-badge">TIER 4 (FAIL-SAFE CLOUD)</div>
                      <div className="tier-title">JDoodle Enterprise</div>
                      <div className="tier-meta">Enterprise OpenJDK 17 & GCC Clang judge for complete multi-language compliance.</div>
                      <span className="tier-latency">Zero-Downtime Fallback</span>
                    </div>
                  </div>

                  {/* Terminal Simulation */}
                  <div className="compiler-terminal-box">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#64748B", fontSize: "11px" }}>
                      <span>EXECUTION ENGINE CONSOLE</span>
                      <span style={{ color: "#34D399" }}>● 4 COMPILERS READY</span>
                    </div>
                    <div style={{ color: "#A78BFA" }}>
                      $ router.executeCode(language=&quot;JAVA&quot;, priorityChain=[&quot;wasm-local&quot;, &quot;transpiler-local&quot;, &quot;onecompiler&quot;, &quot;jdoodle&quot;])
                    </div>
                    <div style={{ color: "#34D399", marginTop: 4 }}>
                      ✓ Route selected: WASM_LOCAL (Isolated CheerpJ 3.0 + ECJ.jar Web Worker)
                    </div>
                    <div style={{ color: "#CBD5E1", marginTop: 4 }}>
                      &gt; Execution Results: 3/3 Test Cases Passed • CPU Time: 340ms • Memory: JVM WASM Sandbox
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ON-DEVICE YOLOv8 PROCTORING SHOWCASE */}
              {activeTab === "proctoring" && (
                <div className="yolo-showcase-grid">
                  {/* Visual Live Video Inference Feed */}
                  <div className="yolo-feed-card">
                    <span className="yolo-badge-live">LIVE EDGE INFERENCE</span>
                    <span className="yolo-badge-fps">60 FPS • 15ms</span>

                    <div className="yolo-target-box">
                      <div style={{ fontSize: "36px", marginBottom: 4 }}>👤</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#34D399" }}>99.4% Verified</div>
                      <div style={{ fontSize: "10px", color: "#94A3B8" }}>Face Detected</div>
                    </div>

                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>Candidate Presence Confirmed</div>
                      <div style={{ fontSize: "11px", color: "#34D399", marginTop: 2 }}>Mobile Phone: NONE DETECTED</div>
                    </div>
                  </div>

                  {/* Security Telemetry Details */}
                  <div className="yolo-metrics-list">
                    <div className="yolo-metric-row">
                      <span className="label">Multiple Person Detection</span>
                      <span className="val" style={{ color: "#34D399" }}>Clean (0 Detected)</span>
                    </div>
                    <div className="yolo-metric-row">
                      <span className="label">Cell Phone / Object Detection</span>
                      <span className="val" style={{ color: "#34D399" }}>Clean (0 Detected)</span>
                    </div>
                    <div className="yolo-metric-row">
                      <span className="label">Fullscreen Enforcement</span>
                      <span className="val" style={{ color: "#34D399" }}>Active (Strict Lock)</span>
                    </div>
                    <div className="yolo-metric-row">
                      <span className="label">Camera PiP Video Mode</span>
                      <span className="val" style={{ color: "#818CF8" }}>Draggable Anywhere</span>
                    </div>

                    <div className="yolo-privacy-callout">
                      <span style={{ fontSize: "18px" }}>🛡️</span>
                      <div>
                        <strong>100% Privacy Preserved:</strong> Zero webcam frames leave the candidate's browser. Neural inference runs entirely client-side via WebAssembly & WebGPU.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. GROQ AI SYNTHESIS SHOWCASE */}
              {activeTab === "ai-authoring" && (
                <div className="groq-showcase-grid">
                  <div className="groq-input-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#A78BFA" }}>PROMPT SYNTHESIS</span>
                      <span className="radar-chip primary" style={{ fontSize: "10px", padding: "2px 8px" }}>
                        Groq LPU 500 T/s
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#E2E8F0", marginBottom: 6 }}>
                        Prompt:
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.4)", padding: "10px 12px", borderRadius: 8, fontSize: "12px", color: "#94A3B8" }}>
                        &quot;Synthesize a Medium-Hard Graph Shortest Path challenge with 3 automated test cases including disconnected components.&quot;
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: "11px", color: "#64748B" }}>Model: Llama 3 70B Versatile</span>
                      <span style={{ fontSize: "11px", color: "#34D399", fontWeight: 700 }}>⚡ Generated in 380ms</span>
                    </div>
                  </div>

                  <div className="groq-output-card">
                    <div style={{ color: "#A78BFA", fontWeight: 700, marginBottom: 6 }}>
                      # Network Optimal Transmission Delay
                    </div>
                    <div style={{ color: "#E2E8F0", marginBottom: 8 }}>
                      Given a network of <code style={{ color: "#F472B6" }}>N</code> nodes and transmission times, compute the minimum time required for all nodes to receive the signal.
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "11px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8 }}>
                      <div style={{ color: "#34D399" }}>✓ Test Case 1 (Sample): times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2 → Output: 2</div>
                      <div style={{ color: "#34D399", marginTop: 4 }}>✓ Test Case 2 (Edge): times = [[1,2,1]], n = 2, k = 2 → Output: -1</div>
                      <div style={{ color: "#34D399", marginTop: 4 }}>✓ Test Case 3 (Evaluation): Fully verified with standard solution</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Motion.div>
        </section>

        {/* Dynamic Capabilities Ticker */}
        <section className="modern-ticker-strip">
          <span>💻 LeetCode-Style AI Coding Arena</span>
          <span>🤖 Real-Time AI Code Evaluation</span>
          <span>🌐 12-Vector Adaptive DSA Coach</span>
          <span>⚡ 1ms WASM & Transpiler Compiler</span>
          <span>🛡️ On-Device YOLOv8 Proctoring</span>
          <span>🎓 Verified Public Portfolios</span>
        </section>

        {/* Full Feature Bento Grid */}
        <section id="features" className="bento-section">
          <Motion.div className="section-header-centered" {...fadeUp}>
            <div className="section-eyebrow">Enterprise & Algorithmic Architecture</div>
            <h2 className="section-title">Everything you need for practice, AI evaluation, and mastery.</h2>
            <p className="section-desc">
              A unified operating system engineered for students, competitive programmers, and enterprise educators.
            </p>
          </Motion.div>

          <div className="bento-grid">
            {PLATFORM_FEATURES.map((feat, index) => (
              <Motion.article
                key={feat.id}
                className="bento-card"
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.06 }}
              >
                <div>
                  <div className="bento-top-row">
                    <span className="bento-icon">{feat.icon}</span>
                    <span className="bento-badge">{feat.badge}</span>
                  </div>

                  <h3>{feat.title}</h3>
                  <div className="bento-sub">{feat.subtitle}</div>
                  <p>{feat.description}</p>
                </div>

                <div className="bento-tags">
                  {feat.tags.map((tag) => (
                    <span key={tag} className="bento-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </Motion.article>
            ))}
          </div>
        </section>

        {/* Benchmark Stats Strip */}
        <section id="benchmarks" className="stats-strip-section">
          <Motion.div className="stats-strip-card" {...fadeUp}>
            <div>
              <div className="stats-number">12</div>
              <div className="stats-label">Mathematical DSA Vectors</div>
            </div>
            <div>
              <div className="stats-number">1ms</div>
              <div className="stats-label">Browser WASM Latency</div>
            </div>
            <div>
              <div className="stats-number">9</div>
              <div className="stats-label">AI Cognitive Bug Profiles</div>
            </div>
            <div>
              <div className="stats-number">100%</div>
              <div className="stats-label">On-Device Privacy AI</div>
            </div>
          </Motion.div>
        </section>

        {/* Call to Action Banner */}
        <section className="cta-section">
          <Motion.div className="cta-banner" {...fadeUp}>
            <h2>Elevate your examination integrity and algorithmic skills today.</h2>
            <p>
              Sign in to your candidate dashboard, launch your Adaptive DSA Coach, or request coordinator onboarding.
            </p>
            <div className="hero-cta-group" style={{ marginBottom: 0 }}>
              <button className="btn-hero-primary" onClick={() => navigate("/login")}>
                Sign In to Workspace ⚡
              </button>
              <button className="btn-hero-secondary" onClick={() => navigate("/register")}>
                Register Coordinator
              </button>
            </div>
          </Motion.div>
        </section>
      </main>

      {/* Upgraded Modern Footer with Verified Developer Attribution */}
      <footer className="modern-footer">
        <div className="footer-content">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo size="sm" />
            <span style={{ color: "#94A3B8", fontSize: "13px" }}>
              © {new Date().getFullYear()} ProctorX Systems. High-Integrity Examination Infrastructure.
            </span>
          </div>

          {/* Developer Attribution & Portfolio Link */}
          <div className="developer-pill">
            <span>Developed with passion by <strong>Bavithran N</strong></span>
            <span style={{ color: "#64748B" }}>•</span>
            <a
              href="https://bavithran.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>bavithran.vercel.app</span>
              <span style={{ fontSize: "12px" }}>↗</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
