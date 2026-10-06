import React, { useState } from "react";

const RANK_THEMES = {
  OBSIDIAN: { name: "Obsidian Grandmaster", color: "#E879F9", bg: "rgba(232, 121, 249, 0.15)", border: "rgba(232, 121, 249, 0.4)", icon: "🌌", minXp: 950 },
  DIAMOND: { name: "Diamond Master", color: "#38BDF8", bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.4)", icon: "🔮", minXp: 850 },
  PLATINUM: { name: "Platinum Expert", color: "#2DD4BF", bg: "rgba(45, 212, 191, 0.15)", border: "rgba(45, 212, 191, 0.4)", icon: "💎", minXp: 700 },
  GOLD: { name: "Gold Specialist", color: "#FBBF24", bg: "rgba(251, 191, 36, 0.15)", border: "rgba(251, 191, 36, 0.4)", icon: "🥇", minXp: 450 },
  SILVER: { name: "Silver Apprentice", color: "#94A3B8", bg: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.3)", icon: "🥈", minXp: 200 },
  BRONZE: { name: "Bronze Novice", color: "#F97316", bg: "rgba(249, 115, 22, 0.15)", border: "rgba(249, 115, 22, 0.3)", icon: "🥉", minXp: 0 }
};

export default function TopicRankMatrix({ topicRanks = [], patternRanks = [], onSelectTopic = null }) {
  const [activeRankTab, setActiveRankTab] = useState("CONCEPTS"); // "CONCEPTS" | "PATTERNS"
  
  const conceptsList = Array.isArray(topicRanks) ? topicRanks : [];
  const patternsList = Array.isArray(patternRanks) ? patternRanks : [];
  const activeList = activeRankTab === "CONCEPTS" ? conceptsList : patternsList;

  return (
    <div className="topic-rank-matrix-container">
      {/* Header & Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "17px", color: "#F8FAFC", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🏆</span> League Ranks & Multi-Layer Mastery XP
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94A3B8" }}>
            Combines Bayesian BKT capability (70%) with solved milestone volume (30%) to compute competitive league tiers.
          </p>
        </div>
        
        {/* Tier Badges Legend */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {Object.entries(RANK_THEMES).map(([tierKey, theme]) => (
            <span
              key={tierKey}
              style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "6px",
                background: theme.bg,
                color: theme.color,
                border: `1px solid ${theme.border}`,
                fontWeight: 600
              }}
            >
              {theme.icon} {tierKey}
            </span>
          ))}
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={() => setActiveRankTab("CONCEPTS")}
          style={{
            padding: "8px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            border: activeRankTab === "CONCEPTS" ? "1px solid #38BDF8" : "1px solid rgba(255, 255, 255, 0.1)",
            background: activeRankTab === "CONCEPTS" ? "rgba(6, 182, 212, 0.2)" : "rgba(15, 23, 42, 0.6)",
            color: activeRankTab === "CONCEPTS" ? "#38BDF8" : "#94A3B8",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease"
          }}
        >
          <span>🌐</span> Core Concepts Ranks ({conceptsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveRankTab("PATTERNS")}
          style={{
            padding: "8px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            border: activeRankTab === "PATTERNS" ? "1px solid #C084FC" : "1px solid rgba(255, 255, 255, 0.1)",
            background: activeRankTab === "PATTERNS" ? "rgba(168, 85, 247, 0.2)" : "rgba(15, 23, 42, 0.6)",
            color: activeRankTab === "PATTERNS" ? "#C084FC" : "#94A3B8",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease"
          }}
        >
          <span>⚡</span> Algorithmic Patterns Ranks ({patternsList.length})
        </button>
      </div>

      {/* Grid of Ranks */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: "14px",
        }}
      >
        {activeList.map((item) => {
          const tierKey = (item.rankTier || "BRONZE").toUpperCase();
          const theme = RANK_THEMES[tierKey] || RANK_THEMES.BRONZE;
          const rankXp = item.rankXp || 0;
          const solved = item.questionsSolved || 0;
          const quota = item.milestoneQuota || 15;
          const masteryPct = Math.round((item.mastery || 0) * 100);
          const topicName = (item.topic || "").replace(/_/g, " ");

          return (
            <div
              key={item.topic}
              style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)",
                border: `1px solid ${theme.border}`,
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: `0 6px 20px rgba(0, 0, 0, 0.35), inset 0 0 16px ${theme.bg}`,
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#F8FAFC", letterSpacing: "-0.01em" }}>
                    {topicName}
                  </div>
                  <div style={{ fontSize: "11px", color: theme.color, fontWeight: "600", marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>{theme.icon}</span> {theme.name}
                  </div>
                </div>
                <div
                  style={{
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    color: theme.color,
                    padding: "3px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "800",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                  }}
                >
                  {rankXp} XP
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94A3B8", marginBottom: "5px" }}>
                  <span>Tier Progress ({rankXp}/1000 XP)</span>
                  <span style={{ fontWeight: "700", color: theme.color }}>{Math.round((rankXp / 1000) * 100)}%</span>
                </div>
                <div style={{ height: "7px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (rankXp / 1000) * 100)}%`,
                      background: `linear-gradient(90deg, #6366F1, ${theme.color})`,
                      borderRadius: "4px",
                      transition: "width 0.4s ease"
                    }}
                  />
                </div>
              </div>

              {/* Sub-Metrics Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "11px",
                  color: "#CBD5E1",
                  paddingTop: "8px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)"
                }}
              >
                <span>
                  Mastery: <strong style={{ color: "#38BDF8" }}>{masteryPct}%</strong>
                </span>
                <span>
                  Solved: <strong>{solved}/{quota}</strong>
                </span>
                {onSelectTopic && (
                  <button
                    type="button"
                    onClick={() => onSelectTopic(item.topic)}
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#F8FAFC",
                      borderRadius: "6px",
                      padding: "3px 10px",
                      fontSize: "11px",
                      cursor: "pointer",
                      fontWeight: "700",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#38BDF8";
                      e.currentTarget.style.color = "#0F172A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.color = "#F8FAFC";
                    }}
                  >
                    Train ⚡
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
