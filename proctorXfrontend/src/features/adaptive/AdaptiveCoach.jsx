import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../shared/components/AppShell";
import Client from "../../shared/api/Client";
import CompetencyRadar from "./components/CompetencyRadar";
import TopicRankMatrix from "./components/TopicRankMatrix";
import ErrorTaxonomyHeatmap from "./components/ErrorTaxonomyHeatmap";
import AdaptiveHistorySection from "./components/AdaptiveHistorySection";
import "./adaptive.css";

const TOPIC_DETAILS = {
  ARRAYS: { name: "Arrays & Contiguous Buffers", desc: "Memory locality, in-place partitioning & pointer scans", icon: "📊" },
  STRINGS: { name: "Strings & Substrings", desc: "Character frequency, anagrams & sliding window substrings", icon: "🔤" },
  HASHING: { name: "Hashing & Sets", desc: "O(1) lookups, hash set deduplication & frequency mapping", icon: "🗺️" },
  LINKED_LISTS: { name: "Linked Lists", desc: "Pointer manipulation, fast-slow cycles & list reversals", icon: "🔗" },
  STACKS: { name: "Stacks & Expressions", desc: "Monotonic stacks, parenthesization & postfix evaluations", icon: "🥞" },
  QUEUES: { name: "Queues & Deques", desc: "FIFO ordering, BFS buffers & monotonic sliding deques", icon: "🔄" },
  TREES: { name: "Trees & Binary Search Trees", desc: "Tree traversals, height computation & BST invariants", icon: "🌲" },
  GRAPHS: { name: "Graphs & Networks", desc: "BFS shortest path, DFS connected components & topological sorting", icon: "🕸️" },
  GREEDY: { name: "Greedy Algorithms", desc: "Locally optimal sub-choices for global optimal proofs", icon: "⚡" },
  BACKTRACKING: { name: "Backtracking & Recursion", desc: "Combinations, permutations, N-Queens & constraint pruning", icon: "🔙" },
  DYNAMIC_PROGRAMMING: { name: "Dynamic Programming", desc: "Recurrence state spaces, memoization & subproblem overlap", icon: "🧩" },
  BINARY_SEARCH: { name: "Binary Search", desc: "Logarithmic space pruning & monotonic boundary discovery", icon: "🔍" },
};

const PATTERN_DETAILS = {
  TWO_POINTERS: { name: "Two Pointers", desc: "Opposite ends, fast-slow collision & window bounding", icon: "👉👈" },
  SLIDING_WINDOW: { name: "Sliding Window", desc: "Dynamic subarray/substring expansion & contraction", icon: "🪟" },
  PREFIX_SUM: { name: "Prefix Sum & Difference Arrays", desc: "O(1) range queries, running sums & frequency balance", icon: "➕" },
  BINARY_SEARCH_PATTERN: { name: "Binary Search Pattern", desc: "Search on answer space & boundary predicates", icon: "🎯" },
  DFS: { name: "Depth First Search (DFS)", desc: "Recursion state exploration, connected components & cycle detection", icon: "🌲" },
  BFS: { name: "Breadth First Search (BFS)", desc: "Layered queue shortest paths & multi-source level traversal", icon: "🌊" },
  MONOTONIC_STACK: { name: "Monotonic Stack / Queue", desc: "Next Greater Element, largest rectangle & window extrema", icon: "🥞" },
  HEAP: { name: "Heap / Priority Queue", desc: "Top-K elements, streaming medians & greedy task scheduling", icon: "🏔️" },
  UNION_FIND: { name: "Union Find (Disjoint Set)", desc: "Dynamic connectivity, Kruskal MST & cycle checks in graphs", icon: "🔗" },
};

function getDimensionInfo(key) {
  if (TOPIC_DETAILS[key]) return { ...TOPIC_DETAILS[key], type: "CONCEPT" };
  if (PATTERN_DETAILS[key]) return { ...PATTERN_DETAILS[key], type: "PATTERN" };
  return {
    name: key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
    desc: "Targeted algorithmic training dimension",
    icon: "⚡",
    type: "SKILL"
  };
}

