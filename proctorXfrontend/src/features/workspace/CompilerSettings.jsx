import { useState, useEffect } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import { executeWasmOrFallback } from "../exam/wasm/wasmRunner";
import { isWasmCached, precacheWasmChunks, getWasmCacheStats, clearWasmCache } from "../exam/wasm/wasmCacheService";
import "../../App.css";

export default function CompilerSettings() {
  const [providersData, setProvidersData] = useState(null);
  const [priorityChain, setPriorityChain] = useState(["wasm-local", "onecompiler", "jdoodle"]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [testingProvider, setTestingProvider] = useState(null);
  const [cacheStats, setCacheStats] = useState({ isCached: false, sizeMB: "0 MB", fileCount: 0 });
  const [cachingProgress, setCachingProgress] = useState(null);

  useEffect(() => {
    fetchProviders();
    loadCacheStats();
  }, []);

  async function loadCacheStats() {
    const stats = await getWasmCacheStats();
    setCacheStats(stats);
  }

  async function handlePrecacheWasm() {
    setCachingProgress({ percent: 0, msg: "Initializing..." });
    await precacheWasmChunks((percent, msg) => {
      setCachingProgress({ percent, msg });
    });
    await loadCacheStats();
    setTimeout(() => setCachingProgress(null), 3000);
  }

  async function handleClearWasmCache() {
    if (confirm("Clear local client-side WASM compiler cache?")) {
      await clearWasmCache();
      await loadCacheStats();
      alert("Local WASM Cache cleared successfully.");
    }
  }

  async function fetchProviders() {
    try {
      setLoading(true);
      const res = await Client.get("/code-execution/priority-chain");
      setProvidersData(res.data);
      if (res.data?.priorityChain && Array.isArray(res.data.priorityChain)) {
        setPriorityChain(res.data.priorityChain);
      }
    } catch (err) {
      console.error("Failed to load compiler priority chain:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePriorityChain() {
    try {
      setUpdating(true);
      const res = await Client.post("/code-execution/priority-chain", {
        priorityChain: priorityChain
      });
      alert(res.data?.message || "Compiler priority order updated successfully!");
      await fetchProviders();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update compiler priority order.");
    } finally {
      setUpdating(false);
    }
  }

  function handlePriorityChange(index, newEngine) {
    const newChain = [...priorityChain];
    const oldEngineAtIdx = newChain[index];
    const existingIdx = newChain.indexOf(newEngine);

    if (existingIdx !== -1 && existingIdx !== index) {
      // Swap positions
      newChain[existingIdx] = oldEngineAtIdx;
    }
    newChain[index] = newEngine;
    setPriorityChain(newChain);
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

  async function handleTestEngine(providerName, testLang = "java") {
    try {
      setTestingProvider(providerName);
      const startTime = Date.now();
      let resData;

      if (providerName === "wasm-local") {
        if (testLang === "python") {
          resData = await executeWasmOrFallback(
            'print("Browser WASM Diagnostic: Python 3.11 Local Execution OK")',
            '',
            'python'
          );
        } else if (testLang === "cpp") {
          resData = await executeWasmOrFallback(
            '#include <iostream>\nusing namespace std;\nint main() { cout << "Browser WASM Diagnostic: C++17 Local Execution OK"; return 0; }',
            '',
            'cpp'
          );
        } else {
          resData = await executeWasmOrFallback(
            'public class Main { public static void main(String[] args) { System.out.println("Java WASM Engine OK"); } }',
            '',
            'java'
          );
        }
      } else {
        const res = await Client.post(`/code-execution/test/${providerName}`, {
          script: 'public class Main { public static void main(String[] args) { System.out.println("Engine Diagnostic OK"); } }',
          stdin: "",
          language: "java"
        });
        resData = res.data;
      }

      const latency = Date.now() - startTime;
      setTestResults((prev) => ({
        ...prev,
        [providerName]: {
          success: true,
          output: resData?.stdout || resData?.output || "OK",
          latency: `${latency}ms`,
          engineUsed: resData?.providerUsed || providerName
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
    "wasm-local": {
      name: "Browser WASM Engine (Client-Side)",
      url: "Local WebAssembly Sandbox / Student CPU",
      desc: "Zero-cost in-browser execution running entirely on candidate CPU via WebAssembly (Pyodide, C++ WASI, Java VM). Near-instant latency (~1ms - 10ms) with $0 server cost. Real-time compilation & syntax error reporting directly in candidate UI.",
      languages: ["Python 3.11 (Pyodide)", "C++ (WASM Engine)", "Java 17 (Local Sandbox)", "C (ANSI C Engine)"],
      icon: "🌐"
    },
    onecompiler: {
      name: "OneCompiler Engine",
      url: "https://api.onecompiler.com/v1/run",
      desc: "High-speed isolated cloud container runner with instant latency (~19ms) and high-concurrency capacity.",
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

  const priorityLabels = [
    { rank: 1, title: "🥇 1st Priority (Primary Engine)", badge: "Primary", color: "#34D399" },
    { rank: 2, title: "🥈 2nd Priority (Tier-1 Fallback)", badge: "Fallback 1", color: "#60A5FA" },
    { rank: 3, title: "🥉 3rd Priority (Tier-2 Fallback)", badge: "Fallback 2", color: "#FBBF24" }
  ];

  const availableEngines = [
    { key: "wasm-local", label: "🌐 Browser WASM Engine (Client-Side - Instant 1ms)" },
    { key: "onecompiler", label: "⚡ OneCompiler Engine (Cloud Container - 19ms)" },
    { key: "jdoodle", label: "☕ JDoodle Compiler (Cloud Judge)" }
  ];

  return (
    <AppShell
      title="Compiler Engines & Multi-Tier Priority Hub"
      subtitle="Configure compiler priority hierarchy, manage automatic failover cascades, and optimize local WebAssembly caching."
      activeNav="/admin/compiler-settings"
    >
      <div className="dashboard-shell" style={{ maxWidth: 1040, margin: "0 auto" }}>
        
        {/* Multi-Tier Compiler Priority Order Manager */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.06))",
            borderColor: "rgba(99, 102, 241, 0.35)",
            marginBottom: 24,
            padding: "22px 26px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.6rem" }}>🔀</span>
                <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
                  Multi-Tier Compiler Priority & Automatic Failover Cascade
                </h3>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Define the hierarchical execution sequence for candidate code evaluation. If an engine encounters a <strong>quota limit (429/502)</strong> or is unsupported, the assessment transparently cascades to the next priority engine without candidate interruption.
              </p>
            </div>
            
            <button
              type="button"
              className="primary-btn"
              style={{ padding: "8px 18px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
              onClick={handleSavePriorityChain}
              disabled={updating}
            >
              {updating ? "Saving..." : "💾 Save Priority Hierarchy"}
            </button>
          </div>

          {/* Priority Selectors */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 18 }}>
            {priorityLabels.map((p, idx) => (
              <div
                key={p.rank}
                style={{
                  background: "var(--bg-surface-2)",
                  border: `1px solid ${idx === 0 ? "rgba(52, 211, 153, 0.4)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "14px 16px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: "0.88rem", color: p.color }}>{p.title}</strong>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: `${p.color}22`,
                      color: p.color
                    }}
                  >
                    {p.badge}
                  </span>
                </div>
                <select
                  className="input-field"
                  style={{
                    width: "100%",
                    fontSize: "0.82rem",
                    padding: "8px 10px",
                    background: "var(--bg-surface-1)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)"
                  }}
                  value={priorityChain[idx] || availableEngines[idx]?.key}
                  onChange={(e) => handlePriorityChange(idx, e.target.value)}
                >
                  {availableEngines.map((eng) => (
                    <option key={eng.key} value={eng.key}>
                      {eng.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Visual Cascade Flow */}
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px dashed rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              fontSize: "0.82rem"
            }}
          >
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Failover Cascade Flow:</span>
            {priorityChain.map((engineKey, idx) => {
              const details = engineDetails[engineKey] || { name: engineKey, icon: "⚙️" };
              return (
                <div key={engineKey} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: idx === 0 ? "rgba(52, 211, 153, 0.15)" : "var(--bg-surface-2)",
                      border: `1px solid ${idx === 0 ? "rgba(52, 211, 153, 0.4)" : "var(--border-subtle)"}`,
                      padding: "4px 10px",
                      borderRadius: "var(--radius-sm)",
                      color: idx === 0 ? "#34D399" : "var(--text-primary)",
                      fontWeight: 600
                    }}
                  >
                    <span>{details.icon}</span>
                    <span>{details.name?.split(" (")[0] || engineKey}</span>
                  </div>
                  {idx < priorityChain.length - 1 && (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      ➔ <em style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>failover</em> ➔
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Client-Side WASM Local Storage & Cache Manager */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(99, 102, 241, 0.04))",
            borderColor: "rgba(99, 102, 241, 0.3)",
            marginBottom: 24,
            padding: "18px 24px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: "1.8rem" }}>💾</span>
              <div>
                <strong style={{ color: "var(--primary-light)", fontSize: "1rem" }}>
                  Client-Side WASM Local Storage (One-Time Download)
                </strong>
                <p style={{ margin: "3px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Pre-downloads and stores Python (Pyodide), C++ WASM, and Java runtimes in candidate's browser <code>CacheStorage</code>.
                  Subsequent runs load in <strong>&lt;10ms</strong> with <strong>$0 server cost</strong> and <strong>0MB bandwidth</strong>.
                </p>
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: "0.78rem" }}>
                  <span style={{ color: cacheStats.isCached ? "#34D399" : "#FBBF24", fontWeight: 600 }}>
                    {cacheStats.isCached ? `● Cached Locally (${cacheStats.sizeMB})` : "○ Not Cached Yet"}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    Assets: {cacheStats.fileCount} chunks
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="primary-btn"
                style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                onClick={handlePrecacheWasm}
                disabled={Boolean(cachingProgress)}
              >
                {cachingProgress ? `${cachingProgress.percent}% Caching...` : "⚡ Pre-cache Compiler Pack"}
              </button>

              {cacheStats.isCached && (
                <button
                  type="button"
                  className="ghost-btn"
                  style={{ padding: "8px 12px", fontSize: "0.82rem", color: "#F87171" }}
                  onClick={handleClearWasmCache}
                >
                  🗑️ Clear Cache
                </button>
              )}
            </div>
          </div>

          {cachingProgress && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(99, 102, 241, 0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 4 }}>
                <span style={{ color: "var(--text-secondary)" }}>{cachingProgress.msg}</span>
                <span style={{ color: "var(--primary-light)", fontWeight: 700 }}>{cachingProgress.percent}%</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "var(--bg-surface-2)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${cachingProgress.percent}%`,
                    height: "100%",
                    background: "var(--primary-gradient)",
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
            </div>
          )}
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
              const rankIdx = priorityChain.indexOf(provider.name);
              const isPrimary = rankIdx === 0;
              const rankText = rankIdx === 0 ? "🥇 1st Priority (Primary)" : rankIdx === 1 ? "🥈 2nd Priority (Fallback 1)" : rankIdx === 2 ? "🥉 3rd Priority (Fallback 2)" : "Configured";
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
                        <span
                          className={`status-chip ${isPrimary ? "approved" : "pending"}`}
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: isPrimary ? "rgba(52, 211, 153, 0.15)" : undefined,
                            color: isPrimary ? "#34D399" : undefined
                          }}
                        >
                          {rankText}
                        </span>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", gap: 8 }}>
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
                        {isPrimary ? "Current Default Primary" : "Promote to 1st Priority"}
                      </button>

                      {provider.name !== "wasm-local" && (
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ padding: "8px 12px", fontSize: "0.82rem" }}
                          onClick={() => handleTestEngine(provider.name, "java")}
                          disabled={testingProvider === provider.name || !provider.configured}
                        >
                          {testingProvider === provider.name ? "Testing..." : "⚡ Test Run"}
                        </button>
                      )}
                    </div>

                    {provider.name === "wasm-local" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleTestEngine(provider.name, "python")}
                          disabled={testingProvider === provider.name}
                        >
                          {testingProvider === provider.name ? "Testing..." : "🐍 Test Python"}
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleTestEngine(provider.name, "cpp")}
                          disabled={testingProvider === provider.name}
                        >
                          {testingProvider === provider.name ? "Testing..." : "⚡ Test C++"}
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleTestEngine(provider.name, "java")}
                          disabled={testingProvider === provider.name}
                        >
                          {testingProvider === provider.name ? "Testing..." : "☕ Test Java"}
                        </button>
                      </div>
                    )}
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
