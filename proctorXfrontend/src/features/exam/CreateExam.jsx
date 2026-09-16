import { useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function CreateExam() {
  const [exam, dispatchForm] = useReducer(
    (state, action) => ({ ...state, [action.name]: action.value }),
    {
      title: "",
      description: "",
      duration: "60",
      totalMarks: "100",
      questionCount: "5",
      examType: "MCQ",
      instructions: "Read every question carefully before selecting your option or running your code.",
      rules: "No tab switching, no copy/pasting, single session only, camera must remain enabled.",
      startTime: "",
      endTime: ""
    }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleChange(e) {
    dispatchForm({ name: e.target.name, value: e.target.value });
  }

  async function handleCreate(next) {
    setError("");

    if (!exam.title.trim()) {
      setError("Please provide an examination title.");
      return;
    }

    if (!Number(exam.totalMarks) || !Number(exam.questionCount)) {
      setError("Please enter valid total marks and question count.");
      return;
    }

    if (!exam.startTime || !exam.endTime) {
      setError("Please specify both start and end availability window times.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: exam.title,
        description: exam.description,
        duration: Number(exam.duration),
        totalMarks: Number(exam.totalMarks),
        questionCount: Number(exam.questionCount),
        examType: exam.examType,
        startTime: exam.startTime,
        endTime: exam.endTime,
        instruction: {
          instructions: exam.instructions,
          rules: exam.rules
        }
      };

      const res = await Client.post("/admin/exams", payload);
      const examId = res.data.id;

      if (exam.examType === "CODING") {
        if (next === "AI") {
          navigate(`/admin/exams/${examId}/coding-plan`, {
            state: { questionCount: Number(exam.questionCount) }
          });
        } else {
          navigate(`/admin/exams/${examId}/coding-manual`, {
            state: { questionCount: Number(exam.questionCount) }
          });
        }
      } else {
        if (next === "AI") {
          navigate(`/admin/exams/${examId}/generate-ai`, {
            state: { questionCount: Number(exam.questionCount) }
          });
        } else {
          navigate(`/admin/exams/${examId}/add-questions`, {
            state: { questionCount: Number(exam.questionCount) }
          });
        }
      }
    } catch (err) {
      console.error("Failed to create exam", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to create exam. Please check your role permissions or try logging in again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Create New Examination"
      subtitle="Configure assessment metadata, schedule availability windows, and select your question authoring workflow."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 960, margin: "0 auto" }}>
        {error && <div className="error">{error}</div>}

        {/* Section 1: Basic Assessment Configuration */}
        <div className="card">
          <div className="hero-badge">Step 1 · Assessment Blueprint</div>
          <h3 style={{ fontSize: "1.2rem", marginBottom: 16 }}>General Details & Format</h3>

          <div className="form-grid">
            <div className="field-stack" style={{ gridColumn: "span 2" }}>
              <label>Examination Title</label>
              <input
                name="title"
                placeholder="e.g. Advanced Data Structures & Algorithm Optimization"
                value={exam.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field-stack">
              <label>Assessment Type / Format</label>
              <select name="examType" value={exam.examType} onChange={handleChange}>
                <option value="MCQ">📝 Multiple Choice Questions (MCQ)</option>
                <option value="CODING">💻 Interactive Coding Assessment (Java IDE)</option>
              </select>
            </div>

            <div className="field-stack">
              <label>Duration (Minutes)</label>
              <input
                name="duration"
                type="number"
                min="1"
                placeholder="60"
                value={exam.duration}
                onChange={handleChange}
              />
            </div>

            <div className="field-stack">
              <label>Total Marks (Score Sum)</label>
              <input
                name="totalMarks"
                type="number"
                min="1"
                placeholder="100"
                value={exam.totalMarks}
                onChange={handleChange}
              />
            </div>

            <div className="field-stack">
              <label>Number of {exam.examType === "MCQ" ? "MCQ" : "Coding"} Questions</label>
              <input
                name="questionCount"
                type="number"
                min="1"
                placeholder="5"
                value={exam.questionCount}
                onChange={handleChange}
              />
            </div>

            <div className="field-stack" style={{ gridColumn: "span 2" }}>
              <label>Short Description</label>
              <input
                name="description"
                placeholder="e.g. Midterm assessment covering Trees, Dynamic Programming, and Graph algorithms."
                value={exam.description}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Scheduling & Rules */}
        <div className="card">
          <div className="hero-badge">Step 2 · Availability & Security Rules</div>
          <h3 style={{ fontSize: "1.2rem", marginBottom: 16 }}>Schedule Window & Candidate Instructions</h3>

          <div className="form-grid">
            <div className="field-stack">
              <label>Window Start Time (Entry Opens)</label>
              <input
                type="datetime-local"
                step="60"
                name="startTime"
                value={exam.startTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field-stack">
              <label>Window End Time (Entry Closes)</label>
              <input
                type="datetime-local"
                step="60"
                name="endTime"
                value={exam.endTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field-stack" style={{ gridColumn: "span 2" }}>
              <label>Candidate Instructions</label>
              <textarea
                name="instructions"
                placeholder="Instructions displayed to students before starting..."
                value={exam.instructions}
                onChange={handleChange}
              />
            </div>

            <div className="field-stack" style={{ gridColumn: "span 2" }}>
              <label>Platform & Anti-Cheating Rules</label>
              <textarea
                name="rules"
                placeholder="Specific rules regarding tab limits, proctoring, or allowable resources..."
                value={exam.rules}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Authoring Path Choice */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-surface-2), var(--bg-surface-3))", borderColor: "var(--border-focus)" }}>
          <div className="hero-badge">Step 3 · Authoring Choice</div>
          <h3 style={{ fontSize: "1.2rem", marginBottom: 6 }}>Proceed to Question Authoring</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>
            Choose whether to compose question prompts manually or leverage AI generation to automatically produce items based on topic and difficulty.
          </p>

          <div className="button-row">
            <button
              type="button"
              className="primary-btn"
              disabled={loading}
              onClick={() => handleCreate("MANUAL")}
            >
              ✍️ Add Questions Manually →
            </button>

            <button
              type="button"
              className="secondary-btn"
              style={{ borderColor: "var(--primary-light)", color: "var(--text-primary)" }}
              disabled={loading}
              onClick={() => handleCreate("AI")}
            >
              ✨ Generate Questions using AI →
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