export default function AdaptiveCoach() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [totalHistoryCount, setTotalHistoryCount] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [activeCountdown, setActiveCountdown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startingTopic, setStartingTopic] = useState(null);
  const [activeRadarTab, setActiveRadarTab] = useState("concept"); // "concept" | "pattern" | "ranks" | "errors" | "history"

  useEffect(() => {
    fetchAdaptiveData();
  }, []);

  useEffect(() => {
    if (!activeSession || activeCountdown <= 0) return;
    const timer = setInterval(() => {
      setActiveCountdown((prev) => {
        if (prev <= 1) {
          setActiveSession(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession, activeCountdown]);

  async function fetchAdaptiveData() {
    try {
      setLoading(true);
      const [profileRes, historyRes, activeRes] = await Promise.all([
        Client.get("/adaptive/profile"),
        Client.get("/adaptive/history?limit=10&offset=0").catch(() => ({ data: { history: [], totalCount: 0, hasMore: false } })),
        Client.get("/adaptive/active-session").catch(() => ({ data: { hasActiveSession: false } })),
      ]);

      setProfile(profileRes.data);
      
      const historyPayload = historyRes.data;
      const historyList = Array.isArray(historyPayload)
        ? historyPayload
        : (historyPayload?.history || []);
      const totalCount = historyPayload?.totalCount != null
        ? historyPayload.totalCount
        : historyList.length;
      const hasMore = historyPayload?.hasMore != null
        ? historyPayload.hasMore
        : false;

      setHistory(historyList);
      setTotalHistoryCount(totalCount);
      setHasMoreHistory(hasMore);

      if (activeRes.data && activeRes.data.sessionId) {
        setActiveSession(activeRes.data);
        setActiveCountdown(activeRes.data.remainingSeconds || 1800);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Failed to load adaptive coach profile:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleLoadMoreHistory = async () => {
    if (loadingMoreHistory || !hasMoreHistory) return;
    try {
      setLoadingMoreHistory(true);
      const res = await Client.get(`/adaptive/history?limit=10&offset=${history.length}`);
      const payload = res.data;
      const newItems = Array.isArray(payload) ? payload : (payload?.history || []);
      
      setHistory((prev) => [...prev, ...newItems]);
      setHasMoreHistory(payload?.hasMore != null ? payload.hasMore : false);
      if (payload?.totalCount != null) setTotalHistoryCount(payload.totalCount);
    } catch (err) {
      console.error("Failed to load more history:", err);
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  const handleStartTraining = (topicKey) => {
    setStartingTopic(topicKey);
    navigate(`/exam/adaptive_training/security?type=training&topic=${topicKey}`);
  };

  const handleDiscardActiveSession = async () => {
    if (!activeSession) return;
    try {
      await Client.post("/adaptive/training/discard", { sessionId: activeSession.sessionId });
      setActiveSession(null);
      fetchAdaptiveData();
    } catch (err) {
      console.error("Failed to discard session:", err);
    }
  };

  function formatTimer(sec = 0) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

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
          <h3>Loading your multi-layer competency vector...</h3>
        </div>
      </AppShell>
    );
  }

  const isCalibrated = profile?.diagnosticCompleted;
  const dsaVectors = profile?.dsaMasteryVector || [];
  const behavioralVectors = profile?.behavioralVector || [];
  const conceptMastery = profile?.conceptMastery || {};
  const patternMastery = profile?.patternMastery || {};
  const codingCompetencies = profile?.codingCompetencies || {};
  const errorProfile = profile?.errorProfile || {};
  const topicRanks = profile?.topicRanks || [];
  const historyStats = profile?.history || {};

  const recommendedTopic = profile?.recommendedTopic || "ARRAYS";
  const recommendedType = profile?.recommendedType || "CONCEPT";
  const remediationReason = profile?.remediationReason || "";
  const isRemediationActive = profile?.isRemediationRecommended;
  const recommendedConcepts = profile?.recommendedConcepts || [];
  const recommendedPatterns = profile?.recommendedPatterns || [];
  const nextFocusAreas = profile?.nextFocusAreas || [];

  const overallReadiness = Math.round((profile?.overallReadiness || 0) * 100);
  const recInfo = getDimensionInfo(recommendedTopic);

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
              Multi-Layer Competency Vector: 12 Core Concepts • 9 Algorithmic Patterns • 5 Engineering Traits • 9 Error Risk Profiles.
            </p>
          </div>

          <div className="adaptive-stats-pills">
            <div className="adaptive-stat-card">
              <div className="adaptive-stat-val">{overallReadiness}%</div>
              <div className="adaptive-stat-label">Readiness</div>
            </div>
            <div className="adaptive-stat-card">
              <div className="adaptive-stat-val" style={{ color: "#818CF8" }}>
                {historyStats.questionsSolved || profile?.totalQuestionsSolved || 0}
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

        {/* Active Resumable Session Banner (30-Minute Grace Window & 3 Re-entries) */}
        {activeSession && activeSession.sessionId && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(6, 182, 212, 0.16) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.45)",
              borderRadius: "18px",
              padding: "20px 26px",
              marginBottom: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "18px",
              boxShadow: "0 10px 30px rgba(16, 185, 129, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #10B981 0%, #06B6D4 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  color: "white",
                  boxShadow: "0 6px 18px rgba(16, 185, 129, 0.35)",
                  flexShrink: 0,
                }}
              >
                🔄
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "rgba(16, 185, 129, 0.25)",
                      color: "#34D399",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    ACTIVE TRAINING SESSION IN PROGRESS
                  </span>
                  <span style={{ fontSize: "12px", color: "#38BDF8", fontWeight: "600" }}>
                    ⏳ 30-Min Grace Window: <strong>{formatTimer(activeCountdown)}</strong> remaining
                  </span>
                </div>
                <h4 style={{ margin: "0 0 4px", fontSize: "17px", color: "#F8FAFC" }}>
                  {getDimensionInfo(activeSession.targetSkill).name} ({activeSession.difficulty})
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#CBD5E1" }}>
                  Reconnects used: <strong>{activeSession.reconnectCount} of 3 attempts</strong>. Your code drafts are cached in local memory.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                className="btn-primary-gradient"
                style={{
                  padding: "11px 22px",
                  fontSize: "13px",
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  whiteSpace: "nowrap",
                }}
                onClick={() => navigate(`/exam/adaptive_training/security?type=training&topic=${activeSession.targetSkill}&sessionId=${activeSession.sessionId}&resume=true`)}
              >
                Resume Session 🔄
              </button>
              <button
                type="button"
                style={{
                  padding: "11px 18px",
                  fontSize: "13px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#F87171",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
                onClick={handleDiscardActiveSession}
              >
                Discard ✕
              </button>
            </div>
          </div>
        )}

        {/* Diagnostic Gate Banner if not completed */}
        {!isCalibrated ? (
          <div className="diagnostic-gate-card">
            <div className="diagnostic-gate-info">
              <h2>Diagnostic Calibration Required</h2>
              <p>
                Take the initial 6-question diagnostic assessment (3 test cases each) to mathematically calibrate your multi-layer competency vector, algorithmic patterns, and initial League Ranks.
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
            {/* AI Master Vector Recommendation Spotlight Card */}
            <div
              className="ai-spotlight-card"
              style={{
                border: isRemediationActive ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(6, 182, 212, 0.35)",
                background: isRemediationActive
                  ? "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(99, 102, 241, 0.15) 100%)"
                  : "linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.15) 100%)",
              }}
            >
              <div className="ai-spotlight-content" style={{ flex: 1 }}>
                <div
                  className="ai-avatar-icon"
                  style={{
                    background: isRemediationActive
                      ? "linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)"
                      : "linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)",
                  }}
                >
                  {recInfo.icon}
                </div>
                <div className="ai-spotlight-text" style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: recommendedType === "PATTERN" ? "rgba(168, 85, 247, 0.2)" : "rgba(6, 182, 212, 0.2)",
                        color: recommendedType === "PATTERN" ? "#C084FC" : "#38BDF8",
                        border: recommendedType === "PATTERN" ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid rgba(6, 182, 212, 0.4)",
                      }}
                    >
                      {recommendedType === "PATTERN" ? "AI RECOMMENDED PATTERN" : "AI RECOMMENDED CONCEPT"}
                    </span>
                    {isRemediationActive && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: "rgba(239, 68, 68, 0.2)",
                          color: "#F87171",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                        }}
                      >
                        🚨 URGENT PRIORITY
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: "18px", margin: "0 0 6px" }}>
                    {recInfo.name}
                  </h4>
                  <p style={{ color: "#CBD5E1", fontSize: "13px", lineHeight: "1.5", margin: 0 }}>
                    {remediationReason || recInfo.desc}
                  </p>
                </div>
              </div>
              <button
                className="btn-primary-gradient"
                style={{
                  padding: "12px 24px",
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                  background: isRemediationActive
                    ? "linear-gradient(135deg, #DC2626 0%, #EA580C 100%)"
                    : "linear-gradient(135deg, #0284C7 0%, #4F46E5 100%)",
                }}
                onClick={() => handleStartTraining(recommendedTopic)}
                disabled={startingTopic === recommendedTopic}
              >
                {startingTopic === recommendedTopic
                  ? "Launching Session..."
                  : `Train Recommended ${recommendedType === "PATTERN" ? "Pattern" : "Concept"} 🚀`}
              </button>
            </div>

            {/* Master Vector Next Focus Quick Cards */}
            {nextFocusAreas.length > 1 && (
              <div style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "700" }}>
                    🎯 Master Vector Recommended Focus Queue
                  </h4>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>Based on Deficits, Bayesian Regression & Error Taxonomy</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                  {nextFocusAreas.slice(0, 4).map((item) => {
                    const itemInfo = getDimensionInfo(item.topic);
                    const masteryPct = Math.round((item.mastery || 0.2) * 100);
                    const rank = getRankBadge(item.mastery || 0.2);

                    return (
                      <div
                        key={item.topic}
                        style={{
                          background: "rgba(30, 41, 59, 0.6)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "18px" }}>{itemInfo.icon}</span>
                            <div>
                              <div style={{ fontSize: "13px", fontWeight: "700", color: "#F8FAFC" }}>{itemInfo.name}</div>
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: "700",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  background: item.type === "PATTERN" ? "rgba(168, 85, 247, 0.18)" : "rgba(6, 182, 212, 0.18)",
                                  color: item.type === "PATTERN" ? "#C084FC" : "#38BDF8",
                                }}
                              >
                                {item.type}
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: rank.color }}>
                            {masteryPct}%
                          </span>
                        </div>

                        <p style={{ fontSize: "11px", color: "#94A3B8", margin: 0, lineHeight: "1.4" }}>
                          {item.reason}
                        </p>

                        <button
                          type="button"
                          className="btn-topic-train"
                          style={{ padding: "6px 0", fontSize: "12px" }}
                          onClick={() => handleStartTraining(item.topic)}
                          disabled={startingTopic === item.topic}
                        >
                          {startingTopic === item.topic ? "Starting..." : `Train ${item.type === "PATTERN" ? "Pattern" : "Concept"} ⚡`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Multi-Layer Competency Vector Navigation Tabs */}
            <div style={{ display: "flex", gap: "10px", margin: "24px 0 16px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`step-tab-btn ${activeRadarTab === "concept" ? "active" : ""}`}
                onClick={() => setActiveRadarTab("concept")}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px" }}
              >
                <span>🌐</span> 12 Core Concepts Radar
              </button>
              <button
                type="button"
                className={`step-tab-btn ${activeRadarTab === "pattern" ? "active" : ""}`}
                onClick={() => setActiveRadarTab("pattern")}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px" }}
              >
                <span>⚡</span> 9 Algorithmic Patterns
              </button>
              <button
                type="button"
                className={`step-tab-btn ${activeRadarTab === "ranks" ? "active" : ""}`}
                onClick={() => setActiveRadarTab("ranks")}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px" }}
              >
                <span>🏆</span> Topic League Ranks & XP
              </button>
              <button
                type="button"
                className={`step-tab-btn ${activeRadarTab === "errors" ? "active" : ""}`}
                onClick={() => setActiveRadarTab("errors")}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px" }}
              >
                <span>🐛</span> Error Taxonomy Risk Profiler
              </button>
              <button
                type="button"
                className={`step-tab-btn ${activeRadarTab === "history" ? "active" : ""}`}
                onClick={() => setActiveRadarTab("history")}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "13px" }}
              >
                <span>📜</span> Exam History & Field Shifts ({history.length})
              </button>
            </div>

            {/* Active View Container */}
            {activeRadarTab === "concept" && (
              <div className="adaptive-overview-grid">
                {/* Left: 12-Dimension Concept Radar */}
                <div className="adaptive-card">
                  <div className="adaptive-card-header">
                    <h3>
                      <span>🌐</span> 12-Dimension DSA Mastery Radar
                    </h3>
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>BKT Bayesian + IRT θ Estimates</span>
                  </div>
                  <div className="radar-wrapper">
                    <CompetencyRadar
                      conceptMasteryMap={conceptMastery}
                      dsaMasteryVector={dsaVectors}
                      mode="concept"
                      size={390}
                    />
                  </div>
                </div>

                {/* Right: 5 Coding Competencies */}
                <div className="adaptive-card">
                  <div className="adaptive-card-header">
                    <h3>
                      <span>🧠</span> Engineering & Cognitive Competencies
                    </h3>
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>Execution & Synthesis</span>
                  </div>
                  <div className="behavioral-list">
                    {Object.entries(codingCompetencies).map(([k, val]) => {
                      const pct = Math.round((val || 0.2) * 100);
                      const rank = getRankBadge(val || 0.2);
                      const displayName = k.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

                      return (
                        <div key={k} className="behavioral-item">
                          <div className="behavioral-meta">
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "700", color: "#F8FAFC" }}>
                                {displayName}
                              </span>
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: rank.bg,
                                  color: rank.color,
                                  fontWeight: "700"
                                }}
                              >
                                {rank.label}
                              </span>
                            </div>
                            <span style={{ fontSize: "13px", fontWeight: "700", color: rank.color }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="behavioral-progress-bg">
                            <div
                              className="behavioral-progress-fill"
                              style={{ width: `${pct}%`, background: `linear-gradient(90deg, #6366F1, ${rank.color})` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeRadarTab === "pattern" && (
              <div className="adaptive-overview-grid">
                {/* Left: 9-Pattern Radar */}
                <div className="adaptive-card">
                  <div className="adaptive-card-header">
                    <h3>
                      <span>⚡</span> 9 Algorithmic Pattern Mastery Radar
                    </h3>
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>Two Pointers, Sliding Window, Monotonic Stack...</span>
                  </div>
                  <div className="radar-wrapper">
                    <CompetencyRadar
                      patternMasteryMap={patternMastery}
                      mode="pattern"
                      size={390}
                    />
                  </div>
                </div>

                {/* Right: Pattern Cards List with Direct Training Controls */}
                <div className="adaptive-card">
                  <div className="adaptive-card-header">
                    <h3>
                      <span>🧩</span> Algorithmic Pattern Competencies
                    </h3>
                    <span style={{ fontSize: "12px", color: "#94A3B8" }}>Train Pattern Directly</span>
                  </div>
                  <div className="behavioral-list">
                    {Object.entries(patternMastery).map(([k, val]) => {
                      const pct = Math.round((val || 0.2) * 100);
                      const rank = getRankBadge(val || 0.2);
                      const info = PATTERN_DETAILS[k] || { name: k, desc: "", icon: "⚡" };

                      return (
                        <div key={k} className="behavioral-item" style={{ background: "rgba(15, 23, 42, 0.4)", padding: "10px 14px", borderRadius: "10px" }}>
                          <div className="behavioral-meta" style={{ marginBottom: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "16px" }}>{info.icon}</span>
                              <div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#F8FAFC" }}>
                                  {info.name}
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748B" }}>
                                  {info.desc}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "700", color: rank.color }}>
                                {pct}%
                              </span>
                              <button
                                type="button"
                                className="btn-topic-train"
                                style={{ width: "auto", padding: "4px 12px", fontSize: "11px" }}
                                onClick={() => handleStartTraining(k)}
                                disabled={startingTopic === k}
                              >
                                {startingTopic === k ? "Starting..." : "Train ⚡"}
                              </button>
                            </div>
                          </div>
                          <div className="behavioral-progress-bg">
                            <div
                              className="behavioral-progress-fill"
                              style={{ width: `${pct}%`, background: `linear-gradient(90deg, #A855F7, ${rank.color})` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeRadarTab === "ranks" && (
              <div className="adaptive-card" style={{ marginTop: "10px" }}>
                <TopicRankMatrix
                  topicRanks={topicRanks}
                  patternRanks={profile?.patternRanks || []}
                  onSelectTopic={handleStartTraining}
                />
              </div>
            )}

            {activeRadarTab === "errors" && (
              <div className="adaptive-card" style={{ marginTop: "10px" }}>
                <ErrorTaxonomyHeatmap
                  errorProfile={errorProfile}
                />
              </div>
            )}

            {activeRadarTab === "history" && (
              <div className="adaptive-card" style={{ marginTop: "10px", padding: "24px" }}>
                <AdaptiveHistorySection
                  history={history}
                  totalCount={totalHistoryCount}
                  hasMore={hasMoreHistory}
                  loadingMore={loadingMoreHistory}
                  onLoadMore={handleLoadMoreHistory}
                  onRetrainTopic={handleStartTraining}
                />
              </div>
            )}

            {/* Targeted Skill Breakdown Cards */}
            <div className="adaptive-section" style={{ marginTop: "32px" }}>
              <div className="section-title-wrap">
                <h2>DSA Concept Mastery & Training Launchpad</h2>
                <p>Select any concept to launch an AI proctored 3-question adaptive calibration session</p>
              </div>

              <div className="skills-grid">
                {Object.entries(TOPIC_DETAILS).map(([topicKey, details]) => {
                  const masteryVal = conceptMastery[topicKey] || 0.20;
                  const rank = getRankBadge(masteryVal);
                  const trendInfo = getTrendBadge("STABLE", 0.0);
                  const isRecommended = topicKey === recommendedTopic;

                  return (
                    <div
                      key={topicKey}
                      className={`skill-card ${isRecommended ? "recommended" : ""}`}
                    >
                      {isRecommended && <div className="recommended-ribbon">AI Recommended Focus</div>}

                      <div className="skill-card-top">
                        <span className="skill-icon">{details.icon}</span>
                        <div className="skill-meta-tags">
                          <span
                            className="skill-rank-badge"
                            style={{ background: rank.bg, color: rank.color }}
                          >
                            {rank.label}
                          </span>
                          <span
                            className="trend-badge"
                            style={{ background: trendInfo.bg, color: trendInfo.color, display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <span>{trendInfo.icon}</span> {trendInfo.label}
                          </span>
                        </div>
                      </div>

                      <h3 className="skill-card-title">{details.name}</h3>
                      <p className="skill-card-desc">{details.desc}</p>

                      <div className="mastery-meter-wrap">
                        <div className="meter-labels">
                          <span>BKT Mastery</span>
                          <span style={{ fontWeight: "700", color: rank.color }}>
                            {Math.round(masteryVal * 100)}%
                          </span>
                        </div>
                        <div className="meter-bar-bg">
                          <div
                            className="meter-bar-fill"
                            style={{
                              width: `${Math.round(masteryVal * 100)}%`,
                              background: `linear-gradient(90deg, #6366F1, ${rank.color})`,
                            }}
                          />
                        </div>
                      </div>

                      <button
                        className={`btn-train ${isRecommended ? "primary" : ""}`}
                        onClick={() => handleStartTraining(topicKey)}
                        disabled={startingTopic === topicKey}
                      >
                        {startingTopic === topicKey ? "Launching..." : `Train ${details.name} →`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Permanent Bottom Audit Log & History Timeline */}
            {activeRadarTab !== "history" && (
              <AdaptiveHistorySection
                history={history}
                totalCount={totalHistoryCount}
                hasMore={hasMoreHistory}
                loadingMore={loadingMoreHistory}
                onLoadMore={handleLoadMoreHistory}
                onRetrainTopic={handleStartTraining}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
