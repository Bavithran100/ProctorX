import React, { useState } from "react";

const CONCEPT_DIMENSIONS = [
  { key: "ARRAYS", label: "Arrays", angle: 0 },
  { key: "STRINGS", label: "Strings", angle: 30 },
  { key: "HASHING", label: "Hashing", angle: 60 },
  { key: "LINKED_LISTS", label: "Linked Lists", angle: 90 },
  { key: "STACKS", label: "Stacks", angle: 120 },
  { key: "QUEUES", label: "Queues", angle: 150 },
  { key: "TREES", label: "Trees", angle: 180 },
  { key: "GRAPHS", label: "Graphs", angle: 210 },
  { key: "GREEDY", label: "Greedy", angle: 240 },
  { key: "BACKTRACKING", label: "Backtracking", angle: 270 },
  { key: "DYNAMIC_PROGRAMMING", label: "Dynamic Prog", angle: 300 },
  { key: "BINARY_SEARCH", label: "Binary Search", angle: 330 },
];

const PATTERN_DIMENSIONS = [
  { key: "TWO_POINTERS", label: "Two Pointers", angle: 0 },
  { key: "SLIDING_WINDOW", label: "Sliding Window", angle: 40 },
  { key: "PREFIX_SUM", label: "Prefix Sum", angle: 80 },
  { key: "BINARY_SEARCH_PATTERN", label: "Binary Search", angle: 120 },
  { key: "DFS", label: "DFS Traversal", angle: 160 },
  { key: "BFS", label: "BFS Queue", angle: 200 },
  { key: "MONOTONIC_STACK", label: "Monotonic Stack", angle: 240 },
  { key: "HEAP", label: "Heap / Priority", angle: 280 },
  { key: "UNION_FIND", label: "Union Find / DSU", angle: 320 },
];

const CODING_COMPETENCY_DIMENSIONS = [
  { key: "IMPLEMENTATION", label: "Implementation", angle: 0 },
  { key: "DEBUGGING", label: "Debugging", angle: 72 },
  { key: "COMPLEXITY_REASONING", label: "Complexity", angle: 144 },
  { key: "EDGE_CASE_HANDLING", label: "Edge Cases", angle: 216 },
  { key: "CODE_ORGANIZATION", label: "Organization", angle: 288 },
];

