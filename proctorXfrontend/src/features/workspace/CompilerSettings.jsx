import { useState, useEffect } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function CompilerSettings() {
  const [providersData, setProvidersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [testingProvider, setTestingProvider] = useState(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    try {
      setLoading(true);
      const res = await Client.get("/code-execution/providers");
      setProvidersData(res.data);
    } catch (err) {
      console.error("Failed to load compiler providers:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPrimary(providerName) {
    try {
      setUpdating(true);
      const res = await Client.post("/code-execution/primary-provider", {
        provider: providerName
      });
      alert(res.data?.message || `Primary compiler set to ${providerName}`);
      await fetchProviders();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update primary compiler.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleTestEngine(providerName) {
    try {
      setTestingProvider(providerName);
      const startTime = Date.now();
      const res = await Client.post("/code-execution/generate-output", {
        script: 'public class Main { public static void main(String[] args) { System.out.println("Engine Diagnostic OK"); } }',
        stdin: "",
        language: "java"
      });
      const latency = Date.now() - startTime;
      setTestResults((prev) => ({
        ...prev,
        [providerName]: {
          success: true,
          output: res.data?.stdout || res.data?.output || "OK",
          latency: `${latency}ms`,
          engineUsed: res.data?.providerUsed || providerName
        }
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [providerName]: {
          success: false,
          error: err?.response?.data?.message || err?.message || "Execution Failed"
        }
      }));
    } finally {
      setTestingProvider(null);
    }
  }

  const engineDetails = {
    onecompiler: {
      name: "OneCompiler Engine",
      url: "https://api.onecompiler.com/v1/run",
      desc: "High-speed isolated container runner with 100+ language support and instant latency (~15ms).",
      languages: ["Java 17", "Python 3.11", "C++ (C++17)", "C (GCC)"],
      icon: "⚡"
    },
    jdoodle: {
      name: "JDoodle Compiler",
      url: "https://api.jdoodle.com/v1/execute",
      desc: "Cloud compiler infrastructure supporting standard competitive programming assessment environments.",
      languages: ["Java 17", "Python 3.11", "C++ (C++17)", "C (GCC)"],
      icon: "☕"
    }
  };

  return (
    <AppShell
      title="Compiler Engines & Execution Hub"
      subtitle="Select the primary assessment compiler, monitor configured engines, and manage automatic failover resilience."
      activeNav="/admin/compiler-settings"
    >
      <div className="dashboard-shell" style={{ maxWidth: 1040, margin: "0 auto" }}>
        {/* Failover Status Banner */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04))",
            borderColor: "rgba(16, 185, 129, 0.3)",
            marginBottom: 24,
            padding: "18px 24px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.6rem" }}>🛡️</span>
              <div>
                <strong style={{ color: "#34D399", fontSize: "1rem" }}>
                  Automatic Multi-Compiler Failover Active
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  If the primary compiler engine encounters a <strong>429 Rate Limit</strong> or outage, the system immediately executes via fallback engines with zero candidate disruption.
                </p>
              </div>
            </div>
            <span className="status-chip approved" style={{ fontSize: "0.75rem" }}>
              Failover: Enabled
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="card loading-card" style={{ textAlign: "center", padding: 40 }}>
            <div className="hero-badge">Compiler Diagnostics</div>
            <h3>Inspecting Execution Engines...</h3>
            <div className="skeleton-card" />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
            {(providersData?.providers || []).map((provider) => {
              const details = engineDetails[provider.name] || {
                name: provider.displayName,
                url: "",
                desc: "Code execution engine provider.",
                languages: ["Java", "Python", "C++", "C"],
                icon: "⚙️"
              };
              const isPrimary = provider.isPrimary;
              const test = testResults[provider.name];

              return (
                <div
                  key={provider.name}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 24,
                    borderColor: isPrimary ? "var(--primary-light)" : "var(--border-subtle)",
                    boxShadow: isPrimary ? "0 0 20px rgba(99, 102, 241, 0.2)" : "none",
                    position: "relative"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: "1.8rem" }}>{details.icon}</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--text-primary)" }}>
                            {details.name}
                          </h3>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {provider.name}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {isPrimary && (
                          <span className="status-chip approved" style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                            ⭐ Default Primary
                          </span>
                        )}
                        <span
                          className={`status-chip ${provider.configured ? "approved" : "pending"}`}
                          style={{ fontSize: "0.7rem" }}
                        >
                          {provider.configured ? "● Ready" : "⚠️ Key Required"}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
                      {details.desc}
                    </p>

                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Supported Languages:
                      </span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                        {details.languages.map((lang, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "0.72rem",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--bg-surface-2)",
                              color: "var(--text-primary)",
                              border: "1px solid var(--border-subtle)"
                            }}
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Test Results Output Box */}
                    {test && (
                      <div
                        style={{
                          padding: 10,
                          borderRadius: "var(--radius-sm)",
                          background: test.success ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                          border: `1px solid ${test.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                          marginBottom: 16,
                          fontSize: "0.78rem"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <strong style={{ color: test.success ? "#34D399" : "#F87171" }}>
                            {test.success ? "✓ Test Passed" : "✕ Test Failed"}
                          </strong>
                          {test.latency && <span style={{ color: "var(--text-muted)" }}>Latency: {test.latency}</span>}
                        </div>
                        <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                          {test.success ? `Output: ${test.output.trim()}` : test.error}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Actions: Set as Primary & Run Diagnostic */}
                  <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
                    <button
                      type="button"
                      className="primary-btn"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        fontSize: "0.82rem",
                        background: isPrimary ? "var(--bg-surface-2)" : undefined,
                        color: isPrimary ? "var(--text-muted)" : undefined,
                        cursor: isPrimary ? "default" : "pointer"
                      }}
                      onClick={() => !isPrimary && handleSetPrimary(provider.name)}
                      disabled={isPrimary || updating || !provider.configured}
                    >
                      {isPrimary ? "Current Default Primary" : "Set as Default Primary"}
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: "8px 12px", fontSize: "0.82rem" }}
                      onClick={() => handleTestEngine(provider.name)}
                      disabled={testingProvider === provider.name || !provider.configured}
                    >
                      {testingProvider === provider.name ? "Testing..." : "⚡ Test Run"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
