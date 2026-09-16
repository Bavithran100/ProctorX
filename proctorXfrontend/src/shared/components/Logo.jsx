import React from "react";

export default function Logo({ size = "md", showText = true, className = "" }) {
  const sizeMap = {
    sm: { icon: 24, font: "text-sm", gap: "gap-2" },
    md: { icon: 32, font: "text-lg", gap: "gap-2.5" },
    lg: { icon: 44, font: "text-2xl", gap: "gap-3" },
    xl: { icon: 56, font: "text-3xl", gap: "gap-3.5" }
  };

  const dim = sizeMap[size] || sizeMap.md;

  return (
    <div className={`proctorx-brand ${dim.gap} ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <svg
        width={dim.icon}
        height={dim.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={`pxGrad-${size}`} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id={`pxGlow-${size}`} x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Outer Shield Polygon */}
        <path
          d="M24 4L40 12V26C40 34.5 33 41.5 24 44C15 41.5 8 34.5 8 26V12L24 4Z"
          stroke={`url(#pxGrad-${size})`}
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="#0F1117"
        />

        {/* Inner Ambient Shield */}
        <path
          d="M24 8L36 14.5V25C36 31.8 30.5 37.5 24 39.5C17.5 37.5 12 31.8 12 25V14.5L24 8Z"
          fill={`url(#pxGlow-${size})`}
          opacity="0.2"
        />

        {/* Precision Crosshair Nodes */}
        <circle cx="24" cy="11" r="1.5" fill="#818CF8" />
        <circle cx="33" cy="25" r="1.5" fill="#06B6D4" />
        <circle cx="15" cy="25" r="1.5" fill="#818CF8" />
        <circle cx="24" cy="37" r="1.5" fill="#06B6D4" />

        {/* Core "X" Glyph */}
        <path
          d="M17 18L31 30M31 18L17 30"
          stroke={`url(#pxGrad-${size})`}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
      </svg>

      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span className="brand-wordmark" style={{ fontWeight: 800, letterSpacing: "-0.03em", color: "#FFFFFF" }}>
            Proctor<span style={{ color: "#818CF8" }}>X</span>
          </span>
          <span className="brand-tagline" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#71717A", fontWeight: 600 }}>
            Precision Assessment
          </span>
        </div>
      )}
    </div>
  );
}
