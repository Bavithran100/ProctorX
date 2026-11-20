import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

const CANONICAL_DAG = {
  ARRAYS_STRINGS: ["TWO_POINTERS", "SLIDING_WINDOW", "BINARY_SEARCH", "INTERVALS_GREEDY"],
  HASH_TABLES: ["SLIDING_WINDOW", "TWO_POINTERS", "BFS_DFS"],
  LINKED_LISTS: ["TWO_POINTERS", "BFS_DFS"],
  STACKS_QUEUES: ["MONOTONIC_QUEUE_STACK", "BFS_DFS"],
  TREES_BST: ["BFS_DFS", "TOP_K_HEAP"],
  GRAPHS: ["BFS_DFS", "UNION_FIND", "TOP_K_HEAP"],
  RECURSION_BACKTRACKING: ["BFS_DFS"],
  DYNAMIC_PROGRAMMING: ["INTERVALS_GREEDY", "TWO_POINTERS"]
};

const PRESETS = [
  {
    id: "CAMPUS",
    name: "Campus Placement Core",
    icon: "🎯",
    desc: "Arrays & Strings + Two Pointers. Calibrated for Big-O time efficiency and O(N) scaling.",
    topic: "ARRAYS_STRINGS",
    pattern: "TWO_POINTERS",
    competency: "ALGORITHMIC_EFFICIENCY",
    difficulty: "MEDIUM",
    prompt: "Design campus placement challenges focusing on Two Pointers on arrays with strict O(N) time bounds and scale stress test cases at N=25,000."
  },
  {
    id: "SYSTEMS",
    name: "System Software & Scale",
    icon: "⚡",
    desc: "Graphs & Trees + BFS/DFS. Calibrated for memory limits and runtime crash safety.",
    topic: "GRAPHS",
    pattern: "BFS_DFS",
    competency: "CODE_RELIABILITY",
    difficulty: "HARD",
    prompt: "Design graph and tree traversal challenges with recursion limits, edge cases, cycle prevention, and optimal space complexity."
  },
  {
    id: "DEFECT_TRAP",
    name: "Reliability & Defect Trap",
    icon: "🛡️",
    desc: "Stacks & Queues + Monotonic Stack. Inoculates against off-by-one errors and edge traps.",
    topic: "STACKS_QUEUES",
    pattern: "MONOTONIC_QUEUE_STACK",
    competency: "EDGE_CASE_RESILIENCE",
    difficulty: "MEDIUM",
    prompt: "Design monotonic stack challenges with edge conditions (empty collections, single-element, duplicates) to test defensive boundary validation."
  },
  {
    id: "FLUENCY",
    name: "Fast Code Fluency",
    icon: "🧠",
    desc: "Hash Tables + Sliding Window. Tests rapid syntactic precision and clean coding.",
    topic: "HASH_TABLES",
    pattern: "SLIDING_WINDOW",
    competency: "IMPLEMENTATION_FLUENCY",
    difficulty: "EASY_MEDIUM",
    prompt: "Design sliding window and hash table frequency matching problems testing syntax precision, input parsing, and clean implementation."
  }
];

