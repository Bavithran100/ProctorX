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

const PLATFORM_FEATURES = [
  {
    id: "adaptive",
    badge: "AI Powered",
    icon: "🌐",
    title: "Adaptive DSA Coach & Vector Radar",
    subtitle: "Continuous Algorithmic Calibration Loop",
    description: "Evaluates candidates across 17 distinct mathematical dimensions (12 DSA vectors + 5 behavioral traits). Automatically detects weak frontiers and generates targeted 3-question training sessions to master complex algorithms.",
    tags: ["12-Vector Radar", "EMA Mastery Formula", "Diagnostic Calibration", "Targeted Training"]
  },
  {
    id: "compiler",
    badge: "Zero Latency",
    icon: "⚡",
    title: "Multi-Tier WebAssembly & Cloud Compiler",
    subtitle: "Pyodide WASM + JDoodle + OneCompiler",
    description: "Executes Python 100% inside candidate browsers via WebAssembly (~2ms latency, $0 server cost). Automatically cascades to JDoodle and OneCompiler for Java 17, C++, and C with full standard library support.",
    tags: ["Browser Pyodide WASM", "JDoodle 1st Fallback", "OneCompiler 2nd Fallback", "Multi-Language"]
  },
  {
    id: "proctoring",
    badge: "Privacy First",
    icon: "🛡️",
    title: "On-Device YOLOv8 AI Proctoring",
    subtitle: "Real-Time Object & Presence Detection",
    description: "Runs edge-AI computer vision in client browser workers. Detects mobile devices, multiple individuals, candidate absence, and fullscreen tab-switching without streaming private webcam feeds to external servers.",
    tags: ["YOLOv8 Edge AI", "Mobile Phone Detection", "Multi-Person Detection", "Fullscreen Lock"]
  },
  {
    id: "ai-authoring",
    badge: "Groq LLM",
    icon: "🤖",
    title: "Generative AI Question Synthesis",
    subtitle: "Instant Algorithmic Problem & Testcase Engine",
    description: "Empowers coordinators to synthesize comprehensive multiple choice question sets and multi-language coding challenges with automated edge-case test case verification in seconds.",
    tags: ["Groq Llama 3 70B", "Automated Test Cases", "Difficulty Calibration", "1-Click Publishing"]
  },
  {
    id: "control-room",
    badge: "Mission Control",
    icon: "📡",
    title: "Live Coordinator Control Room",
    subtitle: "Real-Time Session Telemetry & Interventions",
    description: "Supervise live examination rooms with real-time candidate heartbeats, automated risk scoring, timestamped malpractice logs, remote session terminations, and live webcam audits.",
    tags: ["Live Heartbeat Polling", "Risk Index Scoring", "Malpractice Audit Log", "Remote Actions"]
  },
  {
    id: "portfolio",
    badge: "Shareable",
    icon: "🎓",
    title: "Verified Public Candidate Portfolios",
    subtitle: "Showcase Verified Skills to Recruiters",
    description: "Every student receives a shareable public profile (e.g. /u/username) displaying verified exam performance, 12-dimension competency radar charts, behavioral ratings, and integrity guarantees.",
    tags: ["Public Portfolio /u/id", "Interactive Radar Embed", "Integrity Guarantee", "Recruiter Shareable"]
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [activeTab, setActiveTab] = useState("adaptive");
  const [selectedLanguage, setSelectedLanguage] = useState("python");

  usePageMeta({
    title: "Intelligent Assessment & Real-Time AI Proctoring Platform",
    description: "Enterprise-grade online examination platform featuring on-device real-time AI proctoring, live candidate supervision, and interactive coding IDE assessments."
  });

  return (
    <div className="modern-landing">
      {/* Ambient Radial Background Glows */}
      <div className="landing-ambient-glow" />
      <div className="landing-ambient-glow-secondary" />

      {/* Navigation Bar */}
      <header className="modern-nav">
        <Logo size="md" />
        <nav className="modern-nav-links">
          <a href="#features">Features</a>
          <a href="#telemetry">Interactive Engine</a>
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
        {/* Hero Section */}
        <section className="modern-hero">
          <Motion.div {...fadeUp}>
            <div className="hero-pill">
              <span className="hero-pill-dot" /> Autonomous High-Integrity Assessment & Algorithmic Platform
            </div>

            <h1 className="hero-heading">
              Exams and algorithmic training run better when{" "}
              <span className="hero-gradient-text">trust and intelligence</span> are built in.
            </h1>

            <p className="hero-subheading">
              ProctorX delivers a unified, developer-grade workspace: author AI-generated challenges, execute code with zero-latency browser WebAssembly, supervise with on-device YOLO AI, and continuously train with the 12-Dimension Adaptive DSA Coach.
            </p>

            <div className="hero-cta-group">
              <button className="btn-hero-primary" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}>
                {isAuthenticated ? "Launch Workspace →" : "Launch Workspace →"}
              </button>
              {!isAuthenticated && (
                <button className="btn-hero-secondary" onClick={() => navigate("/register")}>
                  Coordinator Access
                </button>
              )}
            </div>

            <div className="hero-chips-bar">
              <span><b>🌐</b> 12-Vector Adaptive Coach</span>
              <span><b>⚡</b> In-Browser WASM & JDoodle Cascade</span>
              <span><b>🛡️</b> On-Device YOLO AI</span>
              <span><b>🎓</b> Verified Public Profiles</span>
            </div>
          </Motion.div>
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
                      <div style={{ color: "#38BDF8", fontWeight: 700, marginBottom: 4 }}>
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
                        Multi-Tier Client WebAssembly & Cloud Judge
                      </h3>
                      <p style={{ margin: 0, fontSize: "13px", color: "#94A3B8" }}>
                        Instant browser execution for Python with seamless JDoodle and OneCompiler cascading fallbacks.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className="radar-chip success">⚡ 2ms Python (WASM)</span>
                      <span className="radar-chip primary">☕ 18ms Java (JDoodle)</span>
                    </div>
                  </div>

                  {/* 3 Tier Architecture Cards */}
                  <div className="compiler-tiers-row">
                    <div className="compiler-tier-card tier-1">
                      <div className="tier-badge">TIER 1 (CLIENT-SIDE WASM)</div>
                      <div className="tier-title">Pyodide WebAssembly</div>
                      <div className="tier-meta">Runs 100% inside candidate browser. Full Python 3.11 with NumPy and standard library.</div>
                      <span className="tier-latency">0ms Server · $0 Cost</span>
                    </div>

                    <div className="compiler-tier-card tier-2">
                      <div className="tier-badge">TIER 2 (PRIMARY CLOUD)</div>
                      <div className="tier-title">JDoodle Enterprise</div>
                      <div className="tier-meta">Real OpenJDK 17 (javac) & GCC Clang judge for Java, C++, and C with full standard library.</div>
                      <span className="tier-latency">1st Automatic Fallback</span>
                    </div>

                    <div className="compiler-tier-card tier-3">
                      <div className="tier-badge">TIER 3 (FAIL-SAFE CASCADE)</div>
                      <div className="tier-title">OneCompiler Engine</div>
                      <div className="tier-meta">High-throughput fail-safe cascade activated automatically if JDoodle encounters rate limits.</div>
                      <span className="tier-latency">Zero-Downtime Guarantee</span>
                    </div>
                  </div>

                  {/* Terminal Simulation */}
                  <div className="compiler-terminal-box">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#64748B", fontSize: "11px" }}>
                      <span>EXECUTION ENGINE CONSOLE</span>
                      <span style={{ color: "#34D399" }}>● READY</span>
                    </div>
                    <div style={{ color: "#38BDF8" }}>
                      $ router.executeCode(language=&quot;PYTHON&quot;, stdin=&quot;[1, 2, 3, 4, 5]&quot;)
                    </div>
                    <div style={{ color: "#34D399", marginTop: 4 }}>
                      ✓ Route selected: WASM_LOCAL (Client Pyodide Worker)
                    </div>
                    <div style={{ color: "#CBD5E1", marginTop: 4 }}>
                      &gt; Execution Results: 3/3 Test Cases Passed • Time: 2.1ms • Memory: 14MB
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
                      <span className="val" style={{ color: "#38BDF8" }}>Active (Strict Lock)</span>
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
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#38BDF8" }}>PROMPT SYNTHESIS</span>
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
                    <div style={{ color: "#38BDF8", fontWeight: 700, marginBottom: 6 }}>
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
          <span>🌐 12-Vector Adaptive DSA Coach</span>
          <span>⚡ Pyodide WASM & JDoodle / OneCompiler</span>
          <span>🛡️ On-Device YOLOv8 Proctoring</span>
          <span>🤖 Groq LLM Question Synthesis</span>
          <span>📡 Live Coordinator Control Room</span>
          <span>🎓 Verified Public Portfolios</span>
        </section>

        {/* Full Feature Bento Grid */}
        <section id="features" className="bento-section">
          <Motion.div className="section-header-centered" {...fadeUp}>
            <div className="section-eyebrow">Enterprise & Algorithmic Architecture</div>
            <h2 className="section-title">Everything you need for evaluation, supervision, and mastery.</h2>
            <p className="section-desc">
              A unified operating system engineered for students, educators, and enterprise coordinators.
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
              <div className="stats-number">2ms</div>
              <div className="stats-label">Browser WASM Latency</div>
            </div>
            <div>
              <div className="stats-number">100%</div>
              <div className="stats-label">On-Device Video Privacy</div>
            </div>
            <div>
              <div className="stats-number">3-Tier</div>
              <div className="stats-label">Cascading Compiler Fallback</div>
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
