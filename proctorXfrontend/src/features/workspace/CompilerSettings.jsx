import { useState, useEffect } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import { executeWasmOrFallback } from "../exam/wasm/wasmRunner";
import {
  isWasmCached,
  precacheLanguage,
  getDetailedCacheStats,
  clearWasmCache,
  PYTHON_WASM_CHUNKS,
  JAVA_WASM_CHUNKS,
  CPP_WASM_CHUNKS
} from "../exam/wasm/wasmCacheService";
import "../../App.css";

export default function CompilerSettings() {
  const [providersData, setProvidersData] = useState(null);
  const [priorityChain, setPriorityChain] = useState(["wasm-local", "transpiler-local", "onecompiler", "jdoodle"]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [testingProvider, setTestingProvider] = useState(null);
  const [detailedStats, setDetailedStats] = useState({
    python: { isCached: false, sizeMB: "0 MB", approxMB: "~12 MB", fileCount: 0 },
    java: { isCached: false, sizeMB: "0 MB", approxMB: "~3.2 MB", fileCount: 0 },
    cpp: { isCached: false, sizeMB: "0 MB", approxMB: "~0.5 MB", fileCount: 0 },
    total: { isCached: false, sizeMB: "0 MB", approxMB: "~16 MB", fileCount: 0 }
  });
  const [cachingProgress, setCachingProgress] = useState({});

  useEffect(() => {
    fetchProviders();
    loadCacheStats();
  }, []);

  async function loadCacheStats() {
    const stats = await getDetailedCacheStats();
    setDetailedStats(stats);
  }

  async function handlePrecache(langKey) {
    setCachingProgress((prev) => ({
      ...prev,
      [langKey]: { percent: 0, msg: `Initializing ${langKey.toUpperCase()} download...` }
    }));

    await precacheLanguage(langKey, (percent, msg) => {
      setCachingProgress((prev) => ({
        ...prev,
        [langKey]: { percent, msg }
      }));
    });

    await loadCacheStats();
    setTimeout(() => {
      setCachingProgress((prev) => {
        const next = { ...prev };
        delete next[langKey];
        return next;
      });
    }, 3000);
  }

  async function handleClearWasmCache() {
    if (confirm("Clear local client-side WASM & compiler cache for all languages?")) {
      await clearWasmCache();
      await loadCacheStats();
      alert("Local Compiler Cache cleared successfully.");
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
      alert(res.data?.message || "Compiler priority hierarchy updated successfully!");
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
      setTestingProvider(`${providerName}-${testLang}`);
      const startTime = Date.now();
      let resData;

      if (providerName === "wasm-local") {
        if (testLang === "python") {
          resData = await executeWasmOrFallback(
            'print("Browser WASM Toolchain Diagnostic: Python 3.11 Execution OK")',
            '',
            'python',
            'wasm-local'
          );
        } else if (testLang === "cpp") {
          resData = await executeWasmOrFallback(
            '#include <iostream>\n#include <vector>\nusing namespace std;\nint main() { vector<int> v = {1, 2, 3}; cout << "Browser C++ WASM Toolchain Diagnostic OK. Vector size: " << v.size(); return 0; }',
            '',
            'cpp',
            'wasm-local'
          );
        } else {
          resData = await executeWasmOrFallback(
            'import java.util.*;\npublic class Main { public static void main(String[] args) { System.out.println("Java WASM CheerpJ+ECJ Engine Diagnostic OK"); } }',
            '',
            'java',
            'wasm-local'
          );
        }
      } else if (providerName === "transpiler-local") {
        if (testLang === "python") {
          resData = await executeWasmOrFallback(
            'print("Client JS Transpiler Diagnostic: Python Execution OK")',
            '',
            'python',
            'transpiler-local'
          );
        } else if (testLang === "cpp") {
          resData = await executeWasmOrFallback(
            '#include <iostream>\nusing namespace std;\nint main() { cout << "Client JS Transpiler Diagnostic: C++ Execution OK"; return 0; }',
            '',
            'cpp',
            'transpiler-local'
          );
        } else {
          resData = await executeWasmOrFallback(
            'import java.util.*;\npublic class Main { public static void main(String[] args) { System.out.println("Client JS Transpiler: Java Execution OK"); } }',
            '',
            'java',
            'transpiler-local'
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
        [`${providerName}-${testLang}`]: {
          success: true,
          output: resData?.stdout || resData?.output || "OK",
          latency: `${latency}ms`,
          engineUsed: resData?.providerUsed || providerName
        }
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [`${providerName}-${testLang}`]: {
          success: false,
          error: err?.response?.data?.message || err?.message || "Execution Failed"
        }
      }));
    } finally {
      setTestingProvider(null);
    }
  }

  const languagePacks = [
    {
      key: "python",
      name: "Python 3.11 WASM Package",
      icon: "🐍",
      approxMB: "~12 MB",
      stats: detailedStats.python,
      chunks: PYTHON_WASM_CHUNKS,
      desc: "Pyodide 3.11 WASM binary, standard library archive, core runtime, and isolated Web Worker runner."
    },
    {
      key: "java",
      name: "Java 17 CheerpJ + ECJ Compiler",
      icon: "☕",
      approxMB: "~3.2 MB",
      stats: detailedStats.java,
      chunks: JAVA_WASM_CHUNKS,
      desc: "CheerpJ 3.0 runtime, Eclipse Compiler for Java (ECJ.jar 3.1 MB), JVM sandbox, and isolated Web Worker runner."
    },
    {
      key: "cpp",
      name: "C & C++ WASM Toolchain",
      icon: "⚡",
      approxMB: "~0.5 MB",
      stats: detailedStats.cpp,
      chunks: CPP_WASM_CHUNKS,
      desc: "JSCPP WASM execution engine, STL container headers, algorithm polyfills, and isolated Web Worker runner."
    }
  ];

  const engineDetails = {
    "wasm-local": {
      name: "Browser WASM Engine (Client Toolchain)",
      url: "Web Workers / CheerpJ 3.0 (ECJ) / Clang WASM / Pyodide",
      desc: "Full client-side compiler toolchain running inside isolated Web Workers. Compiles Java with Eclipse Compiler (ECJ.jar), C/C++ in WASM memory, and Python in Pyodide. Protected by 5000ms Watchdog timer to safeguard webcam & UI from infinite loops.",
      languages: ["Python 3.11 (Pyodide)", "Java 17 (CheerpJ+ECJ)", "C++ (WASM Engine)", "C (ANSI C Engine)"],
      icon: "🌐"
    },
    "transpiler-local": {
      name: "Browser JS Transpiler Engine (Client-Side)",
      url: "Local JavaScript Transpiler Sandbox / Student CPU",
      desc: "Ultra-fast in-browser execution running on candidate CPU via JavaScript AST transpilation (Python AST, C++ AST, Java AST). Near-instant latency (~1ms) with $0 server cost and real-time syntax checking.",
      languages: ["Python 3.11 (Pure JS AST)", "C++ (Local Transpiler)", "Java 17 (Local Sandbox)", "C (Local Engine)"],
      icon: "⚡"
    },
    onecompiler: {
      name: "OneCompiler Engine",
      url: "https://api.onecompiler.com/v1/run",
      desc: "High-speed isolated cloud Linux container runner with instant latency (~19ms) and high-concurrency capacity.",
      languages: ["Java 17", "Python 3.11", "C++ (C++17)", "C (GCC)"],
      icon: "🚀"
    },
    jdoodle: {
      name: "JDoodle Compiler",
      url: "https://api.jdoodle.com/v1/execute",
      desc: "Enterprise cloud compiler infrastructure supporting standard competitive programming assessment environments.",
      languages: ["Java 17", "Python 3.11", "C++ (C++17)", "C (GCC)"],
      icon: "☕"
    }
  };

  const priorityLabels = [
    { rank: 1, title: "🥇 1st Priority (Primary Engine)", badge: "Primary", color: "#34D399" },
    { rank: 2, title: "🥈 2nd Priority (Tier-1 Fallback)", badge: "Fallback 1", color: "#60A5FA" },
    { rank: 3, title: "🥉 3rd Priority (Tier-2 Fallback)", badge: "Fallback 2", color: "#FBBF24" },
    { rank: 4, title: "🏅 4th Priority (Tier-3 Fallback)", badge: "Fallback 3", color: "#A78BFA" }
  ];

  const availableEngines = [
    { key: "wasm-local", label: "🌐 Browser WASM Engine (Web Workers + JVM + Clang)" },
    { key: "transpiler-local", label: "⚡ Browser JS Transpiler Engine (Client AST - 1ms)" },
    { key: "onecompiler", label: "🚀 OneCompiler Engine (Cloud Container - 19ms)" },
    { key: "jdoodle", label: "☕ JDoodle Compiler (Cloud Judge)" }
  ];

  return (
    <AppShell
      title="Compiler Engines & Multi-Tier Priority Hub"
      subtitle="Configure 4-tier compiler hierarchy, manage automatic failover cascades, and optimize per-language WebAssembly caching."
      activeNav="/admin/compiler-settings"
    >
      <div className="dashboard-shell" style={{ maxWidth: 1080, margin: "0 auto" }}>
        
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
                  4-Tier Compiler Hierarchy & Automatic Failover Cascade
                </h3>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Define the hierarchical execution sequence for candidate code evaluation across <strong>4 distinct engines</strong>. If an engine encounters a <strong>quota limit (429/502)</strong> or timeout, the assessment seamlessly cascades to the next priority engine without candidate interruption.
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 18 }}>
            {priorityLabels.map((p, idx) => (
              <div
                key={p.rank}
                style={{
                  background: "var(--bg-surface-2)",
                  border: `1px solid ${idx === 0 ? "rgba(52, 211, 153, 0.4)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: "0.84rem", color: p.color }}>{p.title}</strong>
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
                    fontSize: "0.80rem",
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
              gap: 8,
              flexWrap: "wrap",
              fontSize: "0.82rem"
            }}
          >
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Failover Cascade Flow:</span>
            {priorityChain.map((engineKey, idx) => {
              const details = engineDetails[engineKey] || { name: engineKey, icon: "⚙️" };
              return (
                <div key={engineKey} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: idx === 0 ? "rgba(52, 211, 153, 0.15)" : "var(--bg-surface-2)",
                      border: `1px solid ${idx === 0 ? "rgba(52, 211, 153, 0.4)" : "var(--border-subtle)"}`,
                      padding: "4px 8px",
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
                      ➔ <em style={{ color: "var(--text-secondary)", fontSize: "0.68rem" }}>failover</em> ➔
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Client-Side WASM Local Storage & Multi-Language Cache Hub */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(99, 102, 241, 0.04))",
            borderColor: "rgba(99, 102, 241, 0.3)",
            marginBottom: 24,
            padding: "20px 24px"
          }}
        >
          {/* Header Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: "2rem" }}>💾</span>
              <div>
                <strong style={{ color: "var(--primary-light)", fontSize: "1.05rem" }}>
                  Client-Side WASM Compiler Local Storage & Offline Cache Hub
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Download runtime packages once into browser <code>CacheStorage</code>. Candidates execute code in isolated Web Workers with <strong>&lt;10ms startup</strong>, <strong>$0 server cost</strong>, and real compiler diagnostics.
                </p>
                <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: "0.78rem" }}>
                  <span style={{ color: detailedStats.total.isCached ? "#34D399" : "#FBBF24", fontWeight: 600 }}>
                    {detailedStats.total.isCached ? `● Total Cached: ${detailedStats.total.sizeMB} (${detailedStats.total.fileCount} files)` : "○ No Compiler Packages Cached"}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    Total Bundle Size: {detailedStats.total.approxMB}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="primary-btn"
                style={{ padding: "8px 16px", fontSize: "0.82rem" }}
                onClick={() => handlePrecache("all")}
                disabled={Boolean(cachingProgress["all"])}
              >
                {cachingProgress["all"] ? `${cachingProgress["all"].percent}% Downloading All...` : "📦 Download All 3 Packages (~57 MB)"}
              </button>

              {detailedStats.total.isCached && (
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

          {/* Master Progress Bar if caching all */}
          {cachingProgress["all"] && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 6, border: "1px solid rgba(99, 102, 241, 0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 4 }}>
                <span style={{ color: "var(--text-secondary)" }}>{cachingProgress["all"].msg}</span>
                <span style={{ color: "var(--primary-light)", fontWeight: 700 }}>{cachingProgress["all"].percent}%</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "var(--bg-surface-2)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${cachingProgress["all"].percent}%`,
                    height: "100%",
                    background: "var(--primary-gradient)",
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
            </div>
          )}

          {/* Individual Language Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14 }}>
            {languagePacks.map((pack) => {
              const isPackCached = pack.stats?.isCached;
              const packProgress = cachingProgress[pack.key];

              return (
                <div
                  key={pack.key}
                  style={{
                    background: "var(--bg-surface-2)",
                    border: `1px solid ${isPackCached ? "rgba(52, 211, 153, 0.35)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.4rem" }}>{pack.icon}</span>
                        <div>
                          <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{pack.name}</strong>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Download Size: {pack.approxMB}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: isPackCached ? "rgba(52, 211, 153, 0.15)" : "rgba(251, 191, 36, 0.15)",
                          color: isPackCached ? "#34D399" : "#FBBF24"
                        }}
                      >
                        {isPackCached ? `● ${pack.stats?.sizeMB}` : "○ Not Cached"}
                      </span>
                    </div>

                    <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {pack.desc}
                    </p>
                  </div>

                  <div>
                    {packProgress && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: 3 }}>
                          <span style={{ color: "var(--text-secondary)" }}>{packProgress.msg}</span>
                          <span style={{ color: "var(--primary-light)", fontWeight: 700 }}>{packProgress.percent}%</span>
                        </div>
                        <div style={{ width: "100%", height: 4, background: "var(--bg-surface-1)", borderRadius: 2, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${packProgress.percent}%`,
                              height: "100%",
                              background: "var(--primary-gradient)",
                              transition: "width 0.3s ease"
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="secondary-btn"
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        fontSize: "0.76rem",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 6
                      }}
                      onClick={() => handlePrecache(pack.key)}
                      disabled={Boolean(packProgress) || Boolean(cachingProgress["all"])}
                    >
                      {packProgress ? `${packProgress.percent}% Caching...` : isPackCached ? `✓ Re-Download Pack (${pack.approxMB})` : `⚡ Download Pack (${pack.approxMB})`}
                    </button>
                  </div>
                </div>
              );
            })}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
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
              const rankText = rankIdx === 0 ? "🥇 1st Priority (Primary)" : rankIdx === 1 ? "🥈 2nd Priority (Fallback 1)" : rankIdx === 2 ? "🥉 3rd Priority (Fallback 2)" : rankIdx === 3 ? "🏅 4th Priority (Fallback 3)" : "Configured";
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
                          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>
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

                    <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
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

                  {/* Actions: Set as Primary & Run Diagnostics */}
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

                      {provider.name !== "wasm-local" && provider.name !== "transpiler-local" && (
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ padding: "8px 12px", fontSize: "0.82rem" }}
                          onClick={() => handleTestEngine(provider.name, "java")}
                          disabled={testingProvider === `${provider.name}-java` || !provider.configured}
                        >
                          {testingProvider === `${provider.name}-java` ? "Testing..." : "⚡ Test Run"}
                        </button>
                      )}
                    </div>

                    {(provider.name === "wasm-local" || provider.name === "transpiler-local") && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleTestEngine(provider.name, "python")}
                          disabled={Boolean(testingProvider)}
                        >
                          {testingProvider === `${provider.name}-python` ? "Testing..." : "🐍 Test Python"}
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleTestEngine(provider.name, "cpp")}
                          disabled={Boolean(testingProvider)}
                        >
                          {testingProvider === `${provider.name}-cpp` ? "Testing..." : "⚡ Test C++"}
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ flex: 1, padding: "6px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleTestEngine(provider.name, "java")}
                          disabled={Boolean(testingProvider)}
                        >
                          {testingProvider === `${provider.name}-java` ? "Testing..." : "☕ Test Java"}
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