export default function CodingQuestionPlan() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [questionCount, setQuestionCount] = useState(
    Number(location.state?.questionCount) || 3
  );
  const [selectedTopic, setSelectedTopic] = useState("ARRAYS_STRINGS");
  const [selectedPattern, setSelectedPattern] = useState("TWO_POINTERS");
  const [selectedCompetency, setSelectedCompetency] = useState("ALGORITHMIC_EFFICIENCY");
  const [selectedDifficulty, setSelectedDifficulty] = useState("MEDIUM");
  const [planningPrompt, setPlanningPrompt] = useState(
    PRESETS[0].prompt
  );
  const [activePreset, setActivePreset] = useState("CAMPUS");

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const allowedPatterns = CANONICAL_DAG[selectedTopic] || ["TWO_POINTERS"];

  function handleSelectPreset(preset) {
    setActivePreset(preset.id);
    setSelectedTopic(preset.topic);
    setSelectedPattern(preset.pattern);
    setSelectedCompetency(preset.competency);
    setSelectedDifficulty(preset.difficulty);
    setPlanningPrompt(preset.prompt);
  }

  function handleTopicChange(topic) {
    setSelectedTopic(topic);
    const validPatterns = CANONICAL_DAG[topic] || [];
    if (!validPatterns.includes(selectedPattern)) {
      setSelectedPattern(validPatterns[0] || "AUTO");
    }
    setActivePreset("CUSTOM");
  }

  async function generatePlan() {
    setLoading(true);
    try {
      const compositePrompt = `[AlgoCortex Competency Engine Studio]
Target Concept: ${selectedTopic}
Algorithmic Pattern: ${selectedPattern}
Telemetry Competency Focus: ${selectedCompetency}
Difficulty Tier: ${selectedDifficulty}
Planned Questions: ${questionCount}
Specifications: ${planningPrompt}`;

      const res = await Client.post("/admin/ai/coding-plan", {
        prompt: compositePrompt,
        questionCount: questionCount
      });

      const generatedPlan = res.data;

      setPlan({
        topic: `${selectedTopic} (${selectedPattern})`,
        concept: selectedTopic,
        pattern: selectedPattern,
        competency: selectedCompetency,
        questionCount: questionCount,
        difficulty: selectedDifficulty,
        targetComplexity: generatedPlan.targetComplexity || "Optimal Time & Space (e.g. O(N))",
        constraints: generatedPlan.constraints || "Strict boundary & N=25,000 scale constraints",
        testCaseFocus: "5 Structured Test Cases (Sample, Boundary, Core, Scale Stress N=25,000, Defect Trap)",
        additionalInstructions: generatedPlan.additionalInstructions || ""
      });
    } catch (error) {
      console.error("AI planning failed", error);
      alert(error?.response?.data?.message || "AI planning failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function continueToGenerator() {
    if (!plan) {
      alert("Please generate an AI plan first.");
      return;
    }

    navigate(`/admin/exams/${examId}/coding-ai`, { state: { plan } });
  }

  return (
    <AppShell
      title="AlgoCortex Competency Exam Planner"
      subtitle="Design competency-calibrated coding assessments powered by the AlgoCortex 20-D vector engine."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 40 }}>
        {/* Header Hero Card */}
        <div className="card" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.8))", border: "1px solid rgba(255, 255, 255, 0.12)", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="hero-badge" style={{ color: "#34D399", borderColor: "rgba(52, 211, 153, 0.3)" }}>
              Exam ID: #{examId} · AlgoCortex Competency Studio
            </div>
            <span style={{ fontSize: "11px", color: "#94A3B8" }}>
              Native Sandbox Execution Enabled
            </span>
          </div>
          <h2 style={{ fontSize: "1.35rem", color: "#F8FAFC", margin: "0 0 6px" }}>
            Vector-Calibrated Assessment Blueprint
          </h2>
          <p style={{ color: "#94A3B8", fontSize: "13px", lineHeight: "1.5", margin: 0 }}>
            Choose an industry curriculum preset or select exact cognitive vectors from the DAG. The engine generates programming challenges with 5 ground-truth test cases verified by the backend sandbox.
          </p>
        </div>

        {/* 1. Fast Industry Presets */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#CBD5E1", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            1. Industry Curriculum Presets
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            {PRESETS.map((p) => {
              const isActive = activePreset === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  style={{
                    background: isActive ? "rgba(99, 102, 241, 0.18)" : "rgba(15, 23, 42, 0.7)",
                    border: `1px solid ${isActive ? "#818CF8" : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: "10px",
                    padding: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "0 4px 14px rgba(99, 102, 241, 0.25)" : "none"
                  }}
                >
                  <div style={{ fontSize: "20px", marginBottom: 6 }}>{p.icon}</div>
                  <div style={{ color: "#F8FAFC", fontSize: "13px", fontWeight: 700, marginBottom: 4 }}>
                    {p.name}
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "11px", lineHeight: "1.4" }}>
                    {p.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Interactive Vector Controls */}
        <div className="card" style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: "1.1rem", color: "#F8FAFC", margin: 0 }}>
              2. Cognitive Vector & Question Configuration
            </h3>
            <span style={{ fontSize: "11px", color: "#34D399", fontWeight: 600 }}>
              🔗 Canonical DAG Connected
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 16 }}>
            {/* Concept */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase" }}>
                Target Concept (8 Foundational)
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => handleTopicChange(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#F8FAFC",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  outline: "none"
                }}
              >
                {Object.keys(CANONICAL_DAG).map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            {/* Pattern */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase" }}>
                Algorithmic Pattern (DAG Filtered)
              </label>
              <select
                value={selectedPattern}
                onChange={(e) => {
                  setSelectedPattern(e.target.value);
                  setActivePreset("CUSTOM");
                }}
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#F8FAFC",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  outline: "none"
                }}
              >
                {allowedPatterns.map((p) => (
                  <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            {/* Competency Focus */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase" }}>
                Competency Vector Focus
              </label>
              <select
                value={selectedCompetency}
                onChange={(e) => {
                  setSelectedCompetency(e.target.value);
                  setActivePreset("CUSTOM");
                }}
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#F8FAFC",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  outline: "none"
                }}
              >
                <option value="ALGORITHMIC_EFFICIENCY">⚡ ALGORITHMIC EFFICIENCY (Big-O Scale)</option>
                <option value="CODE_RELIABILITY">🛡️ CODE RELIABILITY (Crash Safety)</option>
                <option value="EDGE_CASE_RESILIENCE">🎯 EDGE CASE RESILIENCE (Defect Trap)</option>
                <option value="IMPLEMENTATION_FLUENCY">🧠 IMPLEMENTATION FLUENCY (Syntax Hygiene)</option>
              </select>
            </div>

            {/* Difficulty & Count */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94A3B8", marginBottom: 6, textTransform: "uppercase" }}>
                Difficulty Tier & Count
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => {
                    setSelectedDifficulty(e.target.value);
                    setActivePreset("CUSTOM");
                  }}
                  style={{
                    flex: 1,
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#F8FAFC",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    outline: "none"
                  }}
                >
                  <option value="EASY">EASY</option>
                  <option value="EASY_MEDIUM">EASY-MEDIUM</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="MEDIUM_HARD">MEDIUM-HARD</option>
                  <option value="HARD">HARD</option>
                </select>

                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  style={{
                    width: "80px",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#F8FAFC",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    outline: "none"
                  }}
                >
                  {[1, 2, 3, 4, 5].map((cnt) => (
                    <option key={cnt} value={cnt}>{cnt} Qs</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description Prompt */}
          <div className="field-stack">
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#CBD5E1", marginBottom: 6 }}>
              Architectural Prompt & Constraints Description
            </label>
            <textarea
              value={planningPrompt}
              onChange={(e) => {
                setPlanningPrompt(e.target.value);
                setActivePreset("CUSTOM");
              }}
              style={{
                minHeight: 80,
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                color: "#F8FAFC",
                padding: "10px",
                fontSize: "12px",
                lineHeight: "1.5"
              }}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              className="primary-btn"
              onClick={generatePlan}
              disabled={loading}
              style={{ padding: "10px 24px", fontWeight: 700 }}
            >
              {loading ? "Synthesizing AlgoCortex Blueprint..." : "✨ Synthesize Competency Blueprint"}
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="card" style={{ textAlign: "center", padding: 36, background: "rgba(15, 23, 42, 0.8)" }}>
            <div className="hero-badge" style={{ color: "#818CF8", marginBottom: 12 }}>
              Calibrating Cognitive Vectors with Gemini
            </div>
            <p style={{ color: "#94A3B8", fontSize: "13px" }}>
              Synthesizing problem constraints, asymptotic expectations, and 5 structured test case profiles...
            </p>
          </div>
        )}

        {/* Generated Blueprint Preview Card */}
        {plan && (
          <div className="card question-preview" style={{ background: "rgba(15, 23, 42, 0.95)", border: "1px solid #6366F1" }}>
            <div className="question-preview-header" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", color: "#F8FAFC", margin: "0 0 4px" }}>
                  Curriculum Blueprint Ready
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#94A3B8", margin: 0 }}>
                  Ready to synthesize {plan.questionCount} coding challenges with 5 verified test cases each.
                </p>
              </div>
              <span className="status-chip approved" style={{ background: "rgba(52, 211, 153, 0.15)", color: "#34D399", borderColor: "rgba(52, 211, 153, 0.3)" }}>
                {plan.questionCount} Problems · {plan.difficulty}
              </span>
            </div>

            <div className="meta-grid" style={{ marginTop: 16 }}>
              <div className="meta-item">
                <span>Concept & Pattern</span>
                <strong style={{ color: "#A5B4FC" }}>{plan.topic}</strong>
              </div>
              <div className="meta-item">
                <span>Competency Focus</span>
                <strong style={{ color: "#34D399" }}>{plan.competency}</strong>
              </div>
              <div className="meta-item" style={{ gridColumn: "span 2" }}>
                <span>Target Complexity</span>
                <strong>{plan.targetComplexity}</strong>
              </div>
              <div className="meta-item" style={{ gridColumn: "span 2" }}>
                <span>Test Suite Composition</span>
                <strong style={{ color: "#FBBF24" }}>{plan.testCaseFocus}</strong>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <button
                className="submit-btn"
                onClick={continueToGenerator}
                style={{ width: "100%", padding: "12px 24px", fontWeight: 700, fontSize: "14px" }}
              >
                Proceed to Generate 5-Test-Case Problems in Studio →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
