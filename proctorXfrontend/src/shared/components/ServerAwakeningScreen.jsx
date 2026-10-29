import React, { useState, useEffect } from "react";
import Client from "../api/Client";

export default function ServerAwakeningScreen({ onServerReady, onCancel, contextTitle = "Authentication" }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Pinging backend instance...");
  const [isReady, setIsReady] = useState(false);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling server health
  useEffect(() => {
    let active = true;
    let pollInterval = null;

    async function checkServerHealth() {
      try {
        setStatusMessage("Pinging backend container health...");
        // Fast probe on csrf or public endpoint
        const res = await Client.get("/auth/csrf", { timeout: 4000 });
        if (res.status === 200 || res.status === 204 || res.data) {
          if (!active) return;
          setIsReady(true);
          setStatusMessage("✓ Backend server is online & responding!");
          clearInterval(pollInterval);
          setTimeout(() => {
            if (active && onServerReady) {
              onServerReady();
            }
          }, 1200);
        }
      } catch (err) {
        if (!active) return;
        setStatusMessage("Container is still spinning up. Re-checking...");
      }
    }

    // Initial check
    checkServerHealth();

    // Poll every 2.5 seconds
    pollInterval = setInterval(checkServerHealth, 2500);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [onServerReady]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#07090E",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <div
        style={{
          background: "#0B0E17",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "18px",
          padding: "36px 32px",
          maxWidth: "520px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Top glowing line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: isReady
              ? "linear-gradient(90deg, #10B981, #34D399)"
              : "linear-gradient(90deg, #F59E0B 0%, #10B981 50%, #7C3AED 100%)"
          }}
        />

        {/* Radar / Pulsing Animation */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: isReady ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
            border: isReady ? "2px solid #10B981" : "2px solid #F59E0B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: "30px",
            boxShadow: isReady
              ? "0 0 24px rgba(16, 185, 129, 0.35)"
              : "0 0 24px rgba(245, 158, 11, 0.25)"
          }}
        >
          {isReady ? "✓" : "⚡"}
        </div>

        <h2
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "#F8FAFC",
            margin: "0 0 10px",
            letterSpacing: "-0.01em"
          }}
        >
          {isReady ? "Backend Server Ready!" : "Backend Instance Awakening..."}
        </h2>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "13px",
            lineHeight: "1.6",
            margin: "0 0 20px"
          }}
        >
          {isReady
            ? "Your connection has been established. Continuing your request immediately..."
            : "ProctorX runs on cloud-native infrastructure. When idle, the backend instance spins down to conserve resources. We are waking it up right now for your " + contextTitle + "."}
        </p>

        {/* Live Timer & Progress Bar */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
            textAlign: "left"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
            <span style={{ color: "#CBD5E1", fontWeight: "600" }}>Instance Warm-up Status</span>
            <span style={{ color: isReady ? "#34D399" : "#FBBF24", fontWeight: "700" }}>
              {isReady ? "READY" : `${elapsedSeconds}s elapsed`}
            </span>
          </div>

          {/* Progress bar animation */}
          <div
            style={{
              height: "6px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "999px",
              overflow: "hidden",
              marginBottom: "10px"
            }}
          >
            <div
              style={{
                height: "100%",
                width: isReady ? "100%" : `${Math.min(95, elapsedSeconds * 2.5)}%`,
                background: isReady
                  ? "linear-gradient(90deg, #10B981, #34D399)"
                  : "linear-gradient(90deg, #F59E0B, #10B981)",
                transition: "width 0.5s ease"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#94A3B8" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isReady ? "#10B981" : "#F59E0B",
                boxShadow: isReady ? "0 0 8px #10B981" : "0 0 8px #F59E0B"
              }}
            />
            <span>{statusMessage}</span>
          </div>
        </div>

        <p style={{ fontSize: "11px", color: "#64748B", margin: "0 0 20px" }}>
          💡 Render free-tier instances typically take 30–45 seconds to complete cold-start boot. Once awake, all responses are instantaneous.
        </p>

        {/* Back / Cancel Button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#CBD5E1",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            ← Return to Form
          </button>
        )}
      </div>
    </div>
  );
}
