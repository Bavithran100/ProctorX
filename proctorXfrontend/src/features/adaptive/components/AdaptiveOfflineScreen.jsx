import React, { useState, useEffect } from "react";
import Client from "../../../shared/api/Client";

export default function AdaptiveOfflineScreen({
  sessionData,
  currentQuestionNumber = 1,
  onReconnect,
  onExitToHub
}) {
  const [onlineDetected, setOnlineDetected] = useState(navigator.onLine);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState("");

  useEffect(() => {
    function handleOnlineEvent() {
      setOnlineDetected(true);
      setReconnectError("");
    }
    function handleOfflineEvent() {
      setOnlineDetected(false);
    }

    window.addEventListener("online", handleOnlineEvent);
    window.addEventListener("offline", handleOfflineEvent);

    // Periodic heartbeat to test real internet access
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        try {
          await Client.get("/auth/csrf", { timeout: 3000 });
          setOnlineDetected(true);
        } catch {
          // May still be unreachable
        }
      } else {
        setOnlineDetected(false);
      }
    }, 3500);

    return () => {
      window.removeEventListener("online", handleOnlineEvent);
      window.removeEventListener("offline", handleOfflineEvent);
      clearInterval(interval);
    };
  }, []);

  async function handleManualReconnect() {
    try {
      setReconnecting(true);
      setReconnectError("");

      // Test connectivity first
      await Client.get("/auth/csrf", { timeout: 4000 });

      // Call parent reconnect handler
      if (onReconnect) {
        await onReconnect();
      }
    } catch (err) {
      console.error("Reconnect probe failed:", err);
      setReconnectError(
        "Network still unreachable. Please ensure your Wi-Fi or data connection is active and try again."
      );
    } finally {
      setReconnecting(false);
    }
  }

  const reconnectsUsed = sessionData?.reconnectCount || 1;
  const maxReconnects = sessionData?.maxReconnects || 3;

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
        zIndex: 99999,
        padding: "20px",
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <div
        style={{
          background: "#0B0E17",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "18px",
          padding: "36px 32px",
          maxWidth: "560px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Top Warning Strip */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: onlineDetected
              ? "linear-gradient(90deg, #10B981, #34D399)"
              : "linear-gradient(90deg, #EF4444 0%, #F59E0B 100%)"
          }}
        />

        {/* Pulsing Offline Radar Icon */}
        <div
          style={{
            width: "76px",
            height: "76px",
            borderRadius: "50%",
            background: onlineDetected ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: onlineDetected ? "2px solid #10B981" : "2px solid #EF4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: "32px",
            boxShadow: onlineDetected
              ? "0 0 24px rgba(16, 185, 129, 0.35)"
              : "0 0 24px rgba(239, 68, 68, 0.35)"
          }}
        >
          {onlineDetected ? "🟢" : "📡"}
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
          {onlineDetected ? "Connection Restored!" : "Network Disconnected — Exam Safe"}
        </h2>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "13px",
            lineHeight: "1.6",
            margin: "0 0 24px"
          }}
        >
          {onlineDetected
            ? "Your internet connection is back online. Click below to continue your assessment where you left off."
            : "Your internet connection was interrupted. Do not panic — all code drafts for Question #" +
              currentQuestionNumber +
              " are securely saved in your browser's local memory and the assessment timer is paused."}
        </p>

        {/* Reassurance Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "24px",
            textAlign: "left"
          }}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "12px 14px"
            }}
          >
            <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Code Integrity
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#34D399", marginTop: "4px" }}>
              🛡️ Cached Locally
            </div>
          </div>

          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "12px 14px"
            }}
          >
            <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Re-entry Protection
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#FBBF24", marginTop: "4px" }}>
              🔄 {reconnectsUsed} of {maxReconnects} Reconnects
            </div>
          </div>
        </div>

        {/* Live Network Status Indicator */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: onlineDetected ? "#10B981" : "#EF4444",
                boxShadow: onlineDetected ? "0 0 8px #10B981" : "0 0 8px #EF4444"
              }}
            />
            <span style={{ color: onlineDetected ? "#34D399" : "#F87171", fontWeight: "600" }}>
              {onlineDetected ? "Internet Connection Detected" : "Waiting for Internet Connection..."}
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "#64748B" }}>30-Min Grace Period</span>
        </div>

        {reconnectError && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "12px",
              color: "#FCA5A5",
              marginBottom: "20px"
            }}
          >
            {reconnectError}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            type="button"
            onClick={handleManualReconnect}
            disabled={reconnecting}
            style={{
              width: "100%",
              padding: "13px",
              background: onlineDetected
                ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                : "linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: "700",
              cursor: reconnecting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            {reconnecting ? "🔄 Connecting to ProctorX Server..." : "🔄 Reconnect & Continue Exam"}
          </button>

          {onExitToHub && (
            <button
              type="button"
              onClick={onExitToHub}
              style={{
                width: "100%",
                padding: "10px",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                color: "#94A3B8",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              ← Return to Adaptive Coach Hub (Resume Later)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
