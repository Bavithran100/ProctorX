import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function AddQuestions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const plannedQuestionCount = location.state?.questionCount;

  const [current, setCurrent] = useState({
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "A"
  });

  const [addedCount, setAddedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

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
      setAddedCount((prev) => prev + 1);
      setSuccessMsg(`Question ${addedCount + 1} added successfully!`);
      setTimeout(() => setSuccessMsg(""), 3000);

      setCurrent({
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctOption: "A"
      });
    } catch (err) {
      console.error("Failed to add question", err);
      alert("Failed to add question. Please check fields.");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    try {
      setPublishing(true);
      await Client.post(`/admin/exams/${examId}/questions/Publish`);
      alert("Exam published successfully! Students can now view it during the scheduled window.");
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to publish exam", err);
      alert("Publish failed. Please ensure at least one question has been saved.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AppShell
      title="Manual Question Builder (MCQ)"
      subtitle="Compose multiple choice items and options. Total marks are automatically divided by the backend."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Progress Tracker Card */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-surface-2), rgba(99, 102, 241, 0.08))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="hero-badge">Exam ID: #{examId}</div>
              <h3 style={{ fontSize: "1.15rem", margin: "4px 0" }}>
                Questions Added: {addedCount} {plannedQuestionCount ? `/ ${plannedQuestionCount}` : ""}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                {plannedQuestionCount
                  ? `This exam is planned for ${plannedQuestionCount} questions. Marks will be split equally.`
                  : "Add your desired number of questions and click Publish Exam when done."}
              </p>
            </div>
            <button
              className="submit-btn"
              onClick={publish}
              disabled={publishing || (plannedQuestionCount && addedCount < plannedQuestionCount)}
            >
              {publishing ? "Publishing..." : "✓ Publish Exam to Students"}
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="status-chip approved" style={{ width: "fit-content", padding: "8px 16px", fontSize: "0.85rem" }}>
            ✓ {successMsg}
          </div>
        )}

        {/* Question Form */}
        <form onSubmit={addQuestion}>
          <div className="card question-card">
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
                {loading ? "Saving Question..." : "+ Save & Add Next Question"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
