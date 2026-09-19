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
  const [saving, setSaving] = useState(false);

  const [inputs, setInputs] = useState({});
  const [solutions, setSolutions] = useState({});
  const [generatedOutput, setGeneratedOutput] = useState({});

  function normalizeText(str) {
    if (str == null) return "";
    return String(str)
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }

  async function generate() {
    if (!planningBrief) {
      alert("Please create an AI plan before generating coding questions.");
      navigate(`/admin/exams/${examId}/coding-plan`);
      return;
    }

    setLoading(true);

    try {
      const res = await Client.post("/admin/ai/generate-coding-questions", planningBrief);

      const questionsWithTC = (res.data.questions || []).map((q) => ({
        ...q,
        title: q.title || "Coding Question",
        description: normalizeText(q.description || ""),
        testCases: (q.testCases || []).map((tc) => ({
          input: normalizeText(tc.input || ""),
          expectedOutput: normalizeText(tc.expectedOutput || tc.output || "").trim(),
          sample: tc.sample !== false
        })),
        referenceSolution: q.referenceSolution || ""
      }));

      setQuestions(questionsWithTC);

      setSolutions(
        questionsWithTC.reduce((acc, q, i) => {
          acc[i] = q.referenceSolution;
          return acc;
        }, {})
      );
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "AI generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateOutput(qIndex) {
    const input = inputs[qIndex];
    const solution = solutions[qIndex];

    if (!input) return alert("Please enter sample standard input.");
    if (!solution) return alert("Please verify the reference Java solution.");

    try {
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
    }
  }

  function addTestCase(qIndex) {
    const input = inputs[qIndex];
    const output = generatedOutput[qIndex];

    if (!input || (!output && output !== "")) {
      alert("Please generate the standard output first.");
      return;
    }

    const updated = [...questions];

    updated[qIndex].testCases.push({
      input: normalizeText(input),
      expectedOutput: normalizeText(output).trim(),
      sample: updated[qIndex].testCases.length === 0
    });

    setQuestions(updated);

    setGeneratedOutput({
      ...generatedOutput,
      [qIndex]: ""
    });
  }

  async function save() {
    if (!planningBrief || questions.length !== Number(planningBrief.questionCount)) {
      alert(`Please generate exactly ${planningBrief?.questionCount || 0} questions before saving.`);
      return;
    }

    // Verify all questions have at least 1 testcase
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].testCases || questions[i].testCases.length === 0) {
        alert(`Problem #${i + 1} ("${questions[i].title}") does not have any verified test cases. Please generate and add at least one test case for each question before saving.`);
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
      title="AI Coding Problem Generator & Testbed"
      subtitle="Synthesize programming problems, inspect reference solutions in Monaco, and validate testcases with the live compiler."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 1040, margin: "0 auto" }}>
        {/* Planning Brief Card */}
        {planningBrief && (
          <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-surface-2), rgba(99, 102, 241, 0.08))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="hero-badge">AI Plan Loaded</div>
                <h3 style={{ fontSize: "1.15rem", margin: "4px 0" }}>{planningBrief.topic}</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Targeting {planningBrief.questionCount} Problems · {planningBrief.difficulty} Tier · {planningBrief.targetComplexity || "Optimal Complexity"}
                </p>
              </div>

              <button
                className="primary-btn"
                onClick={generate}
                disabled={loading}
              >
                {loading ? "Generating Problems with AI..." : "✨ Generate Coding Problems"}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div className="hero-badge">Synthesizing Code Templates</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        )}

        {/* Generated Problems List */}
        {questions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <h3 style={{ fontSize: "1.25rem" }}>Synthesized Coding Problems ({questions.length})</h3>
              <button className="submit-btn" onClick={save} disabled={saving}>
                {saving ? "Saving All Problems..." : "✓ Approve & Save All Problems"}
              </button>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="card question-card">
                <div className="question-preview-header">
                  <div>
                    <span className="status-chip" style={{ marginRight: 8 }}>Problem #{i + 1}</span>
                    <strong style={{ fontSize: "1.15rem", color: "var(--text-primary)" }}>{q.title}</strong>
                  </div>
                  <span className="status-chip approved">{q.difficulty}</span>
                </div>

                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "10px 0 16px", lineHeight: 1.5 }}>
                  {q.description}
                </p>

                {/* Reference Solution Code Editor */}
                <div className="editor-shell">
                  <div className="editor-toolbar">
                    <strong>Reference Solution (Java)</strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Compiler-verified logic</span>
                  </div>
                  <Editor
                    height="260px"
                    defaultLanguage="java"
                    value={solutions[i] || ""}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false
                    }}
                    onChange={(value) =>
                      setSolutions({ ...solutions, [i]: value })
                    }
                  />
                </div>

                {/* Live Output Generator & Test Case Validator */}
                <div className="card" style={{ background: "var(--bg-surface-1)", padding: 18, marginTop: 16 }}>
                  <div className="hero-badge" style={{ marginBottom: 8 }}>Test Case Generation Workbench</div>
                  <p className="helper-text" style={{ marginBottom: 12 }}>
                    Provide sample inputs for your problem. The compiler will execute the reference solution and capture the exact expected output.
                  </p>

                  <div className="form-grid">
                    <div className="field-stack">
                      <label>Test Input (stdin)</label>
                      <textarea
                        placeholder="Enter sample input lines..."
                        style={{ minHeight: 70, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                        onChange={(e) =>
                          setInputs({ ...inputs, [i]: e.target.value })
                        }
                      />
                    </div>

                    <div className="field-stack">
                      <label>Captured Output (stdout)</label>
                      <pre style={{ minHeight: 70 }}>{generatedOutput[i] || "Click Generate Output below to evaluate..."}</pre>
                    </div>
                  </div>

                  <div className="button-row" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => generateOutput(i)}
                    >
                      ▶ Execute & Generate Output
                    </button>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => addTestCase(i)}
                    >
                      + Add as Verified Test Case
                    </button>
                  </div>
                </div>

                {/* Verified Test Cases */}
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: "0.95rem", marginBottom: 8 }}>
                    Verified Test Cases ({(q.testCases || []).length})
                  </h4>

                  {(q.testCases || []).length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      No test cases added yet. Generate at least 1-2 test cases above.
                    </p>
                  ) : (
                    <div className="sample-grid">
                      {q.testCases.map((t, j) => (
                        <div key={j} className="testcase-card">
                          <span className="status-chip" style={{ fontSize: "0.7rem", marginBottom: 4 }}>
                            Case #{j + 1} {t.sample !== false ? "(Sample)" : "(Hidden)"}
                          </span>
                          <span className="label">Input (stdin)</span>
                          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{t.input !== "" ? t.input : "(empty)"}</pre>
                          <span className="label">Expected Output (stdout)</span>
                          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{t.expectedOutput || t.output || ""}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="submit-btn" onClick={save} disabled={saving}>
                {saving ? "Saving All Problems..." : "✓ Approve & Save All Problems"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
