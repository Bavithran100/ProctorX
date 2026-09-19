import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function AddCodingQuestion() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [exam, setExam] = useState(null);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Question Form State
  const [question, setQuestion] = useState({
    title: "",
    description: "",
    difficulty: "EASY",
    testCases: [{ input: "", output: "" }]
  });

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Quick Test Case Form for already saved question
  const [addingTcForId, setAddingTcForId] = useState(null);
  const [quickTc, setQuickTc] = useState({ input: "", output: "", sample: true });
  const [savingTc, setSavingTc] = useState(false);

  const fetchExamAndQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const [examRes, questionsRes] = await Promise.all([
        Client.get(`/admin/exams/${examId}`),
        Client.get(`/admin/exams/${examId}/coding-questions`)
      ]);

      setExam(examRes.data);
      setSavedQuestions(questionsRes.data || []);
    } catch (err) {
      console.error("Failed to load exam data:", err);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchExamAndQuestions();
  }, [fetchExamAndQuestions]);

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

  function normalizeText(str) {
    if (str == null) return "";
    return String(str)
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }

  async function saveNewQuestion() {
    if (!question.title.trim() || !question.description.trim()) {
      alert("Please provide both title and problem description.");
      return;
    }

    const validTestCases = question.testCases
      .filter((tc) => tc.output && tc.output.trim().length > 0)
      .map((tc) => ({
        input: normalizeText(tc.input),
        expectedOutput: normalizeText(tc.output).trim(),
        sample: true
      }));

    if (validTestCases.length === 0) {
      alert("Validation Error: Every coding question must contain at least one test case with an expected output.");
      return;
    }

    try {
      setSaving(true);
      await Client.post(`/admin/exams/${examId}/coding-questions`, {
        title: question.title.trim(),
        description: question.description.trim(),
        difficulty: question.difficulty,
        allowedLanguage: "JAVA",
        testCases: validTestCases
      });

      alert("Coding question saved successfully with test cases!");

      setQuestion({
        title: "",
        description: "",
        difficulty: "EASY",
        testCases: [{ input: "", output: "" }]
      });

      await fetchExamAndQuestions();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to save coding question.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddQuickTestCase(questionId) {
    if (!quickTc.output.trim()) {
      alert("Please provide the expected output for the test case.");
      return;
    }

    try {
      setSavingTc(true);
      await Client.post(`/admin/exams/${examId}/coding-questions/${questionId}/test-cases`, {
        input: normalizeText(quickTc.input),
        expectedOutput: normalizeText(quickTc.output).trim(),
        sample: quickTc.sample
      });

      alert("Test case added successfully!");
      setAddingTcForId(null);
      setQuickTc({ input: "", output: "", sample: true });
      await fetchExamAndQuestions();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to add test case.");
    } finally {
      setSavingTc(false);
    }
  }

  async function handleDeleteQuestion(questionId, title) {
    if (!window.confirm(`Are you sure you want to delete problem "${title}"?`)) {
      return;
    }

    try {
      await Client.delete(`/admin/exams/${examId}/coding-questions/${questionId}`);
      alert("Question deleted successfully.");
      await fetchExamAndQuestions();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to delete question.");
    }
  }

  async function publish() {
    const plannedCount = exam?.questionCount || location.state?.questionCount || 1;
    if (savedQuestions.length < plannedCount) {
      alert(`Cannot publish yet: Saved ${savedQuestions.length} of ${plannedCount} planned questions.`);
      return;
    }

    const missingTc = savedQuestions.find((q) => !q.testCases || q.testCases.length === 0);
    if (missingTc) {
      alert(`Cannot publish: Problem "${missingTc.title}" has no test cases. Please add at least one test case.`);
      return;
    }

    try {
      setPublishing(true);
      await Client.post(`/admin/exams/${examId}/questions/Publish`);
      alert("🎉 Coding examination published successfully! Students can now access it during the scheduled window.");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err?.response?.data || "Publish failed. Please ensure all coding questions contain at least one test case.");
    } finally {
      setPublishing(false);
    }
  }

  const plannedQuestionCount = exam?.questionCount || location.state?.questionCount;
  const isPublishReady =
    savedQuestions.length > 0 &&
    (!plannedQuestionCount || savedQuestions.length >= plannedQuestionCount) &&
    savedQuestions.every((q) => q.testCases && q.testCases.length > 0);

  return (
    <AppShell
      title="Add Coding Questions & Testcase Suite"
      subtitle="Author problem statements, inspect existing questions, verify testcases, and publish the assessment."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 1040, margin: "0 auto" }}>
        {/* Progress & Publish Card */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-surface-2), rgba(6, 182, 212, 0.08))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div className="hero-badge">Exam ID: #{examId} · {exam?.title || "Coding Assessment"}</div>
              <h3 style={{ fontSize: "1.2rem", margin: "4px 0" }}>
                Problems Saved: {savedQuestions.length} {plannedQuestionCount ? `/ ${plannedQuestionCount}` : ""}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                {plannedQuestionCount
                  ? `Target: ${plannedQuestionCount} coding problems. Total marks: ${exam?.totalMarks || 100} pts.`
                  : "Review problems below and publish when test cases are verified."}
              </p>
            </div>
            <button
              className="submit-btn"
              onClick={publish}
              disabled={publishing || !isPublishReady}
              style={{ padding: "12px 24px", fontSize: "0.95rem" }}
            >
              {publishing ? "Publishing Exam..." : "✓ Publish Coding Exam"}
            </button>
          </div>
        </div>

        {/* Existing Saved Questions Section */}
        {savedQuestions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: "1.2rem", margin: 0 }}>
                Saved Problems for this Exam ({savedQuestions.length})
              </h3>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {savedQuestions.every((q) => q.testCases && q.testCases.length > 0)
                  ? "✓ All problems contain verified test cases"
                  : "⚠️ Some problems are missing test cases"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {savedQuestions.map((q, idx) => {
                const tcCount = q.testCases ? q.testCases.length : 0;
                const hasNoTc = tcCount === 0;

                return (
                  <div key={q.id || idx} className="card question-card" style={{ border: hasNoTc ? "1px solid var(--danger)" : "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span className="status-chip" style={{ fontSize: "0.75rem" }}>Problem #{idx + 1}</span>
                          <strong style={{ fontSize: "1.05rem" }}>{q.title}</strong>
                          <span className="status-chip approved" style={{ fontSize: "0.75rem" }}>{q.difficulty}</span>
                          <span className="status-chip" style={{ fontSize: "0.75rem" }}>{q.marks || (exam?.totalMarks ? Math.round(exam.totalMarks / (plannedQuestionCount || savedQuestions.length)) : 0)} pts</span>
                        </div>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "6px 0 10px", lineHeight: 1.5 }}>
                          {q.description}
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {hasNoTc ? (
                          <span className="status-chip" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", borderColor: "var(--danger)" }}>
                            ⚠️ 0 Test Cases
                          </span>
                        ) : (
                          <span className="status-chip approved" style={{ fontSize: "0.75rem" }}>
                            ✓ {tcCount} Test Case{tcCount > 1 ? "s" : ""}
                          </span>
                        )}

                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ fontSize: "0.8rem", color: "var(--primary)" }}
                          onClick={() => setAddingTcForId(addingTcForId === q.id ? null : q.id)}
                        >
                          {addingTcForId === q.id ? "Cancel" : "+ Add Test Case"}
                        </button>

                        <button
                          type="button"
                          className="ghost-btn"
                          style={{ fontSize: "0.8rem", color: "var(--danger)" }}
                          onClick={() => handleDeleteQuestion(q.id, q.title)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>

                    {/* Display existing test cases */}
                    {tcCount > 0 && (
                      <div className="sample-grid" style={{ marginTop: 12 }}>
                        {q.testCases.map((tc, tcIdx) => (
                          <div key={tc.id || tcIdx} className="testcase-card" style={{ background: "var(--bg-surface-2)" }}>
                            <span className="status-chip" style={{ fontSize: "0.7rem", marginBottom: 4 }}>
                              Case #{tcIdx + 1} {tc.sample ? "(Sample)" : "(Hidden)"}
                            </span>
                            <span className="label">Input (stdin)</span>
                            <pre style={{ maxHeight: 90, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {tc.input !== "" ? tc.input : "(empty)"}
                            </pre>
                            <span className="label">Expected Output (stdout)</span>
                            <pre style={{ maxHeight: 90, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {tc.expectedOutput || tc.output || ""}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Quick Add Test Case Form */}
                    {addingTcForId === q.id && (
                      <div className="card" style={{ background: "var(--bg-surface-2)", marginTop: 14, padding: 16 }}>
                        <h4 style={{ fontSize: "0.95rem", margin: "0 0 10px 0" }}>Add Test Case to Problem #{idx + 1}</h4>
                        <div className="form-grid">
                          <div className="field-stack">
                            <label>Standard Input (stdin)</label>
                            <textarea
                              placeholder="e.g. 5&#10;1 2 3 4 5"
                              value={quickTc.input}
                              onChange={(e) => setQuickTc({ ...quickTc, input: e.target.value })}
                              style={{ minHeight: 60, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                            />
                          </div>

                          <div className="field-stack">
                            <label>Expected Output (stdout) *</label>
                            <textarea
                              placeholder="e.g. 15"
                              value={quickTc.output}
                              onChange={(e) => setQuickTc({ ...quickTc, output: e.target.value })}
                              style={{ minHeight: 60, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                              required
                            />
                          </div>
                        </div>

                        <div className="button-row" style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => handleAddQuickTestCase(q.id)}
                            disabled={savingTc}
                          >
                            {savingTc ? "Saving Case..." : "Save Test Case"}
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => setAddingTcForId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Another Coding Question Form */}
        <div className="card">
          <h3 style={{ fontSize: "1.2rem", marginBottom: 16 }}>
            {savedQuestions.length > 0 ? "+ Add Another Coding Problem" : "Author Problem Statement"}
          </h3>

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
                style={{ minHeight: 120 }}
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
                    <label>Expected Output (stdout) *</label>
                    <textarea
                      placeholder="e.g. 15"
                      value={t.output}
                      onChange={(e) => updateTestCase(i, "output", e.target.value)}
                      style={{ minHeight: 70, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                      required
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
              onClick={saveNewQuestion}
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
