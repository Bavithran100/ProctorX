import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function AddQuestions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [exam, setExam] = useState(null);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [current, setCurrent] = useState({
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "A"
  });

  const [publishing, setPublishing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchExamAndQuestions = useCallback(async () => {
    try {
      setFetching(true);
      const [examRes, questionsRes] = await Promise.all([
        Client.get(`/admin/exams/${examId}`),
        Client.get(`/admin/exams/${examId}/questions`)
      ]);

      setExam(examRes.data);
      setSavedQuestions(questionsRes.data || []);
    } catch (err) {
      console.error("Failed to load exam details", err);
    } finally {
      setFetching(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchExamAndQuestions();
  }, [fetchExamAndQuestions]);

  function handleChange(e) {
    setCurrent({ ...current, [e.target.name]: e.target.value });
  }

  async function addQuestion(e) {
    if (e) e.preventDefault();
    if (!current.questionText.trim()) {
      alert("Please provide the question text.");
      return;
    }

    try {
      setLoading(true);
      await Client.post(`/admin/exams/${examId}/questions`, current);
      setSuccessMsg("Question added successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);

      setCurrent({
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "A"
      });

      await fetchExamAndQuestions();
    } catch (err) {
      console.error("Failed to add question", err);
      alert(err?.response?.data?.message || "Failed to add question. Please check fields.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteQuestion(questionId) {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await Client.delete(`/admin/exams/${examId}/questions/${questionId}`);
      await fetchExamAndQuestions();
    } catch (err) {
      console.error("Failed to delete question", err);
      alert("Failed to delete question.");
    }
  }

  async function publish() {
    const plannedCount = exam?.questionCount || location.state?.questionCount || 1;
    if (savedQuestions.length < plannedCount) {
      alert(`Cannot publish yet: Saved ${savedQuestions.length} of ${plannedCount} planned questions.`);
      return;
    }

    try {
      setPublishing(true);
      await Client.post(`/admin/exams/${examId}/questions/Publish`);
      alert("Exam published successfully! Students can now view it during the scheduled window.");
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to publish exam", err);
      alert(err?.response?.data?.message || err?.response?.data || "Publish failed. Please ensure all planned questions have been added.");
    } finally {
      setPublishing(false);
    }
  }

  const plannedQuestionCount = exam?.questionCount || location.state?.questionCount;
  const isPublishReady =
    savedQuestions.length > 0 &&
    (!plannedQuestionCount || savedQuestions.length >= plannedQuestionCount);

  return (
    <AppShell
      title="Manual Question Builder (MCQ)"
      subtitle="Compose multiple choice items and options. Total marks are automatically divided by the backend."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Progress Tracker Card */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-surface-2), rgba(99, 102, 241, 0.08))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="hero-badge">Exam ID: #{examId} · {exam?.title || "Assessment"}</div>
              <h3 style={{ fontSize: "1.15rem", margin: "4px 0" }}>
                Questions Saved: {savedQuestions.length} {plannedQuestionCount ? `/ ${plannedQuestionCount}` : ""}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                {plannedQuestionCount
                  ? `This exam requires ${plannedQuestionCount} questions. Marks: ${exam?.totalMarks || 100} pts distributed equally.`
                  : "Add your desired number of questions and click Publish Exam when done."}
              </p>
            </div>
            <button
              className="submit-btn"
              onClick={publish}
              disabled={publishing || !isPublishReady}
            >
              {publishing ? "Publishing..." : "✓ Publish Exam to Students"}
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="status-chip approved" style={{ width: "fit-content", padding: "8px 16px", fontSize: "0.85rem", marginBottom: 16 }}>
            ✓ {successMsg}
          </div>
        )}

        {/* Existing Questions List */}
        {savedQuestions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: 12 }}>Saved Questions ({savedQuestions.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {savedQuestions.map((q, idx) => (
                <div key={q.id || idx} className="card question-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span className="status-chip" style={{ fontSize: "0.75rem" }}>Q#{idx + 1}</span>
                        <strong>{q.questionText}</strong>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        <span>A: {q.optionA}</span>
                        <span>B: {q.optionB}</span>
                        <span>C: {q.optionC}</span>
                        <span>D: {q.optionD}</span>
                        <span style={{ color: "var(--primary)", fontWeight: 600 }}>Key: {q.correctOption}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ghost-btn"
                      style={{ fontSize: "0.8rem", color: "var(--danger)" }}
                      onClick={() => handleDeleteQuestion(q.id)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question Form */}
        <form onSubmit={addQuestion}>
          <div className="card question-card">
            <h3 style={{ fontSize: "1.15rem", marginBottom: 14 }}>
              {savedQuestions.length > 0 ? "+ Add Another Question" : "Question Definition"}
            </h3>
            <div className="field-stack">
              <label>Question Prompt / Text</label>
              <textarea
                value={current.questionText}
                name="questionText"
                placeholder="e.g. Which of the following data structures offers O(1) average time complexity for lookups?"
                onChange={handleChange}
                required
              />
            </div>

            <div className="options-grid" style={{ marginTop: 20 }}>
              <div className="field-stack">
                <label>Option A</label>
                <input
                  value={current.optionA}
                  name="optionA"
                  placeholder="Option A text..."
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field-stack">
                <label>Option B</label>
                <input
                  value={current.optionB}
                  name="optionB"
                  placeholder="Option B text..."
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field-stack">
                <label>Option C</label>
                <input
                  value={current.optionC}
                  name="optionC"
                  placeholder="Option C text..."
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field-stack">
                <label>Option D</label>
                <input
                  value={current.optionD}
                  name="optionD"
                  placeholder="Option D text..."
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="field-stack" style={{ marginTop: 16, maxWidth: 300 }}>
              <label>Correct Answer Key</label>
              <select
                value={current.correctOption}
                name="correctOption"
                onChange={handleChange}
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>

            <div className="button-row" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading ? "Saving Question..." : "+ Save Question"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
