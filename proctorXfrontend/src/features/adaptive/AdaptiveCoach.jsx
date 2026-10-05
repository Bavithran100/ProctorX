import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../shared/components/AppShell";
import Client from "../../shared/api/Client";
import CompetencyRadar from "./components/CompetencyRadar";
import "./adaptive.css";

const TOPIC_DETAILS = {
  ARRAY: { name: "Arrays & Strings", desc: "Contiguous memory, in-place transformation & prefix sums", icon: "📊" },
  HASHMAP: { name: "Hash Maps & Sets", desc: "O(1) lookups, frequency counting & anagrams", icon: "🗺️" },
  TWO_POINTER: { name: "Two Pointers", desc: "Converging bounds, fast-slow pointers & palindromes", icon: "👉👈" },
  SLIDING_WINDOW: { name: "Sliding Window", desc: "Subarray sums, maximum k-length & longest substrings", icon: "🪟" },
  SORTING: { name: "Sorting & Custom Order", desc: "Comparators, interval merging & partitions", icon: "🔢" },
  BINARY_SEARCH: { name: "Binary Search", desc: "Logarithmic space pruning & monotonic bounds", icon: "🔍" },
  STACK: { name: "Stacks & Expressions", desc: "Monotonic stacks, parenthesization & evaluation", icon: "🥞" },
  QUEUE: { name: "Queues & Deques", desc: "FIFO queues, monotonic deques & buffers", icon: "🔄" },
  TREE: { name: "Trees & BST", desc: "Recursive traversals, depth calculation & BST invariants", icon: "🌲" },
  GRAPH: { name: "Graphs & Traversal", desc: "BFS shortest path, DFS connected components & cycles", icon: "🕸️" },
  GREEDY: { name: "Greedy Algorithms", desc: "Locally optimal choices for global optima", icon: "⚡" },
  DYNAMIC_PROGRAMMING: { name: "Dynamic Programming", desc: "Recurrence relations, memoization & state space", icon: "🧩" },
};

