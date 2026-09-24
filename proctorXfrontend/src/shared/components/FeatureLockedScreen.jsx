import React from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "./AppShell";
import "../../App.css";

export default function FeatureLockedScreen({
  featureTitle = "Platform Feature",
  featureDescription = "This feature requires administrator account approval.",
  role = "STUDENT"
}) {
  const navigate = useNavigate();

  return (
    <AppShell
      title={`Access Locked: ${featureTitle}`}
      subtitle="Institutional verification required for full access."
      activeNav="/dashboard"
    >
      <div
        className="page"
        style={{
          minHeight: "75vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px"
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: 560,
            width: "100%",
            textAlign: "center",
            padding: "44px 32px",
            background: "linear-gradient(135deg, rgba(23, 27, 38, 0.95), rgba(15, 18, 26, 0.98))",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.6), 0 0 35px -5px rgba(245, 158, 11, 0.15)",
            borderRadius: "var(--radius-lg)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Ambient Glow */}
          <div
            style={{
              position: "absolute",
              top: -40,
              left: "50%",
              transform: "translateX(-50%)",
              width: 180,
              height: 180,
              background: "radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)",
              pointerEvents: "none"
            }}
          />

          {/* Animated Lock Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              margin: "0 auto 20px",
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.12)",
              border: "2px solid rgba(245, 158, 11, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.4rem",
              boxShadow: "0 0 24px rgba(245, 158, 11, 0.25)"
            }}
          >
            🔒
          </div>

          <div
            className="status-chip pending"
            style={{
              fontSize: "0.75rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 14,
              padding: "4px 12px",
              borderRadius: 20
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FBBF24" }} />
            Account Verification Pending
          </div>

          <h2 style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            {featureTitle} is Locked
          </h2>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 440 }}>
            You are locked for this feature. {featureDescription}
          </p>

          <div
            style={{
              background: "rgba(245, 158, 11, 0.06)",
              border: "1px dashed rgba(245, 158, 11, 0.3)",
              borderRadius: "var(--radius-md)",
              padding: "14px 18px",
              marginBottom: 28,
              textAlign: "left"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Current Role:</span>
              <strong style={{ color: "var(--text-primary)" }}>{role}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Access Status:</span>
              <span style={{ color: "#FBBF24", fontWeight: 600 }}>Awaiting Administrator Approval</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Next Step:</span>
              <span style={{ color: "var(--cyan)" }}>Complete institutional profile</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              className="primary-btn"
              onClick={() => navigate("/profile")}
              style={{
                width: "100%",
                padding: "12px 20px",
                fontSize: "0.92rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8
              }}
            >
              Complete Institutional Profile →
            </button>
            <button
              className="ghost-btn"
              onClick={() => navigate("/dashboard")}
              style={{
                width: "100%",
                padding: "10px 18px",
                fontSize: "0.88rem"
              }}
            >
              Return to Workspace Dashboard
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
