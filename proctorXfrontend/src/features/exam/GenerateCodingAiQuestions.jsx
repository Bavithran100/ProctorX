import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function GenerateCodingAIQuestions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const planningBrief = location.state?.plan;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [addingSingle, setAddingSingle] = useState(false);
  const [saving, setSaving] = useState(false);

  const [inputs, setInputs] = useState({});
  const [solutions, setSolutions] = useState({});
  const [manualOutputs, setManualOutputs] = useState({});
  const [generatedOutput, setGeneratedOutput] = useState({});
  const [executingSandbox, setExecutingSandbox] = useState({});

  function normalizeText(str) {
    if (str == null) return "";
    return String(str)
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }

  function parseQuestionFromResponse(rawQ) {
    return {
      ...rawQ,
      title: rawQ.title || "Coding Challenge",
      description: normalizeText(rawQ.description || rawQ.problemStatement || ""),
      difficulty: rawQ.difficulty || planningBrief?.difficulty || "MEDIUM",
      allowedLanguage: rawQ.allowedLanguage || "JAVA",
      testCases: (rawQ.testCases || []).map((tc) => ({
        input: normalizeText(tc.input || ""),
        expectedOutput: normalizeText(tc.expectedOutput || tc.output || "").trim(),
        sample: tc.sample !== false
      })),
      referenceSolution: rawQ.referenceSolution || rawQ.canonicalSolution || ""
    };
  }

  async function generateAllSequentially() {
    if (!planningBrief) {
      alert("Please create an AI plan before generating coding questions.");
      navigate(`/admin/exams/${examId}/coding-plan`);
      return;
    }

    const count = Number(planningBrief.questionCount) || 3;
    setTotalSteps(count);
    setLoading(true);
    setQuestions([]);
    setSolutions({});

    const accumulated = [];
    const newSolutions = {};

    try {
      for (let i = 1; i <= count; i++) {
        setCurrentStep(i);
        setProgressMsg(
          `Generating Problem ${i} of ${count} (${planningBrief.topic || "Core Concept"}) with 5 calibrated test cases...`
        );

        const res = await Client.post("/admin/ai/generate-single-coding-question", {
          ...planningBrief,
          questionCount: i
        });

        const rawList = res.data?.questions || [];
        const rawQ = rawList.length > 0 ? rawList[0] : (res.data?.question || res.data);
        const parsedQ = parseQuestionFromResponse(rawQ);

        accumulated.push(parsedQ);
        newSolutions[accumulated.length - 1] = parsedQ.referenceSolution;

        // Update state in real-time as each question finishes
        setQuestions([...accumulated]);
        setSolutions({ ...newSolutions });
      }
      setProgressMsg("");
    } catch (err) {
      console.error("AI question generation error:", err);
      alert(err?.response?.data?.message || "AI single question generation failed. You can add or retry questions individually.");
    } finally {
      setLoading(false);
      setProgressMsg("");
    }
  }

  async function regenerateQuestion(index) {
    if (!planningBrief) return;
    setRegeneratingIndex(index);

    try {
      const res = await Client.post("/admin/ai/generate-single-coding-question", {
        ...planningBrief,
        questionCount: index + 1
      });

      const rawList = res.data?.questions || [];
      const rawQ = rawList.length > 0 ? rawList[0] : (res.data?.question || res.data);
      const parsedQ = parseQuestionFromResponse(rawQ);

      const updated = [...questions];
      updated[index] = parsedQ;
      setQuestions(updated);
      setSolutions({ ...solutions, [index]: parsedQ.referenceSolution });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to regenerate this question.");
    } finally {
      setRegeneratingIndex(null);
    }
  }

  async function addAnotherQuestion() {
    if (!planningBrief) return;
    setAddingSingle(true);

    try {
      const nextIndex = questions.length + 1;
      const res = await Client.post("/admin/ai/generate-single-coding-question", {
        ...planningBrief,
        questionCount: nextIndex
      });

      const rawList = res.data?.questions || [];
      const rawQ = rawList.length > 0 ? rawList[0] : (res.data?.question || res.data);
      const parsedQ = parseQuestionFromResponse(rawQ);

      const updated = [...questions, parsedQ];
      setQuestions(updated);
      setSolutions({ ...solutions, [updated.length - 1]: parsedQ.referenceSolution });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to generate additional question.");
    } finally {
      setAddingSingle(false);
    }
  }

  function removeQuestion(index) {
    if (questions.length <= 1) {
      if (!window.confirm("Remove this problem? The exam will have 0 questions.")) return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);

    // Re-index solutions
    const newSolutions = {};
    updated.forEach((q, idx) => {
      newSolutions[idx] = solutions[idx] || q.referenceSolution;
    });
    setSolutions(newSolutions);
  }

  async function generateOutput(qIndex) {
    const input = inputs[qIndex];
    const solution = solutions[qIndex];

    if (!input) return alert("Please enter sample standard input.");
    if (!solution) return alert("Please verify the reference Java solution.");

    try {
      setExecutingSandbox({ ...executingSandbox, [qIndex]: true });
      const res = await Client.post("/code-execution/generate-output", {
        script: solution,
        stdin: normalizeText(input)
      });
      const data = res.data;

      if (!data.stdout && data.stdout !== "") {
        alert("Execution Error: Check your code and input formatting.");
        return;
      }

      setGeneratedOutput({
        ...generatedOutput,
        [qIndex]: (data.stdout || "").trim()
      });
    } catch (err) {
      console.error(err);
      alert("Judge execution error. Check compilation output.");
    } finally {
      setExecutingSandbox({ ...executingSandbox, [qIndex]: false });
    }
  }

  function addTestCase(qIndex) {
    const input = inputs[qIndex] != null ? inputs[qIndex] : "";
    const output = manualOutputs[qIndex] != null && manualOutputs[qIndex] !== ""
      ? manualOutputs[qIndex]
      : (generatedOutput[qIndex] || "");

    if (!input.trim() && !output.trim()) {
      alert("Please enter input and expected output for the test case.");
      return;
    }

    const updated = [...questions];
    updated[qIndex].testCases.push({
      input: normalizeText(input),
      expectedOutput: normalizeText(output).trim(),
      sample: updated[qIndex].testCases.length === 0
    });

    setQuestions(updated);
    setInputs({ ...inputs, [qIndex]: "" });
    setManualOutputs({ ...manualOutputs, [qIndex]: "" });
    setGeneratedOutput({ ...generatedOutput, [qIndex]: "" });
  }

  function removeTestCase(qIndex, tcIndex) {
    const updated = [...questions];
    updated[qIndex].testCases = updated[qIndex].testCases.filter((_, idx) => idx !== tcIndex);
    setQuestions(updated);
  }

  async function save() {
    if (questions.length === 0) {
      alert("Please generate at least one coding problem before saving.");
      return;
    }

    // Verify all questions have at least 1 testcase
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].testCases || questions[i].testCases.length === 0) {
        alert(`Problem #${i + 1} ("${questions[i].title}") does not have any verified test cases. Please add at least one test case.`);
        return;
      }
    }

    try {
      setSaving(true);
      for (let q of questions) {
        await Client.post(`/admin/exams/${examId}/coding-questions`, {
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          allowedLanguage: q.allowedLanguage || "JAVA",
          testCases: q.testCases.map((tc) => ({
            input: normalizeText(tc.input),
            expectedOutput: normalizeText(tc.expectedOutput || tc.output).trim(),
            sample: tc.sample !== false
          }))
        });
      }

      alert("All AI coding problems and testcases saved successfully!");
      navigate(`/admin/exams/${examId}/coding-manual`);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to save coding questions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="AlgoCortex Adaptive Coding Problem Generator"
      subtitle="Synthesize programming challenges one by one with 5 calibrated test cases and reference Java solutions."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 1060, margin: "0 auto", paddingBottom: 60 }}>
        {/* Planning Brief Header Card */}
        {planningBrief && (
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.8))", border: "1px solid rgba(255, 255, 255, 0.12)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div className="hero-badge" style={{ color: "#34D399", borderColor: "rgba(52, 211, 153, 0.3)" }}>
                  Blueprint Loaded · {planningBrief.topic}
                </div>
                <h3 style={{ fontSize: "1.25rem", color: "#F8FAFC", margin: "6px 0 4px" }}>
                  {planningBrief.concept ? `${planningBrief.concept} (${planningBrief.pattern || "Pattern"})` : planningBrief.topic}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#94A3B8", margin: 0 }}>
                  Target: {planningBrief.questionCount} Problems · Tier: {planningBrief.difficulty} · {planningBrief.targetComplexity || "Optimal Complexity"}
                </p>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="primary-btn"
                  onClick={generateAllSequentially}
                  disabled={loading || addingSingle}
                  style={{ background: "linear-gradient(135deg, #4F46E5, #6366F1)", border: "none" }}
                >
                  {loading
                    ? `Generating (${currentStep}/${totalSteps})...`
                    : questions.length > 0
                    ? "↻ Regenerate All Problems"
                    : "✨ Generate Coding Problems"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step-by-Step Generation Progress Banner */}
        {loading && (
          <div className="card" style={{ textAlign: "center", padding: "30px 20px", marginBottom: 24, border: "1px solid rgba(99, 102, 241, 0.3)", background: "rgba(15, 23, 42, 0.8)" }}>
            <div className="hero-badge" style={{ color: "#818CF8", marginBottom: 12 }}>
              Iterative Adaptive Synthesis Engine Active
            </div>
            <h3 style={{ fontSize: "1.1rem", color: "#F8FAFC", marginBottom: 8 }}>
              {progressMsg || `Synthesizing Challenge ${currentStep} of ${totalSteps}...`}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#94A3B8", maxWidth: 580, margin: "0 auto 16px" }}>
              Generating problem statement, input/output specifications, 5 calibrated test cases (Sample, Boundary, Scale Stress N=25,000, Defect Trap), and standalone Java reference solution.
            </p>
            <div style={{ width: "100%", maxWidth: 400, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, margin: "0 auto", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: totalSteps > 0 ? `${(currentStep / totalSteps) * 100}%` : "0%",
                  background: "linear-gradient(90deg, #6366F1, #34D399)",
                  transition: "width 0.4s ease"
                }}
              />
            </div>
          </div>
        )}

        {/* Generated Problems List */}
        {questions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", color: "#F8FAFC", margin: 0 }}>
                  Synthesized Coding Problems ({questions.length})
                </h3>
                <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                  Each challenge includes 5 ground-truth test cases and reference Java solution.
                </span>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={addAnotherQuestion}
                  disabled={loading || addingSingle}
                  style={{ fontSize: "0.85rem", padding: "8px 14px" }}
                >
                  {addingSingle ? "Generating 1 More..." : "+ Generate 1 More Problem with AI"}
                </button>

                <button
                  className="submit-btn"
                  onClick={save}
                  disabled={saving || loading}
                  style={{ fontSize: "0.85rem", padding: "8px 18px" }}
                >
                  {saving ? "Saving All Problems..." : "✓ Approve & Save All Problems"}
                </button>
              </div>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="card question-card" style={{ border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(15, 23, 42, 0.75)" }}>
                <div className="question-preview-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="status-chip" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#818CF8", fontWeight: 700 }}>
                      Problem #{i + 1}
                    </span>
                    <strong style={{ fontSize: "1.15rem", color: "#F8FAFC" }}>{q.title}</strong>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="status-chip approved" style={{ textTransform: "uppercase" }}>
                      {q.difficulty}
                    </span>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => regenerateQuestion(i)}
                      disabled={regeneratingIndex === i || loading}
                      style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                      title="Regenerate this specific problem with AI"
                    >
                      {regeneratingIndex === i ? "Regenerating..." : "↻ Regenerate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(i)}
                      style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, padding: "4px 8px" }}
                      title="Remove this problem"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    margin: "14px 0",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    background: "rgba(0, 0, 0, 0.25)",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.05)"
                  }}
                >
                  {q.description}
                </div>

                {/* Reference Solution Code Editor */}
                <div className="editor-shell" style={{ marginTop: 14 }}>
                  <div className="editor-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ color: "#F8FAFC" }}>Reference Solution (Java)</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 8 }}>
                        Standalone Java class Main · Verified against all 5 test cases
                      </span>
                    </div>
                  </div>
                  <Editor
                    height="240px"
                    defaultLanguage="java"
                    value={solutions[i] || ""}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      wrappingIndent: "indent",
                      automaticLayout: true
                    }}
                    onChange={(value) =>
                      setSolutions({ ...solutions, [i]: value })
                    }
                  />
                </div>

                {/* Custom Test Case Workbench */}
                <div className="card" style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: 16, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div className="hero-badge" style={{ color: "#818CF8", margin: 0, fontSize: "11px" }}>
                      Custom Test Case Workbench
                    </div>
                    <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                      Add manual inputs or execute reference solution via backend sandbox
                    </span>
                  </div>

                  <div className="form-grid">
                    <div className="field-stack">
                      <label style={{ fontSize: "12px", color: "#CBD5E1" }}>Test Input (stdin)</label>
                      <textarea
                        value={inputs[i] || ""}
                        placeholder="Enter sample input lines..."
                        style={{ minHeight: 65, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                        onChange={(e) =>
                          setInputs({ ...inputs, [i]: e.target.value })
                        }
                      />
                    </div>

                    <div className="field-stack">
                      <label style={{ fontSize: "12px", color: "#CBD5E1" }}>Expected Output (stdout)</label>
                      <textarea
                        value={manualOutputs[i] != null ? manualOutputs[i] : (generatedOutput[i] || "")}
                        placeholder="Enter expected output or click 'Run in Sandbox' below..."
                        style={{ minHeight: 65, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                        onChange={(e) =>
                          setManualOutputs({ ...manualOutputs, [i]: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="button-row" style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => generateOutput(i)}
                      disabled={executingSandbox[i]}
                      title="Run reference solution in the backend compiler sandbox to auto-compute expected output"
                      style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                    >
                      {executingSandbox[i] ? "Running Sandbox..." : "▶ Run in Compiler Sandbox"}
                    </button>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => addTestCase(i)}
                      style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                    >
                      + Add Test Case to Problem
                    </button>
                  </div>
                </div>

                {/* Verified Test Cases Grid */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h4 style={{ fontSize: "0.95rem", margin: 0, color: "#F8FAFC" }}>
                      Verified Test Cases ({(q.testCases || []).length})
                    </h4>
                    <span style={{ fontSize: "11px", color: "#34D399" }}>
                      ✓ {(q.testCases || []).filter(tc => tc.sample !== false).length} Visible Sample · {(q.testCases || []).filter(tc => tc.sample === false).length} Hidden Evaluation
                    </span>
                  </div>

                  {(q.testCases || []).length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      No test cases added yet. Generate or add test cases above.
                    </p>
                  ) : (
                    <div className="sample-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      {q.testCases.map((t, j) => (
                        <div key={j} className="testcase-card" style={{ position: "relative", background: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: 12, borderRadius: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span className="status-chip" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                              Case #{j + 1} {t.sample !== false ? "(Sample)" : "(Hidden)"}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeTestCase(i, j)}
                              style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
                              title="Delete this test case"
                            >
                              ✕
                            </button>
                          </div>
                          <span className="label" style={{ fontSize: "11px", color: "#94A3B8", display: "block", marginBottom: 2 }}>Input (stdin)</span>
                          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "11px", margin: "0 0 6px", background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4 }}>
                            {t.input !== "" ? t.input : "(empty)"}
                          </pre>
                          <span className="label" style={{ fontSize: "11px", color: "#94A3B8", display: "block", marginBottom: 2 }}>Expected Output (stdout)</span>
                          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "11px", margin: 0, background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4, color: "#34D399" }}>
                            {t.expectedOutput || t.output || ""}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                className="submit-btn"
                onClick={save}
                disabled={saving || loading}
                style={{ fontSize: "0.95rem", padding: "10px 24px" }}
              >
                {saving ? "Saving All Problems..." : "✓ Approve & Save All Problems"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
