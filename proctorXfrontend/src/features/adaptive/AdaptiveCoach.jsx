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

  const handleStartTraining = async (topicKey) => {
    try {
      setStartingTopic(topicKey);
      const res = await Client.post("/adaptive/training/start", { topic: topicKey });
      navigate(`/adaptive-coach/training/${res.data.sessionId}`, {
        state: { session: res.data },
      });
    } catch (err) {
      console.error("Failed to start session:", err);
      alert("Error starting training session: " + (err.response?.data?.message || err.message));
    } finally {
      setStartingTopic(null);
    }
  };

  const getRankBadge = (val) => {
    if (val >= 0.85) return { label: "Master", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)" };
    if (val >= 0.70) return { label: "Advanced", color: "#06B6D4", bg: "rgba(6, 182, 212, 0.15)" };
    if (val >= 0.50) return { label: "Competent", color: "#6366F1", bg: "rgba(99, 102, 241, 0.15)" };
    if (val >= 0.30) return { label: "Developing", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" };
    return { label: "Novice", color: "#EC4899", bg: "rgba(236, 72, 153, 0.15)" };
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

  return (
    <AppShell title="Adaptive Coach" subtitle="AI-Driven Algorithmic Competency & Continuous Training Loop">
      <div className="adaptive-hub-container">
        {/* Header Banner */}
        <div className="adaptive-hub-header">
          <div className="adaptive-title-wrap">
            <h1>
              Adaptive DSA Coach <span className="adaptive-badge-ai">Groq AI Engine</span>
            </h1>
            <p className="adaptive-subtitle">
              Continuous diagnostic feedback loop. Solve targeted 3-question training sessions to expand your algorithmic frontier.
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
            <Link to="/adaptive-coach/diagnostic" className="btn-primary-gradient">
              Start Diagnostic Calibration →
            </Link>
          </div>
        ) : (
          <>
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
                  <span style={{ fontSize: "12px", color: "#94A3B8" }}>Hover vertices for details</span>
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
                    const displayName = bv.skill
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (l) => l.toUpperCase());

                    return (
                      <div key={bv.skill} className="behavioral-item">
                        <div className="behavioral-meta">
                          <span className="behavioral-name">{displayName}</span>
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
                    Select any competency dimension. Groq AI will generate 3 targeted problems with 3 test cases each.
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

                        <p style={{ color: "#94A3B8", fontSize: "12px", minHeight: "34px", margin: "0 0 14px", lineHeight: "1.4" }}>
                          {info.desc}
                        </p>

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
