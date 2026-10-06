import React, { useState, useMemo } from "react";

const TOPIC_ICONS = {
  ARRAYS: "📊",
  STRINGS: "🔤",
  HASHING: "🗺️",
  LINKED_LISTS: "🔗",
  STACKS: "🥞",
  QUEUES: "🔄",
  TREES: "🌲",
  GRAPHS: "🕸️",
  GREEDY: "⚡",
  BACKTRACKING: "🔙",
  DYNAMIC_PROGRAMMING: "🧩",
  BINARY_SEARCH: "🔍",
  TWO_POINTERS: "👉👈",
  SLIDING_WINDOW: "🪟",
  PREFIX_SUM: "➕",
  BINARY_SEARCH_PATTERN: "🎯",
  DFS: "🌲",
  BFS: "🌊",
  MONOTONIC_STACK: "🥞",
  HEAP: "🏔️",
  UNION_FIND: "🔗",
  DIAGNOSTIC: "⭐",
  AUTO: "🤖",
};

export default function AdaptiveHistorySection({
  history = [],
  totalCount = null,
  hasMore = false,
  loadingMore = false,
  onLoadMore = null,
  onRetrainTopic = null,
}) {
  const [filterTopic, setFilterTopic] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterTrend, setFilterTrend] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVectors, setExpandedVectors] = useState({});

  const toggleVectorExpand = (id) => {
    setExpandedVectors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate summary metrics across loaded history
  const metrics = useMemo(() => {
    const totalSessions = history.length;
    let totalQuestionsAttempted = 0;
    let totalQuestionsSolved = 0;
    let totalTestCasesPassed = 0;
    let totalTestCasesTotal = 0;
    let sumScore = 0;
    let netDelta = 0;
    let malpracticeCount = 0;

    history.forEach((h) => {
      totalQuestionsAttempted += h.totalQuestions || 3;
      totalQuestionsSolved += h.passedQuestions || 0;
      totalTestCasesPassed += h.totalTestCasesPassed || 0;
      totalTestCasesTotal += h.totalTestCasesTotal || 0;
      sumScore += h.score || 0;
      netDelta += (h.masteryDelta != null ? h.masteryDelta : 0);
      if (h.status === "TERMINATED_MALPRACTICE") malpracticeCount++;
    });

    const avgScore = totalSessions > 0 ? Math.round(sumScore / totalSessions) : 0;
    const solveRate = totalQuestionsAttempted > 0 ? Math.round((totalQuestionsSolved / totalQuestionsAttempted) * 100) : 0;

    return {
      totalSessions,
      totalQuestionsAttempted,
      totalQuestionsSolved,
      totalTestCasesPassed,
      totalTestCasesTotal,
      avgScore,
      solveRate,
      malpracticeCount,
      netDelta: Math.round(netDelta * 100) / 100
    };
  }, [history]);

  // Unique topics list for filter dropdown
  const uniqueTopics = useMemo(() => {
    const set = new Set();
    history.forEach((h) => {
      if (h.targetSkill) set.add(h.targetSkill.toUpperCase());
    });
    return Array.from(set);
  }, [history]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const topic = (item.targetSkill || "").toUpperCase();
      const status = (item.status || (item.completed ? "COMPLETED" : "IN_PROGRESS")).toUpperCase();
      const trend = (item.recentTrend || (item.masteryDelta > 0 ? "IMPROVING" : item.masteryDelta < 0 ? "DECLINING" : "STABLE")).toUpperCase();
      const learningObj = (item.learningObjective || "").toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      if (filterTopic !== "ALL" && topic !== filterTopic) return false;
      if (filterStatus !== "ALL" && status !== filterStatus) return false;
      if (filterTrend === "IMPROVING" && !(item.masteryDelta > 0 || trend === "IMPROVING")) return false;
      if (filterTrend === "DECLINING" && !(item.masteryDelta < 0 || trend === "DECLINING")) return false;
      if (filterTrend === "STABLE" && item.masteryDelta !== 0 && trend !== "STABLE") return false;

      if (query && !topic.includes(query) && !learningObj.includes(query) && !status.includes(query)) return false;

      return true;
    });
  }, [history, filterTopic, filterStatus, filterTrend, searchQuery]);

  const formatSessionDate = (dateStr) => {
    if (!dateStr) return "Recent Session";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getDifficultyColor = (diff) => {
    const d = (diff || "MEDIUM").toUpperCase();
    if (d === "EASY") return { bg: "rgba(16, 185, 129, 0.15)", color: "#34D399", border: "rgba(16, 185, 129, 0.3)" };
    if (d === "HARD") return { bg: "rgba(244, 63, 94, 0.15)", color: "#FB7185", border: "rgba(244, 63, 94, 0.3)" };
    if (d === "VARIABLE") return { bg: "rgba(168, 85, 247, 0.15)", color: "#C084FC", border: "rgba(168, 85, 247, 0.3)" };
    return { bg: "rgba(245, 158, 11, 0.15)", color: "#FBBF24", border: "rgba(245, 158, 11, 0.3)" };
  };

  const renderStatusBadge = (status, item) => {
    const s = (status || (item.completed ? "COMPLETED" : "IN_PROGRESS")).toUpperCase();

    if (s === "TERMINATED_MALPRACTICE") {
      return (
        <span
          style={{
            fontSize: "11px",
            fontWeight: "800",
            padding: "3px 10px",
            borderRadius: "6px",
            background: "rgba(239, 68, 68, 0.2)",
            color: "#F87171",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          🚨 Malpractice Terminated (-150 XP)
        </span>
      );
    }

    if (s === "EXPIRED_ABANDONED") {
      return (
        <span
          style={{
            fontSize: "11px",
            fontWeight: "700",
            padding: "3px 10px",
            borderRadius: "6px",
            background: "rgba(148, 163, 184, 0.15)",
            color: "#94A3B8",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          ⌛ Session Expired / Network Disconnect
        </span>
      );
    }

    return (
      <span
        style={{
          fontSize: "11px",
          fontWeight: "700",
          padding: "3px 10px",
          borderRadius: "6px",
          background: "rgba(16, 185, 129, 0.15)",
          color: "#34D399",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px"
        }}
      >
        ✅ Completed
      </span>
    );
  };

  return (
    <div className="adaptive-history-section">
      {/* Section Header & Metrics */}
      <div className="section-title-wrap" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 6px" }}>
              <span>📜</span> Adaptive Exam & Calibration Audit Log
            </h2>
            <p style={{ margin: 0, color: "#94A3B8", fontSize: "14px" }}>
              Detailed audit history of adaptive sessions, questions solved, testcase evaluations, malpractice penalties, and multi-vector Bayesian ability shifts.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="history-count-badge">
              {totalCount != null ? `${history.length} of ${totalCount} Sessions Loaded` : `${history.length} Sessions Recorded`}
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="history-kpi-grid">
        <div className="history-kpi-card">
          <div className="history-kpi-icon" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#38BDF8" }}>🎓</div>
          <div className="history-kpi-content">
            <span className="history-kpi-label">Attended Sessions</span>
            <span className="history-kpi-val" style={{ color: "#38BDF8" }}>
              {totalCount != null ? totalCount : metrics.totalSessions}
            </span>
            <span className="history-kpi-sub">Adaptive exams recorded</span>
          </div>
        </div>

        <div className="history-kpi-card">
          <div className="history-kpi-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34D399" }}>🎯</div>
          <div className="history-kpi-content">
            <span className="history-kpi-label">Questions Solved</span>
            <span className="history-kpi-val" style={{ color: "#34D399" }}>
              {metrics.totalQuestionsSolved} <span style={{ fontSize: "14px", color: "#94A3B8" }}>/ {metrics.totalQuestionsAttempted}</span>
            </span>
            <span className="history-kpi-sub">{metrics.solveRate}% solve accuracy</span>
          </div>
        </div>

        <div className="history-kpi-card">
          <div className="history-kpi-icon" style={{ background: "rgba(129, 140, 248, 0.15)", color: "#818CF8" }}>🧪</div>
          <div className="history-kpi-content">
            <span className="history-kpi-label">Test Cases Passed</span>
            <span className="history-kpi-val" style={{ color: "#818CF8" }}>
              {metrics.totalTestCasesPassed} <span style={{ fontSize: "14px", color: "#94A3B8" }}>/ {metrics.totalTestCasesTotal || metrics.totalQuestionsAttempted * 3}</span>
            </span>
            <span className="history-kpi-sub">Automated evaluations</span>
          </div>
        </div>

        <div className="history-kpi-card">
          <div className="history-kpi-icon" style={{ background: metrics.netDelta >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)", color: metrics.netDelta >= 0 ? "#34D399" : "#FB7185" }}>
            {metrics.netDelta >= 0 ? "📈" : "📉"}
          </div>
          <div className="history-kpi-content">
            <span className="history-kpi-label">Net Mastery Shift</span>
            <span className="history-kpi-val" style={{ color: metrics.netDelta >= 0 ? "#34D399" : "#FB7185" }}>
              {metrics.netDelta >= 0 ? `+${Math.round(metrics.netDelta * 100)}%` : `${Math.round(metrics.netDelta * 100)}%`}
            </span>
            <span className="history-kpi-sub">Cumulative BKT growth</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="history-toolbar">
        <div className="history-search-wrap">
          <span className="history-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by topic, learning objective, or session status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="history-search-input"
          />
          {searchQuery && (
            <button className="history-clear-btn" onClick={() => setSearchQuery("")}>✕</button>
          )}
        </div>

        <div className="history-filters-wrap">
          <div className="history-select-wrap">
            <label>Topic:</label>
            <select
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              className="history-select"
            >
              <option value="ALL">All Topics</option>
              {uniqueTopics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="history-select-wrap">
            <label>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="history-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">✅ Completed</option>
              <option value="TERMINATED_MALPRACTICE">🚨 Terminated (Malpractice)</option>
              <option value="EXPIRED_ABANDONED">⌛ Expired / Disconnected</option>
            </select>
          </div>

          <div className="history-select-wrap">
            <label>Mastery Shift:</label>
            <select
              value={filterTrend}
              onChange={(e) => setFilterTrend(e.target.value)}
              className="history-select"
            >
              <option value="ALL">All Shifts</option>
              <option value="IMPROVING">📈 Increased Mastery (+)</option>
              <option value="DECLINING">📉 Decreased Mastery (-)</option>
              <option value="STABLE">⚖️ Stable / Neutral</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="history-empty-card">
          <div style={{ fontSize: "42px", marginBottom: "12px" }}>🎯</div>
          <h3 style={{ margin: "0 0 6px", color: "#F8FAFC" }}>
            {history.length === 0 ? "No Adaptive Sessions Attended Yet" : "No Sessions Match Your Filter"}
          </h3>
          <p style={{ margin: "0 0 20px", color: "#94A3B8", maxWidth: "480px", fontSize: "14px" }}>
            {history.length === 0
              ? "Start training on any DSA topic above to calibrate your multi-layer competency vector and build an auditable track record."
              : "Try adjusting your search query or reset filters to see all completed adaptive exam records."}
          </p>
          {history.length === 0 ? (
            <button
              className="btn-primary-gradient"
              onClick={() => onRetrainTopic && onRetrainTopic("ARRAYS")}
            >
              🚀 Launch First Adaptive Training Session
            </button>
          ) : (
            <button
              className="btn-secondary-dark"
              onClick={() => { setFilterTopic("ALL"); setFilterStatus("ALL"); setFilterTrend("ALL"); setSearchQuery(""); }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="history-timeline-list">
          {filteredHistory.map((item, index) => {
            const topicKey = (item.targetSkill || "AUTO").toUpperCase();
            const topicIcon = TOPIC_ICONS[topicKey] || "⚡";
            const diffStyle = getDifficultyColor(item.difficulty);
            const status = (item.status || (item.completed ? "COMPLETED" : "IN_PROGRESS")).toUpperCase();

            const isMalpractice = status === "TERMINATED_MALPRACTICE";
            const isExpired = status === "EXPIRED_ABANDONED";

            const passedQ = item.passedQuestions != null ? item.passedQuestions : 0;
            const totalQ = item.totalQuestions != null ? item.totalQuestions : 3;
            const scorePct = item.score != null ? Math.round(item.score) : Math.round((passedQ / Math.max(1, totalQ)) * 100);

            const oldMastery = item.oldMastery != null ? Math.round(item.oldMastery * 100) : null;
            const newMastery = item.newMastery != null ? Math.round(item.newMastery * 100) : null;
            const delta = item.masteryDelta != null ? item.masteryDelta : 0;
            const deltaPct = Math.round(delta * 100);

            const isPositive = !isMalpractice && (delta > 0 || item.recentTrend === "IMPROVING");
            const isNegative = isMalpractice || delta < 0 || item.recentTrend === "DECLINING";

            const passedTcs = item.totalTestCasesPassed != null ? item.totalTestCasesPassed : passedQ * 3;
            const totalTcs = item.totalTestCasesTotal != null ? item.totalTestCasesTotal : totalQ * 3;

            const vectorUpdates = Array.isArray(item.vectorUpdates) ? item.vectorUpdates : [];
            const isVectorExpanded = Boolean(expandedVectors[item.id || index]);

            return (
              <div
                key={item.id || index}
                className={`history-item-card ${isPositive ? "trend-up" : isNegative ? "trend-down" : ""}`}
                style={{
                  border: isMalpractice ? "1px solid rgba(239, 68, 68, 0.35)" : isExpired ? "1px solid rgba(148, 163, 184, 0.25)" : undefined,
                  background: isMalpractice ? "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)" : undefined,
                }}
              >
                {/* Left: Icon & Main Details */}
                <div className="history-item-left">
                  <div className="history-item-icon-wrap" style={{ border: `1px solid ${diffStyle.border}` }}>
                    <span style={{ fontSize: "24px" }}>{topicIcon}</span>
                  </div>

                  <div className="history-item-meta">
                    <div className="history-item-title-row">
                      <h4 className="history-item-topic">
                        {topicKey.replace(/_/g, " ")}
                      </h4>
                      <span
                        className="history-diff-badge"
                        style={{ background: diffStyle.bg, color: diffStyle.color, border: `1px solid ${diffStyle.border}` }}
                      >
                        {item.difficulty || "MEDIUM"}
                      </span>
                      {renderStatusBadge(status, item)}
                      <span className="history-time-stamp">
                        📅 {formatSessionDate(item.completedAt || item.startedAt)}
                      </span>
                    </div>

                    <p className="history-item-objective">
                      {isMalpractice
                        ? `🚨 Terminated due to proctoring security violations. Cheating score: ${item.malpracticeScore || 75}/100. Rank penalty: -150 XP deducted.`
                        : isExpired
                        ? `⌛ Disconnected / Session expired after 30-minute grace period or ${item.reconnectCount || 0} reconnects. No score penalty recorded.`
                        : (item.learningObjective || `Calibrate and evaluate competency across ${topicKey.replace(/_/g, " ")} algorithms.`)}
                    </p>

                    {/* Question Solved, Test Cases & Reconnect Badges */}
                    <div className="history-badges-row">
                      {!isExpired && (
                        <span className={`history-solved-badge ${passedQ === totalQ ? "perfect" : passedQ > 0 ? "partial" : "failed"}`}>
                          🎯 Solved: <strong>{passedQ} / {totalQ} Questions</strong> ({Math.round((passedQ / Math.max(1, totalQ)) * 100)}%)
                        </span>
                      )}

                      {!isExpired && (
                        <span className="history-tc-badge">
                          🧪 Testcases: <strong>{passedTcs} / {totalTcs} Passed</strong>
                        </span>
                      )}

                      <span className="history-score-badge" style={{ background: isMalpractice ? "rgba(239, 68, 68, 0.2)" : undefined, color: isMalpractice ? "#F87171" : undefined }}>
                        ⭐ Score: <strong>{scorePct}%</strong>
                      </span>

                      {item.reconnectCount > 0 && (
                        <span style={{ fontSize: "11px", color: "#38BDF8", background: "rgba(6, 182, 212, 0.15)", padding: "3px 8px", borderRadius: "6px", border: "1px solid rgba(6, 182, 212, 0.3)" }}>
                          🔄 {item.reconnectCount} Reconnect{item.reconnectCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Vector Updates Breakdown Chips */}
                    {vectorUpdates.length > 0 && (
                      <div style={{ marginTop: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            🧬 Impacted Vectors ({vectorUpdates.length}):
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleVectorExpand(item.id || index)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#38BDF8",
                              fontSize: "11px",
                              cursor: "pointer",
                              textDecoration: "underline",
                              padding: 0
                            }}
                          >
                            {isVectorExpanded ? "Collapse ▲" : "View Details ▼"}
                          </button>
                        </div>

                        {/* Always show compact chip badges */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {vectorUpdates.slice(0, isVectorExpanded ? vectorUpdates.length : 3).map((v, vIdx) => {
                            const vDelta = v.delta != null ? v.delta : 0;
                            const vDeltaPct = Math.round(vDelta * 100);
                            const vPositive = vDelta > 0;
                            const vNegative = vDelta < 0;
                            const dimName = (v.dimension || "").replace(/_/g, " ");

                            return (
                              <div
                                key={vIdx}
                                style={{
                                  fontSize: "11px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: vNegative ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                  border: vNegative ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
                                  color: vNegative ? "#FB7185" : "#34D399",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px"
                                }}
                              >
                                <span style={{ fontWeight: "700", color: "#F8FAFC" }}>{dimName}</span>
                                <span>{vPositive ? `+${vDeltaPct}%` : `${vDeltaPct}%`}</span>
                                {v.xpPenalty && (
                                  <span style={{ color: "#F87171", fontWeight: "700" }}>({v.xpPenalty} XP)</span>
                                )}
                              </div>
                            );
                          })}
                          {!isVectorExpanded && vectorUpdates.length > 3 && (
                            <span style={{ fontSize: "11px", color: "#64748B", alignSelf: "center" }}>
                              +{vectorUpdates.length - 3} more
                            </span>
                          )}
                        </div>

                        {/* Expanded Full Breakdown Table */}
                        {isVectorExpanded && (
                          <div
                            style={{
                              marginTop: "10px",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              background: "rgba(15, 23, 42, 0.6)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: "8px"
                            }}
                          >
                            {vectorUpdates.map((v, vIdx) => {
                              const vDelta = v.delta != null ? v.delta : 0;
                              const vDeltaPct = Math.round(vDelta * 100);
                              const oldM = v.oldMastery != null ? Math.round(v.oldMastery * 100) : "--";
                              const newM = v.newMastery != null ? Math.round(v.newMastery * 100) : "--";

                              return (
                                <div key={vIdx} style={{ fontSize: "11px", color: "#CBD5E1" }}>
                                  <div style={{ fontWeight: "700", color: "#F8FAFC" }}>
                                    {(v.dimension || "").replace(/_/g, " ")} ({v.type || "SKILL"})
                                  </div>
                                  <div style={{ color: "#94A3B8", marginTop: "2px" }}>
                                    {oldM}% → <strong style={{ color: vDelta >= 0 ? "#34D399" : "#FB7185" }}>{newM}%</strong> ({vDelta >= 0 ? `+${vDeltaPct}%` : `${vDeltaPct}%`})
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Competency Shift & Action */}
                <div className="history-item-right">
                  {/* Field Increase / Decrease Highlight */}
                  <div className="history-delta-box">
                    <div className="history-delta-header">
                      <span className="history-delta-title">Field Mastery Shift</span>
                      <span className="history-field-name">{topicKey}</span>
                    </div>

                    <div className="history-delta-val-row">
                      {isMalpractice ? (
                        <div className="delta-pill delta-negative">
                          <span className="delta-arrow">🚨</span>
                          <span className="delta-text">-10% Penalty</span>
                        </div>
                      ) : isPositive ? (
                        <div className="delta-pill delta-positive">
                          <span className="delta-arrow">📈</span>
                          <span className="delta-text">+{deltaPct}% Increase</span>
                        </div>
                      ) : isNegative ? (
                        <div className="delta-pill delta-negative">
                          <span className="delta-arrow">📉</span>
                          <span className="delta-text">{deltaPct}% Decrease</span>
                        </div>
                      ) : (
                        <div className="delta-pill delta-neutral">
                          <span className="delta-arrow">⚖️</span>
                          <span className="delta-text">Maintained (±0%)</span>
                        </div>
                      )}

                      {oldMastery != null && newMastery != null && (
                        <div className="history-progression-text">
                          <span style={{ color: "#94A3B8" }}>{oldMastery}%</span>
                          <span style={{ color: "#64748B", margin: "0 4px" }}>→</span>
                          <span style={{ fontWeight: "700", color: isPositive ? "#34D399" : isNegative ? "#FB7185" : "#38BDF8" }}>
                            {newMastery}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Retrain Action Button */}
                  {topicKey !== "DIAGNOSTIC" && (
                    <button
                      className="history-retrain-btn"
                      onClick={() => onRetrainTopic && onRetrainTopic(topicKey)}
                      title={`Launch a new training session for ${topicKey}`}
                    >
                      Train Again ⚡
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Load More Button */}
      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
          <button
            type="button"
            className="btn-secondary-dark"
            onClick={onLoadMore}
            disabled={loadingMore}
            style={{
              padding: "12px 28px",
              fontSize: "13px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#38BDF8",
              borderRadius: "12px",
              cursor: loadingMore ? "not-allowed" : "pointer"
            }}
          >
            {loadingMore ? (
              <>
                <span>⏳</span> Fetching older sessions...
              </>
            ) : (
              <>
                <span>📥</span> Load More History ({totalCount != null ? `Showing ${history.length} of ${totalCount}` : "Next 10 Records"})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
