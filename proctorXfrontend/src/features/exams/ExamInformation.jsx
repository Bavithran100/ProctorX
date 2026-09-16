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
          <TabButton id="WORKFLOW" label="Exam Workflow" activeTab={tab} onChange={setTab} />
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
                <b>ProctorX</b> is an enterprise assessment platform purpose-built for accredited universities, coding bootcamps, and technical organizations. It guarantees examination integrity through lightweight on-device AI supervision, deterministic server-side grading, and real-time coordinator interventions.
              </p>
              <div className="summary-grid" style={{ marginTop: 24 }}>
                <div className="card summary-card">
                  <span>Anti-Cheating Core</span>
                  <strong>Client-Side YOLO</strong>
                  <p className="helper-text">Detects phones and multiple individuals without sending raw video feeds over the network.</p>
                </div>
                <div className="card summary-card">
                  <span>Interactive IDE</span>
                  <strong>Zero-Config Java</strong>
                  <p className="helper-text">Run testcases against an isolated compilation environment in real time.</p>
                </div>
                <div className="card summary-card">
                  <span>Tamper Defense</span>
                  <strong>Single-Session Token</strong>
                  <p className="helper-text">Prevents concurrent logins, duplicate submissions, and client-side clock alterations.</p>
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
                <li><b>2. Timed Window Check:</b> Assessment entry buttons activate strictly within the published start and end times.</li>
                <li><b>3. Biometric Diagnostic Gate:</b> Before question delivery, verify camera permissions, single-person presence, and fullscreen enforcement.</li>
                <li><b>4. Live Supervised Session:</b> Continuous heartbeats periodically sync answers while logging visibility changes and blur events.</li>
                <li><b>5. Final Verification & Auto-Submit:</b> Answers are locked upon time expiry or candidate submission with server-calculated results.</li>
              </ul>
            </section>
          )}

          {tab === "RULES" && (
            <section>
              <div className="hero-badge">Candidate Code of Conduct</div>
              <h3>Crucial Exam Rules</h3>
              <ul style={{ marginTop: 16 }}>
                <li><b>No Tab Switching:</b> Navigating away from the active browser tab triggers an automated infraction log to your coordinator.</li>
                <li><b>Fullscreen Required:</b> Exiting fullscreen initiates an urgent 60-second recovery timer before auto-termination.</li>
                <li><b>No Clipboard Interception:</b> Copying, pasting, and right-click context menus are disabled and logged during the exam.</li>
                <li><b>One Attempt Rule:</b> Once an examination is submitted or terminated, the session is irreversibly closed.</li>
              </ul>
            </section>
          )}

          {tab === "MALPRACTICE" && (
            <section>
              <div className="hero-badge">AI Surveillance</div>
              <h3>Automated Malpractice Detection</h3>
              <p style={{ marginBottom: 16 }}>
                ProctorX evaluates session safety using automated risk scoring calculated from the following telemetry points:
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
