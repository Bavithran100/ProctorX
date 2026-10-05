import React from "react";

export default function Logo({ size = "md", showText = true, className = "", style = {} }) {
  // Support string presets ("sm", "md", "lg", "xl") or raw numbers (e.g. 28, 36, 44)
  let iconSize = 34;
  let fontSize = "1.1rem";
  let taglineSize = "0.62rem";
  let gap = "10px";

  if (typeof size === "number") {
    iconSize = size;
    fontSize = `${Math.max(0.85, size * 0.038)}rem`;
    taglineSize = `${Math.max(0.55, size * 0.02)}rem`;
    gap = `${Math.max(6, Math.round(size * 0.28))}px`;
  } else {
    const sizeMap = {
      sm: { icon: 26, font: "0.95rem", tag: "0.58rem", gap: "8px" },
      md: { icon: 34, font: "1.15rem", tag: "0.62rem", gap: "10px" },
      lg: { icon: 46, font: "1.45rem", tag: "0.72rem", gap: "12px" },
      xl: { icon: 60, font: "1.85rem", tag: "0.82rem", gap: "14px" }
    };
    const preset = sizeMap[size] || sizeMap.md;
    iconSize = preset.icon;
    fontSize = preset.font;
    taglineSize = preset.tag;
    gap = preset.gap;
  }

  return (
    <div
      className={`proctorx-brand ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: gap,
        userSelect: "none",
        ...style
      }}
    >
      <div
        style={{
          position: "relative",
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <img
          src="/logo.png"
          alt="ProctorX Logo"
          width={iconSize}
          height={iconSize}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 2px 8px rgba(6, 182, 212, 0.45)) drop-shadow(0 0 16px rgba(99, 102, 241, 0.25))",
            transition: "transform 0.2s ease, filter 0.2s ease"
          }}
          loading="eager"
        />
      </div>

      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
          <span
            className="brand-wordmark"
            style={{
              fontWeight: 800,
              letterSpacing: "-0.03em",
              fontSize: fontSize,
              color: "#FFFFFF",
              fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
            }}
          >
            Proctor<span style={{ background: "linear-gradient(135deg, #06B6D4 0%, #818CF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>X</span>
          </span>
          <span
            className="brand-tagline"
            style={{
              fontSize: taglineSize,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#94A3B8",
              fontWeight: 700,
              marginTop: "2px"
            }}
          >
            AI Assessment & Integrity
          </span>
        </div>
      )}
    </div>
  );
}
