import React, { useState } from "react";

const ACADEMIC_DOMAINS = [
  { key: "Data Structures", label: "Data Structures", angle: 0, icon: "📦" },
  { key: "Algorithms", label: "Algorithms", angle: 60, icon: "⚡" },
  { key: "System Design", label: "System Design", angle: 120, icon: "🏗️" },
  { key: "Database Systems", label: "Database Systems", angle: 180, icon: "🗄️" },
  { key: "Object-Oriented Programming", label: "OOP & Design", angle: 240, icon: "🧩" },
  { key: "Web Technologies", label: "Web Tech", angle: 300, icon: "🌐" },
];

export default function OfficialAssessmentRadar({ domainScores = {}, size = 420 }) {
  const [hoveredDomain, setHoveredDomain] = useState(null);

  const center = size / 2;
  const maxRadius = (size / 2) * 0.70;
  const numLevels = 5;

  const getCoordinates = (angleDeg, radius) => {
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angleRad),
      y: center + radius * Math.sin(angleRad),
    };
  };

  // Concentric hex rings
  const gridRings = [];
  for (let level = 1; level <= numLevels; level++) {
    const r = (maxRadius / numLevels) * level;
    const points = ACADEMIC_DOMAINS.map((d) => {
      const pt = getCoordinates(d.angle, r);
      return `${pt.x},${pt.y}`;
    }).join(" ");
    gridRings.push({ radius: r, points, percentage: (level / numLevels) * 100 });
  }

  // Data polygon points
  const dataPoints = ACADEMIC_DOMAINS.map((d) => {
    const rawVal = domainScores[d.key] != null ? domainScores[d.key] : 0.0;
    const scoreVal = typeof rawVal === "number" ? rawVal : parseFloat(rawVal) || 0.0;
    const radius = Math.max(12, scoreVal * maxRadius);
    const pt = getCoordinates(d.angle, radius);
    return {
      ...d,
      score: scoreVal,
      x: pt.x,
      y: pt.y,
    };
  });

  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const getGradeTier = (val) => {
    if (val >= 0.90) return { label: "A+ (Distinction)", color: "#10B981" };
    if (val >= 0.80) return { label: "A (Excellent)", color: "#06B6D4" };
    if (val >= 0.70) return { label: "B (Proficient)", color: "#6366F1" };
    if (val >= 0.55) return { label: "C (Adequate)", color: "#F59E0B" };
    if (val > 0) return { label: "D (Needs Review)", color: "#EC4899" };
    return { label: "No Exam Submissions", color: "#64748B" };
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
          <radialGradient id="officialRadarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.60" />
            <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.10" />
          </radialGradient>

          <filter id="officialGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Concentric grid polygons */}
        {gridRings.map((ring, idx) => (
          <g key={idx}>
            <polygon
              points={ring.points}
              fill={idx % 2 === 0 ? "rgba(255, 255, 255, 0.015)" : "rgba(255, 255, 255, 0.03)"}
              stroke="rgba(255, 255, 255, 0.12)"
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

        {/* Axis Spokes & Domain Labels */}
        {ACADEMIC_DOMAINS.map((d, idx) => {
          const pt = getCoordinates(d.angle, maxRadius);
          const labelPt = getCoordinates(d.angle, maxRadius + 22);
          const isHovered = hoveredDomain?.key === d.key;

          return (
            <g key={idx}>
              <line
                x1={center}
                y1={center}
                x2={pt.x}
                y2={pt.y}
                stroke={isHovered ? "rgba(16, 185, 129, 0.8)" : "rgba(255, 255, 255, 0.10)"}
                strokeWidth={isHovered ? "1.5" : "1"}
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? "#34D399" : "rgba(255, 255, 255, 0.85)"}
                fontSize="11"
                fontWeight={isHovered ? "700" : "600"}
                style={{ transition: "all 0.2s ease", cursor: "pointer" }}
                onMouseEnter={() => setHoveredDomain(dataPoints.find((p) => p.key === d.key))}
                onMouseLeave={() => setHoveredDomain(null)}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Official Performance Polygon Area */}
        <polygon
          points={polygonPoints}
          fill="url(#officialRadarGradient)"
          stroke="#10B981"
          strokeWidth="2.2"
          strokeLinejoin="round"
          style={{ transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />

        {/* Domain Data Vertices */}
        {dataPoints.map((p, idx) => {
          const isHovered = hoveredDomain?.key === p.key;
          const tier = getGradeTier(p.score);

          return (
            <g key={idx}>
              {/* Outer halo */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 8 : 4.5}
                fill={tier.color}
                opacity={isHovered ? 0.9 : 0.6}
                filter="url(#officialGlowFilter)"
                style={{ transition: "all 0.2s ease", cursor: "pointer" }}
                onMouseEnter={() => setHoveredDomain(p)}
                onMouseLeave={() => setHoveredDomain(null)}
              />
              {/* Inner core */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 4 : 2.5}
                fill="#FFFFFF"
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })}
      </svg>

      {/* Hover Floating Tooltip */}
      {hoveredDomain && (
        <div
          style={{
            position: "absolute",
            top: `${hoveredDomain.y - 12}px`,
            left: `${hoveredDomain.x}px`,
            transform: "translate(-50%, -100%)",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "8px",
            padding: "8px 12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(16, 185, 129, 0.2)",
            pointerEvents: "none",
            zIndex: 100,
            whiteSpace: "nowrap",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#F8FAFC", marginBottom: "2px" }}>
            {hoveredDomain.icon} {hoveredDomain.label}
          </div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#34D399" }}>
            {Math.round(hoveredDomain.score * 100)}%
          </div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: "600",
              color: getGradeTier(hoveredDomain.score).color,
              marginTop: "2px",
            }}
          >
            {getGradeTier(hoveredDomain.score).label}
          </div>
        </div>
      )}
    </div>
  );
}
