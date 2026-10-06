import React from "react";

const ERROR_DETAILS = {
  OFF_BY_ONE: {
    title: "Off-by-One Indices",
    desc: "Loop conditions using '<' vs '<=', 0-based array bounds, slice window termination errors.",
    icon: "🔢",
    category: "Indexing"
  },
  BOUNDARY_CONDITION: {
    title: "Boundary Conditions",
    desc: "Single-element inputs, empty arrays, extreme upper/lower integer limits.",
    icon: "🧱",
    category: "Edge Cases"
  },
  INCORRECT_POINTER_UPDATE: {
    title: "Pointer Drift / Update",
    desc: "Advancing left/right two-pointer cursors incorrectly or skipping steps.",
    icon: "👉",
    category: "Pointers"
  },
  NULL_EMPTY_HANDLING: {
    title: "Null & Empty Handling",
    desc: "Null pointer dereferences on empty trees, null linked list next nodes, or empty strings.",
    icon: "🚫",
    category: "Robustness"
  },
  WRONG_RECURRENCE: {
    title: "Wrong Recurrence Relation",
    desc: "Faulty transition equations or infinite recursion base-case missing.",
    icon: "🔄",
    category: "Dynamic Prog"
  },
  INCORRECT_STATE_TRANSITION: {
    title: "Incorrect State Transition",
    desc: "Memoization table key collisions, incomplete subproblem state tracking.",
    icon: "🔀",
    category: "Dynamic Prog"
  },
  TLE: {
    title: "Time Limit Exceeded (TLE)",
    desc: "O(N^2) or exponential recursion where O(N log N) or O(N) is required.",
    icon: "⏱️",
    category: "Complexity"
  },
  MLE: {
    title: "Memory Limit Exceeded (MLE)",
    desc: "Deep recursion stack overflow or allocating unnecessarily large auxiliary arrays.",
    icon: "💾",
    category: "Memory"
  },
  COMPILATION_SYNTAX_ERROR: {
    title: "Compilation & Syntax Errors",
    desc: "Missing imports, unclosed scopes, type mismatch, syntax compilation errors.",
    icon: "⚠️",
    category: "Syntax"
  }
};

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
          🐛 Diagnostic Bug & Failure Mode Risk Profiler
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
          const riskVal = errorProfile[key] != null ? errorProfile[key] : 0.15;
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
