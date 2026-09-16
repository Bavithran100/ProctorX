import React from "react";
import { motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Logo from "../../shared/components/Logo";
import "../../App.css";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
};

const features = [
  ["01", "Live Session Supervision", "Track real-time candidate status, heartbeats, tab switches, and integrity signals with automated risk scoring."],
  ["02", "Dual Assessment Engines", "Conduct high-throughput multiple choice tests alongside full-featured interactive coding assessments."],
  ["03", "Precision Proctoring", "In-browser YOLO AI model detecting multi-person presence, mobile phones, and fullscreen violations without streaming video to servers."],
  ["04", "Comprehensive Audit Trails", "Transparent dispute resolution with timestamped malpractice logs and coordinator intervention histories."]
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <header className="landing-nav">
        <Logo size="md" />
        <div className="landing-nav-links">
          <a href="#platform">Platform</a>
          <a href="#security">Security</a>
          <a href="#trust">Trust</a>
          <button className="nav-login" onClick={() => navigate("/login")}>
            Sign In
          </button>
          <button className="nav-cta" onClick={() => navigate("/register")}>
            Get Started
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="landing-hero">
          <Motion.div className="landing-hero-copy" {...fadeUp}>
            <div className="hero-badge">
              <span className="badge-dot" /> High-Integrity Assessment Infrastructure
            </div>
            <h1>Exams run better when trust is built in.</h1>
            <p>
              ProctorX delivers a unified, developer-grade workspace to author,
              deliver, proctor, and evaluate online assessments with absolute confidence.
            </p>
            <div className="hero-actions">
              <button className="btn" onClick={() => navigate("/login")}>
                Enter Workspace <span>→</span>
              </button>
              <button className="ghost-btn" onClick={() => navigate("/register")}>
                Coordinator Access
              </button>
            </div>
            <div className="hero-proof">
              <span><b>Live</b> AI Proctoring</span>
              <span><b>Integrated</b> Code Judge</span>
              <span><b>Deterministic</b> Scoring</span>
            </div>
          </Motion.div>

          {/* Interactive Dashboard Mockup Preview */}
          <Motion.div
            className="dashboard-preview"
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="preview-topbar">
              <Logo size="sm" showText={false} />
              <div className="preview-user">Live Mission Control — Coordinator Hub</div>
            </div>
            <div className="preview-layout">
              <aside className="preview-sidebar">
                <span className="active">Overview</span>
                <span>Examinations</span>
                <span>Control Room</span>
                <span>Audit Logs</span>
              </aside>
              <div className="preview-main">
                <div className="preview-heading">
                  <div>
                    <small style={{ color: "#94A3B8" }}>Session Telemetry</small>
                    <h3 style={{ fontSize: "1.1rem" }}>Active Assessment Rounds</h3>
                  </div>
                  <span className="live-chip"><i /> 14 Active</span>
                </div>
                <div className="preview-stats">
                  <div>
                    <span>Active Candidates</span>
                    <strong>164</strong>
                    <small>Across 4 exams</small>
                  </div>
                  <div>
                    <span>Integrity Index</span>
                    <strong>99.2%</strong>
                    <small>Normal activity</small>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>3,820</strong>
                    <small>All time</small>
                  </div>
                </div>
                <div className="preview-table">
                  <div className="preview-row preview-labels">
                    <span>Assessment</span>
                    <span>Attendance</span>
                    <span>Status</span>
                  </div>
                  <div className="preview-row">
                    <span>Advanced Data Structures</span>
                    <span>54 / 56</span>
                    <span className="status-chip approved">Live</span>
                  </div>
                  <div className="preview-row">
                    <span>Full-Stack Java Systems</span>
                    <span>42 / 42</span>
                    <span className="status-chip approved">Live</span>
                  </div>
                  <div className="preview-row">
                    <span>Algorithms & Complexity</span>
                    <span>68 / 70</span>
                    <span className="status-chip pending">Supervising</span>
                  </div>
                </div>
              </div>
            </div>
          </Motion.div>
        </section>

        {/* Feature Strip */}
        <section className="logo-strip" aria-label="Platform capabilities">
          <span>AI-POWERED PROCTORING</span>
          <span>BROWSER-LEVEL ENFORCEMENT</span>
          <span>INTEGRATED CODE COMPILER</span>
          <span>INSTANT RESULTS PIPELINE</span>
        </section>

        {/* Platform Overview */}
        <section id="platform" className="landing-section">
          <Motion.div className="section-intro" {...fadeUp}>
            <div className="eyebrow">Enterprise Ready</div>
            <h2>An intelligent operating system for assessments.</h2>
            <p>From question generation to instant auto-scoring, every stakeholder operates in a focused environment.</p>
          </Motion.div>
          <div className="landing-feature-grid">
            {features.map(([number, title, description], index) => (
              <Motion.article
                key={title}
                className="landing-feature-card"
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.08 }}
              >
                <span className="feature-number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </Motion.article>
            ))}
          </div>
        </section>

        {/* Trust & Stats */}
        <section id="trust" className="landing-section">
          <Motion.div className="section-intro" {...fadeUp}>
            <div className="eyebrow">Proven Reliability</div>
            <h2>Precision metrics built for high-stakes evaluations.</h2>
          </Motion.div>
          <Motion.div className="landing-stats" {...fadeUp}>
            <div>
              <strong>3</strong>
              <span>Dedicated Role Workspaces</span>
            </div>
            <div>
              <strong>5s</strong>
              <span>Live Control Room Telemetry</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>On-Device Video Privacy</span>
            </div>
          </Motion.div>
        </section>

        {/* Call to Action */}
        <section className="landing-section">
          <Motion.div className="landing-cta" {...fadeUp}>
            <div>
              <div className="eyebrow">Ready for High-Stakes Assessments</div>
              <h2>Elevate your examination integrity today.</h2>
              <p>Sign in to your candidate dashboard or request coordinator onboarding.</p>
            </div>
            <div className="hero-actions" style={{ margin: 0 }}>
              <button className="btn" onClick={() => navigate("/login")}>
                Sign In to Workspace
              </button>
              <button className="ghost-btn" onClick={() => navigate("/register")}>
                Register as Coordinator
              </button>
            </div>
          </Motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <Logo size="sm" />
        <span>© {new Date().getFullYear()} ProctorX Systems. All rights reserved.</span>
      </footer>
    </div>
  );
}
