import { useState } from "react";
import AppShell from "../../shared/components/AppShell";
import "../../AdminMonitoring.css";
import "../../App.css";

function TabButton({ id, label, activeTab, onChange }) {
  return (
    <button
      className={`info-tab ${activeTab === id ? "active-tab" : ""}`}
      onClick={() => onChange(id)}
    >
      {label}
    </button>
  );
}

export default function ExamInformation() {
  const [tab, setTab] = useState("OVERVIEW");

  return (
    <AppShell
      title="Examination Guidelines & Security Handbook"
      subtitle="Familiarize yourself with candidate conduct rules, proctoring requirements, and submission procedures."
      activeNav="/rules"
    >
      <div className="admin-container">
        {/* Navigation Tabs */}
        <div className="info-tab-bar">
          <TabButton id="OVERVIEW" label="Overview" activeTab={tab} onChange={setTab} />
          <TabButton id="ADAPTIVE_ENGINE" label="20-D Adaptive Engine" activeTab={tab} onChange={setTab} />
          <TabButton id="AI_EVALUATION" label="AI Evaluation & Compilers" activeTab={tab} onChange={setTab} />
          <TabButton id="WORKFLOW" label="Lifecycle & Workflow" activeTab={tab} onChange={setTab} />
          <TabButton id="RULES" label="Candidate Rules" activeTab={tab} onChange={setTab} />
          <TabButton id="MALPRACTICE" label="AI Malpractice Engine" activeTab={tab} onChange={setTab} />
          <TabButton id="SECURITY" label="Platform Security" activeTab={tab} onChange={setTab} />
          <TabButton id="NOTES" label="Technical Notes" activeTab={tab} onChange={setTab} />
        </div>

        {/* Tab Content Cards */}
        <div className="info-content">
          {tab === "OVERVIEW" && (
            <section>
              <div className="hero-badge">Platform Overview</div>
              <h3>What is ProctorX?</h3>
              <p style={{ lineHeight: 1.7, marginBottom: 20 }}>
                <b>ProctorX</b> is a next-generation algorithmic training and examination platform. It operates in two unified modes: an <b>AI-Powered LeetCode-Style Practice Arena</b> where questions and code submissions are evaluated instantly by AI, and an <b>Enterprise Proctored Assessment System</b> featuring on-device edge-AI computer vision for high-stakes examinations.
              </p>
              <div className="summary-grid" style={{ marginTop: 24 }}>
                <div className="card summary-card">
                  <span>AI Practice Arena</span>
                  <strong>LeetCode-Style IDE</strong>
                  <p className="helper-text">Solve algorithmic challenges with instant AI evaluation, edge-case analysis, and complexity audits.</p>
                </div>
                <div className="card summary-card">
                  <span>Algorithmic Coach</span>
                  <strong>20-D Cognitive Radar</strong>
                  <p className="helper-text">Continuous Bayesian calibration tracking your mastery across 20 hierarchical DSA dimensions.</p>
                </div>
                <div className="card summary-card">
                  <span>Multi-Tier Compilers</span>
                  <strong>WASM & Cloud Judges</strong>
                  <p className="helper-text">~1ms Web Worker execution for Python, Java, C++, and C with automated cloud failover.</p>
                </div>
              </div>
            </section>
          )}

          {tab === "ADAPTIVE_ENGINE" && (
            <section>
              <div className="hero-badge">Bayesian Adaptive Core</div>
              <h3>AlgoCortex 20-D Cognitive Architecture</h3>
              <p style={{ lineHeight: 1.7, marginBottom: 20 }}>
                AlgoCortex models a student's algorithmic knowledge using a <b>20-Dimensional Vector Manifold</b>. In our adaptive exams, three progressive questions are generated sequentially, each dynamically calibrated to test your Bayesian mastery frontier.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: "16px 20px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <strong style={{ color: "#818CF8", fontSize: "0.95rem" }}>8 Foundational Concepts</strong>
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Arrays & Strings, Linked Lists, Stacks & Queues, Trees & BST, Graphs, Hash Tables, Recursion & Backtracking, and Dynamic Programming.
                  </p>
                </div>

                <div className="card" style={{ padding: "16px 20px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <strong style={{ color: "#34D399", fontSize: "0.95rem" }}>8 Algorithmic Patterns</strong>
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Two Pointers, Sliding Window, Binary Search, BFS/DFS, Monotonic Stack & Queue, Top-K Heap, Union-Find, and Intervals & Greedy.
                  </p>
                </div>

                <div className="card" style={{ padding: "16px 20px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <strong style={{ color: "#FBBF24", fontSize: "0.95rem" }}>4 Core Engineering Competencies</strong>
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Implementation Fluency, Code Reliability, Algorithmic Efficiency, and Edge-Case Resilience.
                  </p>
                </div>

                <div className="card" style={{ padding: "16px 20px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <strong style={{ color: "#FB7185", fontSize: "0.95rem" }}>4 Core Defect Profiles</strong>
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Off-By-One Slips, Null/Empty Collection Traps, Time Limit Exceeded (TLE), and State Corruption.
                  </p>
                </div>
              </div>

              <div className="card" style={{ padding: "20px", background: "rgba(17, 24, 39, 0.8)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                <h4 style={{ margin: "0 0 10px", color: "#F8FAFC", fontSize: "1rem" }}>📐 Mathematical Calibration: BKT + IRT 1PL (Rasch) Engine</h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#CBD5E1", lineHeight: 1.6 }}>
                  Mastery trajectories update via <b>Bayesian Knowledge Tracing (BKT)</b> combined with <b>Item Response Theory (IRT)</b>. Questions evaluate sequentially so each problem's posterior feeds the next problem's prior. When a target Concept is assessed, knowledge propagates through our Directed Acyclic Graph (DAG) to linked Algorithmic Patterns with empirical damping (&gamma; = 0.90).
                </p>
              </div>
            </section>
          )}

          {tab === "AI_EVALUATION" && (
            <section>
              <div className="hero-badge">AI Grading & Compiler System</div>
              <h3>How AI Evaluates Code & Solutions</h3>
              <p style={{ lineHeight: 1.7, marginBottom: 20 }}>
                ProctorX evaluates candidate code submissions through a multi-dimensional AI scoring engine combining automated testcase execution, static AST analysis, and cognitive error taxonomy profiling:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ padding: "16px 20px", background: "rgba(15, 23, 42, 0.6)" }}>
                  <strong style={{ color: "#A78BFA", fontSize: "0.95rem" }}>1. Automated Public & Hidden Test Case Verification</strong>
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Every submission is tested against sample test cases and hidden stress suites (e.g. boundary values, negative numbers, maximum array constraints). A solution is accepted only if all test cases produce expected outputs within defined time/memory limits.
                  </p>
                </div>

                <div className="card" style={{ padding: "16px 20px", background: "rgba(15, 23, 42, 0.6)" }}>
                  <strong style={{ color: "#34D399", fontSize: "0.95rem" }}>2. Time & Space Complexity Audits</strong>
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    The AI evaluates algorithmic efficiency (e.g. O(N) vs O(N²)). Solutions that pass small test cases by brute-force but fail on large inputs receive automated algorithmic feedback suggesting optimal data structures (e.g. HashMaps, Two-Pointers, Binary Search).
                  </p>
                </div>

                <div className="card" style={{ padding: "16px 20px", background: "rgba(15, 23, 42, 0.6)" }}>
                  <strong style={{ color: "#FBBF24", fontSize: "0.95rem" }}>3. 4 Core Defect Profiles & Dual-AI Semantic Verification</strong>
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Our Dual-AI Semantic Code Review evaluates Pattern Fidelity, Anti-Hardcoding, Asymptotic Optimality, and Syntax Slip Shielding. Errors are categorized into 4 Core Defect Profiles: Off-by-One, Null/Empty Collection, Time Limit Exceeded, and State Corruption.
                  </p>
                </div>

                <div className="card" style={{ padding: "16px 20px", background: "rgba(15, 23, 42, 0.6)" }}>
                  <strong style={{ color: "#818CF8", fontSize: "0.95rem" }}>4. 4-Tier Compiler Hierarchy & 5000ms Watchdog</strong>
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Code executes in isolated browser WebAssembly sandboxes (~1ms latency) with seamless fallback to OneCompiler and JDoodle cloud judges. A strict 5000ms Watchdog timer terminates infinite loops to protect browser stability.
                  </p>
                </div>
              </div>
            </section>
          )}

          {tab === "WORKFLOW" && (
            <section>
              <div className="hero-badge">Standard Exam Lifecycle</div>
              <h3>Assessment Workflow Stages</h3>
              <ul style={{ marginTop: 16 }}>
                <li><b>1. Secure Authentication:</b> Log in with your institutional credentials or single-sign-on Google account.</li>
                <li><b>2. Mode Selection:</b> Choose between <b>AI Practice Mode</b> (self-paced LeetCode challenges with AI feedback) or <b>Official Exam Mode</b> (monitored assessments).</li>
                <li><b>3. Biometric Diagnostic Gate:</b> Before official exam delivery, verify camera permissions, single-person presence, and fullscreen enforcement.</li>
                <li><b>4. Live Supervised Session:</b> Continuous heartbeats periodically sync answers while logging visibility changes and blur events.</li>
                <li><b>5. Final Verification & Auto-Submit:</b> Answers and code are locked upon time expiry or candidate submission with server-calculated results.</li>
              </ul>
            </section>
          )}

          {tab === "RULES" && (
            <section>
              <div className="hero-badge">Candidate Code of Conduct</div>
              <h3>Crucial Rules: Practice vs. Monitored Exams</h3>
              <ul style={{ marginTop: 16 }}>
                <li><b>AI Practice Arena Mode:</b> Open environment with zero webcam restrictions. You can freely run code, test edge-cases, inspect AI feedback, and retry as many times as you like.</li>
                <li><b>Official Monitored Exam Mode:</b> Strict anti-cheat enforcement:
                  <ul style={{ marginTop: 8 }}>
                    <li><b>No Tab Switching:</b> Navigating away from the active browser tab triggers an automated infraction log to your coordinator.</li>
                    <li><b>Fullscreen Required:</b> Exiting fullscreen initiates an urgent 60-second recovery timer before auto-termination.</li>
                    <li><b>No Clipboard Interception:</b> Copying, pasting, and right-click context menus are disabled and logged during the exam.</li>
                    <li><b>Single Device Lock:</b> Logging into the same account on a second device or tab during an active session is strictly prohibited.</li>
                  </ul>
                </li>
              </ul>
            </section>
          )}

          {tab === "MALPRACTICE" && (
            <section>
              <div className="hero-badge">AI Surveillance</div>
              <h3>Automated Malpractice Detection</h3>
              <p style={{ marginBottom: 16 }}>
                ProctorX evaluates session safety during official exams using automated risk scoring calculated from on-device computer vision telemetry:
              </p>
              <ul>
                <li><b>Mobile Phone Detection:</b> Visual detection of cellular devices via the YOLO onnx model increments the risk score.</li>
                <li><b>Multiple Person Detection:</b> The presence of secondary individuals in frame raises security alerts.</li>
                <li><b>No Person in Frame:</b> Leaving the camera viewport for more than 60 seconds triggers session termination.</li>
                <li><b>Inactivity & Disconnects:</b> A maximum of 3 reconnects and 10 minutes of inactivity are permitted per session.</li>
              </ul>
            </section>
          )}

          {tab === "SECURITY" && (
            <section>
              <div className="hero-badge">Integrity Architecture</div>
              <h3>Security & Data Protection</h3>
              <ul style={{ marginTop: 16 }}>
                <li><b>100% Video Privacy:</b> Webcam feeds are processed client-side via YOLOv8 onnx in Web Workers. Raw video frames are NEVER streamed or saved to remote servers.</li>
                <li><b>CSRF Defense:</b> Double-submitted token authentication with automatic token refreshing.</li>
                <li><b>Isolated Execution:</b> Coding submissions are evaluated against server-side test case suites with strict CPU and time bounds.</li>
                <li><b>Immutable Audit Records:</b> Every warning, malpractice log, and coordinator action is permanently persisted.</li>
              </ul>
            </section>
          )}

          {tab === "NOTES" && (
            <section>
              <div className="hero-badge">Hardware & Environment</div>
              <h3>Important Technical Recommendations</h3>
              <ul style={{ marginTop: 16 }}>
                <li>Ensure a stable, continuous internet connection before launching any assessment.</li>
                <li>Do not refresh your browser during an exam — state is synchronized continuously via background progress endpoints.</li>
                <li>Use a Chromium-based browser (Google Chrome, Microsoft Edge, Brave) with hardware acceleration enabled for optimal YOLO inference.</li>
              </ul>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