export default function AdaptiveCoach() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingTopic, setStartingTopic] = useState(null);

  useEffect(() => {
    fetchAdaptiveData();
  }, []);

  async function fetchAdaptiveData() {
    try {
      setLoading(true);
      const [profileRes, historyRes] = await Promise.all([
        Client.get("/adaptive/profile"),
        Client.get("/adaptive/history").catch(() => ({ data: [] })),
      ]);

      setProfile(profileRes.data);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error("Failed to load adaptive coach profile:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleStartTraining = (topicKey) => {
    navigate(`/exam/adaptive_training/security?type=training&topic=${topicKey}`);
  };

  const getRankBadge = (val) => {
    if (val >= 0.85) return { label: "Master", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)" };
    if (val >= 0.70) return { label: "Advanced", color: "#06B6D4", bg: "rgba(6, 182, 212, 0.15)" };
    if (val >= 0.50) return { label: "Competent", color: "#6366F1", bg: "rgba(99, 102, 241, 0.15)" };
    if (val >= 0.30) return { label: "Developing", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" };
    return { label: "Novice", color: "#EC4899", bg: "rgba(236, 72, 153, 0.15)" };
  };

  const getTrendBadge = (trend, delta) => {
    const d = delta != null ? delta : 0;
    if (trend === "IMPROVING" || d > 0.02) {
      return { label: `+${Math.round(d * 100)}% (Improving)`, color: "#10B981", bg: "rgba(16, 185, 129, 0.15)", icon: "📈" };
    }
    if (trend === "DECLINING" || d < -0.02) {
      return { label: `${Math.round(d * 100)}% (Declining)`, color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)", icon: "📉" };
    }
    return { label: "Stable (±0%)", color: "#94A3B8", bg: "rgba(148, 163, 184, 0.12)", icon: "⚖️" };
  };

  if (loading) {
    return (
      <AppShell title="Adaptive Coach" subtitle="AI Algorithmic Training Loop">
        <div style={{ textAlign: "center", padding: "100px 0", color: "#94A3B8" }}>
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>⚡</div>
          <h3>Loading your competency vector...</h3>
        </div>
      </AppShell>
    );
  }

  const isCalibrated = profile?.diagnosticCompleted;
  const dsaVectors = profile?.dsaMasteryVector || [];
  const behavioralVectors = profile?.behavioralVector || [];
  const recommendedTopic = profile?.recommendedTopic || "ARRAY";
  const overallReadiness = Math.round((profile?.overallReadiness || 0) * 100);

  // Check if any skill has declining mastery requiring ZPD remediation
  const decliningSkill = dsaVectors.find((v) => v.trend === "DECLINING" || (v.growthDelta != null && v.growthDelta < -0.05));
  const isRemediationActive = profile?.remediationRecommended || Boolean(decliningSkill);
  const remediationTopicKey = profile?.remediationTopic || decliningSkill?.skill || recommendedTopic;

  return (
    <AppShell title="Adaptive Coach" subtitle="AI-Driven Algorithmic Competency & Continuous Training Loop">
      <div className="adaptive-hub-container">
        {/* Header Banner */}
        <div className="adaptive-hub-header">
          <div className="adaptive-title-wrap">
            <h1>
              Adaptive DSA Coach <span className="adaptive-badge-ai">BKT + IRT Bayesian Engine</span>
            </h1>
            <p className="adaptive-subtitle">
              Dynamic Zone of Proximal Development (ZPD) calibration (Flow State: P(Pass | θ) ≈ 65% – 75%). Autonomous AI proctored practice sessions.
            </p>
          </div>

          <div className="adaptive-stats-pills">
            <div className="adaptive-stat-card">
              <div className="adaptive-stat-val">{overallReadiness}%</div>
              <div className="adaptive-stat-label">Readiness</div>
            </div>
            <div className="adaptive-stat-card">
              <div className="adaptive-stat-val" style={{ color: "#818CF8" }}>
                {profile?.totalQuestionsSolved || 0}
              </div>
              <div className="adaptive-stat-label">Solved</div>
            </div>
            <div className="adaptive-stat-card">
              <div className="adaptive-stat-val" style={{ color: "#34D399" }}>
                {profile?.totalSessionsCompleted || 0}
              </div>
              <div className="adaptive-stat-label">Sessions</div>
            </div>
          </div>
        </div>

        {/* Diagnostic Gate Banner if not completed */}
        {!isCalibrated ? (
          <div className="diagnostic-gate-card">
            <div className="diagnostic-gate-info">
              <h2>Diagnostic Calibration Required</h2>
              <p>
                Take the initial 6-question diagnostic assessment (3 test cases per question) to calibrate your 17-dimension competency profile and unlock the live interactive radar chart.
              </p>
              <div className="diagnostic-meta-tags">
                <span className="diagnostic-tag">⚡ 6 Algorithmic Problems</span>
                <span className="diagnostic-tag">🧪 3 Test Cases Each</span>
                <span className="diagnostic-tag">🎯 Instant Vector Calibration</span>
              </div>
            </div>
            <Link to="/exam/adaptive_diagnostic/security?type=diagnostic" className="btn-primary-gradient">
              Start Diagnostic Calibration →
            </Link>
          </div>
        ) : (
          <>
            {/* Targeted Warmup Remediation Alert Card */}
            {isRemediationActive && (
              <div className="remediation-alert-card">
                <div className="remediation-content">
                  <div className="remediation-icon">🚨</div>
                  <div className="remediation-text">
                    <h4>Targeted Warmup Remediation Recommended</h4>
                    <p>
                      Bayesian Knowledge Tracing identified mastery regression in <strong>{TOPIC_DETAILS[remediationTopicKey]?.name || remediationTopicKey}</strong>. 
                      Dynamic ZPD calibration has tailored a rapid flow-state warmup session (calibrated difficulty targeting 65%–75% success) to reinforce core patterns.
                    </p>
                  </div>
                </div>
                <button
                  className="btn-remediation-action"
                  onClick={() => handleStartTraining(remediationTopicKey)}
                  disabled={startingTopic === remediationTopicKey}
                >
                  {startingTopic === remediationTopicKey ? "Generating Warmup..." : "Launch Warmup Session ⚡"}
                </button>
              </div>
            )}

            {/* AI Recommendation Spotlight */}
            <div className="ai-spotlight-card">
              <div className="ai-spotlight-content">
                <div className="ai-avatar-icon">🤖</div>
                <div className="ai-spotlight-text">
                  <h4>AI Recommended Focus: {TOPIC_DETAILS[recommendedTopic]?.name || recommendedTopic}</h4>
                  <p>
                    {TOPIC_DETAILS[recommendedTopic]?.desc || "Targeted algorithmic practice tailored to your weakest competency."}
                  </p>
                </div>
              </div>
              <button
                className="btn-primary-gradient"
                style={{ padding: "10px 22px", fontSize: "13px" }}
                onClick={() => handleStartTraining(recommendedTopic)}
                disabled={startingTopic === recommendedTopic}
              >
                {startingTopic === recommendedTopic ? "Launching..." : "Train Recommended Topic 🚀"}
              </button>
            </div>

            {/* Overview Grid: Competency Radar + Behavioral Vectors */}
            <div className="adaptive-overview-grid">
              {/* Left: 12-Dimension Competency Radar */}
              <div className="adaptive-card">
                <div className="adaptive-card-header">
                  <h3>
                    <span>🌐</span> 12-Dimension DSA Mastery Radar
                  </h3>
                  <span style={{ fontSize: "12px", color: "#94A3B8" }}>BKT Bayesian + IRT θ Estimates</span>
                </div>
                <div className="radar-wrapper">
                  <CompetencyRadar dsaMasteryVector={dsaVectors} size={390} />
                </div>
              </div>

              {/* Right: 5 Behavioral Vectors */}
              <div className="adaptive-card">
                <div className="adaptive-card-header">
                  <h3>
                    <span>🧠</span> Behavioral & Cognitive Dimensions
                  </h3>
                  <span style={{ fontSize: "12px", color: "#94A3B8" }}>Code Quality & Synthesis</span>
                </div>
                <div className="behavioral-list">
                  {behavioralVectors.map((bv) => {
                    const pct = Math.round((bv.mastery || 0.2) * 100);
                    const rank = getRankBadge(bv.mastery || 0.2);
                    const trendInfo = getTrendBadge(bv.trend, bv.growthDelta);
                    const displayName = bv.skill
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (l) => l.toUpperCase());

                    return (
                      <div key={bv.skill} className="behavioral-item">
                        <div className="behavioral-meta">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className="behavioral-name">{displayName}</span>
                            <span
                              className="growth-trend-pill"
                              style={{ background: trendInfo.bg, color: trendInfo.color }}
                            >
                              {trendInfo.icon} {trendInfo.label}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: rank.bg,
                                color: rank.color,
                              }}
                            >
                              {rank.label}
                            </span>
                            <span className="behavioral-val">{pct}%</span>
                          </div>
                        </div>
                        <div className="behavioral-progress-track">
                          <div
                            className="behavioral-progress-fill"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, #6366F1, ${rank.color})`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Vector Topic Selection Grid */}
            <div className="topic-grid-section">
              <div className="topic-grid-header">
                <div>
                  <h2>Choose Topic to Train</h2>
                  <p style={{ color: "#94A3B8", fontSize: "13px", margin: "4px 0 0" }}>
                    Select any competency dimension. Groq AI will generate 3 targeted problems calibrated to your ZPD frontier.
                  </p>
                </div>
                <button
                  className="btn-primary-gradient"
                  style={{ padding: "8px 18px", fontSize: "13px" }}
                  onClick={() => handleStartTraining("AUTO")}
                  disabled={startingTopic === "AUTO"}
                >
                  {startingTopic === "AUTO" ? "Generating..." : "⚡ AI Auto-Pick"}
                </button>
              </div>

              <div className="topics-container">
                {dsaVectors.map((t) => {
                  const info = TOPIC_DETAILS[t.skill] || { name: t.skill, desc: "Algorithmic competency", icon: "📌" };
                  const masteryPct = Math.round((t.mastery || 0.2) * 100);
                  const rank = getRankBadge(t.mastery || 0.2);
                  const trendInfo = getTrendBadge(t.trend, t.growthDelta);
                  const isStarting = startingTopic === t.skill;

                  return (
                    <div key={t.skill} className="topic-card">
                      <div>
                        <div className="topic-card-top">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "18px" }}>{info.icon}</span>
                            <h4 className="topic-title">{info.name}</h4>
                          </div>
                          <span
                            className="topic-badge"
                            style={{ background: rank.bg, color: rank.color }}
                          >
                            {rank.label}
                          </span>
                        </div>

                        <p style={{ color: "#94A3B8", fontSize: "12px", minHeight: "34px", margin: "0 0 10px", lineHeight: "1.4" }}>
                          {info.desc}
                        </p>

                        {/* Growth Delta & BKT Status Chips */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
                          <span
                            className="growth-trend-pill"
                            style={{ background: trendInfo.bg, color: trendInfo.color }}
                          >
                            {trendInfo.icon} {trendInfo.label}
                          </span>
                          {t.bktPrior != null && (
                            <span className="bkt-stat-chip">
                              Prior: {Math.round(t.bktPrior * 100)}%
                            </span>
                          )}
                          {t.irtTheta != null && (
                            <span className="bkt-stat-chip">
                              θ: {t.irtTheta > 0 ? "+" : ""}{t.irtTheta.toFixed(1)}
                            </span>
                          )}
                        </div>

                        <div className="topic-metric-row">
                          <span>Mastery Level</span>
                          <span className="topic-metric-val" style={{ color: rank.color }}>
                            {masteryPct}%
                          </span>
                        </div>

                        <div className="topic-progress-bar">
                          <div
                            className="topic-progress-fill"
                            style={{
                              width: `${masteryPct}%`,
                              background: `linear-gradient(90deg, #6366F1, ${rank.color})`,
                            }}
                          />
                        </div>
                      </div>

                      <button
                        className="btn-topic-train"
                        onClick={() => handleStartTraining(t.skill)}
                        disabled={isStarting}
                      >
                        {isStarting ? "Generating 3 Questions..." : "Train This Topic →"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Training History Table */}
            {history.length > 0 && (
              <div className="history-section">
                <div className="adaptive-card-header">
                  <h3>
                    <span>📜</span> Training Session History
                  </h3>
                  <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                    {history.length} completed sessions
                  </span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Target Topic</th>
                        <th>Difficulty</th>
                        <th>Score</th>
                        <th>Solved</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td>{h.startedAt ? new Date(h.startedAt).toLocaleDateString() : "—"}</td>
                          <td style={{ fontWeight: "600", color: "#38BDF8" }}>{h.targetSkill}</td>
                          <td>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "600",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: "rgba(255, 255, 255, 0.06)",
                              }}
                            >
                              {h.difficulty}
                            </span>
                          </td>
                          <td style={{ fontWeight: "700", color: h.score >= 66 ? "#34D399" : "#F8FAFC" }}>
                            {h.score}%
                          </td>
                          <td>{h.passedQuestions} / {h.totalQuestions}</td>
                          <td>
                            <span style={{ color: h.completed ? "#34D399" : "#F59E0B" }}>
                              {h.completed ? "✓ Completed" : "In Progress"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
