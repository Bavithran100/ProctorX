import React from "react";

const ERROR_DETAILS = {
  OFF_BY_ONE: {
    title: "Off-by-One & Index Drift",
    desc: "Loop bounds '<' vs '<=', 0-based boundary slips, slice termination drift & fencepost errors.",
    icon: "🔢",
    category: "Indexing & Bounds",
    legacyKeys: ["OFF_BY_ONE", "BOUNDARY_CONDITION"]
  },
  NULL_EMPTY_COLLECTION: {
    title: "Null & Empty Collection",
    desc: "Unchecked null dereferencing, empty array/string/tree edge cases, and empty collection bounds.",
    icon: "🚫",
    category: "Edge Cases & Safety",
    legacyKeys: ["NULL_EMPTY_COLLECTION", "NULL_EMPTY_HANDLING"]
  },
  TIME_LIMIT_EXCEEDED: {
    title: "Time Limit Exceeded (TLE)",
    desc: "Suboptimal asymptotic complexity, O(N^2) quadratic traps where O(N) or O(N log N) is required, infinite loops.",
    icon: "⏱️",
    category: "Complexity Traps",
    legacyKeys: ["TIME_LIMIT_EXCEEDED", "TLE"]
  },
  STATE_CORRUPTION: {
    title: "State & Memory Corruption",
    desc: "Faulty state transitions, memory overhead, stale pointer updates, incorrect DP recurrence, or recursion depth bounds.",
    icon: "🔀",
    category: "State Space & Memory",
    legacyKeys: ["STATE_CORRUPTION", "WRONG_RECURRENCE", "INCORRECT_STATE_TRANSITION", "INCORRECT_POINTER_UPDATE", "MLE", "COMPILATION_SYNTAX_ERROR"]
  }
};

function resolveRiskValue(errorProfile, info) {
  if (!errorProfile) return 0.15;
  for (const k of info.legacyKeys) {
    if (errorProfile[k] != null) return errorProfile[k];
  }
  return 0.15;
}

export default function ErrorTaxonomyHeatmap({ errorProfile = {} }) {
  const getRiskTier = (val) => {
    if (val >= 0.60) return { label: "High Hazard", color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)" };
    if (val >= 0.35) return { label: "Moderate Risk", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.4)" };
    return { label: "Clean / Low Risk", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.4)" };
  };

  return (
    <div className="error-taxonomy-heatmap-container">
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#F8FAFC", fontWeight: "700" }}>
          🐛 4 Core Diagnostic Defect Profiles
        </h3>
        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94A3B8" }}>
          Real-time Bayesian classification of code defects, runtime crashes, and algorithmic pitfalls detected during your execution traces.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "12px",
        }}
      >
        {Object.entries(ERROR_DETAILS).map(([key, info]) => {
          const riskVal = resolveRiskValue(errorProfile, info);
          const tier = getRiskTier(riskVal);
          const riskPct = Math.round(riskVal * 100);

          return (
            <div
              key={key}
              style={{
                background: "rgba(15, 23, 42, 0.75)",
                border: `1px solid ${tier.border}`,
                borderRadius: "12px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: `0 4px 16px rgba(0, 0, 0, 0.3), inset 0 0 10px ${tier.bg}`
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>{info.icon}</span>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#F8FAFC" }}>
                      {info.title}
                    </div>
                    <span style={{ fontSize: "10px", color: "#94A3B8", textTransform: "uppercase" }}>
                      {info.category}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: tier.bg,
                    border: `1px solid ${tier.border}`,
                    color: tier.color,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700"
                  }}
                >
                  {riskPct}% Risk
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "#CBD5E1", lineHeight: "1.4" }}>
                {info.desc}
              </div>

              {/* Meter */}
              <div style={{ marginTop: "4px" }}>
                <div style={{ height: "5px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, riskPct)}%`,
                      background: tier.color,
                      borderRadius: "3px",
                      transition: "width 0.4s ease"
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: tier.color, marginTop: "3px", fontWeight: 600 }}>
                  <span>{tier.label}</span>
                  <span>{riskVal >= 0.50 ? "⚠️ Recommended Practice" : "✓ In Control"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
