import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function AddCodingQuestion() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const plannedQuestionCount = location.state?.questionCount;

  const [question, setQuestion] = useState({
    title: "",
    description: "",
    difficulty: "EASY",
    testCases: [{ input: "", output: "" }]
  });

  const [addedCount, setAddedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function handleChange(e) {
    setQuestion({ ...question, [e.target.name]: e.target.value });
  }

  function addTestCase() {
    setQuestion({
      ...question,
      testCases: [...question.testCases, { input: "", output: "" }]
    });
  }

  function removeTestCase(index) {
    if (question.testCases.length <= 1) return;
    setQuestion({
      ...question,
      testCases: question.testCases.filter((_, i) => i !== index)
    });
  }

  function updateTestCase(i, field, value) {
    const updated = [...question.testCases];
    updated[i][field] = value;
    setQuestion({ ...question, testCases: updated });
  }

  async function save() {
    if (!question.title.trim() || !question.description.trim()) {
      alert("Please provide both title and problem description.");
      return;
    }

    try {
      setSaving(true);
      await Client.post(`/admin/exams/${examId}/coding-questions`, question);
      setAddedCount((prev) => prev + 1);
      alert("Coding question saved successfully!");

      setQuestion({
        title: "",
        description: "",
        difficulty: "EASY",
        testCases: [{ input: "", output: "" }]
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save coding question.");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    try {
      setPublishing(true);
      await Client.post(`/admin/exams/${examId}/questions/Publish`);
      alert("Coding examination published successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Publish failed. Please ensure at least one coding question has been saved.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AppShell
      title="Add Coding Questions (Manual)"
      subtitle="Author problem statements and define testcase input/output pairs for the Java execution judge."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Progress & Publish Card */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-surface-2), rgba(6, 182, 212, 0.08))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="hero-badge">Exam ID: #{examId} · Coding Assessment</div>
              <h3 style={{ fontSize: "1.15rem", margin: "4px 0" }}>
                Problems Saved: {addedCount} {plannedQuestionCount ? `/ ${plannedQuestionCount}` : ""}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                {plannedQuestionCount
                  ? `Requires ${plannedQuestionCount} coding problems. The server divides total marks equally.`
                  : "Add testcase sets and publish when ready."}
              </p>
            </div>
            <button
              className="submit-btn"
              onClick={publish}
              disabled={publishing || (plannedQuestionCount && addedCount < plannedQuestionCount)}
            >
              {publishing ? "Publishing..." : "✓ Publish Coding Exam"}
            </button>
          </div>
        </div>

        {/* Problem Definition */}
        <div className="card">
          <h3 style={{ fontSize: "1.2rem", marginBottom: 16 }}>Problem Statement</h3>

          <div className="form-grid">
            <div className="field-stack" style={{ gridColumn: "span 2" }}>
              <label>Problem Title</label>
              <input
                name="title"
                placeholder="e.g. Invert a Binary Tree or Maximum Subarray Sum"
                value={question.title}
                onChange={handleChange}
              />
            </div>

            <div className="field-stack">
              <label>Difficulty Tier</label>
              <select
                name="difficulty"
                value={question.difficulty}
                onChange={handleChange}
              >
                <option value="EASY">🟢 EASY</option>
                <option value="MEDIUM">🟡 MEDIUM</option>
                <option value="HARD">🔴 HARD</option>
              </select>
            </div>

            <div className="field-stack" style={{ gridColumn: "span 2" }}>
              <label>Problem Description & Constraints</label>
              <textarea
                name="description"
                placeholder="Detailed problem statement, input formatting, constraints, and sample explanations..."
                value={question.description}
                onChange={handleChange}
                style={{ minHeight: 140 }}
              />
            </div>
          </div>
        </div>

        {/* Test Cases Matrix */}
        <div className="card question-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: "1.2rem" }}>Test Cases Matrix ({question.testCases.length})</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Provide exact input lines and expected standard output strings.
              </p>
            </div>
            <button
              type="button"
              className="ghost-btn"
              style={{ fontSize: "0.82rem" }}
              onClick={addTestCase}
            >
              + Add Test Case
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {question.testCases.map((t, i) => (
              <div key={i} className="card" style={{ background: "var(--bg-surface-1)", padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span className="status-chip" style={{ fontSize: "0.75rem" }}>
                    Test Case #{i + 1}
                  </span>
                  {question.testCases.length > 1 && (
                    <button
                      type="button"
                      className="ghost-btn"
                      style={{ padding: "2px 8px", fontSize: "0.75rem", color: "var(--danger)" }}
                      onClick={() => removeTestCase(i)}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  <div className="field-stack">
                    <label>Standard Input (stdin)</label>
                    <textarea
                      placeholder="e.g. 5&#10;1 2 3 4 5"
                      value={t.input}
                      onChange={(e) => updateTestCase(i, "input", e.target.value)}
                      style={{ minHeight: 70, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                    />
                  </div>

                  <div className="field-stack">
                    <label>Expected Output (stdout)</label>
                    <textarea
                      placeholder="e.g. 15"
                      value={t.output}
                      onChange={(e) => updateTestCase(i, "output", e.target.value)}
                      style={{ minHeight: 70, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="button-row" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
            <button
              type="button"
              className="primary-btn"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving Problem..." : "+ Save This Coding Question"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
