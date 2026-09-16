import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function GenerateAIQuestions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const plannedQuestionCount = location.state?.questionCount;

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(plannedQuestionCount || 5);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function generateQuestions() {
    if (!topic.trim()) {
      alert("Please specify a topic or curriculum subject.");
      return;
    }

    setLoading(true);
    try {
      const res = await Client.post("/admin/ai/generate-mcq", { topic, count: Number(count) });
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error("AI generation failed", err);
      alert(err?.response?.data?.message || "AI generation request failed. Please verify the backend AI service.");
    } finally {
      setLoading(false);
    }
  }

  function mapQuestion(q) {
    return {
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption
    };
  }

  async function saveQuestions() {
    if (plannedQuestionCount && questions.length !== plannedQuestionCount) {
      alert(`Please generate exactly ${plannedQuestionCount} questions for this examination.`);
      return;
    }

    try {
      setSaving(true);
      for (let q of questions) {
        const payload = mapQuestion(q);
        await Client.post(`/admin/exams/${examId}/questions`, payload);
      }
      alert("All AI-generated questions were saved successfully!");
      navigate(`/admin/exams/${examId}/add-questions`);
    } catch (err) {
      console.error("Failed to save questions", err);
      alert("Failed to save generated questions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="AI Question Generator (MCQ)"
      subtitle="Instantly generate multiple-choice items and distractor options powered by the backend AI engine."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Generator Controls */}
        <div className="card">
          <div className="hero-badge">Exam ID: #{examId} · AI Generator</div>
          <h3 style={{ fontSize: "1.2rem", marginBottom: 16 }}>Topic Prompt & Generation Parameters</h3>

          <div className="form-grid">
            <div className="field-stack" style={{ gridColumn: "span 2" }}>
              <label>Curriculum Topic or Prompt</label>
              <input
                placeholder="e.g. Operating System Deadlocks, Banker's Algorithm, and Resource Allocation Graphs"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="field-stack">
              <label>Number of Questions</label>
              <input
                type="number"
                min="1"
                max="20"
                placeholder="5"
                value={count}
                readOnly={Boolean(plannedQuestionCount)}
                onChange={(e) => setCount(e.target.value)}
              />
              {plannedQuestionCount && (
                <span className="helper-text">Locked to match the planned count ({plannedQuestionCount})</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="primary-btn"
              onClick={generateQuestions}
              disabled={loading}
            >
              {loading ? "Generating Questions with AI..." : "✨ Generate MCQ Items"}
            </button>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div className="hero-badge">AI Assistant Drafting Items</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        )}

        {/* Question Preview & Confirmation */}
        {questions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <h3 style={{ fontSize: "1.2rem" }}>Generated Questions Preview ({questions.length})</h3>
              <button
                className="submit-btn"
                onClick={saveQuestions}
                disabled={saving}
              >
                {saving ? "Saving to Exam..." : "✓ Approve & Save These Questions"}
              </button>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="card question-card">
                <div className="question-preview-header">
                  <h4 style={{ color: "var(--text-primary)" }}>Question {i + 1}</h4>
                  <span className="status-chip approved">
                    Key: Option {q.correctOption}
                  </span>
                </div>

                <p style={{ color: "var(--text-primary)", fontWeight: 500, margin: "8px 0 16px" }}>
                  {q.questionText}
                </p>

                <div className="options-grid">
                  <div className={`option ${q.correctOption === "A" ? "status-good" : ""}`}>
                    <b>A.</b> {q.optionA}
                  </div>
                  <div className={`option ${q.correctOption === "B" ? "status-good" : ""}`}>
                    <b>B.</b> {q.optionB}
                  </div>
                  <div className={`option ${q.correctOption === "C" ? "status-good" : ""}`}>
                    <b>C.</b> {q.optionC}
                  </div>
                  <div className={`option ${q.correctOption === "D" ? "status-good" : ""}`}>
                    <b>D.</b> {q.optionD}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                className="submit-btn"
                onClick={saveQuestions}
                disabled={saving}
              >
                {saving ? "Saving to Exam..." : "✓ Approve & Save These Questions"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