export default function CompetencyRadar({
  dsaMasteryVector = [],
  conceptMasteryMap = null,
  patternMasteryMap = null,
  codingCompetencyMap = null,
  mode = "concept", // "concept" | "pattern" | "competency"
  size = 420
}) {
  const [hoveredSkill, setHoveredSkill] = useState(null);

  const center = size / 2;
  const maxRadius = (size / 2) * 0.72;
  const numLevels = 5;

  let dimensionsOrder = CONCEPT_DIMENSIONS;
  let gradientTheme = {
    start: "#06B6D4",
    mid: "#6366F1",
    stroke: "#06B6D4",
    glow: "rgba(6, 182, 212, 0.4)"
  };

  if (mode === "pattern") {
    dimensionsOrder = PATTERN_DIMENSIONS;
    gradientTheme = {
      start: "#A855F7",
      mid: "#6366F1",
      stroke: "#A855F7",
      glow: "rgba(168, 85, 247, 0.4)"
    };
  } else if (mode === "competency") {
    dimensionsOrder = CODING_COMPETENCY_DIMENSIONS;
    gradientTheme = {
      start: "#10B981",
      mid: "#06B6D4",
      stroke: "#10B981",
      glow: "rgba(16, 185, 129, 0.4)"
    };
  }

  // Map mastery data
  const masteryMap = new Map();
  const confidenceMap = new Map();

  if (mode === "pattern" && patternMasteryMap) {
    Object.entries(patternMasteryMap).forEach(([k, v]) => masteryMap.set(k.toUpperCase(), v));
  } else if (mode === "competency" && codingCompetencyMap) {
    Object.entries(codingCompetencyMap).forEach(([k, v]) => masteryMap.set(k.toUpperCase(), v));
  } else if (conceptMasteryMap) {
    Object.entries(conceptMasteryMap).forEach(([k, v]) => masteryMap.set(k.toUpperCase(), v));
  } else if (Array.isArray(dsaMasteryVector)) {
    dsaMasteryVector.forEach((item) => {
      const key = (item.skill || "").toUpperCase();
      masteryMap.set(key, item.mastery != null ? item.mastery : 0.2);
      confidenceMap.set(key, item.confidence != null ? item.confidence : 0.2);
    });
  }

  const getCoordinates = (angleDeg, radius) => {
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angleRad),
      y: center + radius * Math.sin(angleRad),
    };
  };

  // Generate grid rings
  const gridRings = [];
  for (let level = 1; level <= numLevels; level++) {
    const r = (maxRadius / numLevels) * level;
    const points = dimensionsOrder.map((d) => {
      const pt = getCoordinates(d.angle, r);
      return `${pt.x},${pt.y}`;
    }).join(" ");
    gridRings.push({ radius: r, points, percentage: (level / numLevels) * 100 });
  }

  // Generate data polygon
  const dataPoints = dimensionsOrder.map((d) => {
    const masteryVal = masteryMap.get(d.key) ?? masteryMap.get(d.key.replace(/S$/, "")) ?? 0.2;
    const radius = Math.max(12, masteryVal * maxRadius);
    const pt = getCoordinates(d.angle, radius);
    return {
      ...d,
      mastery: masteryVal,
      confidence: confidenceMap.get(d.key) ?? 0.3,
      x: pt.x,
      y: pt.y,
    };
  });

  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const getRank = (val) => {
    if (val >= 0.85) return { label: "Master", color: "#10B981" };
    if (val >= 0.70) return { label: "Advanced", color: "#06B6D4" };
    if (val >= 0.50) return { label: "Competent", color: "#6366F1" };
    if (val >= 0.30) return { label: "Developing", color: "#F59E0B" };
    return { label: "Novice", color: "#EC4899" };
  };

  return (
    <div style={{ position: "relative", display: "inline-block", userSelect: "none" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Radial Gradient for Data Polygon */}
          <radialGradient id={`radarGlow_${mode}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gradientTheme.start} stopOpacity="0.55" />
            <stop offset="70%" stopColor={gradientTheme.mid} stopOpacity="0.30" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0.10" />
          </radialGradient>

          {/* Filter for glowing vertices */}
          <filter id={`glowFilter_${mode}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Concentric grid rings */}
        {gridRings.map((ring, idx) => (
          <g key={idx}>
            <polygon
              points={ring.points}
              fill={idx % 2 === 0 ? "rgba(255, 255, 255, 0.015)" : "rgba(255, 255, 255, 0.03)"}
              stroke="rgba(255, 255, 255, 0.10)"
              strokeWidth="1"
              strokeDasharray={idx < numLevels - 1 ? "3 3" : "none"}
            />
            <text
              x={center + 4}
              y={center - ring.radius + 10}
              fill="rgba(255, 255, 255, 0.35)"
              fontSize="9"
              fontFamily="monospace"
            >
              {ring.percentage}%
            </text>
          </g>
        ))}

        {/* Radial Axis Spokes */}
        {dimensionsOrder.map((d, idx) => {
          const pt = getCoordinates(d.angle, maxRadius);
          const labelPt = getCoordinates(d.angle, maxRadius + 22);
          const isHovered = hoveredSkill?.key === d.key;

          return (
            <g key={idx}>
              <line
                x1={center}
                y1={center}
                x2={pt.x}
                y2={pt.y}
                stroke={isHovered ? gradientTheme.stroke : "rgba(255, 255, 255, 0.08)"}
                strokeWidth={isHovered ? "1.5" : "1"}
              />
              {/* Outer Axis Labels */}
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? gradientTheme.stroke : "rgba(255, 255, 255, 0.75)"}
                fontSize={dimensionsOrder.length > 10 ? "10" : "11"}
                fontWeight={isHovered ? "700" : "500"}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textShadow: isHovered ? `0 0 10px ${gradientTheme.stroke}` : "none",
                }}
                onMouseEnter={() => setHoveredSkill(dataPoints.find((p) => p.key === d.key))}
                onMouseLeave={() => setHoveredSkill(null)}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Filled Data Polygon */}
        <polygon
          points={polygonPoints}
          fill={`url(#radarGlow_${mode})`}
          stroke={gradientTheme.stroke}
          strokeWidth="2.5"
          filter={`drop-shadow(0 0 8px ${gradientTheme.glow})`}
          style={{ transition: "all 0.4s ease" }}
        />

        {/* Data Vertices (Glowing Dots) */}
        {dataPoints.map((p, idx) => {
          const isHovered = hoveredSkill?.key === p.key;
          const rank = getRank(p.mastery);

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredSkill(p)}
              onMouseLeave={() => setHoveredSkill(null)}
              style={{ cursor: "pointer" }}
            >
              {isHovered && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="9"
                  fill="none"
                  stroke={rank.color}
                  strokeWidth="2"
                  opacity="0.6"
                  filter={`url(#glowFilter_${mode})`}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? "6" : "4.5"}
                fill={rank.color}
                stroke="#0F172A"
                strokeWidth="2"
                style={{ transition: "all 0.2s ease" }}
              />
            </g>
          );
        })}
      </svg>

      {/* Interactive Tooltip Card */}
      {hoveredSkill && (
        <div
          style={{
            position: "absolute",
            top: `${Math.min(size - 90, Math.max(10, hoveredSkill.y - 45))}px`,
            left: `${Math.min(size - 130, Math.max(10, hoveredSkill.x + 15))}px`,
            background: "rgba(15, 23, 42, 0.94)",
            border: `1px solid ${getRank(hoveredSkill.mastery).color}`,
            borderRadius: "10px",
            padding: "8px 12px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(6, 182, 212, 0.2)",
            backdropFilter: "blur(12px)",
            pointerEvents: "none",
            zIndex: 30,
            minWidth: "135px",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#F8FAFC", marginBottom: "3px" }}>
            {hoveredSkill.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>Mastery:</span>
            <span style={{ fontSize: "12px", fontWeight: "700", color: getRank(hoveredSkill.mastery).color }}>
              {Math.round(hoveredSkill.mastery * 100)}%
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)" }}>Proficiency:</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "600",
                padding: "2px 6px",
                borderRadius: "4px",
                background: `${getRank(hoveredSkill.mastery).color}22`,
                color: getRank(hoveredSkill.mastery).color,
              }}
            >
              {getRank(hoveredSkill.mastery).label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
